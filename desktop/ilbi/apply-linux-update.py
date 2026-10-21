"""Apply a verified archive using the per-user atomic installer. No store files move."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile


def apply(job):
    archive = Path(job['archive'])
    if archive.stat().st_size != job['bytes']:
        raise ValueError('Paket to‘liq yuklanmagan.')
    with archive.open('rb') as source:
        if hashlib.file_digest(source, 'sha256').hexdigest() != job['sha256']:
            raise ValueError('Paket tekshiruvdan o‘tmadi.')
    with tempfile.TemporaryDirectory(prefix='install-', dir=archive.parent) as directory:
        with tarfile.open(archive) as package:
            # Reject escaping links and paths; do not extract special devices.
            package.extractall(directory, filter='data')
        root = Path(directory) / 'ILBI'
        # Identity is already protected by SHA-256 of the complete CI archive.
        if not (root / 'ilbi').is_file() or not (root / 'install.sh').is_file():
            raise ValueError('ILBI paketi to‘liq emas.')
        environment = {**os.environ, 'XDG_DATA_HOME': job['dataHome'], 'ILBI_INSTALL_BIN_DIR': job['binDirectory']}
        subprocess.run(['bash', str(root / 'install.sh')], env=environment, check=True, capture_output=True)


if __name__ == '__main__':
    apply(json.loads(Path(sys.argv[1]).read_text()))
