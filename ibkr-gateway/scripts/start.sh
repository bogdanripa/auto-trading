#!/bin/bash
set -e

echo "==> Starting IBKR Gateway Container"
echo "==> Mode: ${ACCOUNT_MODE:-paper}"
echo "==> Region: europe-west1"

# Validate required environment variables
: "${AUTH_TOKEN:?AUTH_TOKEN env var is required}"
: "${IB_USERNAME:?IB_USERNAME env var is required}"
: "${IB_PASSWORD:?IB_PASSWORD env var is required}"

# Populate IBC config with credentials from env
cp /config/ibc.ini /home/trader/ibc.ini
sed -i "s|^IbLoginId=.*|IbLoginId=${IB_USERNAME}|" /home/trader/ibc.ini
sed -i "s|^IbPassword=.*|IbPassword=${IB_PASSWORD}|" /home/trader/ibc.ini
sed -i "s|^TradingMode=.*|TradingMode=${ACCOUNT_MODE:-paper}|" /home/trader/ibc.ini
chown trader:trader /home/trader/ibc.ini
chmod 600 /home/trader/ibc.ini

# Create log directory
mkdir -p /var/log
touch /var/log/xvfb.log /var/log/ibgateway.log /var/log/fastapi.log

# IBC refuses to launch without this dir — it exits 5 with
# "Error: TWS settings path: /home/trader/ibgateway-settings does not exist".
# IB Gateway will populate it on first run (jts.ini, etc.).
mkdir -p /home/trader/ibgateway-settings

# Fail loudly if IB Gateway or IBC aren't where we expect them — otherwise
# supervisord will happily keep restarting a process that can never succeed.
: "${IB_GATEWAY_VERSION:?IB_GATEWAY_VERSION is required at runtime (set via Dockerfile ENV)}"
for d in "/opt/ibgateway/${IB_GATEWAY_VERSION}/jars" /opt/ibc/scripts; do
    if [ ! -d "$d" ]; then
        echo "FATAL: $d is missing — the Docker build did not install it correctly." >&2
        echo "       Contents of /opt:" >&2
        ls -la /opt >&2 || true
        echo "       Contents of /opt/ibgateway:" >&2
        ls -la /opt/ibgateway >&2 || true
        exit 1
    fi
done

chown -R trader:trader /var/log /opt/ibgateway /opt/ibc /home/trader/ibgateway-settings

# Start supervisord (manages Xvfb + IB Gateway + FastAPI)
echo "==> Handing off to supervisord"
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/ibkr-gateway.conf
