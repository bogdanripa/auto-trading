FROM eclipse-temurin:17-jre-jammy

# Install Python 3.11, supervisord, IBC dependencies.
# x11-utils provides xdpyinfo, which start-ibgateway.sh uses to poll
# whether Xvfb is ready before launching the IB Gateway JVM.
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    supervisor \
    wget unzip curl \
    xvfb x11-utils libxtst6 libxrender1 libxi6 \
    socat \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -s /bin/bash trader
WORKDIR /home/trader

# Install IB Gateway (stable channel).
# IMPORTANT: do NOT swallow failures here — if the installer doesn't produce
# /opt/ibgateway, start.sh will blow up later with a confusing chown error.
#
# The installer is an IzPack self-extracting shell script; `-q` runs it in
# unattended mode, and piping `yes ''` answers every prompt with the default.
# We don't mix in `-c` (console mode) — combined with `-q` it becomes
# interactive in unpredictable ways on some installer builds.
RUN set -eux \
    && wget --progress=dot:giga \
       "https://download2.interactivebrokers.com/installers/ibgateway/stable-standalone/ibgateway-stable-standalone-linux-x64.sh" \
       -O /tmp/ibgateway-installer.sh \
    && chmod +x /tmp/ibgateway-installer.sh \
    && yes '' | /tmp/ibgateway-installer.sh -q -dir /opt/ibgateway \
    && rm /tmp/ibgateway-installer.sh \
    && test -d /opt/ibgateway \
    && test -f /opt/ibgateway/ibgateway \
    && ls -la /opt/ibgateway | head -20

# Install IBC (IB Controller) for automated login.
# IBC's zip layout is `scripts/*.sh` (Gateway/TWS wrappers) plus some top-level
# helpers. Recursive chmod so `ibcstart.sh` (under scripts/) is executable;
# otherwise start-ibgateway.sh exits 126 on the first exec and supervisord
# burns through its restart budget in seconds.
ENV IBC_VERSION=3.20.0
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
