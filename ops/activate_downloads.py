#!/usr/bin/env python3
"""Publish a complete immutable installer only after its application is healthy."""

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path


def activate(directory, staged_feed, commit, *, keep=3):
    directory, staged_feed = Path(directory), Path(staged_feed)
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("Invalid release commit")
    feed = json.loads(staged_feed.read_text())
    release = feed["windows"]
    version = release["version"]
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?", version):
        raise ValueError("Invalid release version")
    name = f"ILBI-Setup-{version}-x64.exe"
    if (feed.get("schema") != 1 or release.get("sourceCommit") != commit
            or release["url"] != f"/downloads/{commit}/{name}"):
        raise ValueError("Release does not match the deployed commit")
    installer = directory / commit / name
    if installer.is_symlink() or installer.parent.is_symlink():
        raise ValueError("Release must contain a regular installer")
    with installer.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != release["sha256"] or installer.stat().st_size != release["bytes"]:
        raise ValueError("Installer integrity verification failed; current feed preserved")
    linux = feed.get("linux")
    if linux is not None:
        linux_name = f"ILBI-{version}-linux-x64.tar.gz"
        if (linux.get("version") != version or linux.get("sourceCommit") != commit
                or linux.get("url") != f"/downloads/{commit}/{linux_name}"):
            raise ValueError("Linux release does not match the deployed commit")
        linux_artifact = directory / commit / linux_name
        if linux_artifact.is_symlink():
            raise ValueError("Linux release must be a regular archive")
        with linux_artifact.open("rb") as stream:
            linux_digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if linux_digest != linux["sha256"] or linux_artifact.stat().st_size != linux["bytes"]:
            raise ValueError("Linux archive integrity verification failed; current feed preserved")
    published = directory / "releases.json"
    if published.exists() and feed.get("mobile") is None:
        previous = json.loads(published.read_text())
        feed["mobile"] = previous.get("mobile")
    temporary = directory / ".releases.json.part"
    temporary.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n")
    temporary.chmod(0o644)
    temporary.replace(published)
    staged_feed.unlink()
    # Keep the active installer plus two recent builds; leave mobile/operator files alone.
    older = sorted(
        (item for item in directory.iterdir() if item.name != commit
         and re.fullmatch(r"[a-f0-9]{40}", item.name) and item.is_dir() and not item.is_symlink()),
        key=lambda item: item.stat().st_mtime_ns, reverse=True,
    )
    for item in older[max(keep - 1, 0):]:
        shutil.rmtree(item)
    return {"commit": commit, "url": release["url"], "sha256": digest}


if __name__ == "__main__":
    print(json.dumps(activate(*sys.argv[1:])))
