#!/bin/bash
set -e

# IB_GATEWAY_VERSION must match the directory under /opt/ibgateway that the
# Docker build populated (e.g. /opt/ibgateway/10.19.2g/jars/...). IBC reads
# the first arg and appends `/jars` to `--tws-path` + arg to find the jars.
# If the env var is missing, IBC will search for a literal "stable" folder
# and fail with "Offline TWS/Gateway version stable is not installed".
: "${IB_GATEWAY_VERSION:?IB_GATEWAY_VERSION env var is required (must match the installed version dir under /opt/ibgateway)}"
: "${ACCOUNT_MODE:=paper}"

# Ensure X display is ready
while ! xdpyinfo -display :1 >/dev/null 2>&1; do
    echo "Waiting for Xvfb..."
    sleep 1
done

echo "==> Starting IBC with IB Gateway ${IB_GATEWAY_VERSION} in ${ACCOUNT_MODE} mode"

# IBC launches IB Gateway and handles the login dialog
exec /opt/ibc/scripts/ibcstart.sh \
    "${IB_GATEWAY_VERSION}" \
    --gateway \
    --mode="${ACCOUNT_MODE}" \
    --ibc-ini=/home/trader/ibc.ini \
    --ibc-path=/opt/ibc \
    --tws-path=/opt/ibgateway \
    --tws-settings-path=/home/trader/ibgateway-settings
