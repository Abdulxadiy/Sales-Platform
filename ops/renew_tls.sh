#!/usr/bin/env bash
# Certbot deploy hook: copy resolved certificate files into Nginx's read-only mount.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
public_host=$(sed -n 's/^PUBLIC_HOST=//p' .env.production)
tls_dir=$(sed -n 's/^TLS_CERT_DIR=//p' .env.production)
[[ "$public_host" =~ ^[a-z0-9][a-z0-9.-]+[a-z0-9]$ ]] || exit 1
[[ "$tls_dir" == /etc/ilbi/tls ]] || exit 1
lineage="/etc/letsencrypt/live/$public_host"
if [[ -n "${RENEWED_LINEAGE:-}" && "$RENEWED_LINEAGE" != "$lineage" ]]; then
    exit 0
fi
install -m 0644 "$lineage/fullchain.pem" "$tls_dir/fullchain.pem"
install -m 0600 "$lineage/privkey.pem" "$tls_dir/privkey.pem"
if ./ops/compose.sh ps --status running --services | grep -qx frontend; then
    ./ops/compose.sh exec -T frontend nginx -t
    ./ops/compose.sh exec -T frontend nginx -s reload
fi
