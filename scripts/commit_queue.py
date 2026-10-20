#!/usr/bin/env python3
"""Back up real work, queue reviewed file groups, and publish verified batches.

All Git writes happen in temporary clones. The developer's HEAD, index and
working files are never reset, stashed, committed, rebased or force-pushed.
"""

from __future__ import annotations

import argparse
import base64
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
import tomllib
from datetime import datetime, timedelta
from pathlib import Path, PurePosixPath
from zoneinfo import ZoneInfo
from urllib.parse import quote

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
    daily = settings.get("daily", {})
    if daily and not (1 <= daily["minimum"] <= daily["target_min"] <= daily["target_max"] < daily["maximum"]):
        raise QueueError("Invalid daily release range.")
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
    if name.startswith(".env") and name not in {".env.example", ".env.production.example"}:
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
    git(repo, "config", "tag.gpgsign", "false")


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
            item = {"id": identifier, "message": message, "paths": paths}
            if group.get("atomic_unit"):
                item["atomic_unit"] = group["atomic_unit"]
            result.append(item)
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


def project_version(repo):
    for folder in ("ilbi", "inventra"):
        path = repo / folder / "pyproject.toml"
        if path.exists():
            return tomllib.loads(path.read_text())["project"]["version"]
    return None


def set_project_version(repo, version):
    """Only project metadata changes; dependency versions and application text do not."""
    changed = []
    for folder in ("ilbi", "inventra"):
        path = repo / folder / "pyproject.toml"
        if not path.exists():
            continue
        text = path.read_text()
        project = tomllib.loads(text)["project"]
        updated = re.sub(r'(?m)^(version\s*=\s*")[^"]+("\s*)$', lambda m: m[1] + version + m[2], text, count=1)
        if updated != text:
            path.write_text(updated)
            changed.append(str(path.relative_to(repo)))
        lock = path.parent / "uv.lock"
        if lock.exists():
            text = lock.read_text()
            pattern = r'(\[\[package\]\]\nname = "' + re.escape(project["name"]) + r'"\nversion = ")[^"]+("\n)'
            updated = re.sub(pattern, lambda m: m[1] + version + m[2], text, count=1)
            if updated != text:
                lock.write_text(updated)
                changed.append(str(lock.relative_to(repo)))
    for folder in ("frontend/ilbi", "frontend/inventra"):
        for filename in ("package.json", "package-lock.json"):
            path = repo / folder / filename
            if not path.exists():
                continue
            text = path.read_text()
            data = json.loads(text)
            data["version"] = version
            if filename == "package-lock.json" and "" in data.get("packages", {}):
                data["packages"][""]["version"] = version
            updated = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
            if updated != text:
                path.write_text(updated)
                changed.append(str(path.relative_to(repo)))
    return changed


def release_level(groups):
    rank = 0
    for group in groups:
        # Documentation, tests, artwork and publisher maintenance do not version the app.
        runtime = any(
            (path.startswith(("ilbi/", "inventra/", "frontend/ilbi/src/", "frontend/inventra/src/"))
             and "/tests/" not in path
             and not path.endswith((".md", ".png", ".svg", ".jpg")))
            or path in ("frontend/ilbi/package.json", "frontend/ilbi/package-lock.json", "frontend/inventra/package.json", "frontend/inventra/package-lock.json")
            for path in group["paths"]
        )
        if runtime:
            subject = group["message"].split(":", 1)[0]
            rank = max(rank, 3 if "!" in subject else 2 if subject.startswith("feat") else 1)
    return rank


def bump_version(version, level):
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise QueueError("App version must use major.minor.patch.")
    major, minor, patch = map(int, version.split("."))
    return f"{major + 1}.0.0" if level == 3 else f"{major}.{minor + 1}.0" if level == 2 else f"{major}.{minor}.{patch + 1}"


def daily_slot(settings, day):
    """One varying local hour per day, repeatable across retries; never fake Git dates."""
    date = datetime.fromisoformat(day).date()
    week = date - timedelta(days=date.weekday())
    seed = hashlib.sha256((settings.get("repository", "local") + str(week)).encode()).digest()
    # Different weekday remainders ensure adjacent days use different hours.
    hour = date.weekday() + 7 * (seed[date.weekday()] % 3)
    return hour, 17


