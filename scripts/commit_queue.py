#!/usr/bin/env python3
"""Back up real work, queue reviewed file groups, and publish verified batches.

All Git writes happen in temporary clones. The developer's HEAD, index and
working files are never reset, stashed, committed, rebased or force-pushed.
"""

from __future__ import annotations

import argparse
import contextlib
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path, PurePosixPath
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ".github/commit-queue/manifest.json"
STATE = "progress.json"
PROTECTED = {
    "scripts/commit_queue.py",
    "automation/commit-queue.json",
    ".github/workflows/publish-queue.yml",
}
TOKEN_PATTERN = re.compile(
    rb"(?:gh[pousr]_[A-Za-z0-9_]{25,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|[0-9]{8,12}:[A-Za-z0-9_-]{30,})"
)


class QueueError(Exception):
    pass


def run(argv, cwd=None, env=None, check=True):
    result = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=False)
    if check and result.returncode:
        # Git never receives credentials in its URL. Avoid dumping arbitrary
        # file contents or command output from secret scanning.
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise QueueError(f"{argv[0]} failed ({result.returncode}): {detail}")
    return result


def git(repo, *args, check=True, env=None):
    return run(["git", *args], cwd=repo, check=check, env=env)


def output(repo, *args):
    return git(repo, *args).stdout.decode().strip()


def config(root=ROOT):
    settings = json.loads((root / "automation/commit-queue.json").read_text())
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", settings["repository"]):
        raise QueueError("Invalid repository name.")
    expected = f"https://github.com/{settings['repository']}.git"
    if settings["remote"] != expected:
        raise QueueError("Remote must match the configured GitHub repository.")
    for key in ("default_branch", "backup_branch", "queue_branch", "state_branch"):
        run(["git", "check-ref-format", f"refs/heads/{settings[key]}"])
    if "minimum_batch" in settings or "target_per_day" in settings:
        raise QueueError(
            "Daily commit quotas are retired; publish completed reviewed work instead."
        )
    ZoneInfo(settings["timezone"])
    return settings


