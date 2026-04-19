# IBKR Gateway Service

A containerized REST API wrapper around Interactive Brokers' IB Gateway, deployed on Google Cloud Run. Provides the execution layer for the BVB autonomous trading engine.

## Architecture

```
Claude scheduled task
      │ HTTPS + Bearer token
      ▼
Cloud Run (europe-west1)
  ├── FastAPI on :8080 (this service)
  │     /account, /positions, /orders, /quote/{symbol}, etc.
  │
  └── IB Gateway (Java, managed by IBC for auto-login)
        Listens on localhost:4001 (live) or :4002 (paper)
      │ encrypted TCP
      ▼
IBKR servers (IB Ireland)
```

Two separate services are deployed:
- `ibkr-gateway-paper` — paper trading, connects to port 4002
- `ibkr-gateway-live` — live trading, connects to port 4001

## Prerequisites

1. **Google Cloud account** with billing enabled
2. **IBKR account** (separate paper and live credentials)
3. **2FA set up** — see [Soft Token Setup](#soft-token-setup) below
4. **`gcloud` CLI** installed and authenticated locally

## Setup

### 1. Create GCP project and enable APIs

```bash
export GCP_PROJECT_ID=your-project-id
./scripts/setup-gcp.sh
```

### 2. Create secrets in Secret Manager

For **paper** trading:
```bash
echo -n 'your-paper-ibkr-username' | gcloud secrets create ibkr-username-paper --data-file=-
echo -n 'your-paper-ibkr-password' | gcloud secrets create ibkr-password-paper --data-file=-
openssl rand -hex 32 | gcloud secrets create trading-auth-token-paper --data-file=-
```

For **live** trading:
```bash
echo -n 'your-live-ibkr-username' | gcloud secrets create ibkr-username-live --data-file=-
echo -n 'your-live-ibkr-password' | gcloud secrets create ibkr-password-live --data-file=-
openssl rand -hex 32 | gcloud secrets create trading-auth-token-live --data-file=-
```

Save the auth tokens — you'll need them to configure Claude's scheduled tasks:
```bash
gcloud secrets versions access latest --secret=trading-auth-token-paper
```

### 3. Grant Cloud Run access to secrets

```bash
PROJECT_NUMBER=$(gcloud projects describe $GCP_PROJECT_ID --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for s in ibkr-username-paper ibkr-password-paper trading-auth-token-paper \
         ibkr-username-live ibkr-password-live trading-auth-token-live; do
  gcloud secrets add-iam-policy-binding $s \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 4. Deploy

```bash
./scripts/deploy.sh paper    # Deploy paper trading service
./scripts/deploy.sh live     # Deploy live trading service
```

The output shows each service URL. You'll need these for the trade-executor skill configuration.

## Soft Token Setup

IBKR offers several 2FA methods. For automated operation, use **Soft Token via the IBKR Authenticator app**:

1. Install "IBKR Mobile" app on your phone
2. In IBKR Client Portal → Settings → User Settings → Security → Secure Login → enable IBKR Mobile Authentication
3. The app generates time-based codes (TOTP)
4. In the IBKR Mobile app, go to Authentication → enable "Auto Lock Bypass" so codes can be generated without manually unlocking

**Important caveats:**
- IBKR still requires manual 2FA approval roughly **once per week** during their Sunday maintenance window (~12:00 AM EST Sunday)
- During this window you'll get a Telegram alert from the trading engine; open IBKR Mobile and approve
- This is unavoidable — IBKR's policy is that fully unattended live trading isn't supported for retail accounts

For **paper trading**, 2FA is often not required, so this is much simpler.

## API Reference

All endpoints except `/health` require `Authorization: Bearer <token>` header.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check (no auth) |
| `/account` | GET | Account summary (cash, buying power, NLV) |
| `/positions` | GET | Current positions |
| `/orders` | GET | Open orders |
| `/orders` | POST | Place a new order |
| `/orders/{id}` | DELETE | Cancel an open order |
| `/quote/{symbol}` | GET | Current bid/ask/last for a symbol |
| `/executions` | GET | Today's fills |

### Example: Place a BVB order

```bash
curl -X POST "${SERVICE_URL}/orders" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "SNG",
    "exchange": "BVB",
    "currency": "RON",
    "action": "BUY",
    "quantity": 10,
    "order_type": "LMT",
    "limit_price": 48.50,
    "tif": "DAY",
    "notes": "Swing entry, RSI oversold bounce"
  }'
```

## Cost estimate

With `min-instances=1` on 1 vCPU + 2GB RAM, the cost runs approximately:
- Paper service: ~€10-12/month
- Live service: ~€10-12/month
- Total: ~€20-25/month

This is higher than a VPS (€4-6/month) but buys you managed uptime, auto-restart, HTTPS + IAM, and zero ops overhead.

**To reduce cost if running only paper initially**, deploy only the paper service until the strategy is ready.

## Monitoring

View logs:
```bash
gcloud run services logs read ibkr-gateway-paper --region=europe-west1 --limit=100
```

Check health from anywhere:
```bash
curl "${SERVICE_URL}/health"
```

Set up a Cloud Monitoring uptime check against `/health` to alert on outages.

## Troubleshooting

**Container fails to start:** Most common cause is IB credentials wrong. Check Cloud Run logs; look for `IBC` authentication errors.

**`ib_connected: false` in /health:** The gateway is up but not connected. Usually means IBKR is in their nightly maintenance window, or 2FA needs manual approval. Wait 5 minutes, check logs.

**Order rejected with "No security definition found":** The symbol/exchange combination isn't valid. For BVB, use `exchange: "BVB"` and `currency: "RON"`. Some illiquid stocks may not be available via API — check in the IBKR Client Portal first.

**"Outside trading hours" errors:** BVB trades 10:00-17:45 EET. Use `tif: "DAY"` and submit after 09:45 when the pre-open auction starts.
