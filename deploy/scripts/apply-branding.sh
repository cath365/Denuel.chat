#!/bin/bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required"
  exit 1
fi

ROOT_URL="${ROOT_URL:-https://chat.denuelchat.com}"
BRAND_NAME="${BRAND_NAME:-Denuel Chat}"
RC_ADMIN_USER="${RC_ADMIN_USER:-admin}"
RC_ADMIN_PASSWORD="${RC_ADMIN_PASSWORD:-}"
ASSET_DIR="${ASSET_DIR:-$(cd "$(dirname "$0")/.." && pwd)/assets}"

if [ -z "$RC_ADMIN_PASSWORD" ]; then
  echo "Set RC_ADMIN_PASSWORD before running this script"
  exit 1
fi

LOGIN_RESPONSE=$(
  curl -sS \
    -H 'Content-Type: application/json' \
    -d "{\"user\":\"${RC_ADMIN_USER}\",\"password\":\"${RC_ADMIN_PASSWORD}\"}" \
    "${ROOT_URL}/api/v1/login"
)

AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.authToken')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.userId')

if [ "$AUTH_TOKEN" = "null" ] || [ "$USER_ID" = "null" ]; then
  echo "Failed to log in as admin"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

curl -sS -X POST \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -H "X-User-Id: ${USER_ID}" \
  -H 'Content-Type: application/json' \
  -d "{\"value\":\"${BRAND_NAME}\"}" \
  "${ROOT_URL}/api/v1/settings/Site_Name" >/dev/null

curl -sS -X POST \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -H "X-User-Id: ${USER_ID}" \
  -H 'Content-Type: application/json' \
  -d "{\"value\":\"${ROOT_URL}\"}" \
  "${ROOT_URL}/api/v1/settings/Site_Url" >/dev/null

curl -sS -X POST \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -H "X-User-Id: ${USER_ID}" \
  -F "asset=@${ASSET_DIR}/logo.svg;type=image/svg+xml" \
  -F 'assetName=logo' \
  -F 'refreshAllClients=true' \
  "${ROOT_URL}/api/v1/assets.setAsset" >/dev/null

curl -sS -X POST \
  -H "X-Auth-Token: ${AUTH_TOKEN}" \
  -H "X-User-Id: ${USER_ID}" \
  -F "asset=@${ASSET_DIR}/favicon.svg;type=image/svg+xml" \
  -F 'assetName=favicon' \
  -F 'refreshAllClients=true' \
  "${ROOT_URL}/api/v1/assets.setAsset" >/dev/null

echo "Applied Denuel Chat branding to ${ROOT_URL}"
