#!/bin/sh
set -eu

DBPATH="${MONGO_DBPATH:-/data/db}"
PORT="${MONGO_PORT:-27017}"
REPLICA_SET="${MONGO_REPLICA_SET:-rs0}"
ADVERTISED_HOST="${MONGO_ADVERTISED_HOST:-denuel-mongo}"

mkdir -p "$DBPATH"

mongod --bind_ip_all --port "$PORT" --dbpath "$DBPATH" --replSet "$REPLICA_SET" &
MONGOD_PID=$!

cleanup() {
  kill "$MONGOD_PID" 2>/dev/null || true
}

trap cleanup INT TERM

until mongosh --host 127.0.0.1 --port "$PORT" --quiet --eval "db.adminCommand({ ping: 1 }).ok" >/dev/null 2>&1; do
  sleep 2
done

mongosh --host 127.0.0.1 --port "$PORT" --quiet <<EOF
try {
  rs.status()
} catch (error) {
  rs.initiate({
    _id: '${REPLICA_SET}',
    members: [{ _id: 0, host: '${ADVERTISED_HOST}:${PORT}' }],
  })
}
EOF

wait "$MONGOD_PID"
