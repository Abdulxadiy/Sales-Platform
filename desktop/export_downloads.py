"""Export a built installer and atomic public release feed; does not publish remotely."""

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "desktop/downloads")
    parser.add_argument("--channel", choices=["preview", "stable"], default="preview")
    parser.add_argument("--release-id", help="Immutable Git commit directory for CI downloads")
    args = parser.parse_args()
    built = ROOT / "desktop/ilbi/release"
    manifest = json.loads((built / "desktop-build-manifest.json").read_text())
    version = json.loads((ROOT / "desktop/ilbi/package.json").read_text())["version"]
    if manifest["version"] != version:
        raise ValueError("Build version does not match the desktop package")
    if args.release_id and (not re.fullmatch(r"[a-f0-9]{40}", args.release_id)
                            or manifest.get("sourceCommit") != args.release_id):
        raise ValueError("The release directory must match the built source commit")
    name = f"ILBI-Setup-{version}-x64.exe"
    installer = built / name
    with installer.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    if (
        checksum != manifest["sha256"]
        or installer.stat().st_size != manifest["installerBytes"]
    ):
        raise ValueError("Installer checksum or size does not match its build manifest")
    args.output.mkdir(parents=True, exist_ok=True)
    directory = args.output / args.release_id if args.release_id else args.output
    directory.mkdir(parents=True, exist_ok=True)
    staging = directory / (name + ".part")
    shutil.copyfile(installer, staging)
    staging.replace(directory / name)
    feed_path = args.output / "releases.json"
    previous = json.loads(feed_path.read_text()) if feed_path.exists() else {}
    release = {
        "schema": 1,
        "windows": {
            "version": version,
            "url": "/downloads/" + (args.release_id + "/" if args.release_id else "") + name,
            "sourceCommit": args.release_id,
            "bytes": manifest["installerBytes"],
            "sha256": checksum,
            "channel": args.channel,
        },
        "mobile": previous.get("mobile"),
    }
    temporary = feed_path.with_suffix(".json.part")
    temporary.write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(feed_path)
    print(
        json.dumps(
            {
                "exported": name,
                "channel": args.channel,
                "directory": str(args.output),
                "sha256": checksum,
            }
        )
    )


if __name__ == "__main__":
    main()
