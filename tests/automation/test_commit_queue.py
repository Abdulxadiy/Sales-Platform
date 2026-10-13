"""Real Git integration tests against disposable local repositories."""

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "commit_queue", Path(__file__).resolve().parents[2] / "scripts/commit_queue.py"
)
queue = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(queue)


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name) / "repo"
        self.repo.mkdir()
        queue.git(self.repo, "init", "-q", "-b", "main")
        queue.git(self.repo, "config", "user.name", "Test Author")
        queue.git(self.repo, "config", "user.email", "test@example.invalid")
        self.settings = {
            "default_branch": "main",
            "queue_branch": "queue/ready",
            "state_branch": "queue/progress",
            "backup_branch": "backup/work-in-progress",
            "timezone": "Asia/Tashkent",
            "target_per_day": 2,
            "minimum_batch": 2,
            "author_name": "Test Author",
            "author_email": "test@example.invalid",
            "paused": False,
            "validation": [],
        }
        for name in ("update.txt", "remove.txt", "later.txt"):
            (self.repo / name).write_text("old\n")
        self.commit("original")
        self.base = queue.output(self.repo, "rev-parse", "HEAD")
        queue.git(self.repo, "update-ref", "refs/remotes/origin/main", self.base)
        (self.repo / "update.txt").write_text("real update\n")
        (self.repo / "remove.txt").unlink()
        (self.repo / "new file.txt").write_text("real addition\n")
        (self.repo / "later.txt").write_text("another reviewed change\n")
        self.commit("source snapshot")
        self.snapshot = queue.output(self.repo, "rev-parse", "HEAD")
        queue.git(
            self.repo, "update-ref", "refs/remotes/origin/queue/ready", self.snapshot
        )
        self.groups = [
            {
                "id": "first",
                "message": "fix(content): update original text",
                "paths": ["update.txt"],
            },
            {
                "id": "second",
                "message": "refactor(files): replace obsolete file",
                "paths": ["remove.txt", "new file.txt"],
            },
            {
                "id": "third",
                "message": "docs(text): record reviewed follow-up",
                "paths": ["later.txt"],
            },
        ]
        self.manifest = {
            "version": 1,
            "queue_id": "q1",
            "base_sha": self.base,
            "groups": self.groups,
        }

    def commit(self, message):
        queue.git(self.repo, "add", "--all")
        queue.git(self.repo, "commit", "-q", "-m", message)

    def test_batch_size_never_leaves_a_small_tail(self):
        self.assertEqual(queue.batch_size(45, 20, 15), 20)
        self.assertEqual(queue.batch_size(25, 20, 15), 25)
        self.assertEqual(queue.batch_size(35, 20, 15), 20)
        self.assertEqual(queue.batch_size(15, 20, 15), 15)
        self.assertEqual(queue.batch_size(0, 20, 15), 0)
        with self.assertRaises(queue.QueueError):
            queue.batch_size(14, 20, 15)

    def test_prepare_handles_new_modified_deleted_and_space_containing_paths(self):
        # With three remaining groups and a minimum of two, take all three.
        state = queue.prepare_batch(
            self.repo, self.settings, self.manifest, {}, today="2026-10-13"
        )
        self.assertEqual(state["completed"], ["first", "second", "third"])
        self.assertEqual((self.repo / "update.txt").read_text(), "real update\n")
        self.assertFalse((self.repo / "remove.txt").exists())
        self.assertTrue((self.repo / "new file.txt").exists())
        self.assertEqual(
            queue.output(self.repo, "rev-list", "--count", f"{self.base}..HEAD"), "3"
        )
        self.assertEqual(
            queue.output(self.repo, "diff", "--name-only", self.snapshot, "HEAD"), ""
        )
        self.assertEqual(
            queue.output(self.repo, "log", "-1", "--format=%ae"), "test@example.invalid"
        )
        queue.git(
            self.repo, "update-ref", "refs/remotes/origin/main", state["last_main_sha"]
        )
        self.assertIsNone(
            queue.prepare_batch(
                self.repo, self.settings, self.manifest, state, today="2026-10-13"
            )
        )

    def test_remote_advance_stops_without_overwriting(self):
        queue.git(self.repo, "update-ref", "refs/remotes/origin/main", self.snapshot)
        before = queue.output(self.repo, "rev-parse", "HEAD")
        with self.assertRaisesRegex(queue.QueueError, "Main advanced"):
            queue.prepare_batch(self.repo, self.settings, self.manifest, {})
        self.assertEqual(queue.output(self.repo, "rev-parse", "HEAD"), before)

    def test_empty_group_never_creates_a_fake_commit(self):
        self.groups[0]["paths"] = ["later.txt"]
        self.groups[2]["paths"] = ["update.txt"]
        (self.repo / "unchanged.txt").write_text("same\n")
        self.commit("snapshot addition")
        sha = queue.output(self.repo, "rev-parse", "HEAD")
        queue.git(self.repo, "update-ref", "refs/remotes/origin/main", sha)
        self.manifest["base_sha"] = sha
        self.manifest["groups"] = [
            {"id": "one", "message": "fix: unchanged", "paths": ["unchanged.txt"]},
            {"id": "two", "message": "fix: second", "paths": ["update.txt"]},
        ]
        queue.git(self.repo, "update-ref", "refs/remotes/origin/queue/ready", sha)
        with self.assertRaisesRegex(queue.QueueError, "empty"):
            queue.prepare_batch(self.repo, self.settings, self.manifest, {})
        self.assertEqual(queue.output(self.repo, "rev-parse", "HEAD"), sha)

    def test_plan_must_cover_every_path_once(self):
        with self.assertRaisesRegex(queue.QueueError, "Unassigned"):
            queue.validate_groups(self.groups, {"update.txt", "missing.txt"})
        with self.assertRaisesRegex(queue.QueueError, "more than once"):
            queue.validate_groups(
                [self.groups[0], {**self.groups[1], "paths": ["update.txt"]}],
                {"update.txt"},
            )

    def test_secrets_and_unsafe_paths_are_excluded(self):
        for value in (
            ".env",
            "inventra/.env.test",
            ".git/config",
            "../private",
            "media/customer.png",
            "id_rsa",
            "key.pem",
            "scripts/./commit_queue.py",
            "line\nname",
        ):
            self.assertFalse(queue.path_allowed(value), value)
        for value in (
            ".env.example",
            "inventra/.env.example",
            "branding/new logo.png",
            "frontend/inventra/package-lock.json",
        ):
            self.assertTrue(queue.path_allowed(value), value)
        with self.assertRaises(queue.QueueError):
            queue.validate_groups(
                [{"id": "bad", "message": "bad", "paths": ["scripts/commit_queue.py"]}],
                {"scripts/commit_queue.py"},
            )

    def test_sensitive_content_is_rejected_without_echoing_token(self):
        token = "ghp_" + "a" * 36
        (self.repo / "bad.py").write_text(token)
        with self.assertRaisesRegex(queue.QueueError, "bad.py") as error:
            queue.source_files(self.repo)
        self.assertNotIn(token, str(error.exception))

    def test_commit_dates_are_real_and_not_inherited_from_environment(self):
        with patch.dict(
            os.environ,
            {"GIT_AUTHOR_DATE": "2000-01-01", "GIT_COMMITTER_DATE": "2000-01-01"},
        ):
            environment = queue.commit_environment(self.settings)
        self.assertNotIn("GIT_AUTHOR_DATE", environment)
        self.assertNotIn("GIT_COMMITTER_DATE", environment)
        self.assertEqual(environment["TZ"], "Asia/Tashkent")

    def test_validation_failure_never_advances_remote_state(self):
        settings = {
            **self.settings,
            "validation": [
                {"cwd": ".", "argv": ["python3", "-c", "raise SystemExit(1)"]}
            ],
        }
        with self.assertRaisesRegex(queue.QueueError, "Validation failed"):
            queue.validate_delivery(self.repo, settings)
        self.assertEqual(queue.ref(self.repo, "main"), self.base)

    def test_progress_and_main_are_pushed_atomically(self):
        remote = Path(self.tmp.name) / "remote.git"
        queue.run(["git", "init", "--bare", "-q", str(remote)])
        queue.git(self.repo, "remote", "add", "origin", str(remote))
        queue.git(self.repo, "push", "-q", "origin", f"{self.base}:refs/heads/main")
        (self.repo / queue.MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        (self.repo / queue.MANIFEST).write_text(json.dumps(self.manifest))
        self.commit("queued manifest")
        queue.git(
            self.repo,
            "update-ref",
            "refs/remotes/origin/queue/ready",
            queue.output(self.repo, "rev-parse", "HEAD"),
        )
        with patch.object(queue, "remote_clone") as clone:
            clone.return_value.__enter__.return_value = self.repo
            queue.publish(self.settings)
        delivery = queue.output(remote, "rev-parse", "refs/heads/main")
        state_sha = queue.output(remote, "rev-parse", "refs/heads/queue/progress")
        state = queue.read_json(remote, state_sha, queue.STATE)
        self.assertEqual(delivery, state["last_main_sha"])
        self.assertEqual(state["completed"], ["first", "second", "third"])
        self.assertEqual(
            queue.output(remote, "ls-tree", "--name-only", state_sha), "progress.json"
        )

    def test_failed_main_push_cannot_save_progress(self):
        remote = Path(self.tmp.name) / "remote.git"
        queue.run(["git", "init", "--bare", "-q", str(remote)])
        queue.git(self.repo, "remote", "add", "origin", str(remote))
        queue.git(self.repo, "push", "-q", "origin", f"{self.snapshot}:refs/heads/main")
        (self.repo / queue.MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        (self.repo / queue.MANIFEST).write_text(json.dumps(self.manifest))
        self.commit("queued manifest")
        queue.git(
            self.repo,
            "update-ref",
            "refs/remotes/origin/queue/ready",
            queue.output(self.repo, "rev-parse", "HEAD"),
        )
        with patch.object(queue, "remote_clone") as clone:
            clone.return_value.__enter__.return_value = self.repo
            with self.assertRaises(queue.QueueError):
                queue.publish(self.settings)
        self.assertEqual(
            queue.output(remote, "rev-parse", "refs/heads/main"), self.snapshot
        )
        self.assertIsNone(queue.ref(remote, "queue/progress"))
        self.assertNotEqual(
            queue.git(
                remote,
                "rev-parse",
                "--verify",
                "refs/heads/queue/progress",
                check=False,
            ).returncode,
            0,
        )


if __name__ == "__main__":
    unittest.main()
