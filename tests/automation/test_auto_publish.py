"""Real Git remotes exercise direct main publication without network or user data."""

import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


publisher = load("auto_publish", "scripts/auto_publish.py")
installer = load("install_auto_publish", "scripts/install_auto_publish.py")


class DirectPublicationTests(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory(prefix="ilbi-main-tests-")
        self.addCleanup(scratch.cleanup)
        folder = Path(scratch.name)
        self.remote = folder / "remote.git"
        self.root = folder / "working source"
        self.other = folder / "other"
        self.run_git(folder, "init", "--bare", "--initial-branch=main", str(self.remote))
        self.run_git(folder, "clone", str(self.remote), str(self.root))
        for name, content in {"keep.txt": "initial\n", "deleted.txt": "delete me\n", ".gitignore": ".auto-publish-local/\n.env*\n!.env.example\n"}.items():
            (self.root / name).write_text(content)
        self.commit(self.root)
        self.run_git(self.root, "push", "origin", "main")
        self.settings = {"remote": str(self.remote), "branch": "main", "author_name": "Test", "author_email": "test@example.invalid"}
        self.head = self.run_git(self.root, "rev-parse", "HEAD")

    def run_git(self, folder, *args):
        return subprocess.run(["git", *args], cwd=folder, capture_output=True, check=True, text=True).stdout.strip()

    def commit(self, folder):
        self.run_git(folder, "add", "--all")
        self.run_git(folder, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "test source")

    def publish(self, **kwargs):
        return publisher.publish(self.root, self.settings, **kwargs)

    def clone_other(self):
        self.run_git(self.root.parent, "clone", str(self.remote), str(self.other))

    def test_complete_initial_snapshot_and_no_daily_minimum(self):
        (self.root / "deleted.txt").unlink()
        (self.root / "keep.txt").write_text("new source\n")
        (self.root / "with spaces.txt").write_text("new file\n")
        (self.root / ".env").write_text("private database credentials")
        result = self.publish(initialize=True)
        self.assertEqual(result["status"], "published")
        self.assertEqual(self.run_git(self.remote, "show", "main:keep.txt"), "new source")
        self.assertEqual(self.run_git(self.remote, "show", "main:with spaces.txt"), "new file")
        paths = self.run_git(self.remote, "ls-tree", "-r", "--name-only", "main").splitlines()
        self.assertNotIn("deleted.txt", paths)
        self.assertNotIn(".env", paths)
        self.assertEqual(self.run_git(self.root, "rev-parse", "HEAD"), self.head)
        self.assertEqual(self.publish()["status"], "unchanged")
        (self.root / "keep.txt").write_text("one more save")
        self.assertEqual(self.publish()["status"], "published")
        self.assertEqual(self.run_git(self.remote, "rev-list", "--count", "main"), "3")

    def test_missing_initialization_does_not_write_remote(self):
        with self.assertRaisesRegex(publisher.PublishError, "initialize"):
            self.publish()
        self.assertEqual(self.run_git(self.remote, "rev-parse", "main"), self.head)

    def test_unrelated_remote_changes_are_preserved(self):
        self.publish(initialize=True)
        self.clone_other()
        (self.other / "remote.txt").write_text("remote work")
        self.commit(self.other)
        self.run_git(self.other, "push", "origin", "main")
        (self.root / "keep.txt").write_text("local work")
        self.publish()
        self.assertEqual(self.run_git(self.remote, "show", "main:remote.txt"), "remote work")

    def test_same_file_conflict_never_overwrites_main(self):
        self.publish(initialize=True)
        self.clone_other()
        (self.other / "keep.txt").write_text("remote work")
        self.commit(self.other)
        self.run_git(self.other, "push", "origin", "main")
        remote_head = self.run_git(self.remote, "rev-parse", "main")
        (self.root / "keep.txt").write_text("local work")
        with self.assertRaisesRegex(publisher.PublishError, "Both local and main changed: keep.txt"):
            self.publish()
        self.assertEqual(self.run_git(self.remote, "rev-parse", "main"), remote_head)
        self.assertEqual((self.root / "keep.txt").read_text(), "local work")

    def test_push_race_is_rejected_without_force_then_retried(self):
        self.publish(initialize=True)
        self.clone_other()
        (self.other / "remote.txt").write_text("race")
        self.commit(self.other)
        (self.root / "keep.txt").write_text("local")
        original_git = publisher.git

        def racing_git(folder, *args, **kwargs):
            if args[0] == "push":
                self.run_git(self.other, "push", "origin", "main")
            return original_git(folder, *args, **kwargs)

        with patch.object(publisher, "git", side_effect=racing_git):
            with self.assertRaisesRegex(publisher.PublishError, "push failed"):
                self.publish()
        self.publish()
        self.assertEqual(self.run_git(self.remote, "show", "main:remote.txt"), "race")
        self.assertEqual(self.run_git(self.remote, "show", "main:keep.txt"), "local")

    def test_alignment_preserves_edits_saved_during_upload(self):
        (self.root / "keep.txt").write_text("snapshot")
        original_git = publisher.git

        def save_during_push(folder, *args, **kwargs):
            result = original_git(folder, *args, **kwargs)
            if args[0] == "push":
                (self.root / "keep.txt").write_text("newer edit")
            return result

        with patch.object(publisher, "git", side_effect=save_during_push):
            first = self.publish(initialize=True, align=True)
        self.assertEqual((self.root / "keep.txt").read_text(), "newer edit")
        self.assertEqual(self.run_git(self.root, "rev-parse", "HEAD"), first["commit"])
        self.assertEqual(self.run_git(self.root, "rev-parse", "refs/auto-publish/before-alignment"), self.head)
        self.publish(align=True)
        self.assertEqual(self.run_git(self.remote, "show", "main:keep.txt"), "newer edit")

    def test_crash_after_accepted_push_recovers_before_new_save(self):
        self.publish(initialize=True)
        (self.root / "keep.txt").write_text("accepted snapshot")
        original_write = publisher.write_state

        def crash(path, value):
            if path.name == "state.json":
                raise OSError("simulated disk interruption")
            return original_write(path, value)

        with patch.object(publisher, "write_state", side_effect=crash):
            with self.assertRaises(OSError):
                self.publish()
        (self.root / "keep.txt").write_text("later save")
        self.publish()
        self.assertEqual(self.run_git(self.remote, "show", "main:keep.txt"), "later save")

    def test_possible_secret_blocks_entire_publication(self):
        (self.root / "accidental.txt").write_bytes(b"ghp_" + b"A" * 40)
        with self.assertRaisesRegex(publisher.PublishError, "Possible credential in accidental.txt"):
            self.publish(initialize=True)
        self.assertEqual(self.run_git(self.remote, "rev-parse", "main"), self.head)

    def test_oversized_file_is_rejected_before_reading(self):
        with (self.root / "huge.bin").open("wb") as stream:
            stream.truncate(96 * 1024 * 1024)
        with self.assertRaisesRegex(publisher.PublishError, "size limit"):
            self.publish(initialize=True)

    def test_external_symlink_is_rejected(self):
        (self.root / "external").symlink_to(self.root.parent / "remote.git")
        with self.assertRaisesRegex(publisher.PublishError, "External symlink"):
            self.publish(initialize=True)

    def test_unstable_capture_does_not_publish(self):
        real_signature = publisher.signature(self.root)
        with patch.object(publisher, "signature", side_effect=[real_signature, []]):
            with self.assertRaisesRegex(publisher.PublishError, "changed during capture"):
                self.publish(initialize=True)

    def test_delete_rename_and_file_directory_transitions(self):
        self.publish(initialize=True)
        (self.root / "keep.txt").unlink()
        (self.root / "keep.txt").mkdir()
        (self.root / "keep.txt/child").write_text("nested")
        self.publish()
        self.assertEqual(self.run_git(self.remote, "show", "main:keep.txt/child"), "nested")
        (self.root / "keep.txt/child").unlink()
        (self.root / "keep.txt").rmdir()
        (self.root / "keep.txt").write_text("flat")
        self.publish()
        self.assertEqual(self.run_git(self.remote, "show", "main:keep.txt"), "flat")

    def test_service_has_no_timer_and_quotes_repository_path(self):
        service = installer.service_contents(Path('/tmp/project space%name'), '/usr/bin:/home/user/bin')
        self.assertIn('WorkingDirectory=/tmp/project space%%name', service)
        self.assertIn('auto_publish.py" watch', service)
        self.assertIn('Restart=always', service)
        self.assertNotIn('OnCalendar', service)
        self.assertNotIn('timer', service)

    @unittest.skipUnless(shutil.which('systemd-analyze'), 'systemd unit validator unavailable')
    def test_generated_service_is_accepted_by_systemd(self):
        unit = self.root.parent / 'ilbi-auto-publish.service'
        unit.write_text(installer.service_contents(self.root, '/usr/bin:/bin'))
        checked = subprocess.run(['systemd-analyze', 'verify', str(unit)], capture_output=True, text=True)
        self.assertEqual(checked.returncode, 0, checked.stderr)


if __name__ == "__main__":
    unittest.main()
