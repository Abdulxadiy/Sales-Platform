#!/usr/bin/env python3
"""Install a user-owned systemd timer for source-code backups."""

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
Description=Back up Sales Platform source to GitHub

[Service]
Type=oneshot
WorkingDirectory={str(root).replace("%", "%%")}
ExecStart=/usr/bin/python3 {quoted(root / "scripts/commit_queue.py")} backup
Environment=GIT_TERMINAL_PROMPT=0
TimeoutStartSec=10min
"""


def main():
    root = Path(__file__).resolve().parents[1]
    directory = Path.home() / ".config/systemd/user"
    directory.mkdir(parents=True, exist_ok=True)
    service = service_contents(root)
    timer = """[Unit]
Description=Back up saved Sales Platform code every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true
RandomizedDelaySec=30s
Unit=inventra-source-backup.service

[Install]
WantedBy=timers.target
"""
    (directory / "inventra-source-backup.service").write_text(service)
    (directory / "inventra-source-backup.timer").write_text(timer)
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(
        ["systemctl", "--user", "enable", "--now", "inventra-source-backup.timer"],
        check=True,
    )
    subprocess.run(
        [
            "systemctl",
            "--user",
            "list-timers",
            "inventra-source-backup.timer",
            "--no-pager",
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
