"""Stage an explicitly verified PostgreSQL distribution for the Windows installer."""
import argparse
import hashlib
import shutil
import tempfile
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("archive", type=Path, help="EDB Windows x64 binaries ZIP")
parser.add_argument("--sha256", required=True)
args = parser.parse_args()
if hashlib.file_digest(args.archive.open("rb"), "sha256").hexdigest() != args.sha256.lower():
    raise SystemExit("PostgreSQL ZIP checksum mismatch")
target = Path(__file__).resolve().parent / "ilbi/resources/postgres"
if target.exists():
    raise SystemExit("Staged PostgreSQL already exists; inspect it before replacing")
with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    with zipfile.ZipFile(args.archive) as archive:
        for name in archive.namelist():
            if not (root / name).resolve().is_relative_to(root.resolve()):
                raise SystemExit("Unsafe archive member")
        archive.extractall(root)
    binary = next(root.rglob("initdb.exe"), None)
    if binary is None:
        raise SystemExit("Windows PostgreSQL bin/initdb.exe missing")
    source = binary.parent.parent
    if not all((source / "bin" / name).exists() for name in ["pg_ctl.exe", "postgres.exe", "psql.exe", "createdb.exe"]):
        raise SystemExit("Incomplete PostgreSQL distribution")
    shutil.copytree(source, target)
