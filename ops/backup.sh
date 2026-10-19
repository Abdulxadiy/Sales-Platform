#!/usr/bin/env bash
# Encrypted DB/media/docs snapshot; writers resume on success or failure.
set -euo pipefail
cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.."

backup_data() (
    mapfile -t active < <(./ops/compose.sh ps --status running --services |
        grep -E '^(ilbi|celery_worker|celery_beat|bot)$' || true)
    restore_writers() {
        if ((${#active[@]})); then
            ./ops/compose.sh start --wait --wait-timeout 240 "${active[@]}"
        fi
    }
    trap restore_writers EXIT
    if ((${#active[@]})); then
        ./ops/compose.sh stop "${active[@]}"
    fi
    python3 scripts/data_backup.py create \
        --config /etc/ilbi-backup/config.json \
        --output-dir /srv/ilbi-backups \
        --passphrase-file /etc/ilbi-backup/passphrase --writers-stopped
)

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    exec 9>.operations.lock
    flock -n 9 || { echo 'Another deployment or backup is running.' >&2; exit 1; }
    backup_data
fi
