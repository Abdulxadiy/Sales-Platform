"""Exercise the workflow handoff scripts without GitHub writes or deployment."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class CiHandoffTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix="ilbi-ci-handoff-")
        self.addCleanup(self.scratch.cleanup)
        self.folder = Path(self.scratch.name)
        self.log = self.folder / "calls"
        self.output = self.folder / "outputs"
        gh = self.folder / "gh"
        gh.write_text(
            '#!/usr/bin/env bash\n'
            'printf "%s\\n" "$*" >> "$TEST_CALLS"\n'
            'if [[ "$1" == api ]]; then\n'
            '  [[ "${TEST_API_ERROR:-false}" == true ]] && exit 19\n'
            '  printf "%s\\n" "$TEST_MAIN_SHA"\n'
            'fi\n'
        )
        gh.chmod(0o700)
        self.env = {
            **os.environ,
            "PATH": f"{self.folder}:{os.environ['PATH']}",
            "TEST_CALLS": str(self.log),
            "TEST_MAIN_SHA": "2" * 40,
            "GITHUB_REPOSITORY": "example/project",
            "GITHUB_SHA": "1" * 40,
            "RELEASE_SHA": "2" * 40,
            "GITHUB_OUTPUT": str(self.output),
        }

    def run_script(self, path, **overrides):
        return subprocess.run(
            ["bash", str(ROOT / path)], env={**self.env, **overrides},
            capture_output=True, text=True, timeout=10, check=False,
        )

    def test_current_tested_main_can_deploy(self):
        result = self.run_script("ops/check_deploy_target.sh")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.output.read_text(), "current=true\n")

    def test_superseded_ci_commit_cannot_deploy(self):
        result = self.run_script("ops/check_deploy_target.sh", RELEASE_SHA="1" * 40)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.output.read_text(), "current=false\n")

    def test_failed_or_invalid_api_response_never_allows_deploy(self):
        for overrides in ({"TEST_API_ERROR": "true"}, {"TEST_MAIN_SHA": "invalid"}):
            with self.subTest(overrides=overrides):
                result = self.run_script("ops/check_deploy_target.sh", **overrides)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
