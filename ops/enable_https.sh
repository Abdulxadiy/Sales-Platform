#!/usr/bin/env bash
# Run on the server after the domain's A record points here and port 80 is public.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
exec 9>.operations.lock
flock -n 9 || { echo 'Another deployment or backup is running.' >&2; exit 1; }
public_host=$(sed -n 's/^PUBLIC_HOST=//p' .env.production)
expected_ip=$(sed -n 's/^EXPECTED_PUBLIC_IPV4=//p' .env.production)
original_bind=$(sed -n 's/^EDGE_BIND_ADDRESS=//p' .env.production)
[[ "$original_bind" == 127.0.0.1 || "$original_bind" == 0.0.0.0 ]] || exit 1
[[ "$public_host" =~ ^[a-z0-9][a-z0-9.-]+[a-z0-9]$ ]] || exit 1
python3 - "$public_host" "$expected_ip" <<'PY'
import ipaddress
import socket
import sys

host, expected = sys.argv[1:]
ipaddress.IPv4Address(expected)
addresses = set(socket.gethostbyname_ex(host)[2])
if addresses != {expected}:
    raise SystemExit(f"DNS is not ready: {host} must resolve only to {expected}.")
PY
set_edge_bind() {
    python3 - "$1" <<'PY'
import os
import sys
import tempfile
from pathlib import Path

path = Path('.env.production')
lines = [line for line in path.read_text().splitlines() if not line.startswith('EDGE_BIND_ADDRESS=')]
with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, prefix='.env.production-', delete=False) as pending:
    pending.write('\n'.join([*lines, f'EDGE_BIND_ADDRESS={sys.argv[1]}', '']))
os.replace(pending.name, path)
PY
}
restore_on_error() {
    status=$?
    if ((status != 0)); then
        if ((binding_changed)); then set_edge_bind "$original_bind" || true; fi
        ./ops/compose.sh up -d --no-build frontend >/dev/null || true
    fi
}
sudo -n true
binding_changed=0
trap restore_on_error EXIT
./ops/compose.sh stop frontend
trap 'exit 130' INT
trap 'exit 143' TERM
sudo certbot certonly --standalone --non-interactive --agree-tos \
    --register-unsafely-without-email --preferred-challenges http \
    -d "$public_host" --deploy-hook "$(pwd)/ops/renew_tls.sh" \
    --pre-hook "$(pwd)/ops/certbot_frontend_hook.sh stop" \
    --post-hook "$(pwd)/ops/certbot_frontend_hook.sh start"
sudo ./ops/renew_tls.sh
# Verify the issued chain and hostname while the bootstrap edge is still private.
./ops/compose.sh up -d --no-build --wait --wait-timeout 240 frontend
curl --fail --silent --show-error --resolve "$public_host:443:127.0.0.1" \
    "https://$public_host/" -o /dev/null
binding_changed=1
set_edge_bind 0.0.0.0
./ops/compose.sh up -d --no-build --wait --wait-timeout 240 frontend
curl --fail --silent --show-error --resolve "$public_host:443:127.0.0.1" \
    "https://$public_host/" -o /dev/null
sudo systemctl enable --now certbot.timer
trap - EXIT
printf 'HTTPS enabled: https://%s\n' "$public_host"
