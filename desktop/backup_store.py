"""Stream a stopped desktop store. Never follow links or accept archive paths."""

import os
import sys
import tarfile
from pathlib import Path, PurePosixPath

ROOTS = {"postgres", "media", "cloud.credentials"}


def private_directory(path, **kwargs):
    # Windows inherits the app profile's explicit user SID ACL. Python's 0700
    # creates a protected OWNER RIGHTS ACL which can resolve to Administrators
    # for an elevated account; PostgreSQL deliberately drops that group.
    path.mkdir(mode=0o777 if os.name == "nt" else 0o700, **kwargs)


def pack(directory):
    root = Path(directory).resolve()
    if (root / "postgres/postmaster.pid").exists():
        raise ValueError("Stop PostgreSQL before taking a consistent backup")
    with tarfile.open(fileobj=sys.stdout.buffer, mode="w|") as archive:
        for name in sorted(ROOTS):
            path = root / name
            if not path.exists():
                continue
            paths = [path, *sorted(path.rglob("*"))] if path.is_dir() else [path]
            for item in paths:
                if item.is_symlink() or not item.resolve().is_relative_to(root):
                    raise ValueError("Backup cannot contain links")
                archive.add(
                    item, arcname=item.relative_to(root).as_posix(), recursive=False
                )


def unpack(directory):
    root = Path(directory).resolve()
    private_directory(root, parents=True, exist_ok=False)
    with tarfile.open(fileobj=sys.stdin.buffer, mode="r|") as archive:
        for item in archive:
            name = PurePosixPath(item.name)
            if (
                not name.parts
                or name.is_absolute()
                or ".." in name.parts
                or "\\" in item.name
                or name.parts[0] not in ROOTS
                or not (item.isdir() or item.isfile())
            ):
                raise ValueError("Invalid backup entry")
            destination = root.joinpath(*name.parts)
            if not destination.resolve().is_relative_to(root) or any(":" in part for part in name.parts):
                raise ValueError("Backup path escaped the store directory")
            if item.isdir():
                private_directory(destination, parents=True, exist_ok=True)
            else:
                private_directory(destination.parent, parents=True, exist_ok=True)
                with (
                    destination.open("xb") as output,
                    archive.extractfile(item) as source,
                ):
                    while data := source.read(1024 * 1024):
                        output.write(data)
                destination.chmod(0o600)
    version = (root / "postgres/PG_VERSION").read_text().strip()
    if version != "16" or not (root / "postgres/global/pg_control").is_file():
        raise ValueError("Unsupported or incomplete PostgreSQL backup")


if __name__ == "__main__":
    os.umask(0o077)
    {"pack": pack, "unpack": unpack}[sys.argv[1]](sys.argv[2])
