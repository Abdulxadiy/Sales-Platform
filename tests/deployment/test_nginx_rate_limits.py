"""Rate-limit behavior against the unchanged production template in real Nginx.

Run from the repo root:
python3 -m unittest discover -s tests/deployment -p 'test_*edge.py' -v
python3 -m unittest discover -s tests/deployment -p 'test_nginx_rate_limits.py' -v

Only synthetic clients, certificates and an echo backend are used. No application
database, Redis, production environment files or external service is accessed.
"""

import json
import time
import unittest
import uuid

from test_https_edge import HOST, ProductionHttpsFixture, command

CLIENT_PROGRAM = """
import concurrent.futures
import http.client
import json
import ssl
import sys
import threading
import time

config = json.loads(sys.argv[1])
context = ssl.create_default_context(cafile='/fixture-tls/fullchain.pem')
local = threading.local()
def request(item):
    if not hasattr(local, 'connection'):
        local.connection = http.client.HTTPSConnection(config['host'], context=context, timeout=5)
    local.connection.request(
        item.get('method', 'POST'), item['path'], body=item.get('body', '{}'),
        headers={'Content-Type': 'application/json', 'X-Test-Run': config['run'], **item.get('headers', {})},
    )
    response = local.connection.getresponse()
    body = response.read().decode()
    return {'status': response.status, 'headers': dict(response.getheaders()), 'body': body}
started = time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=config['concurrency']) as pool:
    results = list(pool.map(request, config['requests']))
print(json.dumps({'results': results, 'elapsed': time.monotonic() - started}))
"""


