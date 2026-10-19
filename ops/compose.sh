#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
exec docker compose --env-file .env.production -f docker-compose.prod.yml "$@"
