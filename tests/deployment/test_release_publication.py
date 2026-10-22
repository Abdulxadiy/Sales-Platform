"""Release retries must preserve published binaries and reject unverified builds."""

import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "desktop"))
from publish_release import publish  # noqa: E402
from release_version import check  # noqa: E402


class FakeGitHub:
    def __init__(self):
        self.release = None
        self.target = None
        self.uploads = []
        self.fail_upload = False

    def api(self, path, method="GET", payload=None, missing=False):
        if path.startswith("releases/assets/") and method == "DELETE":
            self.release["assets"] = [asset for asset in self.release["assets"] if asset.get("id") != int(path.rsplit("/", 1)[1])]
            return None
        if path.startswith("releases/tags/"):
            return copy.deepcopy(self.release)
        if path.startswith("git/ref/tags/"):
            return {"object": {"type": "commit", "sha": self.target}} if self.target else None
        if path == "releases" and method == "POST":
            self.release = {**payload, "id": 1, "assets": [], "html_url": "https://example.test/release"}
        elif method == "PATCH":
            self.release.update(payload)
            if not self.release["draft"]:
                self.target = self.release["target_commitish"]
        return copy.deepcopy(self.release)

    def upload(self, tag, path):
        if self.fail_upload:
            raise RuntimeError("Upload interrupted")
        self.uploads.append(path.name)
        self.release["assets"].append({"name": path.name, "size": path.stat().st_size,
                                       "state": "uploaded", "digest": "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()})


class ReleasePublicationTests(unittest.TestCase):
    def setUp(self):
        scratch = tempfile.TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        self.folder = Path(scratch.name)
        self.commit = "a" * 40
        self.version = check()
        directory = self.folder / "downloads" / self.commit
        directory.mkdir(parents=True)
        windows = directory / f"ILBI-Setup-{self.version}-x64.exe"
        linux = directory / f"ILBI-{self.version}-linux-x64.tar.gz"
        windows.write_bytes(b"MZ Windows fixture")
        linux.write_bytes(b"Linux fixture")
        feed = {"schema": 1}
        for platform, artifact in (("windows", windows), ("linux", linux)):
            feed[platform] = {"version": self.version, "sourceCommit": self.commit, "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
                              "bytes": artifact.stat().st_size, "url": f"/downloads/{self.commit}/{artifact.name}", "channel": "preview"}
        self.feed = feed
        (self.folder / "downloads/releases.json").write_text(json.dumps(feed))
        (self.folder / "downloads/releases-linux.json").write_text(json.dumps({"schema": 1, "linux": feed["linux"]}))
        self.win_manifest = self.folder / "ilbi/release/desktop-build-manifest.json"
        self.win_manifest.parent.mkdir(parents=True)
        self.win_manifest.write_text(json.dumps({**feed["windows"], "nativeWindowsServiceVerified": True, "installerBytes": windows.stat().st_size}))
        self.linux_manifest = self.folder / "ilbi/release-linux/linux-build-manifest.json"
        self.linux_manifest.parent.mkdir(parents=True)
        self.linux_manifest.write_text(json.dumps({**feed["linux"], "nativeLinuxVerified": True, "platform": "linux", "arch": "x64", "artifact": linux.name}))
        self.github = FakeGitHub()

    def test_publishes_both_verified_packages_checksums_and_exact_commit(self):
        result = publish(self.folder, self.commit, self.github)
        self.assertFalse(result["draft"])
        self.assertTrue(result["prerelease"])
        self.assertEqual(self.github.target, self.commit)
        self.assertEqual(set(self.github.uploads), {f"ILBI-Setup-{self.version}-x64.exe", f"ILBI-{self.version}-linux-x64.tar.gz", "SHA256SUMS.txt", "release-manifest.json"})
        self.assertIn(self.commit, result["body"])

    def test_later_web_commit_cannot_rewrite_a_published_release(self):
        publish(self.folder, self.commit, self.github)
        before = copy.deepcopy(self.github.release)
        uploads = list(self.github.uploads)
        publish(self.folder, "b" * 40, self.github)
        self.assertEqual(self.github.release, before)
        self.assertEqual(self.github.uploads, uploads)

    def test_interrupted_upload_stays_draft_and_retry_completes(self):
        self.github.fail_upload = True
        with self.assertRaisesRegex(RuntimeError, "interrupted"):
            publish(self.folder, self.commit, self.github)
        self.assertTrue(self.github.release["draft"])
        self.github.fail_upload = False
        publish(self.folder, self.commit, self.github)
        self.assertFalse(self.github.release["draft"])
        self.assertEqual(len(self.github.uploads), 4)

    def test_partial_draft_retry_verifies_existing_asset_instead_of_overwriting(self):
        self.github.fail_upload = True
        with self.assertRaises(RuntimeError):
            publish(self.folder, self.commit, self.github)
        self.github.fail_upload = False
        artifact = self.folder / "downloads" / self.commit / f"ILBI-Setup-{self.version}-x64.exe"
        self.github.upload("unused", artifact)
        publish(self.folder, self.commit, self.github)
        self.assertEqual(len(self.github.uploads), 4)

    def test_wrong_uploaded_digest_cannot_be_published(self):
        self.github.fail_upload = True
        with self.assertRaises(RuntimeError):
            publish(self.folder, self.commit, self.github)
        self.github.release["assets"] = [{"name": f"ILBI-Setup-{self.version}-x64.exe", "size": self.feed["windows"]["bytes"], "state": "uploaded", "digest": "sha256:" + "0" * 64}]
        with self.assertRaisesRegex(ValueError, "checksum"):
            publish(self.folder, self.commit, self.github)
        self.assertTrue(self.github.release["draft"])

    def test_interrupted_github_starter_asset_is_replaced_only_while_draft(self):
        self.github.fail_upload = True
        with self.assertRaises(RuntimeError):
            publish(self.folder, self.commit, self.github)
        self.github.fail_upload = False
        self.github.release["assets"] = [{"name": f"ILBI-Setup-{self.version}-x64.exe", "id": 23, "state": "starter", "size": 0}]
        result = publish(self.folder, self.commit, self.github)
        self.assertFalse(result["draft"])
        self.assertEqual(len(result["assets"]), 4)

    def test_mismatched_tag_is_not_moved(self):
        self.github.target = "b" * 40
        with self.assertRaisesRegex(ValueError, "different commit"):
            publish(self.folder, self.commit, self.github)
        self.assertIsNone(self.github.release)
        self.assertEqual(self.github.target, "b" * 40)

    def test_unverified_or_damaged_package_cannot_create_release(self):
        manifest = json.loads(self.win_manifest.read_text())
        manifest["nativeWindowsServiceVerified"] = False
        self.win_manifest.write_text(json.dumps(manifest))
        with self.assertRaises(ValueError):
            publish(self.folder, self.commit, self.github)
        self.assertIsNone(self.github.release)
        manifest["nativeWindowsServiceVerified"] = True
        self.win_manifest.write_text(json.dumps(manifest))
        (self.folder / "downloads" / self.commit / f"ILBI-{self.version}-linux-x64.tar.gz").write_bytes(b"corrupt")
        with self.assertRaisesRegex(ValueError, "integrity"):
            publish(self.folder, self.commit, self.github)
        self.assertIsNone(self.github.release)

    def test_mixed_platform_versions_cannot_create_release(self):
        wrong = self.feed["linux"].copy()
        wrong["version"] = "999.0.0"
        (self.folder / "downloads/releases-linux.json").write_text(json.dumps({"schema": 1, "linux": wrong}))
        with self.assertRaises(ValueError):
            publish(self.folder, self.commit, self.github)
        self.assertIsNone(self.github.release)


if __name__ == "__main__":
    unittest.main()
