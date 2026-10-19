"""Activation failure paths, without Docker, real ACME requests or privileged writes."""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