def path_allowed(value):
    if not isinstance(value, str) or any(char in value for char in ("\0", "\n", "\r")):
        return False
    path = PurePosixPath(value)
    if (
        path.is_absolute()
        or not path.parts
        or ".." in path.parts
        or "\\" in value
        or path.as_posix() != value
    ):
        return False
    if any(
        part
        in {
            ".git",
            ".commit-queue-local",
            ".venv",
            "node_modules",
            "__pycache__",
            ".ruff_cache",
            ".pytest_cache",
            "media",
            "staticfiles",
        }
        for part in path.parts
    ):
        return False
    name = path.name.lower()
    if name.startswith(".env") and name != ".env.example":
        return False
    if name in {
        ".envrc",
        "credentials",
        "credentials.json",
        "id_rsa",
        "id_ed25519",
        "celerybeat-schedule",
    }:
        return False
    return not name.endswith(
        (".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".rdb", ".aof", ".log")
    )


def source_files(root):
    data = git(
        root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"
    ).stdout
    paths = sorted(set(p.decode() for p in data.split(b"\0") if p))
    files = []
    for value in paths:
        if not path_allowed(value):
            continue
        source = root / value
        if not source.exists() and not source.is_symlink():
            continue
        if source.is_symlink():
            if not source.resolve().is_relative_to(root.resolve()):
                raise QueueError(f"External symlink excluded: {value}")
        elif source.is_file():
            if source.stat().st_size >= 95 * 1024 * 1024:
                raise QueueError(f"File is too large for GitHub: {value}")
            if TOKEN_PATTERN.search(source.read_bytes()):
                raise QueueError(
                    f"Possible credential detected in {value}; remove it before uploading."
                )
        else:
            raise QueueError(f"Unsupported tracked path: {value}")
        files.append(value)
    return files


def fingerprint(root, paths):
    digest = hashlib.sha256()
    for value in paths:
        file = root / value
        digest.update(value.encode() + b"\0")
        digest.update(
            os.readlink(file).encode() if file.is_symlink() else file.read_bytes()
        )
        digest.update(b"\0" + str(file.lstat().st_mode & 0o111).encode())
    return digest.hexdigest()


def commit_environment(settings, bot=False):
    env = dict(os.environ)
    env.pop("GIT_AUTHOR_DATE", None)
    env.pop("GIT_COMMITTER_DATE", None)
    env["TZ"] = settings["timezone"]
    env["GIT_AUTHOR_NAME"] = env["GIT_COMMITTER_NAME"] = (
        "github-actions[bot]" if bot else settings["author_name"]
    )
    env["GIT_AUTHOR_EMAIL"] = env["GIT_COMMITTER_EMAIL"] = (
        "41898282+github-actions[bot]@users.noreply.github.com"
        if bot
        else settings["author_email"]
    )
    return env


def configure(repo, settings):
    git(repo, "remote", "set-url", "origin", settings["remote"])
    git(repo, "config", "credential.helper", "!gh auth git-credential")
    git(repo, "config", "core.autocrlf", "false")
    git(repo, "config", "commit.gpgsign", "false")


def fetch(repo):
    git(
        repo,
        "fetch",
        "--prune",
        "--no-tags",
        "origin",
        "+refs/heads/*:refs/remotes/origin/*",
    )


def ref(repo, branch):
    result = git(
        repo, "rev-parse", "--verify", f"refs/remotes/origin/{branch}", check=False
    )
    return result.stdout.decode().strip() if result.returncode == 0 else None


def read_json(repo, sha, name):
    return json.loads(git(repo, "show", f"{sha}:{name}").stdout)


def tree_commit(repo, tree, parents, message, settings, bot=False):
    args = ["commit-tree", tree]
    for parent in dict.fromkeys(p for p in parents if p):
        args += ["-p", parent]
    args += ["-m", message]
    return (
        git(repo, *args, env=commit_environment(settings, bot)).stdout.decode().strip()
    )


def backup(root, settings):
    paths = source_files(root)
    before = fingerprint(root, paths)
    with tempfile.TemporaryDirectory(prefix="ilbi-backup-") as folder:
        repo = Path(folder) / "repository"
        run(["git", "clone", "--quiet", "--no-hardlinks", str(root), str(repo)])
        configure(repo, settings)
        fetch(repo)
        main = ref(repo, settings["default_branch"])
        previous = ref(repo, settings["backup_branch"])
        git(repo, "rm", "-r", "--force", "--quiet", "--ignore-unmatch", ".")
        for value in paths:
            destination = repo / value
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / value, destination, follow_symlinks=False)
        if source_files(root) != paths or fingerprint(root, paths) != before:
            raise QueueError(
                "Files changed during backup; retry after the current save finishes."
            )
        git(repo, "add", "--all")
        path_file = repo.parent / "source-paths"
        path_file.write_bytes(b"\0".join(path.encode() for path in paths) + b"\0")
        git(
            repo,
            "add",
            "--force",
            f"--pathspec-from-file={path_file}",
            "--pathspec-file-nul",
        )
        tree = output(repo, "write-tree")
        if previous and output(repo, "rev-parse", f"{previous}^{{tree}}") == tree:
            print(f"Backup unchanged: {previous}")
            return previous
        sha = tree_commit(
            repo,
            tree,
            [previous, main],
            "backup(workspace): preserve current source snapshot",
            settings,
            bot=True,
        )
        git(repo, "update-ref", "refs/heads/upload-backup", sha)
        git(
            repo,
            "push",
            "origin",
            f"refs/heads/upload-backup:refs/heads/{settings['backup_branch']}",
        )
        print(f"Backup pushed: {sha} ({len(paths)} source files)")
        return sha


def validate_groups(groups, changed):
    assigned, ids = set(), set()
    result = []
    for group in groups:
        identifier = group["id"]
        if not re.fullmatch(r"[a-z0-9-]+", identifier) or identifier in ids:
            raise QueueError(f"Invalid or duplicate group id: {identifier}")
        ids.add(identifier)
        message = group["message"]
        if not message.strip() or "\n" in message or "[skip ci]" in message.lower():
            raise QueueError(f"Invalid commit message: {identifier}")
        candidates = group.get("paths", [])
        if any(
            not path_allowed(path) or path in PROTECTED or path == MANIFEST
            for path in candidates
        ):
            raise QueueError(f"Sensitive or protected path in {identifier}")
        paths = sorted(set(candidates) & changed)
        if set(paths) & assigned:
            raise QueueError(f"A file is assigned more than once: {identifier}")
        if paths:
            assigned.update(paths)
            result.append({"id": identifier, "message": message, "paths": paths})
    missing = changed - assigned
    if missing:
        raise QueueError("Unassigned changed files: " + ", ".join(sorted(missing)))
    return result


@contextlib.contextmanager
def remote_clone(settings):
    with tempfile.TemporaryDirectory(prefix="ilbi-publish-") as folder:
        repo = Path(folder) / "repository"
        run(
            [
                "git",
                "-c",
                "credential.helper=!gh auth git-credential",
                "clone",
                "--quiet",
                settings["remote"],
                str(repo),
            ]
        )
        configure(repo, settings)
        fetch(repo)
        yield repo


