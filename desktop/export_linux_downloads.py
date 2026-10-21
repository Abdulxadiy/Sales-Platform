"""Export the verified native Linux artifact without modifying the Windows feed."""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-id", required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "desktop/downloads")
    args = parser.parse_args()
    built = ROOT / "desktop/ilbi/release-linux"
    manifest = json.loads((built / "linux-build-manifest.json").read_text())
    if not re.fullmatch(r"[a-f0-9]{40}", args.release_id) or manifest.get("sourceCommit") != args.release_id or manifest.get("nativeLinuxVerified") is not True:
        raise ValueError("A natively verified Linux build from this commit is required")
    version = json.loads((ROOT / "desktop/ilbi/package.json").read_text())["version"]
    name = f"ILBI-{version}-linux-x64.tar.gz"
    artifact = built / name
    with artifact.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if manifest["version"] != version or manifest["artifact"] != name or digest != manifest["sha256"] or artifact.stat().st_size != manifest["bytes"]:
        raise ValueError("Linux artifact checksum, size or version mismatch")
    directory = args.output / args.release_id
    directory.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(artifact, directory / name)
    release = {"version": version, "sourceCommit": args.release_id, "url": f"/downloads/{args.release_id}/{name}", "bytes": manifest["bytes"], "sha256": digest, "channel": "preview"}
    release['buildTimestamp'] = manifest.get('buildTimestamp', 0)
    (args.output / "releases-linux.json").write_text(json.dumps({"schema": 1, "linux": release}, indent=2) + "\n")
    print("Exported", name)


if __name__ == "__main__":
    main()
