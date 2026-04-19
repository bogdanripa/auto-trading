FROM eclipse-temurin:17-jre-jammy

# Install Python 3.11, supervisord, IBC dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    supervisor \
    wget unzip curl \
    xvfb libxtst6 libxrender1 libxi6 \
    socat \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -s /bin/bash trader
WORKDIR /home/trader

# Install IB Gateway (stable version)
# Note: IBKR requires downloading the installer. We use the "latest stable" URL.
# For production, pin to a specific version.
ENV IB_GATEWAY_VERSION=10.19.2g
RUN wget -q https://download2.interactivebrokers.com/installers/ibgateway/stable-standalone/ibgateway-stable-standalone-linux-x64.sh \
    -O /tmp/ibgateway-installer.sh \
    && chmod +x /tmp/ibgateway-installer.sh \
    && echo "n" | /tmp/ibgateway-installer.sh -c -q -dir /opt/ibgateway \
    || true

# Install IBC (IB Controller) for automated login
ENV IBC_VERSION=3.20.0
RUN wget -q https://github.com/IbcAlpha/IBC/releases/download/${IBC_VERSION}/IBCLinux-${IBC_VERSION}.zip \
    -O /tmp/ibc.zip \
    && unzip -q /tmp/ibc.zip -d /opt/ibc \
    && chmod +x /opt/ibc/*.sh

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
