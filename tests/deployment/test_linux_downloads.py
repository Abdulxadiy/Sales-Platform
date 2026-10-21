"""Unverified Linux artifacts must never enter the combined production feed."""
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("verify_linux", ROOT / "desktop/verify_linux_downloads.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LinuxDownloadTests(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.folder = Path(scratch.name)
        self.commit = "a" * 40
        name = "ILBI-1.2.0-linux-x64.tar.gz"
        (self.folder / "downloads" / self.commit).mkdir(parents=True)
        self.artifact = self.folder / "downloads" / self.commit / name
        self.artifact.write_bytes(b"Linux archive fixture")
        digest = hashlib.sha256(self.artifact.read_bytes()).hexdigest()
        self.manifest = {"version": "1.2.0", "platform": "linux", "arch": "x64", "artifact": name,
                         "sourceCommit": self.commit, "nativeLinuxVerified": True,
                         "sha256": digest, "bytes": self.artifact.stat().st_size}
        self.path = self.folder / "ilbi/release-linux/linux-build-manifest.json"
        self.path.parent.mkdir(parents=True)
        self.path.write_text(json.dumps(self.manifest))
        (self.folder / "downloads/releases-linux.json").write_text(json.dumps({"schema": 1, "linux": {
            "version": "1.2.0", "sourceCommit": self.commit, "url": f"/downloads/{self.commit}/{name}",
            "sha256": digest, "bytes": self.artifact.stat().st_size}}))
        self.feed = self.folder / "downloads/releases.json"
        self.feed.write_text(json.dumps({"schema": 1, "windows": {"sourceCommit": self.commit}, "mobile": None}))
        self.previous = self.feed.read_bytes()

    def test_verified_native_package_merges_without_losing_windows(self):
        module.verify(self.folder, self.commit)
        feed = json.loads(self.feed.read_text())
        self.assertEqual(feed["windows"]["sourceCommit"], self.commit)
        self.assertEqual(feed["linux"]["sourceCommit"], self.commit)
        self.assertIsNone(feed["mobile"])

    def test_corrupt_or_unverified_linux_never_changes_pending_windows_feed(self):
        self.manifest["nativeLinuxVerified"] = False
        self.path.write_text(json.dumps(self.manifest))
        with self.assertRaises(ValueError):
            module.verify(self.folder, self.commit)
        self.assertEqual(self.feed.read_bytes(), self.previous)
        self.manifest["nativeLinuxVerified"] = True
        self.path.write_text(json.dumps(self.manifest))
        self.artifact.write_bytes(b"truncated")
        with self.assertRaisesRegex(ValueError, "integrity"):
            module.verify(self.folder, self.commit)
        self.assertEqual(self.feed.read_bytes(), self.previous)

    def test_mixed_commits_are_rejected(self):
        with self.assertRaises(ValueError):
            module.verify(self.folder, "b" * 40)
        self.assertEqual(self.feed.read_bytes(), self.previous)
