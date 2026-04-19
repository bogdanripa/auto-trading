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
chown -R trader:trader /var/log /opt/ibgateway /opt/ibc

# Start supervisord (manages Xvfb + IB Gateway + FastAPI)
echo "==> Handing off to supervisord"
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/ibkr-gateway.conf