def enqueue(root, settings):
    with remote_clone(settings) as repo:
        snapshot = ref(repo, settings["backup_branch"])
        if not snapshot:
            raise QueueError("Run backup first.")
        previous = ref(repo, settings["queue_branch"])
        progress_sha = ref(repo, settings["state_branch"])
        if previous:
            old = read_json(repo, previous, MANIFEST)
            state = read_json(repo, progress_sha, STATE) if progress_sha else {}
            if state.get("queue_id") != old["queue_id"] or set(
                state.get("completed", [])
            ) != {g["id"] for g in old["groups"]}:
                raise QueueError(
                    "Current queue is still active. Its frozen snapshot remains safe; finish it before replacing the queue."
                )
        base = ref(repo, settings["default_branch"])
        changed = set(
            p.decode()
            for p in git(
                repo, "diff", "--name-only", "-z", base, snapshot
            ).stdout.split(b"\0")
            if p
        )
        changed.discard(MANIFEST)
        plan = json.loads((root / "automation/queue-plan.json").read_text())
        groups = validate_groups(plan["groups"], changed)
        if not groups:
            raise QueueError("No changes to queue.")
        manifest = {
            "version": 1,
            "queue_id": datetime.now(ZoneInfo(settings["timezone"])).strftime(
                "%Y%m%dT%H%M%S"
            )
            + "-"
            + snapshot[:8],
            "base_sha": base,
            "snapshot_sha": snapshot,
            "created_at": datetime.now(ZoneInfo(settings["timezone"])).isoformat(),
            "groups": groups,
        }
        git(repo, "checkout", "--detach", "--quiet", snapshot)
        if git(
            repo, "merge-base", "--is-ancestor", base, snapshot, check=False
        ).returncode:
            raise QueueError(
                "Backup predates main. Refresh the backup before creating the queue."
            )
        (repo / MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        (repo / MANIFEST).write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
        )
        git(repo, "add", "--force", MANIFEST)
        tree = output(repo, "write-tree")
        sha = tree_commit(
            repo,
            tree,
            [previous, snapshot, base],
            f"queue: freeze {len(groups)} reviewed change groups",
            settings,
            bot=True,
        )
        git(repo, "update-ref", "refs/heads/upload-queue", sha)
        git(
            repo,
            "push",
            "origin",
            f"refs/heads/upload-queue:refs/heads/{settings['queue_branch']}",
        )
        print(f"Queue pushed: {manifest['queue_id']} ({len(groups)} genuine commits)")


