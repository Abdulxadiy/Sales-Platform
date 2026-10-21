#!/usr/bin/env python3
"""Install the continuous saved-source publisher for the current Linux user."""

import argparse
import os
import shutil
import subprocess
from pathlib import Path


def quoted(value):
    return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"').replace("%", "%%") + '"'


def service_contents(root, search_path):
    return f"""[Unit]
Description=Publish saved ILBI source directly to main
After=network-online.target

[Service]
Type=simple
WorkingDirectory={quoted(root)}
ExecStart=/usr/bin/python3 {quoted(root / 'scripts/auto_publish.py')} watch
Environment=GIT_TERMINAL_PROMPT=0
Environment={quoted('PATH=' + search_path)}
Restart=always
RestartSec=10
TimeoutStopSec=190
UMask=0077

[Install]
WantedBy=default.target
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if not args.no_activate and not (root / ".auto-publish-local/state.json").exists():
        parser.error("Initialize once with scripts/auto_publish.py once --initialize --align first.")
    folder = args.output_dir or Path.home() / ".config/systemd/user"
    folder.mkdir(parents=True, exist_ok=True)
    # systemd does not inherit the interactive shell's PATH (gh may be in ~/.local/bin).
    search_path = os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin")
    if not shutil.which("gh", path=search_path):
        parser.error("GitHub CLI (gh) is required; authenticate with gh auth login.")
    (folder / "ilbi-auto-publish.service").write_text(service_contents(root, search_path))
    if args.no_activate:
        print(f"Prepared {folder / 'ilbi-auto-publish.service'}")
        return
    for prefix in ("ilbi-source-backup", "inventra-source-backup"):
        subprocess.run(["systemctl", "--user", "disable", "--now", prefix + ".timer"], check=False, capture_output=True)
        subprocess.run(["systemctl", "--user", "stop", prefix + ".service"], check=False, capture_output=True)
        for kind in ("service", "timer"):
            (folder / f"{prefix}.{kind}").unlink(missing_ok=True)
    subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "--user", "enable", "--now", "ilbi-auto-publish.service"], check=True)
    print("Saved source now publishes directly to main; CI controls production deployment.")


if __name__ == "__main__":
    main()