def choose_groups(remaining, settings, day):
    daily = settings.get("daily")
    if not daily:
        return remaining
    seed = int.from_bytes(hashlib.sha256(day.encode()).digest()[:4], "big")
    target = daily["target_min"] + seed % (daily["target_max"] - daily["target_min"] + 1)
    # Leave room for one release metadata commit.
    maximum = daily["maximum"] - 1
    units = []
    seen = set()
    for group in remaining:
        unit = group.get("atomic_unit")
        if unit and units and units[-1][0].get("atomic_unit") == unit:
            units[-1].append(group)
        else:
            if unit in seen:
                raise QueueError("Atomic release groups must be contiguous.")
            if unit:
                seen.add(unit)
            units.append([group])
    selected = []
    for unit in units:
        if len(selected) + len(unit) > maximum:
            if not selected:
                raise QueueError("An atomic change set exceeds the daily maximum; review its release plan.")
            break
        if len(selected) >= target:
            break
        selected.extend(unit)
    # Finish a small tail when the whole delivery still fits the limit.
    if 0 < len(remaining) - len(selected) < daily["minimum"] and len(remaining) <= maximum:
        selected = remaining
    if len(selected) < daily["minimum"]:
        print(f"Waiting for real work: {len(selected)} ready groups; minimum {daily['minimum']}. No empty commits created.")
        return []
    return selected


def reviewed_groups(plan, changed):
    """Keep feature groups; all coupled application/rename groups ship atomically."""
    groups = [dict(g, paths=list(g["paths"])) for g in plan["groups"]]
    assigned = {p for g in groups for p in g["paths"]}
    missing = changed - assigned
    if missing and not plan.get("auto_classify"):
        return validate_groups(groups, changed)
    runtime = next((g for g in groups if g["id"] == "ilbi-rebranding"), None)
    extras = []
    for path in sorted(missing):
        if runtime is not None and path.startswith(("ilbi/", "inventra/", "frontend/", "nginx/", "telegram_bot_sms/")):
            runtime["paths"].append(path)
        else:
            extras.append(path)
    if extras:
        groups.append({"id": "supporting-tools", "message": "chore(tooling): update supporting project tools and resources", "paths": extras})
    atomic = set(plan.get("atomic_groups", []))
    for group in groups:
        if group["id"] in atomic:
            group["atomic_unit"] = "application"
    groups.sort(key=lambda g: 0 if g.get("atomic_unit") == "application" else 1)
    return validate_groups(groups, changed)


