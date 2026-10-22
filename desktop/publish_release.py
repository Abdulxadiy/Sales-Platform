"""Publish verified CI binaries after deployment; published releases are immutable."""

import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

from release_version import ROOT, check
from verify_downloads import verify as verify_windows
from verify_linux_downloads import verify as verify_linux


class GitHub:
    def __init__(self, repository):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
            raise ValueError("Invalid GitHub repository")
        self.repository = repository

    def api(self, path, method="GET", payload=None, missing=False):
        command = ["gh", "api", f"repos/{self.repository}/{path}", "--method", method]
        if payload is not None:
            command += ["--input", "-"]
        result = subprocess.run(command, input=json.dumps(payload) if payload is not None else None,
                                capture_output=True, text=True, timeout=120, check=False)
        if result.returncode:
            if missing and "(HTTP 404)" in result.stderr:
                return None
            raise RuntimeError(result.stderr.strip() or "GitHub request failed")
        return json.loads(result.stdout) if result.stdout.strip() else None

    def upload(self, tag, path):
        subprocess.run(["gh", "release", "upload", tag, str(path), "--repo", self.repository], check=True, timeout=600)


def tag_commit(github, tag):
    ref = github.api(f"git/ref/tags/{tag}", missing=True)
    if ref is None:
        return None
    obj = ref["object"]
    for _ in range(5):
        if obj["type"] == "commit":
            return obj["sha"]
        if obj["type"] != "tag":
            break
        obj = github.api(f"git/tags/{obj['sha']}")["object"]
    raise ValueError("Release tag must resolve to a commit")


def prepare(folder, commit, root=ROOT):
    folder, root = Path(folder), Path(root)
    version = check(root)
    names = [verify_windows(folder, commit), verify_linux(folder, commit)]
    feed = json.loads((folder / "downloads/releases.json").read_text())
    if any(feed[platform]["version"] != version for platform in ("windows", "linux")):
        raise ValueError("Release packages must match the application version")
    assets = [folder / "downloads" / commit / name for name in names]
    output = folder / "github-release"
    output.mkdir(exist_ok=True)
    sums = output / "SHA256SUMS.txt"
    sums.write_text("".join(f"{feed[platform]['sha256']}  {name}\n" for platform, name in zip(("windows", "linux"), names)))
    manifest = output / "release-manifest.json"
    manifest.write_text(json.dumps({"version": version, "sourceCommit": commit,
                                   **{platform: feed[platform] for platform in ("windows", "linux")}}, indent=2) + "\n")
    assets += [sums, manifest]
    preview = "-" in version or any(feed[platform].get("channel") == "preview" for platform in ("windows", "linux"))
    return version, assets, preview


def verify_assets(release, assets):
    uploaded = {asset["name"]: asset for asset in release["assets"]}
    for path in assets:
        with path.open("rb") as source:
            digest = hashlib.file_digest(source, "sha256").hexdigest()
        asset = uploaded.get(path.name)
        if not asset or asset.get("state") != "uploaded" or asset["size"] != path.stat().st_size or asset.get("digest") != f"sha256:{digest}":
            raise ValueError(f"GitHub asset is missing or has a different checksum: {path.name}")


def publish(folder, commit, github, root=ROOT):
    version = check(root)
    tag = f"v{version}"
    existing = github.api(f"releases/tags/{tag}", missing=True)
    if existing and not existing["draft"]:
        print(f"Release {tag} already published; keeping its original files: {existing['html_url']}")
        return existing
    version, assets, preview = prepare(folder, commit, root)
    target = tag_commit(github, tag)
    if target is not None and target != commit:
        raise ValueError("Existing release tag points to a different commit; choose a new version")
    if existing and existing["target_commitish"] != commit:
        raise ValueError("An unfinished release belongs to another build; choose a new version")
    notes = (Path(root) / "docs/releases" / f"{tag}.md").read_text()
    notes += f"\n\nBuild: `{commit}`. Windows va Linux paketlari aynan shu commit uchun CI’da tekshirilgan.\n"
    if not existing:
        existing = github.api("releases", "POST", {"tag_name": tag, "target_commitish": commit,
                               "name": f"ILBI {tag}", "body": notes, "draft": True, "prerelease": preview})
    else:
        github.api(f"releases/{existing['id']}", "PATCH", {"body": notes, "prerelease": preview})
    current = github.api(f"releases/{existing['id']}")
    uploaded = {asset["name"]: asset for asset in current["assets"]}
    for path in assets:
        if path.name in uploaded:
            if uploaded[path.name].get("state") == "starter":
                github.api(f"releases/assets/{uploaded[path.name]['id']}", "DELETE")
                github.upload(tag, path)
            else:
                verify_assets(current, [path])
        else:
            github.upload(tag, path)
    current = github.api(f"releases/{existing['id']}")
    verify_assets(current, assets)
    released = github.api(f"releases/{existing['id']}", "PATCH",
                          {"draft": False, "prerelease": preview, "make_latest": "false" if preview else "true"})
    if tag_commit(github, tag) != commit or released["draft"]:
        raise ValueError("Published release identity could not be verified")
    print("Published:", released["html_url"])
    return released


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("commit")
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY"))
    args = parser.parse_args()
    publish(args.folder, args.commit, GitHub(args.repository or ""))
