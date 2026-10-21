#!/usr/bin/env python3
"""Publish saved source directly to main; CI gates production deployment."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import time
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_PARTS = {
    ".git", ".commit-queue-local", ".auto-publish-local", ".venv",
    "node_modules", "__pycache__", ".ruff_cache", ".pytest_cache", "media", "staticfiles",
}
TOKEN_PATTERN = re.compile(
    rb"(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|[0-9]{8,12}:[A-Za-z0-9_-]{30,})"
)


class PublishError(Exception):
    pass


def git(root, *args, check=True):
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"}, timeout=180,
    )
    if check and result.returncode:
        raise PublishError(f"git {args[0]} failed: {result.stderr.decode(errors='replace').strip()}")
    return result


def allowed(value):
    path = PurePosixPath(value)
    if (not path.parts or path.is_absolute() or ".." in path.parts
            or path.as_posix() != value or any(c in value for c in "\0\n\r\\")
            or PRIVATE_PARTS.intersection(path.parts)):
        return False
    name = path.name.lower()
    if name.startswith(".env") and name not in {".env.example", ".env.production.example"}:
        return False
    return name not in {
        ".envrc", "credentials", "credentials.json", "id_rsa", "id_ed25519",
        "celerybeat-schedule", "data-backup.config.json", "data-backup.passphrase",
    } and not name.endswith((".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".rdb", ".aof", ".log"))


def source_paths(root):
    listed = git(root, "ls-files", "--cached", "--others", "--exclude-standard", "-z").stdout
    return sorted({p.decode() for p in listed.split(b"\0") if p and allowed(p.decode())})


def signature(root):
    """Cheap save detection; actual contents are verified again before publication."""
    result = []
    for name in source_paths(root):
        try:
            info = (root / name).lstat()
        except (FileNotFoundError, NotADirectoryError):
            continue
        if stat.S_ISDIR(info.st_mode):
            continue
        result.append((name, info.st_mtime_ns, info.st_ctime_ns, info.st_size, info.st_mode))
    return result


def snapshot(root):
    before = signature(root)
    files, contents = {}, {}
    for name, *_ in before:
        path = root / name
        if path.is_symlink():
            if not path.resolve().is_relative_to(root.resolve()):
                raise PublishError(f"External symlink: {name}")
            data, mode = os.readlink(path).encode(), "120000"
        elif path.is_file():
            if path.stat().st_size >= 95 * 1024 * 1024:
                raise PublishError(f"File exceeds GitHub source size limit: {name}")
            data = path.read_bytes()
            mode = "100755" if path.stat().st_mode & 0o111 else "100644"
        else:
            raise PublishError(f"Unsupported source: {name}")
        if TOKEN_PATTERN.search(data):
            raise PublishError(f"Possible credential in {name}; publication stopped.")
        blob = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
        files[name], contents[name] = {"mode": mode, "blob": blob}, data
    if before != signature(root):
        raise PublishError("Files changed during capture; retrying the next saved version.")
    return files, contents


def remote_tree(repo):
    result = {}
    for row in git(repo, "ls-tree", "-rz", "HEAD").stdout.split(b"\0"):
        if not row:
            continue
        info, path = row.split(b"\t", 1)
        mode, kind, blob = info.decode().split()
        if kind != "blob":
            raise PublishError("Submodules are not supported by automatic publication.")
        result[path.decode()] = {"mode": mode, "blob": blob}
    return result


def write_state(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, sort_keys=True) + "\n")
    temporary.replace(path)


def publish(root, settings, *, initialize=False, align=False):
    root = root.resolve()
    folder = root / ".auto-publish-local"
    folder.mkdir(mode=0o700, exist_ok=True)
    with (folder / "lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        state_path = folder / "state.json"
        previous = json.loads(state_path.read_text()) if state_path.exists() else None
        if previous is None and not initialize:
            raise PublishError("Run once --initialize before enabling automatic publication.")
        if previous and previous["remote"] != settings["remote"]:
            raise PublishError("Configured remote changed; inspect the saved publication state.")
        files, contents = snapshot(root)
        old_files = previous["files"] if previous else {}
        changed = {name for name in files.keys() | old_files.keys() if files.get(name) != old_files.get(name)}
        if previous and not changed:
            return {"status": "unchanged", "commit": previous["commit"]}

        # All resets/cleanups are confined to this disposable clone, never the user's files.
        repo = folder / "repository"
        if not repo.exists():
            repo.mkdir()
            git(repo, "init", "--quiet")
            git(repo, "config", "credential.helper", "!gh auth git-credential")
            git(repo, "config", "core.autocrlf", "false")
            git(repo, "config", "commit.gpgsign", "false")
        git(repo, "fetch", "--quiet", "--depth=1", settings["remote"], settings["branch"])
        git(repo, "checkout", "--quiet", "--force", "-B", "publish", "FETCH_HEAD")
        git(repo, "clean", "--quiet", "-fdx")
        main = git(repo, "rev-parse", "HEAD").stdout.decode().strip()
        remote = remote_tree(repo)
        pending_path = folder / "pending.json"
        if pending_path.exists():
            accepted = json.loads(pending_path.read_text())
            if accepted["remote"] == settings["remote"] and accepted["commit"] == main:
                previous = accepted
                changed = {name for name in files.keys() | previous["files"].keys() if files.get(name) != previous["files"].get(name)}
        if previous is None:
            changed = {name for name in files.keys() | remote.keys() if allowed(name) and files.get(name) != remote.get(name)}
        else:
            conflicts = [name for name in changed if remote.get(name) != previous["remote_files"].get(name) and remote.get(name) != files.get(name)]
            if conflicts:
                raise PublishError("Both local and main changed: " + ", ".join(sorted(conflicts)))
        for name in sorted(changed, key=lambda p: (-p.count('/'), p)):
            destination = repo / name
            # Refuse parent symlinks even if they were introduced remotely.
            if any(parent.is_symlink() for parent in destination.parents if parent != repo and parent.is_relative_to(repo)):
                raise PublishError(f"Symlink parent in remote tree: {name}")
            if destination.is_symlink() or destination.is_file():
                destination.unlink()
            elif destination.is_dir():
                shutil.rmtree(destination)
        for name in sorted(changed):
            if name not in files:
                continue
            destination = repo / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            if files[name]["mode"] == "120000":
                destination.symlink_to(contents[name].decode())
            else:
                destination.write_bytes(contents[name])
                destination.chmod(0o755 if files[name]["mode"] == "100755" else 0o644)
        git(repo, "add", "--all", "--force")
        staged = git(repo, "diff", "--cached", "--quiet", check=False).returncode
        if staged not in (0, 1):
            raise PublishError("Unable to inspect staged publication.")
        if staged:
            git(repo, "-c", f"user.name={settings['author_name']}", "-c", f"user.email={settings['author_email']}", "commit", "--quiet", "-m", f"chore: publish saved platform changes ({len(changed)} files)")
        commit = git(repo, "rev-parse", "HEAD").stdout.decode().strip()
        # Save the exact snapshot BEFORE push: a crash after an accepted push is recoverable.
        pending = {"remote": settings["remote"], "files": files, "remote_files": remote_tree(repo), "commit": commit}
        write_state(folder / "pending.json", pending)
        if staged:
            git(repo, "push", settings["remote"], f"HEAD:refs/heads/{settings['branch']}")
        write_state(state_path, pending)
        (folder / "pending.json").unlink(missing_ok=True)
        if align:
            if git(root, "branch", "--show-current").stdout.decode().strip() != settings["branch"]:
                raise PublishError("Publication succeeded; local branch is not main, so HEAD was preserved.")
            git(root, "fetch", settings["remote"], f"{settings['branch']}:refs/remotes/origin/{settings['branch']}")
            if git(root, "rev-parse", "--verify", "refs/auto-publish/initial-head", check=False).returncode:
                git(root, "update-ref", "refs/auto-publish/initial-head", "HEAD")
            git(root, "update-ref", "refs/auto-publish/before-alignment", "HEAD")
            # --mixed preserves ALL working files, including edits saved during the upload.
            git(root, "reset", "--mixed", commit)
        return {"status": "published" if staged else "unchanged", "commit": commit, "files": len(changed), "base": main}


def watch(root, settings):
    observed, since, retry = None, time.monotonic(), 0.0
    while True:
        try:
            current = signature(root)
            now = time.monotonic()
            if current != observed:
                observed, since, retry = current, now, 0.0
            if now - since >= settings["quiet_seconds"] and now >= retry:
                result = publish(root, settings, align=True)
                if result["status"] == "published":
                    print(json.dumps(result), flush=True)
                retry = now + settings["retry_seconds"]
        except (PublishError, OSError, subprocess.SubprocessError) as exc:
            print(f"Publication pending: {exc}", file=sys.stderr, flush=True)
            retry = time.monotonic() + settings["retry_seconds"]
        time.sleep(settings["poll_seconds"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["once", "watch", "status"])
    parser.add_argument("--initialize", action="store_true", help="Publish the complete current source snapshot on first run.")
    parser.add_argument("--align", action="store_true", help="Align local main after saving its previous HEAD; working files are preserved.")
    args = parser.parse_args()
    settings = json.loads((ROOT / "automation/auto-publish.json").read_text())
    if settings["remote"] != "https://github.com/" + settings["repository"] + ".git" or settings["branch"] != "main":
        raise PublishError("Invalid main publication target.")
    if args.command == "status":
        state = ROOT / ".auto-publish-local/state.json"
        value = json.loads(state.read_text()) if state.exists() else {}
        print(json.dumps({"initialized": bool(value), "commit": value.get("commit"), "branch": settings["branch"]}))
    elif args.command == "watch":
        watch(ROOT, settings)
    else:
        print(json.dumps(publish(ROOT, settings, initialize=args.initialize, align=args.align)))


if __name__ == "__main__":
    try:
        main()
    except (PublishError, OSError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
