FROM eclipse-temurin:17-jre-jammy

# Install Python 3.11, supervisord, IBC dependencies.
# x11-utils provides xdpyinfo, which start-ibgateway.sh uses to poll
# whether Xvfb is ready before launching the IB Gateway JVM.
# Swing/AWT + IB Gateway UI dependencies. eclipse-temurin:17-jre-jammy is
# Ubuntu 22.04, which ships a much thinner X11 baseline than 24.04 — so we
# need to install the libs IB Gateway's Swing UI and jxbrowser component
# expect, plus fonts for text rendering. Without these, `ibgateway` starts
# but silently fails to render the login dialog; IBC times out after
# LoginDialogDisplayTimeout seconds with exit code 1112.
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    supervisor \
    wget unzip curl \
    xvfb x11-utils \
    libxtst6 libxrender1 libxi6 libxext6 \
    libxrandr2 libxcomposite1 libxdamage1 libxfixes3 libxcursor1 \
    libnss3 libasound2 libgbm1 libxkbcommon0 libxshmfence1 \
    libgtk-3-0 libpango-1.0-0 libcairo2 \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    fonts-dejavu-core fonts-liberation \
    socat \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -s /bin/bash trader
WORKDIR /home/trader

# Install IB Gateway — MUST be the OFFLINE/STANDALONE build (pinned version).
# IBC refuses to run against the auto-updating "stable" build; it logs:
#   "Offline TWS/Gateway version <X> is not installed: can't find jars folder"
# and exits 4.
#
# IBKR currently only hosts the auto-updating installer on their own CDN
# (the path /installers/ibgateway/*-standalone/ibgateway-<version>-*.sh
# returns 404 for every pinned version). The community-maintained mirror
# at github.com/gnzsnz/ib-gateway-docker releases offline-build tarballs as
# GitHub release assets — that's what we pull from.
#
# IBC 3.x's ibcstart.sh computes gateway_program_path as
# `${tws-path}/ibgateway/${version}` — note the literal `ibgateway/`
# segment between tws-path and the versioned dir. If we install anywhere
# else, IBC falls back to looking for `tws.vmoptions` and exits 7 with
# "Neither tws.vmoptions nor ibgateway.vmoptions could be found".
# So: install at /opt/ibgateway/ibgateway/${IB_GATEWAY_VERSION}, and pass
# --tws-path=/opt/ibgateway to IBC (the child dir is implicit).
#
# To bump versions: check https://github.com/gnzsnz/ib-gateway-docker/releases
# for the latest `ibgateway-stable@<ver>` tag, then update the env var +
# the URL (note the literal '@' must be URL-encoded as %40).
ENV IB_GATEWAY_VERSION=10.37.1q
ENV IB_GATEWAY_RELEASE_CHANNEL=stable
RUN set -eux \
    && wget --progress=dot:giga \
       "https://github.com/gnzsnz/ib-gateway-docker/releases/download/ibgateway-${IB_GATEWAY_RELEASE_CHANNEL}%40${IB_GATEWAY_VERSION}/ibgateway-${IB_GATEWAY_VERSION}-standalone-linux-x64.sh" \
       -O /tmp/ibgateway-installer.sh \
    && chmod +x /tmp/ibgateway-installer.sh \
    && mkdir -p /opt/ibgateway \
    && yes '' | /tmp/ibgateway-installer.sh -q -dir "/opt/ibgateway/ibgateway/${IB_GATEWAY_VERSION}" \
    && rm /tmp/ibgateway-installer.sh \
    && test -d "/opt/ibgateway/ibgateway/${IB_GATEWAY_VERSION}/jars" \
    && echo "IB Gateway ${IB_GATEWAY_VERSION} installed:" \
    && ls -la "/opt/ibgateway/ibgateway/${IB_GATEWAY_VERSION}" \
    && ls "/opt/ibgateway/ibgateway/${IB_GATEWAY_VERSION}/jars" | head -5

# Install IBC (IB Controller) for automated login.
# IBC's zip layout is `scripts/*.sh` (Gateway/TWS wrappers) plus some top-level
# helpers. Recursive chmod so `ibcstart.sh` (under scripts/) is executable;
# otherwise start-ibgateway.sh exits 126 on the first exec and supervisord
# burns through its restart budget in seconds.
ENV IBC_VERSION=3.23.0
RUN set -eux \
    && wget -q "https://github.com/IbcAlpha/IBC/releases/download/${IBC_VERSION}/IBCLinux-${IBC_VERSION}.zip" \
       -O /tmp/ibc.zip \
    && unzip -q /tmp/ibc.zip -d /opt/ibc \
    && find /opt/ibc -type f -name '*.sh' -exec chmod +x {} + \
    && test -x /opt/ibc/scripts/ibcstart.sh \
    && rm /tmp/ibc.zip

# Copy Python application
COPY app/ /app/
COPY scripts/ /scripts/
COPY config/ /config/

# Install Python dependencies
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Supervisord config (runs IB Gateway + FastAPI together)
COPY config/supervisord.conf /etc/supervisor/conf.d/ibkr-gateway.conf

# Health check and startup
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["/scripts/start.sh"]
