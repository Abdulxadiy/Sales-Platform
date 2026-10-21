"""Check the Linux CI artifact, then merge it into the verified pending feed."""
import hashlib
import json
import re
import sys
from pathlib import Path


def verify(folder, commit):
    folder = Path(folder)
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("Invalid source commit")
    manifest = json.loads((folder / "ilbi/release-linux/linux-build-manifest.json").read_text())
    release = json.loads((folder / "downloads/releases-linux.json").read_text())["linux"]
    version = manifest["version"]
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?", version):
        raise ValueError("Invalid version")
    name = f"ILBI-{version}-linux-x64.tar.gz"
    if (manifest.get("sourceCommit") != commit or release.get("sourceCommit") != commit
            or manifest.get("nativeLinuxVerified") is not True or manifest.get("platform") != "linux"
            or manifest.get("arch") != "x64" or manifest.get("artifact") != name
            or release.get("version") != version or release.get("url") != f"/downloads/{commit}/{name}"):
        raise ValueError("Linux verification or release identity is invalid")
    artifact = folder / "downloads" / commit / name
    if artifact.is_symlink() or artifact.parent.is_symlink():
        raise ValueError("Expected a regular Linux archive")
    with artifact.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if digest != manifest["sha256"] or digest != release["sha256"] or artifact.stat().st_size != manifest["bytes"] or artifact.stat().st_size != release["bytes"]:
        raise ValueError("Linux archive integrity check failed")
    path = folder / "downloads/releases.json"
    feed = json.loads(path.read_text())
    if feed.get("schema") != 1 or feed.get("windows", {}).get("sourceCommit") != commit:
        raise ValueError("Linux and Windows builds must come from the same tested commit")
    feed["linux"] = release
    path.write_text(json.dumps(feed, indent=2) + "\n")
    return name


if __name__ == "__main__":
    print("Verified Linux download:", verify(sys.argv[1], sys.argv[2]))
