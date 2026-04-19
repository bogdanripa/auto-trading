#!/bin/bash
set -e

# Ensure X display is ready
while ! xdpyinfo -display :1 >/dev/null 2>&1; do
    echo "Waiting for Xvfb..."
    sleep 1
done

# IBC launches IB Gateway and handles the login dialog
exec /opt/ibc/scripts/ibcstart.sh \
    "${IB_GATEWAY_VERSION:-stable}" \
    --gateway \
    --mode="${ACCOUNT_MODE:-paper}" \
    --ibc-ini=/home/trader/ibc.ini \
    --ibc-path=/opt/ibc \
    --tws-path=/opt/ibgateway \
    --tws-settings-path=/home/trader/ibgateway-settings
