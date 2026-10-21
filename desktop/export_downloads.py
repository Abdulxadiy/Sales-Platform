"""Export a built installer and atomic public release feed; does not publish remotely."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "desktop/downloads")
    parser.add_argument("--channel", choices=["preview", "stable"], default="preview")
    args = parser.parse_args()
    built = ROOT / "desktop/ilbi/release"
    manifest = json.loads((built / "desktop-build-manifest.json").read_text())
    version = json.loads((ROOT / "desktop/ilbi/package.json").read_text())["version"]
    if manifest["version"] != version:
        raise ValueError("Build version does not match the desktop package")
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
    staging = args.output / (name + ".part")
    shutil.copyfile(installer, staging)
    staging.replace(args.output / name)
    feed_path = args.output / "releases.json"
    previous = json.loads(feed_path.read_text()) if feed_path.exists() else {}
    release = {
        "schema": 1,
        "windows": {
            "version": version,
            "url": "/downloads/" + name,
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
