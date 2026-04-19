#!/bin/bash
# Deploy IBKR Gateway to Google Cloud Run
#
# Prerequisites:
#   - gcloud CLI installed and authenticated: gcloud auth login
#   - Project created and billing enabled
#   - APIs enabled: run.googleapis.com, artifactregistry.googleapis.com, secretmanager.googleapis.com
#   - Secrets created in Secret Manager (see README)

set -e

# ============================================================
# CONFIGURATION — edit these for your setup
# ============================================================
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="europe-west1"  # Belgium — closest to IBKR Ireland
MODE="${1:-paper}"     # paper | live (pass as first arg)

if [[ "$MODE" != "paper" && "$MODE" != "live" ]]; then
    echo "Usage: $0 [paper|live]"
    exit 1
fi

SERVICE_NAME="ibkr-gateway-${MODE}"
IMAGE_REPO="europe-west1-docker.pkg.dev/${PROJECT_ID}/trading/${SERVICE_NAME}"
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_URI="${IMAGE_REPO}:${IMAGE_TAG}"

echo "==> Deploying ${SERVICE_NAME} to ${REGION}"
echo "==> Image: ${IMAGE_URI}"

# ============================================================
# BUILD & PUSH
# ============================================================
gcloud builds submit \
    --tag "${IMAGE_URI}" \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    .

# ============================================================
# DEPLOY TO CLOUD RUN
# ============================================================
# min-instances=1 keeps container always-warm (critical for gateway session)
# max-instances=1 prevents multiple gateway sessions fighting each other
# cpu-boost and startup-cpu-boost help the gateway cold-start
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_URI}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --platform managed \
    --allow-unauthenticated \
    --min-instances 1 \
    --max-instances 1 \
    --memory 2Gi \
    --cpu 1 \
    --cpu-boost \
    --timeout 3600 \
    --port 8080 \
    --set-env-vars "ACCOUNT_MODE=${MODE},IB_PORT=$([ "$MODE" = "live" ] && echo 4001 || echo 4002)" \
    --set-secrets "AUTH_TOKEN=trading-auth-token-${MODE}:latest" \
    --set-secrets "IB_USERNAME=ibkr-username-${MODE}:latest" \
    --set-secrets "IB_PASSWORD=ibkr-password-${MODE}:latest"

# ============================================================
# SHOW SERVICE URL
# ============================================================
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format 'value(status.url)')

echo ""
echo "==> Deployed successfully"
echo "==> Service URL: ${SERVICE_URL}"
echo ""
echo "Test it with:"
echo "  curl -H \"Authorization: Bearer \$AUTH_TOKEN\" ${SERVICE_URL}/health"
echo ""
