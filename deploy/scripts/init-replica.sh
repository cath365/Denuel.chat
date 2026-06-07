#!/bin/bash
set -euo pipefail

MONGO_URI="mongodb://mongo:27017/admin"

until mongosh "$MONGO_URI" --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; do
  sleep 2
done

mongosh "$MONGO_URI" --quiet <<'EOF'
try {
  rs.status();
} catch (error) {
  rs.initiate({
    _id: 'rs0',
    members: [{ _id: 0, host: 'mongo:27017' }],
  });
}
EOF

until mongosh "$MONGO_URI" --quiet --eval "db.hello().isWritablePrimary" | grep true >/dev/null 2>&1; do
  sleep 2
done
