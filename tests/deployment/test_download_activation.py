"""Incomplete releases cannot replace the live public download feed."""

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("activate_downloads", ROOT / "ops/activate_downloads.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DownloadActivationTests(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.folder = Path(scratch.name)
        self.commit = "a" * 40
        self.name = "ILBI-Setup-1.2.0-x64.exe"
        (self.folder / self.commit).mkdir()
        self.installer = self.folder / self.commit / self.name
        self.installer.write_bytes(b"MZ verified test fixture")
        self.feed = {"schema": 1, "mobile": None, "windows": {"version": "1.2.0", "sourceCommit": self.commit,
                     "url": f"/downloads/{self.commit}/{self.name}", "sha256": hashlib.sha256(self.installer.read_bytes()).hexdigest(),
                     "bytes": self.installer.stat().st_size}}
        self.pending = self.folder / ".pending.json"
        self.pending.write_text(json.dumps(self.feed))
        self.live = self.folder / "releases.json"
        self.live.write_text(json.dumps({"schema": 1, "mobile": {"version": "1.0.0", "url": "/downloads/mobile.apk"}}))
        self.previous = self.live.read_bytes()

    def test_complete_release_activates_and_preserves_mobile(self):
        module.activate(self.folder, self.pending, self.commit)
        published = json.loads(self.live.read_text())
        self.assertEqual(published["windows"], self.feed["windows"])
        self.assertEqual(published["mobile"]["url"], "/downloads/mobile.apk")
        self.assertFalse(self.pending.exists())

    def test_truncated_installer_preserves_live_feed(self):
        self.installer.write_bytes(b"MZ incomplete")
        with self.assertRaisesRegex(ValueError, "integrity"):
            module.activate(self.folder, self.pending, self.commit)
        self.assertEqual(self.live.read_bytes(), self.previous)

    def test_wrong_commit_and_path_never_replace_feed(self):
        with self.assertRaises(ValueError):
            module.activate(self.folder, self.pending, "b" * 40)
        self.assertEqual(self.live.read_bytes(), self.previous)
        self.feed["windows"]["url"] = "/downloads/../../elsewhere.exe"
        self.pending.write_text(json.dumps(self.feed))
        with self.assertRaises(ValueError):
            module.activate(self.folder, self.pending, self.commit)
        self.assertEqual(self.live.read_bytes(), self.previous)

    def test_retention_keeps_three_builds_and_operator_files(self):
        for digit in "12345":
            old = self.folder / (digit * 40)
            old.mkdir()
            (old / "fixture.exe").write_text("old installer")
        (self.folder / "mobile").mkdir()
        (self.folder / "notes.txt").write_text("operator file")
        module.activate(self.folder, self.pending, self.commit)
        builds = [p for p in self.folder.iterdir() if len(p.name) == 40]
        self.assertEqual(len(builds), 3)
        self.assertTrue(self.installer.exists())
        self.assertTrue((self.folder / "mobile").exists())
        self.assertTrue((self.folder / "notes.txt").exists())


if __name__ == "__main__":
    unittest.main()
