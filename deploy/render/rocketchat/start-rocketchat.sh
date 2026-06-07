#!/bin/sh
set -eu

MONGO_HOST="${MONGO_HOST:?MONGO_HOST is required}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB_NAME="${MONGO_DB_NAME:-rocketchat}"
MONGO_REPLICA_SET="${MONGO_REPLICA_SET:-rs0}"

export MONGO_URL="${MONGO_URL:-mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}?replicaSet=${MONGO_REPLICA_SET}}"
export MONGO_OPLOG_URL="${MONGO_OPLOG_URL:-mongodb://${MONGO_HOST}:${MONGO_PORT}/local?replicaSet=${MONGO_REPLICA_SET}}"
export OVERWRITE_SETTING_Site_Name="${BRAND_NAME:-Denuel Chat}"
export OVERWRITE_SETTING_Site_Url="${ROOT_URL:-https://chat.denuelchat.com}"
export SETTINGS_BLOCKED="Site_Name,Site_Url"

exec node main.js
