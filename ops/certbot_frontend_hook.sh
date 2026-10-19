#!/usr/bin/env bash
# Standalone ACME renewal needs port 80; restore only a previously running edge.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
marker=/run/ilbi-certbot-frontend-running
case "${1:-}" in
    stop)
        if ./ops/compose.sh ps --status running --services | grep -qx frontend; then
            touch "$marker"
            ./ops/compose.sh stop frontend
        fi
        ;;
    start)
        if [[ -f "$marker" ]]; then
            ./ops/compose.sh up -d --no-build --wait --wait-timeout 240 frontend
            rm "$marker"
        fi
        ;;
    *) exit 2 ;;
esac
