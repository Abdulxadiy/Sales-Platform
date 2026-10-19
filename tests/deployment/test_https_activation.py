"""Activation failure paths, without Docker, real ACME requests or privileged writes."""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


class HttpsActivationTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix="ilbi-activation-test-")
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        (self.root / "ops").mkdir()
        (self.root / "bin").mkdir()
        shutil.copy2(ROOT / "ops/enable_https.sh", self.root / "ops/enable_https.sh")
        self.log = self.root / "commands"
        self.env_file = self.root / ".env.production"
        self.env_file.write_text(
            "PUBLIC_HOST=localhost\nEXPECTED_PUBLIC_IPV4=127.0.0.1\nEDGE_BIND_ADDRESS=127.0.0.1\n"
        )
        self.stub(self.root / "ops/compose.sh", 'printf "compose %s\\n" "$*" >> "$TEST_COMMAND_LOG"\n')
        self.stub(
            self.root / "bin/sudo",
            'printf "sudo %s\\n" "$*" >> "$TEST_COMMAND_LOG"\n'
            '[[ "$1" == -n ]] && exit 0\n'
            '[[ "$1" == certbot ]] && exit 42\nexit 99\n',
        )

    @staticmethod
    def stub(path, contents):
        path.write_text("#!/usr/bin/env bash\n" + contents)
        path.chmod(0o700)

    def run_activation(self):
        return subprocess.run(
            ["bash", str(self.root / "ops/enable_https.sh")],
            env={**os.environ, "PATH": f"{self.root}/bin:{os.environ['PATH']}", "TEST_COMMAND_LOG": str(self.log)},
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )

    def test_dns_mismatch_changes_nothing(self):
        before = self.env_file.read_text().replace("EXPECTED_PUBLIC_IPV4=127.0.0.1", "EXPECTED_PUBLIC_IPV4=127.0.0.2")
        self.env_file.write_text(before)
        result = self.run_activation()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DNS is not ready", result.stderr)
        self.assertEqual(self.env_file.read_text(), before)
        self.assertFalse(self.log.exists())

    def test_certificate_failure_restores_private_frontend(self):
        before = self.env_file.read_bytes()
        result = self.run_activation()
        self.assertEqual(result.returncode, 42, result.stderr)
        commands = self.log.read_text().splitlines()
        self.assertIn("compose stop frontend", commands)
        self.assertEqual(commands[-1], "compose up -d --no-build frontend")
        self.assertEqual(self.env_file.read_bytes(), before)

    def prepare_successful_certbot(self):
        self.stub(self.root / "bin/sudo", 'printf "sudo %s\\n" "$*" >> "$TEST_COMMAND_LOG"\nexit 0\n')
        self.stub(
            self.root / "bin/curl",
            'bind=$(sed -n "s/^EDGE_BIND_ADDRESS=//p" .env.production)\n'
            'printf "curl %s\\n" "$bind" >> "$TEST_COMMAND_LOG"\n'
            '[[ "${TEST_CURL_FAIL_AT:-}" == "$bind" ]] && exit 60\nexit 0\n',
        )

    def test_invalid_certificate_is_never_published(self):
        self.prepare_successful_certbot()
        before = self.env_file.read_bytes()
        with patch.dict(os.environ, {"TEST_CURL_FAIL_AT": "127.0.0.1"}):
            result = self.run_activation()
        self.assertEqual(result.returncode, 60, result.stderr)
        self.assertEqual(self.env_file.read_bytes(), before)
        self.assertNotIn("curl 0.0.0.0", self.log.read_text())

    def test_public_start_failure_restores_private_binding(self):
        self.prepare_successful_certbot()
        with patch.dict(os.environ, {"TEST_CURL_FAIL_AT": "0.0.0.0"}):
            result = self.run_activation()
        self.assertEqual(result.returncode, 60, result.stderr)
        self.assertIn("EDGE_BIND_ADDRESS=127.0.0.1\n", self.env_file.read_text())
        self.assertEqual(self.log.read_text().splitlines()[-1], "compose up -d --no-build frontend")

    def test_trusted_private_https_is_checked_before_publishing(self):
        self.prepare_successful_certbot()
        result = self.run_activation()
        self.assertEqual(result.returncode, 0, result.stderr)
        checks = [line for line in self.log.read_text().splitlines() if line.startswith("curl ")]
        self.assertEqual(checks, ["curl 127.0.0.1", "curl 0.0.0.0"])
        self.assertIn("EDGE_BIND_ADDRESS=0.0.0.0\n", self.env_file.read_text())
        self.assertEqual(self.env_file.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