class ProductionRateLimitTests(ProductionHttpsFixture, unittest.TestCase):
    def setUp(self):
        self.run_id = uuid.uuid4().hex
        self.client = self.new_client()

    def new_client(self):
        name = f"{self.network}-client-{uuid.uuid4().hex[:8]}"
        command(
            "docker",
            "run",
            "--pull=never",
            "--rm",
            "-d",
            "--name",
            name,
            "--network",
            self.network,
            "-v",
            f"{self.certs}:/fixture-tls:ro",
            "python:3.12-slim",
            "python",
            "-B",
            "-c",
            "import threading; threading.Event().wait(300)",
        )
        # Keep clients until class teardown: Docker may otherwise reuse an IP
        # while its rate-limit history still exists in the edge's shared zone.
        self.addClassCleanup(command, "docker", "rm", "-f", name)
        return name

    def requests(self, items, *, client=None, concurrency=1):
        config = {
            "host": HOST,
            "run": self.run_id,
            "requests": items,
            "concurrency": concurrency,
        }
        return json.loads(
            command(
                "docker",
                "exec",
                client or self.client,
                "python",
                "-B",
                "-c",
                CLIENT_PROGRAM,
                json.dumps(config),
            )
        )

    def backend_count(self):
        return json.loads(
            command(
                "docker",
                "exec",
                self.backend,
                "python",
                "-B",
                "-c",
                "import sys, urllib.request; "
                "url = 'http://localhost:8000/_fixture/count?run=' + sys.argv[1]; "
                "print(urllib.request.urlopen(url).read().decode())",
                self.run_id,
            )
        )["count"]

    def flood_auth(self):
        return self.requests([{"path": "/api/v1/auth/admin-login/"}] * 65)

    def assert_edge_rejection(self, result, retry_after="2"):
        self.assertEqual(result["status"], 429)
        headers = result["headers"]
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["Retry-After"], retry_after)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        self.assertEqual(headers["Strict-Transport-Security"], "max-age=3600")
        body = json.loads(result["body"])
        self.assertEqual(body["error"]["code"], "throttled")
        self.assertTrue(body["error"]["message"])
        self.assertIsNone(body["error"]["details"])

    def test_login_flood_returns_json_and_never_reaches_backend(self):
        batch = self.flood_auth()
        accepted = [item for item in batch["results"] if item["status"] == 200]
        rejected = [item for item in batch["results"] if item["status"] == 429]
        self.assertGreaterEqual(len(accepted), 31)
        self.assertLessEqual(len(accepted), 31 + int(batch["elapsed"]) + 1)
        self.assertTrue(rejected)
        for item in rejected:
            self.assert_edge_rejection(item)
        self.assertEqual(self.backend_count(), len(accepted))

    def test_all_sensitive_routes_and_uri_variants_share_the_auth_bucket(self):
        self.flood_auth()
        paths = [
            "/api/v1/auth/admin-login/?random=1",
            "/api/v1/auth/admin-login",
            "/api/v1/%61uth/admin-login/",
            "/api//v1/auth/admin-login/",
            "/api/v1/auth/admin-login/send-otp/",
            "/api/v1/auth/admin-login/verify-otp/",
            "/api/v1/auth/password-reset/request/",
            "/api/v1/auth/password-reset/verify/?token=synthetic",
            "/api/v1/auth/password-reset/confirm/",
            "/api/v1/auth/password-reset/resume/",
            "/api/v1/auth/password-reset/change-with-old/",
            "/api/v1/auth/change-password/",
        ]
        results = self.requests(
            [{"path": path, "method": "GET" if "reset/verify/" in path else "POST"} for path in paths]
        )["results"]
        for path, item in zip(paths, results, strict=True):
            with self.subTest(path=path):
                self.assert_edge_rejection(item)

    def test_spoofed_identity_headers_do_not_reset_the_limit(self):
        self.flood_auth()
        result = self.requests(
            [
                {
                    "path": f"/api/v1/auth/admin-login/?attempt={index}",
                    "headers": {
                        "X-Forwarded-For": f"198.51.100.{index + 1}",
                        "X-Real-IP": f"203.0.113.{index + 1}",
                        "CF-Connecting-IP": f"192.0.2.{index + 1}",
                        "Authorization": f"Bearer synthetic-{index}",
                    },
                }
                for index in range(8)
            ]
        )
        for item in result["results"]:
            self.assert_edge_rejection(item)

    def test_other_ip_and_business_api_keep_working_after_login_flood(self):
        other_client = self.new_client()
        self.flood_auth()
        results = self.requests(
            [
                {"path": "/api/v1/sales/sales/"},
                {"path": "/api/v1/catalog/products/", "method": "GET"},
                {"path": "/api/v1/auth/profile/", "method": "GET"},
                {"path": "/api/v1/auth/token/refresh/"},
                {"path": "/api/v1/auth/admin-login/telegram-status/"},
            ]
        )["results"]
        self.assertEqual([item["status"] for item in results], [200] * 5)
        result = self.requests([{"path": "/api/v1/auth/admin-login/"}], client=other_client)
        self.assertEqual(result["results"][0]["status"], 200)

    def test_limit_recovers_after_waiting_without_a_permanent_ip_block(self):
        self.flood_auth()
        self.assert_edge_rejection(self.requests([{"path": "/api/v1/auth/admin-login/"}])["results"][0])
        time.sleep(2.1)
        result = self.requests([{"path": "/api/v1/auth/admin-login/"}])["results"][0]
        self.assertEqual(result["status"], 200)

    def test_normal_multi_cashier_burst_passes_and_larger_flood_is_limited(self):
        # 80 simultaneous business requests stand in for cashiers sharing one IP.
        regular = self.requests([{"path": "/api/v1/catalog/products/", "method": "GET"}] * 80, concurrency=16)
        self.assertEqual([item["status"] for item in regular["results"]], [200] * 80)
        flood = self.requests(
            [{"path": f"/api/v1/sales/sales/?attempt={index}"} for index in range(500)], concurrency=16
        )
        statuses = [item["status"] for item in flood["results"]]
        self.assertTrue(set(statuses).issubset({200, 429}))
        self.assertIn(429, statuses)
        self.assertEqual(self.backend_count(), 80 + statuses.count(200))
        self.assert_edge_rejection(next(item for item in flood["results"] if item["status"] == 429), "1")
        # Static/frontend/media requests do not spend or depend on the API budget.
        independent = self.requests(
            [
                {"path": "/", "method": "GET"},
                {"path": "/assets/fixture.js", "method": "GET"},
                {"path": "/media/fixture.png", "method": "GET"},
                {"path": "/api/v1/auth/admin-login/"},
            ]
        )["results"]
        self.assertEqual([item["status"] for item in independent], [200] * 4)

    def test_parallel_connections_use_a_single_budget_across_workers(self):
        batch = self.requests([{"path": "/api/v1/auth/admin-login/"}] * 100, concurrency=24)
        statuses = [item["status"] for item in batch["results"]]
        self.assertTrue(set(statuses).issubset({200, 429}))
        self.assertIn(429, statuses)
        self.assertLessEqual(statuses.count(200), 31 + int(batch["elapsed"]) + 1)
        self.assertEqual(self.backend_count(), statuses.count(200))
        lines = command("docker", "exec", self.edge, "cat", "/var/log/nginx/fixture-access.log").splitlines()
        workers = {line.split()[0] for line in lines if line.endswith(f" {self.run_id}")}
        self.assertEqual(len(workers), 2, "Both real Nginx workers must have served requests")

    def test_upstream_throttle_response_is_preserved(self):
        item = self.requests([{"path": "/api/fixture-throttled/"}])["results"][0]
        self.assertEqual(item["status"], 429)
        self.assertEqual(item["headers"]["Retry-After"], "73")
        self.assertEqual(json.loads(item["body"])["error"]["code"], "fixture_limit")

    def test_allowed_requests_preserve_json_body_method_and_proxy_boundary(self):
        for path in (
            "/api/v1/auth/admin-login/",
            "/api/v1/auth/admin-login/send-otp/",
            "/api/v1/auth/admin-login/verify-otp/",
            "/api/v1/sales/sales/",
        ):
            with self.subTest(path=path):
                payload = '{"fixture":"synthetic","amount":100}'
                item = self.requests(
                    [
                        {
                            "path": path,
                            "body": payload,
                            "headers": {
                                "X-Forwarded-Proto": "http",
                                "X-Forwarded-For": "198.51.100.1",
                            },
                        }
                    ]
                )["results"][0]
                self.assertEqual(item["status"], 200)
                body = {key.lower(): value for key, value in json.loads(item["body"]).items()}
                self.assertEqual(body["_test_method"], "POST")
                self.assertEqual(body["_test_body"], payload)
                self.assertEqual(body["_test_path"], path)
                self.assertEqual(body["x-forwarded-proto"], "https")
                self.assertNotEqual(body["x-forwarded-for"], "198.51.100.1")


if __name__ == "__main__":
    unittest.main()
