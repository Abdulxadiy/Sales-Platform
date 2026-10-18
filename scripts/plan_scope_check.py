#!/usr/bin/env python3
"""Scope guard: fail when changed files fall outside docs/plan_scope.json for the given phase.
Usage: python scripts/plan_scope_check.py phase4 [--base origin/main]"""
import fnmatch
import json
import subprocess
import sys
from pathlib import Path


def changed_files(base: str) -> list[str]:
    cmds = [
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        ["git", "diff", "--name-only"],
        ["git", "diff", "--name-only", "--cached"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    ]
    out: set[str] = set()
    for cmd in cmds:
        res = subprocess.run(cmd, capture_output=True, text=True)
        out.update(line.strip() for line in res.stdout.splitlines() if line.strip())
    return sorted(out)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    phase = sys.argv[1]
    base = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else "origin/main"
    scope = json.loads(Path("docs/plan_scope.json").read_text(encoding="utf-8"))
    if phase not in scope:
        print(f"Unknown phase key: {phase}")
        return 2
    allowed = scope["always"] + scope[phase]
    bad = [f for f in changed_files(base) if not any(fnmatch.fnmatch(f, g) for g in allowed)]
    if bad:
        print("OUT-OF-SCOPE CHANGES (revert them or justify in docs/PLAN_NOTES.md and extend docs/plan_scope.json):")
        for f in bad:
            print("  -", f)
        return 1
    print(f"scope OK for {phase}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
