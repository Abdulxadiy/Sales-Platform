"""Daily limits, release versions and refreshes tested with real disposable Git repos."""

import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from pathlib import Path

import test_commit_queue as support

queue = support.queue


class DailyReleaseTests(unittest.TestCase):
    def setUp(self):
        self.fixture = support.PublisherTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.repo = self.fixture.repo
        self.settings = {
            **self.fixture.settings,
            "repository": "example/project",
            "daily": {"minimum": 15, "target_min": 18, "target_max": 22, "maximum": 25},
        }

    def groups(self, count):
        return [{"id": f"change-{i}", "message": "docs: meaningful update", "paths": [f"docs/{i}.md"]} for i in range(count)]

    def test_daily_packages_stay_in_range_and_never_invent_work(self):
        for count in range(90):
            selected = queue.choose_groups(self.groups(count), self.settings, "2026-10-16")
            if count < 15:
                self.assertEqual(selected, [])
            else:
                self.assertGreaterEqual(len(selected), 15)
                self.assertLessEqual(len(selected), 24)
                self.assertEqual(selected, self.groups(count)[:len(selected)])

    def test_coupled_application_changes_never_split_across_days(self):
        groups = self.groups(40)
        for group in groups[:21]:
            group["atomic_unit"] = "application"
        selected = queue.choose_groups(groups, self.settings, "2026-10-16")
        self.assertGreaterEqual(len(selected), 21)
        self.assertLessEqual(len(selected), 24)
        groups[21]["atomic_unit"] = "application"
        groups[22]["atomic_unit"] = "application"
        groups[23]["atomic_unit"] = "application"
        groups[24]["atomic_unit"] = "application"
        with self.assertRaisesRegex(queue.QueueError, "exceeds"):
            queue.choose_groups(groups, self.settings, "2026-10-16")

    def test_local_release_hours_vary_and_are_retry_stable(self):
        date = datetime(2026, 10, 1)
        slots = []
        for i in range(100):
            day = (date + timedelta(days=i)).date().isoformat()
            slot = queue.daily_slot(self.settings, day)
            self.assertEqual(slot, queue.daily_slot(self.settings, day))
            self.assertTrue(0 <= slot[0] < 24)
            self.assertEqual(slot[1], 17)
            slots.append(slot[0])
        self.assertTrue(all(a != b for a, b in zip(slots, slots[1:])))

    def gate(self, progress=None, pending=20, manual=False, now=None):
        manifest = {"queue_id": "q", "groups": self.groups(pending)}
        with patch.object(queue, "github_json", side_effect=[manifest, progress or {}]):
            return queue.release_gate(self.settings, manual=manual, now=now or datetime(2026, 10, 16, 18, tzinfo=timezone.utc))

    def test_gate_retries_after_the_slot_and_skips_an_already_published_day(self):
        result = self.gate()
        self.assertTrue(result["due"])
        self.assertEqual(result["day"], "2026-10-16")
        self.assertFalse(self.gate({"days": {"2026-10-16": 20}})["due"])
        self.assertFalse(self.gate(pending=14)["due"])

    def test_gate_uses_tashkent_date_and_manual_only_bypasses_the_clock(self):
        early = datetime(2026, 10, 15, 19, 1, tzinfo=timezone.utc)
        self.assertEqual(self.gate(now=early)["day"], "2026-10-16")
        self.assertFalse(self.gate(now=early)["due"])
        self.assertTrue(self.gate(manual=True, now=early)["due"])
        self.assertFalse(self.gate(pending=4, manual=True, now=early)["due"])

    def test_versions_follow_change_semantics_instead_of_every_commit(self):
        docs = [{"message": "feat(branding): new artwork", "paths": ["branding/new.svg"]}]
        tests = [{"message": "fix(tests): improve coverage", "paths": ["ilbi/apps/catalog/tests/test_labels.py"]}]
        self.assertEqual(queue.release_level(docs + tests), 0)
        self.assertEqual(queue.release_level([{"message": "fix(catalog): correct labels", "paths": ["ilbi/api/labels.py"]}]), 1)
        self.assertEqual(queue.bump_version("0.13.1", 1), "0.13.2")
        self.assertEqual(queue.bump_version("0.13.1", 2), "0.14.0")
        self.assertEqual(queue.bump_version("0.13.1", 3), "1.0.0")

    def versioned_snapshot(self):
        f = self.fixture
        queue.git(self.repo, "checkout", "--detach", "--quiet", f.base)
        files = {
            "ilbi/pyproject.toml": '[project]\nname = "ilbi"\nversion = "1.2.3"\n',
            "ilbi/uv.lock": '[[package]]\nname = "ilbi"\nversion = "1.2.3"\n\n[[package]]\nname = "dependency"\nversion = "1.2.3"\n',
            "frontend/ilbi/package.json": json.dumps({"name": "app", "version": "0.0.0"}),
            "frontend/ilbi/package-lock.json": json.dumps({"name": "app", "version": "0.0.0", "packages": {"": {"version": "0.0.0"}, "node_modules/dependency": {"version": "1.2.3"}}}),
            "ilbi/app.py": "old\n",
        }
        for path, text in files.items():
            dest = self.repo / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text)
        f.commit("existing app")
        base = queue.output(self.repo, "rev-parse", "HEAD")
        queue.git(self.repo, "update-ref", "refs/remotes/origin/main", base)
        (self.repo / "ilbi/app.py").write_text("new feature\n")
        f.commit("source")
        snapshot = queue.output(self.repo, "rev-parse", "HEAD")
        queue.git(self.repo, "update-ref", "refs/remotes/origin/queue/ready", snapshot)
        manifest = {"version": 1, "queue_id": "versions", "base_sha": base, "groups": [{"id": "feature", "message": "feat(app): ship new feature", "paths": ["ilbi/app.py"]}]}
        return manifest

    def test_release_bumps_only_project_fields_and_keeps_dependency_versions(self):
        manifest = self.versioned_snapshot()
        state = queue.prepare_batch(self.repo, self.fixture.settings, manifest, {})
        self.assertEqual(state["release_tag"], "v1.3.0")
        self.assertEqual(queue.project_version(self.repo), "1.3.0")
        lock = (self.repo / "ilbi/uv.lock").read_text()
        self.assertIn('name = "dependency"\nversion = "1.2.3"', lock)
        front = json.loads((self.repo / "frontend/ilbi/package-lock.json").read_text())
        self.assertEqual(front["version"], "1.3.0")
        self.assertEqual(front["packages"][""]["version"], "1.3.0")
        self.assertEqual(front["packages"]["node_modules/dependency"]["version"], "1.2.3")
        self.assertEqual(queue.output(self.repo, "rev-list", "--count", f"{manifest['base_sha']}..HEAD"), "2")
        self.assertEqual(state["days"][next(iter(state["days"]))], 2)

    def test_only_docs_do_not_bump_version(self):
        manifest = self.versioned_snapshot()
        manifest["groups"][0]["message"] = "docs: explain behavior"
        manifest["groups"][0]["paths"] = ["later.txt"]
        # Replace the selected source with an actual documentation-only change.
        (self.repo / "guide.md").write_text("new documentation\n")
        self.fixture.commit("docs source")
        queue.git(self.repo, "update-ref", "refs/remotes/origin/queue/ready", queue.output(self.repo, "rev-parse", "HEAD"))
        manifest["groups"][0]["paths"] = ["guide.md"]
        state = queue.prepare_batch(self.repo, self.fixture.settings, manifest, {})
        self.assertIsNone(state["release_tag"])
        self.assertEqual(queue.project_version(self.repo), "1.2.3")

    def test_today_cannot_be_published_twice_after_refresh(self):
        progress = {"version": 1, "queue_id": "q1", "completed": [], "last_main_sha": self.fixture.base, "days": {"2026-10-16": 21}}
        before = queue.output(self.repo, "rev-parse", "HEAD")
        result = queue.prepare_batch(self.repo, self.settings, self.fixture.manifest, progress, today="2026-10-16")
        self.assertIsNone(result)
        self.assertEqual(queue.output(self.repo, "rev-parse", "HEAD"), before)

    def test_classification_keeps_renamed_runtime_paths_in_the_atomic_unit(self):
        plan = {"auto_classify": True, "atomic_groups": ["api", "ilbi-rebranding"], "groups": [
            {"id": "api", "message": "feat(api): reviewed endpoints", "paths": ["ilbi/api.py"]},
            {"id": "guide", "message": "docs: guide", "paths": ["guide.md"]},
            {"id": "ilbi-rebranding", "message": "feat(branding): rename platform", "paths": []},
        ]}
        groups = queue.reviewed_groups(plan, {"ilbi/api.py", "frontend/ilbi/src/new.jsx", "guide.md"})
        self.assertEqual([g["id"] for g in groups], ["api", "ilbi-rebranding", "guide"])
        self.assertEqual(groups[0]["atomic_unit"], groups[1]["atomic_unit"])
        self.assertIn("frontend/ilbi/src/new.jsx", groups[1]["paths"])

    def test_refresh_preserves_undelivered_files_history_and_daily_counts(self):
        f = self.fixture
        remote = Path(f.tmp.name) / "remote.git"
        queue.run(["git", "init", "--bare", "-q", str(remote)])
        queue.git(self.repo, "remote", "add", "origin", str(remote))
        (self.repo / queue.MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        (self.repo / queue.MANIFEST).write_text(json.dumps(f.manifest))
        f.commit("old frozen queue")
        old_queue = queue.output(self.repo, "rev-parse", "HEAD")
        queue.git(self.repo, "read-tree", "--empty")
        state = {"queue_id": "q1", "completed": ["first"], "last_main_sha": f.base, "days": {"2026-10-16": 20}}
        (self.repo / queue.STATE).write_text(json.dumps(state))
        queue.git(self.repo, "add", queue.STATE)
        state_sha = queue.tree_commit(self.repo, queue.output(self.repo, "write-tree"), [], "state", f.settings, bot=True)
        queue.git(self.repo, "reset", "--hard", old_queue)
        queue.git(self.repo, "clean", "-ffdx")
        queue.git(self.repo, "push", "-q", "origin", f"{f.base}:refs/heads/main", f"{f.snapshot}:refs/heads/backup/work-in-progress", f"{old_queue}:refs/heads/queue/ready", f"{state_sha}:refs/heads/queue/progress")
        plan = self.repo / "automation/queue-plan.json"
        plan.parent.mkdir(exist_ok=True)
        plan.write_text(json.dumps({"groups": f.groups}))
        settings = {**f.settings, "remote": str(remote)}
        before = queue.output(self.repo, "status", "--porcelain")
        with self.assertRaisesRegex(queue.QueueError, "still active"):
            queue.enqueue(self.repo, settings)
        queue.enqueue(self.repo, settings, refresh=True)
        new_queue = queue.output(remote, "rev-parse", "refs/heads/queue/ready")
        self.assertIn(old_queue, queue.output(remote, "show", "-s", "--format=%P", new_queue))
        manifest = queue.read_json(remote, new_queue, queue.MANIFEST)
        self.assertEqual(len(manifest["groups"]), 3)
        progress_sha = queue.output(remote, "rev-parse", "refs/heads/queue/progress")
        progress = queue.read_json(remote, progress_sha, queue.STATE)
        self.assertEqual(progress["days"], state["days"])
        self.assertEqual(progress["last_main_sha"], f.base)
        self.assertEqual(queue.output(remote, "show", f"{new_queue}:new file.txt"), "real addition")
        self.assertEqual(queue.output(self.repo, "status", "--porcelain"), before)
        queue.enqueue(self.repo, settings, refresh=True)
        self.assertEqual(queue.output(remote, "rev-parse", "refs/heads/queue/ready"), new_queue)
        self.assertEqual(queue.output(remote, "rev-parse", "refs/heads/queue/progress"), progress_sha)

    def test_main_progress_and_version_tag_are_one_atomic_delivery(self):
        manifest = self.versioned_snapshot()
        f = self.fixture
        remote = Path(f.tmp.name) / "remote.git"
        queue.run(["git", "init", "--bare", "-q", str(remote)])
        queue.git(self.repo, "remote", "add", "origin", str(remote))
        queue.git(self.repo, "push", "-q", "origin", f"{manifest['base_sha']}:refs/heads/main")
        (self.repo / queue.MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        (self.repo / queue.MANIFEST).write_text(json.dumps(manifest))
        f.commit("versioned queue")
        queue.git(self.repo, "update-ref", "refs/remotes/origin/queue/ready", queue.output(self.repo, "rev-parse", "HEAD"))
        with patch.object(queue, "remote_clone") as clone:
            clone.return_value.__enter__.return_value = self.repo
            queue.publish(f.settings)
        head = queue.output(remote, "rev-parse", "refs/heads/main")
        self.assertEqual(queue.output(remote, "rev-parse", "refs/tags/v1.3.0^{}"), head)
        progress = queue.read_json(remote, queue.output(remote, "rev-parse", "refs/heads/queue/progress"), queue.STATE)
        self.assertEqual(progress["last_main_sha"], head)
        self.assertEqual(progress["release_tag"], "v1.3.0")
