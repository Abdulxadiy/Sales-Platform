"""Verify the CI artifact before its installer is published to production."""

import hashlib
import json
import re
import sys
from pathlib import Path


def verify(folder, expected_commit=None):
    folder = Path(folder)
    feed = json.loads((folder / "downloads/releases.json").read_text(encoding="utf-8-sig"))
    manifest = json.loads((folder / "ilbi/release/desktop-build-manifest.json").read_text(encoding="utf-8-sig"))
    release = feed["windows"]
    name = f"ILBI-Setup-{manifest['version']}-x64.exe"
    if expected_commit and (not re.fullmatch(r"[a-f0-9]{40}", expected_commit)
                            or manifest.get("sourceCommit") != expected_commit
                            or release.get("sourceCommit") != expected_commit):
        raise ValueError("The installer does not match the tested source commit")
    relative = (expected_commit + "/" if expected_commit else "") + name
    if (release["url"] != "/downloads/" + relative or release["version"] != manifest["version"]
            or manifest.get("nativeWindowsServiceVerified") is not True):
        raise ValueError("The installer version or native Windows verification is invalid")
    installer = folder / "downloads" / relative
    with installer.open("rb") as stream:
        checksum = hashlib.file_digest(stream, "sha256").hexdigest()
    if (checksum != release["sha256"] or checksum != manifest["sha256"]
            or installer.stat().st_size != release["bytes"]
            or installer.stat().st_size != manifest["installerBytes"]):
        raise ValueError("Public installer integrity check failed")
    return name


if __name__ == "__main__":
    print("Verified Windows download:", verify(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
