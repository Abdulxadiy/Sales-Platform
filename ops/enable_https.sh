#!/usr/bin/env bash
# Run on the server after the domain's A record points here and port 80 is public.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
public_host=$(sed -n 's/^PUBLIC_HOST=//p' .env.production)
expected_ip=$(sed -n 's/^EXPECTED_PUBLIC_IPV4=//p' .env.production)
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
sudo -n true
./ops/compose.sh stop frontend
trap './ops/compose.sh up -d --no-build frontend >/dev/null || true' EXIT
sudo certbot certonly --standalone --non-interactive --agree-tos \
    --register-unsafely-without-email --preferred-challenges http \
    -d "$public_host" --deploy-hook "$(pwd)/ops/renew_tls.sh" \
    --pre-hook "$(pwd)/ops/certbot_frontend_hook.sh stop" \
    --post-hook "$(pwd)/ops/certbot_frontend_hook.sh start"
sudo ./ops/renew_tls.sh
python3 - <<'PY'
from pathlib import Path

path = Path('.env.production')
lines = path.read_text().splitlines()
lines = [line for line in lines if not line.startswith('EDGE_BIND_ADDRESS=')]
path.write_text('\n'.join([*lines, 'EDGE_BIND_ADDRESS=0.0.0.0', '']))
path.chmod(0o600)
PY
./ops/compose.sh up -d --no-build --wait --wait-timeout 240 frontend
trap - EXIT
curl --fail --silent --show-error --resolve "$public_host:443:127.0.0.1" \
    "https://$public_host/" -o /dev/null
sudo systemctl enable --now certbot.timer
printf 'HTTPS enabled: https://%s\n' "$public_host"