def prepare_batch(repo, settings, manifest, progress, *, today=None):
    groups = manifest["groups"]
    if manifest.get("version") != 1:
        raise QueueError("Unknown queue format.")
    flat = {p for g in groups for p in g["paths"]}
    validate_groups(groups, flat)
    if progress.get("queue_id") != manifest["queue_id"]:
        progress = {
            "version": 1,
            "queue_id": manifest["queue_id"],
            "completed": [],
            "last_main_sha": manifest["base_sha"],
            "days": {},
        }
    main = ref(repo, settings["default_branch"])
    if main != progress["last_main_sha"]:
        raise QueueError(
            "Main advanced outside this queue. Stop and review the changed base; no files were overwritten."
        )
    completed = progress["completed"]
    if completed != [g["id"] for g in groups[: len(completed)]]:
        raise QueueError("Queue progress is not a valid prefix.")
    day = today or datetime.now(ZoneInfo(settings["timezone"])).date().isoformat()
    remaining = groups[len(completed) :]
    count = len(remaining)
    if not count:
        print("Queue finished. Add completed real changes before another publication.")
        return None
    selected = remaining[:count]
    git(repo, "checkout", "--detach", "--quiet", main)
    queue = ref(repo, settings["queue_branch"])
    for group in selected:
        file = repo.parent / "paths"
        file.write_bytes(b"\0".join(path.encode() for path in group["paths"]) + b"\0")
        git(
            repo,
            "restore",
            f"--source={queue}",
            "--staged",
            "--worktree",
            f"--pathspec-from-file={file}",
            "--pathspec-file-nul",
        )
        if git(repo, "diff", "--cached", "--quiet", check=False).returncode == 0:
            raise QueueError(
                f"Group {group['id']} is empty. Refusing to create an artificial commit."
            )
        message = (
            group["message"]
            + f"\n\nQueue-Id: {manifest['queue_id']}\nQueue-Group: {group['id']}"
        )
        git(
            repo,
            "-c",
            "core.hooksPath=/dev/null",
            "commit",
            "--quiet",
            "-m",
            message,
            env=commit_environment(settings),
        )
        print(f"Prepared: {group['message']}")
    result = dict(progress)
    result["completed"] = completed + [g["id"] for g in selected]
    result["last_main_sha"] = output(repo, "rev-parse", "HEAD")
    result["days"] = dict(progress.get("days", {}))
    result["days"][day] = result["days"].get(day, 0) + count
    result["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).isoformat()
    return result


def validate_delivery(repo, settings):
    for check in settings["validation"]:
        cwd = (repo / check["cwd"]).resolve()
        if not cwd.is_relative_to(repo.resolve()):
            raise QueueError("Validation path must remain in the temporary clone.")
        print("Checking: " + " ".join(check["argv"]), flush=True)
        result = subprocess.run(check["argv"], cwd=cwd)
        if result.returncode:
            raise QueueError(
                "Validation failed; the queued snapshot and progress remain unchanged."
            )
    # Checks may produce ignored build/cache artifacts, but must not edit source.
    if output(repo, "status", "--porcelain", "--untracked-files=no"):
        raise QueueError("Validation changed tracked files; publishing is stopped.")


def publish(settings, dry_run=False):
    if settings["paused"]:
        print("Publishing is paused. Backups can continue.")
        return
    with remote_clone(settings) as repo:
        queue = ref(repo, settings["queue_branch"])
        if not queue:
            print("No queue yet.")
            return
        manifest = read_json(repo, queue, MANIFEST)
        old_state = ref(repo, settings["state_branch"])
        progress = read_json(repo, old_state, STATE) if old_state else {}
        prepared = prepare_batch(repo, settings, manifest, progress)
        if prepared is None:
            return
        if dry_run:
            old_count = (
                len(progress.get("completed", []))
                if progress.get("queue_id") == manifest["queue_id"]
                else 0
            )
            print(
                f"Dry run: {len(prepared['completed']) - old_count} genuine commits prepared; nothing pushed."
            )
            return
        validate_delivery(repo, settings)
        delivery = output(repo, "rev-parse", "HEAD")
        git(repo, "update-ref", "refs/heads/delivery", delivery)
        # State uses a separate commit chain and bot identity, outside main.
        git(repo, "read-tree", "--empty")
        git(repo, "clean", "-ffdx")
        (repo / STATE).write_text(
            json.dumps(prepared, ensure_ascii=False, indent=2) + "\n"
        )
        git(repo, "add", "--force", STATE)
        state_tree = output(repo, "write-tree")
        state_sha = tree_commit(
            repo,
            state_tree,
            [old_state],
            f"queue progress: {len(prepared['completed'])}/{len(manifest['groups'])}",
            settings,
            bot=True,
        )
        git(repo, "update-ref", "refs/heads/progress", state_sha)
        git(
            repo,
            "push",
            "--atomic",
            "origin",
            f"refs/heads/delivery:refs/heads/{settings['default_branch']}",
            f"refs/heads/progress:refs/heads/{settings['state_branch']}",
        )
        print(
            f"Published safely: {delivery}. Completed {len(prepared['completed'])}/{len(manifest['groups'])}."
        )


def status(settings):
    with remote_clone(settings) as repo:
        queue = ref(repo, settings["queue_branch"])
        print(f"Backup: {ref(repo, settings['backup_branch']) or 'not uploaded'}")
        if not queue:
            print("Queue: not created")
            return
        manifest = read_json(repo, queue, MANIFEST)
        progress_sha = ref(repo, settings["state_branch"])
        progress = read_json(repo, progress_sha, STATE) if progress_sha else {}
        completed = (
            len(progress.get("completed", []))
            if progress.get("queue_id") == manifest["queue_id"]
            else 0
        )
        print(
            f"Queue: {manifest['queue_id']} | completed {completed}/{len(manifest['groups'])} | remaining {len(manifest['groups']) - completed}"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["backup", "enqueue", "publish", "status"])
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    settings = config(root)
    if args.command == "backup":
        lockdir = root / ".commit-queue-local"
        lockdir.mkdir(exist_ok=True)
        with (lockdir / "backup.lock").open("w") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print("Another backup is running.")
                return 0
            backup(root, settings)
    elif args.command == "enqueue":
        enqueue(root, settings)
    elif args.command == "publish":
        publish(settings, args.dry_run)
    else:
        status(settings)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (QueueError, OSError, ValueError, KeyError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