def enqueue(root, settings, refresh=False):
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
                if not refresh:
                    raise QueueError(
                        "Current queue is still active. Its frozen snapshot remains safe; finish it before replacing the queue."
                    )
        base = ref(repo, settings["default_branch"])
        source_tree = output(repo, "rev-parse", f"{snapshot}^{{tree}}")
        if previous and old.get("source_tree") == source_tree and old.get("base_sha") == base and state.get("last_main_sha") == base:
            print("Queue already covers this source snapshot.")
            return
        if previous and state.get("last_main_sha") and state["last_main_sha"] != base:
            raise QueueError("Main advanced outside this queue. Review before refreshing it.")
        git(repo, "checkout", "--detach", "--quiet", base)
        current_version = project_version(repo)
        git(repo, "checkout", "--detach", "--quiet", snapshot)
        if current_version:
            set_project_version(repo, current_version)
        git(repo, "add", "--all")
        tree = output(repo, "write-tree")
        effective = tree_commit(repo, tree, [snapshot, base], "queue: normalize managed release metadata", settings, bot=True)
        changed = set(
            p.decode()
            for p in git(
                repo, "diff", "--no-renames", "--name-only", "-z", base, effective
            ).stdout.split(b"\0")
            if p
        )
        changed.discard(MANIFEST)
        plan = json.loads((root / "automation/queue-plan.json").read_text())
        groups = reviewed_groups(plan, changed)
        if not groups:
            print("No new source changes to queue.")
            return
        manifest = {
            "version": 1,
            "queue_id": datetime.now(ZoneInfo(settings["timezone"])).strftime(
                "%Y%m%dT%H%M%S"
            )
            + "-"
            + snapshot[:8],
            "base_sha": base,
            "snapshot_sha": snapshot,
            "source_tree": source_tree,
            "created_at": datetime.now(ZoneInfo(settings["timezone"])).isoformat(),
            "groups": groups,
        }
        git(repo, "checkout", "--detach", "--quiet", effective)
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
        # Preserve daily accounting and the superseded snapshot in Git history.
        progress = {
            "version": 1, "queue_id": manifest["queue_id"], "completed": [],
            "last_main_sha": base, "days": state.get("days", {}) if previous else {},
            "superseded_queue": previous,
        }
        git(repo, "read-tree", "--empty")
        git(repo, "clean", "-ffdx")
        (repo / STATE).write_text(json.dumps(progress, indent=2) + "\n")
        git(repo, "add", "--force", STATE)
        progress_commit = tree_commit(repo, output(repo, "write-tree"), [progress_sha], "queue: record refreshed snapshot", settings, bot=True)
        git(repo, "update-ref", "refs/heads/upload-progress", progress_commit)
        git(
            repo,
            "push",
            "--atomic",
            "origin",
            f"refs/heads/upload-queue:refs/heads/{settings['queue_branch']}",
            f"refs/heads/upload-progress:refs/heads/{settings['state_branch']}",
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
    if not remaining:
        print("Queue finished. Add completed real changes before another publication.")
        return None
    daily = settings.get("daily")
    used = progress.get("days", {}).get(day, 0)
    if daily and used >= daily["minimum"]:
        print(f"Today's release is already complete ({used} commits).")
        return None
    budget = dict(settings)
    if daily:
        budget["daily"] = {**daily, "maximum": daily["maximum"] - used}
    selected = choose_groups(remaining, budget, day)
    if not selected:
        return None
    git(repo, "checkout", "--detach", "--quiet", main)
    before_version = project_version(repo)
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
    level = release_level(selected)
    release_tag = None
    if level and before_version:
        staged = project_version(repo) or before_version
        current = max((before_version, staged), key=lambda value: tuple(map(int, value.split("."))))
        version = bump_version(current, level)
        paths = set_project_version(repo, version)
        if paths:
            git(repo, "add", "--", *paths)
            git(repo, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", f"chore(release): v{version}", env=commit_environment(settings))
            release_tag = f"v{version}"
    result = dict(progress)
    result["completed"] = completed + [g["id"] for g in selected]
    result["last_main_sha"] = output(repo, "rev-parse", "HEAD")
    result["days"] = dict(progress.get("days", {}))
    result["days"][day] = used + len(selected) + int(release_tag is not None)
    result["release_tag"] = release_tag
    result["updated_at"] = datetime.now(ZoneInfo(settings["timezone"])).isoformat()
    return result


def validate_delivery(repo, settings):
    for check in settings["validation"]:
        relative = check["cwd"]
        # Transitional queues may still use the pre-rebrand directory names.
        if not (repo / relative).exists():
            relative = relative.replace("ilbi", "inventra")
        cwd = (repo / relative).resolve()
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
                f"Dry run: {len(prepared['completed']) - old_count} change commits"
                f" + {int(prepared.get('release_tag') is not None)} release commit prepared; nothing pushed."
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
        refs = [
            f"refs/heads/delivery:refs/heads/{settings['default_branch']}",
            f"refs/heads/progress:refs/heads/{settings['state_branch']}",
        ]
        if prepared.get("release_tag"):
            tag = prepared["release_tag"]
            git(repo, "tag", "-a", tag, delivery, "-m", f"ILBI {tag}", env=commit_environment(settings))
            refs.append(f"refs/tags/{tag}:refs/tags/{tag}")
        git(
            repo,
            "push",
            "--atomic",
            "origin",
            *refs,
        )
        print(
            f"Published safely: {delivery}. Completed {len(prepared['completed'])}/{len(manifest['groups'])}."
        )


def github_json(settings, branch, path):
    endpoint = f"repos/{settings['repository']}/contents/{path}?ref={quote(branch, safe='')}"
    response = run(["gh", "api", endpoint], check=False)
    if response.returncode:
        if b"404" in response.stderr:
            return {}
        raise QueueError("Unable to read the remote release state.")
    return json.loads(base64.b64decode(json.loads(response.stdout)["content"]))


def release_gate(settings, *, manual=False, now=None):
    now = now or datetime.now(ZoneInfo(settings["timezone"]))
    now = now.astimezone(ZoneInfo(settings["timezone"]))
    day = now.date().isoformat()
    hour, minute = daily_slot(settings, day)
    result = {"due": False, "day": day, "local_time": f"{hour:02}:{minute:02}", "timezone": settings["timezone"]}
    if settings["paused"]:
        return {**result, "reason": "Publishing is paused"}
    manifest = github_json(settings, settings["queue_branch"], MANIFEST)
    progress = github_json(settings, settings["state_branch"], STATE)
    pending = len(manifest.get("groups", []))
    if progress.get("queue_id") == manifest.get("queue_id"):
        pending -= len(progress.get("completed", []))
    result["pending"] = pending
    daily = settings.get("daily", {"minimum": 1})
    if progress.get("days", {}).get(day, 0) >= daily["minimum"]:
        return {**result, "reason": "Today's release is already complete"}
    if pending < daily["minimum"]:
        return {**result, "reason": f"Waiting for at least {daily['minimum']} real change groups"}
    if not manual and (now.hour, now.minute) < (hour, minute):
        return {**result, "reason": "Today's varying release time has not arrived"}
    return {**result, "due": True, "reason": "Real queued changes are ready for today's release"}


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
    parser.add_argument("command", choices=["backup", "enqueue", "publish", "status", "gate"])
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--manual", action="store_true")
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
        if settings.get("auto_enqueue"):
            enqueue(root, settings, refresh=True)
    elif args.command == "enqueue":
        enqueue(root, settings, refresh=args.refresh)
    elif args.command == "publish":
        publish(settings, args.dry_run)
    elif args.command == "gate":
        print(json.dumps(release_gate(settings, manual=args.manual)))
    else:
        status(settings)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (QueueError, OSError, ValueError, KeyError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
