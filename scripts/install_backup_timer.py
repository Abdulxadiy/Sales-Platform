#!/usr/bin/env python3
"""Install a user-owned systemd timer for source-code backups."""

import argparse
import shutil
import subprocess
from pathlib import Path


def quoted(value):
    return (
        '"'
        + str(value).replace("\\", "\\\\").replace('"', '\\"').replace("%", "%%")
        + '"'
    )


def service_contents(root):
    return f"""[Unit]
Description=Back up ILBI Platform source to GitHub

[Service]
Type=oneshot
WorkingDirectory={str(root).replace("%", "%%")}
ExecStart=/usr/bin/python3 {quoted(root / "scripts/commit_queue.py")} backup
Environment=GIT_TERMINAL_PROMPT=0
TimeoutStartSec=10min
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, help='Prepare units in another directory.')
    parser.add_argument('--no-activate', action='store_true', help='Only prepare unit files.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    directory = args.output_dir or Path.home() / ".config/systemd/user"
    directory.mkdir(parents=True, exist_ok=True)
    service = service_contents(root)
    timer = """[Unit]
Description=Back up saved ILBI Platform code every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true
RandomizedDelaySec=30s
Unit=ilbi-source-backup.service

[Install]
WantedBy=timers.target
"""
    (directory / "ilbi-source-backup.service").write_text(service)
    (directory / "ilbi-source-backup.timer").write_text(timer)
    if args.no_activate:
        print(f'Prepared ILBI units in {directory}')
        return

    legacy_timer = directory / 'inventra-source-backup.timer'
    legacy_files = [directory / ('inventra-source-backup.' + kind) for kind in ('service', 'timer')]
    if legacy_timer.exists():
        backup = directory / 'ilbi-rebranding-backup'
        backup.mkdir(mode=0o700, exist_ok=True)
        for old in legacy_files:
            if old.exists():
                shutil.copy2(old, backup / old.name)
        subprocess.run(['systemctl', '--user', 'disable', '--now', legacy_timer.name], check=True)
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    try:
        subprocess.run(
            ["systemctl", "--user", "enable", "--now", "ilbi-source-backup.timer"],
            check=True,
        )
    except subprocess.CalledProcessError:
        if legacy_timer.exists():
            subprocess.run(['systemctl', '--user', 'enable', '--now', legacy_timer.name], check=False)
        raise
    for old in legacy_files:
        if old.exists():
            old.unlink()
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(
        [
            "systemctl",
            "--user",
            "list-timers",
            "ilbi-source-backup.timer",
            "--no-pager",
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
