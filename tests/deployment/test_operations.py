"""Exercise backup failure recovery without touching an application or database."""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class BackupRecoveryTests(unittest.TestCase):
    def test_failed_backup_resumes_only_previously_running_writers(self):
        with tempfile.TemporaryDirectory(prefix="ilbi-backup-recovery-") as folder:
            root = Path(folder)
            (root / "ops").mkdir()
            (root / "bin").mkdir()
            shutil.copy2(ROOT / "ops/backup.sh", root / "ops/backup.sh")
            compose = root / "ops/compose.sh"
            compose.write_text(
                '#!/usr/bin/env bash\n'
                'printf "compose %s\\n" "$*" >> "$TEST_COMMAND_LOG"\n'
                'if [[ "$1" == ps ]]; then printf "ilbi\\ncelery_worker\\npostgres\\nfrontend\\n"; fi\n'
            )
            compose.chmod(0o700)
            python = root / "bin/python3"
            python.write_text('#!/usr/bin/env bash\nprintf "backup failed\\n" >> "$TEST_COMMAND_LOG"\nexit 18\n')
            python.chmod(0o700)
            log = root / "commands"
            result = subprocess.run(
                ["bash", str(root / "ops/backup.sh")],
                env={**os.environ, "PATH": f"{root}/bin:{os.environ['PATH']}", "TEST_COMMAND_LOG": str(log)},
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            self.assertEqual(result.returncode, 18, result.stderr)
            commands = log.read_text().splitlines()
            self.assertEqual(commands[-3:], [
                'compose stop ilbi celery_worker',
                'backup failed',
                'compose start --wait --wait-timeout 240 ilbi celery_worker',
            ])


if __name__ == "__main__":
    unittest.main()
