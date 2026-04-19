#!/bin/bash
# One-time GCP project setup for IBKR Gateway
# Run this once when setting up a new GCP project.

set -e

PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="europe-west1"

echo "==> Setting up GCP project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

echo "==> Enabling required APIs"
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com

echo "==> Creating Artifact Registry repository"
gcloud artifacts repositories create trading \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Trading system containers" \
    || echo "  (repository may already exist, continuing)"

echo ""
echo "==> Next: Create secrets in Secret Manager"
echo ""
echo "For paper trading:"
echo "  echo -n 'your-paper-ibkr-username' | gcloud secrets create ibkr-username-paper --data-file=-"
echo "  echo -n 'your-paper-ibkr-password' | gcloud secrets create ibkr-password-paper --data-file=-"
echo "  openssl rand -hex 32 | gcloud secrets create trading-auth-token-paper --data-file=-"
echo ""
echo "For live trading:"
echo "  echo -n 'your-live-ibkr-username' | gcloud secrets create ibkr-username-live --data-file=-"
echo "  echo -n 'your-live-ibkr-password' | gcloud secrets create ibkr-password-live --data-file=-"
echo "  openssl rand -hex 32 | gcloud secrets create trading-auth-token-live --data-file=-"
echo ""
echo "==> Grant Cloud Run service account access to secrets:"
echo ""
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "  for s in ibkr-username-paper ibkr-password-paper trading-auth-token-paper \\"
echo "           ibkr-username-live ibkr-password-live trading-auth-token-live; do"
echo "    gcloud secrets add-iam-policy-binding \$s \\"
echo "      --member=\"serviceAccount:${SA}\" \\"
echo "      --role=\"roles/secretmanager.secretAccessor\""
echo "  done"
echo ""
echo "==> After that, deploy with:"
echo "  ./scripts/deploy.sh paper"
echo "  ./scripts/deploy.sh live"
