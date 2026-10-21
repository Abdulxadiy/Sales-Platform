"""Build on Windows, or build a native Linux runtime for integration verification."""
import os
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    import PyInstaller.__main__
    ilbi = ROOT / "ilbi"
    destination = ROOT / "desktop/ilbi/resources/backend"
    # Collect dynamic Django app modules from the repository, never deployment
    # secrets, user media, backups or the developer's virtual environment.
    modules = []
    for directory in [ilbi / "apps", ilbi / "api", ilbi / "config"]:
        for path in directory.rglob("*.py"):
            if "tests" in path.parts or path.name.startswith("test_"):
                continue
            name = ".".join(path.relative_to(ilbi).with_suffix("").parts)
            modules.append(name.removesuffix(".__init__"))
    arguments = [str(ROOT / "desktop/runtime.py"), "--name=ilbi-runtime", "--onedir", "--noconfirm", "--clean",
                 f"--paths={ilbi}", f"--distpath={destination}", f"--workpath={ROOT / 'desktop/ilbi/build/backend'}",
                 f"--specpath={ROOT / 'desktop/ilbi/build'}", f"--add-data={ilbi / 'pyproject.toml'}:.",
                 "--collect-data=django", "--collect-data=rest_framework", "--collect-submodules=rest_framework_simplejwt",
                 "--collect-submodules=django_filters", "--collect-submodules=drf_spectacular", "--hidden-import=psycopg2",
                 "--hidden-import=cryptography.fernet", "--hidden-import=waitress"]
    arguments.extend(f"--hidden-import={name}" for name in modules)
    PyInstaller.__main__.run(arguments)


if __name__ == "__main__":
    main()
