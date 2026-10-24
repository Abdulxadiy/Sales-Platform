#!/bin/sh
set -eu
if ! sha256sum -c node_modules/.ilbi-dependencies.sha256 >/dev/null 2>&1; then
  echo "Syncing mobile dependencies..."
  npm ci --no-audit --no-fund
  sha256sum package.json package-lock.json > node_modules/.ilbi-dependencies.sha256
fi
exec node scripts/dev-server.mjs
