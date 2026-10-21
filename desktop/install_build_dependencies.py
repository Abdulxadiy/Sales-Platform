"""Resolve the Windows build from the application's committed Python lockfile."""
import subprocess
import sys
import tomllib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
lock = tomllib.loads((root / "ilbi/uv.lock").read_text())
excluded = {"ilbi", "gevent", "greenlet", "gunicorn", "psycopg2", "ruff", "factory-boy", "pytest", "pytest-cov",
            "pytest-django", "coverage", "iniconfig", "pluggy", "pygments", "django-stubs-ext", "django-stubs", "djangorestframework-stubs"}
requirements = sorted({f"{item['name']}=={item['version']}" for item in lock["package"]
                       if item["name"] not in excluded and "version" in item and "registry" in item.get("source", {})})
subprocess.run([sys.executable, "-m", "pip", "install", *requirements,
                "psycopg2-binary>=2.9.12,<3", "waitress==3.0.2", "pyinstaller>=6.16,<7"], check=True)
