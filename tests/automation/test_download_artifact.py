"""The deploy boundary rejects tampered or unverified Windows installers."""

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("verify_downloads", ROOT / "desktop/verify_downloads.py")
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.folder = Path(scratch.name)
        (self.folder / "downloads").mkdir()
        (self.folder / "ilbi/release").mkdir(parents=True)
        self.name = "ILBI-Setup-1.2.0-x64.exe"
        self.installer = self.folder / "downloads" / self.name
        self.installer.write_bytes(b"MZ synthetic installer fixture")
        checksum = hashlib.sha256(self.installer.read_bytes()).hexdigest()
        self.manifest = {"version": "1.2.0", "nativeWindowsServiceVerified": True,
                         "sha256": checksum, "installerBytes": self.installer.stat().st_size}
        self.feed = {"windows": {"version": "1.2.0", "url": "/downloads/" + self.name,
                                 "sha256": checksum, "bytes": self.installer.stat().st_size}}
        self.save()

    def save(self):
        (self.folder / "downloads/releases.json").write_text(json.dumps(self.feed))
        (self.folder / "ilbi/release/desktop-build-manifest.json").write_text(json.dumps(self.manifest))

    def test_verified_installer_is_accepted(self):
        self.assertEqual(verifier.verify(self.folder), self.name)

    def test_tampered_installer_is_rejected(self):
        self.installer.write_bytes(b"MZ corrupted installer")
        with self.assertRaisesRegex(ValueError, "integrity"):
            verifier.verify(self.folder)

    def test_immutable_download_matches_exact_tested_commit(self):
        commit = "a" * 40
        (self.folder / "downloads" / commit).mkdir()
        self.installer.rename(self.folder / "downloads" / commit / self.name)
        self.feed["windows"]["url"] = f"/downloads/{commit}/{self.name}"
        self.feed["windows"]["sourceCommit"] = commit
        self.manifest["sourceCommit"] = commit
        self.save()
        self.assertEqual(verifier.verify(self.folder, commit), self.name)
        with self.assertRaisesRegex(ValueError, "source commit"):
            verifier.verify(self.folder, "b" * 40)

    def test_missing_native_test_or_wrong_version_is_rejected(self):
        for field, value in (("nativeWindowsServiceVerified", False), ("version", "0.0.0")):
            with self.subTest(field=field):
                original = self.manifest[field]
                self.manifest[field] = value
                self.save()
                with self.assertRaises(ValueError):
                    verifier.verify(self.folder)
                self.manifest[field] = original


if __name__ == "__main__":
    unittest.main()
