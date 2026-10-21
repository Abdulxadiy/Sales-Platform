"""Verify the CI artifact before its installer is published to production."""

import hashlib
import json
import sys
from pathlib import Path


def verify(folder):
    folder = Path(folder)
    feed = json.loads((folder / "downloads/releases.json").read_text(encoding="utf-8-sig"))
    manifest = json.loads((folder / "ilbi/release/desktop-build-manifest.json").read_text(encoding="utf-8-sig"))
    release = feed["windows"]
    name = f"ILBI-Setup-{manifest['version']}-x64.exe"
    if (release["url"] != "/downloads/" + name or release["version"] != manifest["version"]
            or manifest.get("nativeWindowsServiceVerified") is not True):
        raise ValueError("The installer version or native Windows verification is invalid")
    installer = folder / "downloads" / name
    with installer.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    if (checksum != release["sha256"] or checksum != manifest["sha256"]
            or installer.stat().st_size != release["bytes"]
            or installer.stat().st_size != manifest["installerBytes"]):
        raise ValueError("Public installer integrity check failed")
    return name


if __name__ == "__main__":
    print("Verified Windows download:", verify(sys.argv[1]))
