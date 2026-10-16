# ILBI Platform

ILBI is an enterprise-grade multi-tenant retail and wholesale sales platform designed for inventory tracking, point-of-sale (POS) operations, cash register (cashbox) accounting, debt management, and B2B commerce.

---

## Tech Stack

- **Backend**: Python 3.12, Django (version constrained in `ilbi/pyproject.toml`), Django REST Framework, Celery, Gunicorn + Gevent
- **Database & Cache**: PostgreSQL 16, Redis 7
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons
- **Proxy & Server**: Nginx, Docker, Docker Compose
- **Telegram Services**: Aiogram 3 (2FA SMS and notification bot)
- **API Documentation**: OpenAPI 3 / drf-spectacular (Swagger UI & Redoc)

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)
- [uv](https://docs.astral.sh/uv/) (Python package manager, optional for bare-metal development)
- [Node.js](https://nodejs.org/) v22+ & npm (optional for bare-metal frontend development)

### 1. Environment Setup

Copy example environment files to configure your local environment:

```bash
cp .env.example .env
cp ilbi/.env.example ilbi/.env
cp telegram_bot_sms/.env.example telegram_bot_sms/.env
```

Review and adjust variables in all three environment files. Use matching PostgreSQL credentials and internal service tokens. For local development set `DJANGO_DEBUG=True`; enable synthetic demo login only when explicitly needed.

---

## Running the Application

### Development (Docker Compose)

Start the entire platform including backend, frontend, database, redis, celery, and nginx:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost/api/v1/
- **API Documentation (Swagger)**: http://localhost/api/docs/
- **API Documentation (Redoc)**: http://localhost/api/redoc/

The frontend root `/` is ILBI's public presentation page. Sign-in stays at `/login`; authenticated work starts at `/dashboard`. The presentation follows native scrolling in both directions, including a four-stage sales story. Reduced-motion preferences and short windows retain the complete, unpinned presentation.

### Bare-Metal Development (Manual)

#### Backend:
```bash
cd ilbi
uv sync
uv run python manage.py migrate
uv run python manage.py runserver 0.0.0.0:8000
```

#### Frontend:
```bash
cd frontend/ilbi
npm install
npm run dev
```

---

## Running Tests

Run the backend test suite using the isolated test database stack:

```bash
# 1. Start test Postgres and Redis
docker compose -f ilbi/docker-compose.test.yml up -d

# 2. Run pytest with coverage
cd ilbi
uv run pytest
```

Run frontend linting:

```bash
cd frontend/ilbi
npm run lint
```

To check the built public page, its reversible scroll effects, mobile layouts and sign-in routing in Chrome:

```bash
cd frontend/ilbi
npm run build
npm run test:landing
```

These browser checks use synthetic API responses and never sign in to or write to a real backend. Screenshots and the JSON report are saved under `branding/ilbi-motion-studio/qa/landing/`; set `ILBI_LANDING_QA_DIR` to choose another output directory.

---

## Production Deployment

Production uses a separate Compose file with a built React bundle served by Nginx. The development Vite server is used only by `docker-compose.yml`.

1. Prepare separate production environment files on the server:

```bash
cp .env.production.example .env.production
cp ilbi/.env.production.example ilbi/.env.production
cp telegram_bot_sms/.env.production.example telegram_bot_sms/.env.production
```

2. Set `PUBLIC_HOST` to the canonical domain in `.env.production`. Use unique production secrets, matching database credentials in the root/backend files, and matching bot/internal tokens in the backend/bot files. Set the real SMTP credentials in the backend file. Production does not load the local development `.env`.
3. Obtain a trusted TLS certificate for `PUBLIC_HOST`. Put the resolved certificate chain in `fullchain.pem` and its private key in `privkey.pem` under the absolute directory specified by `TLS_CERT_DIR`. Do not use symlinks pointing outside that directory. The directory is mounted read-only; a missing directory or certificate makes startup fail. Keep the private key outside the repository. After renewal, update these resolved files, validate with `docker compose --env-file .env.production -f docker-compose.prod.yml exec frontend nginx -t`, and reload with the same command ending in `nginx -s reload`.
4. Validate the deployment configuration and production settings before launching:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config -q
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --no-deps --entrypoint python ilbi manage.py check --deploy
```

5. Launch the production layout only after the remaining release requirements are met:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Only frontend ports 80/443 are published. Nginx terminates TLS, redirects HTTP to the configured HTTPS domain, rejects unknown hosts, and overwrites client-supplied proxy headers. Django trusts this private edge, sets secure session/CSRF cookies, and redirects public HTTP requests. Existing authenticated `/api/v1/internal/` service calls remain HTTP inside Docker; the public edge blocks this entire prefix. The backend must not be published directly. An additional load balancer or CDN requires its own reviewed proxy configuration; do not forward arbitrary client `X-Forwarded-*` headers through this edge.

The production edge also applies separate per-IP request budgets in [nginx.prod.conf](frontend/ilbi/nginx.prod.conf): login, OTP send/verify, password reset and password changes share a sustained **60 requests/minute**, with `burst=30`; the remaining `/api/` routes share **60 requests/second**, with `burst=120`. These use Nginx's leaky-bucket accounting with `nodelay`, rather than fixed minute/second windows. A short burst can pass immediately; excess requests receive `429` before reaching Django. Login abuse does not consume the business API budget. Token refresh, profile reads and Telegram-link status use the general API budget. Static files, the SPA and media do not use these API counters. Existing account/OTP/DRF limits remain in force.

Edge-generated `429` responses use the application's JSON error shape, `Cache-Control: no-store`, security headers and `Retry-After` of 2 seconds for auth or 1 second for the general API. Ongoing traffic from the same IP can require waiting longer. Application-generated `429` responses retain their own body and retry delay. Counters use the socket peer IP, ignore supplied identity headers and are shared by workers of one Nginx instance; separate edge instances have separate budgets. Review the initial rates against actual peak traffic from stores sharing an IP. Keep new sensitive auth routes in the explicit auth map. See [Nginx request limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html).

Cloudflare/WAF/DDoS protection is a separate deployment step and is not activated by this configuration. Before putting a CDN or load balancer in front, configure real visitor IP restoration using only explicitly trusted proxy ranges and prevent direct origin bypass; otherwise limits count the proxy's shared IP. Do not trust arbitrary `CF-Connecting-IP` or `X-Forwarded-For` headers. These local Nginx checks do not simulate a network-scale DDoS attack.

Production uses `config.settings_production`, rejects debug/demo mode and wildcard hosts, requires an HTTPS frontend origin matching `ALLOWED_HOSTS`, and disables Gunicorn reload even if its environment flag is enabled. Development continues to use its existing `.env` and `config.settings`.

Accounts tagged with `ilbi_local_demo` or the legacy `inventra_local_demo` group are rejected whenever either local demo switch is off. This covers new password login, previously issued access/refresh tokens, existing Telegram login tickets, password-reset/invitation links and password changes through the old-password endpoint. The persistent group marker still applies after editing a demo account's username or phone. Support notification tasks also exclude blocked demo admins, including personal/group preferences and legacy operator-phone recipients. Local synthetic demos continue working only with both debug and demo mode explicitly enabled. Deploying this policy requires updating the backend and Celery worker; it does not delete accounts or replace production secrets.

Production sets `API_DOCS_ENABLED=False`: the technical `/api/schema/`, `/api/docs/` (Swagger) and `/api/redoc/` routes return 404. Development and test settings keep them available. Product help at `/docs` and `/api/v1/docs/`, support and business APIs keep their existing routes and permissions. Offline schema generation with `manage.py spectacular --validate --fail-on-warn` remains available, including with production settings; protect any exported schema file as an operator artefact.

Access and refresh JWTs must include an integer `token_version` matching the account's current version. Missing, null, boolean, float, string and mismatched versions are rejected with 401. Existing legacy sessions without this claim must sign in again after deployment; normally issued current tokens continue working. Password changes revoke earlier access and refresh tokens through the existing account version increment.

Production also requires an explicit `redis://` or `rediss://` `REDIS_URL`. The default Django cache uses this shared Redis with a domain-specific production prefix. Public receipt requests keep their existing limit of 60/minute per client IP, and store creation keeps 5/day per owner; workers and replicas now share the same history. Support keeps its separate cache alias/prefix, and login keeps its existing Redis keys. Redis must remain available; there is no fallback to local counters. These existing DRF throttles use non-atomic cache operations, so simultaneous bursts can still exceed the nominal limit; this change does not provide strict concurrency control or DDoS protection. [DRF throttling behavior](https://www.django-rest-framework.org/api-guide/throttling/).

The backend readiness probe runs `python -B healthcheck.py` every 15 seconds, with a 10-second Docker timeout, a 120-second startup grace period and three failure retries. Its private `GET /api/v1/internal/health/ready/` endpoint accepts only the actual loopback peer, independently of forwarded headers. It performs a read-only PostgreSQL `SELECT 1` on a separate connection and a Redis `PING`; it returns `200 {"status":"ready"}` or `503 {"status":"not_ready"}` without credentials or exception details. Responses are not cached. PostgreSQL connect/statement timeouts and Redis socket timeouts apply only to the probe, and connections are closed afterwards. The lightweight HTTP checker uses no proxy, follows no redirect and accepts only the expected JSON response.

On initial Compose startup, worker, beat, bot and frontend wait for the backend's `service_healthy` state. Later dependency failures mark the backend unhealthy, and readiness recovers when the dependency returns; this does not automatically restart containers, stop already running workers or send external alerts. These are separate operational tasks. [Compose startup and health conditions](https://docs.docker.com/compose/how-tos/startup-order/).

After a separately approved server deployment, inspect the state or run the probe inside its container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml exec ilbi python -B healthcheck.py
```

The probe prints only `ready` (exit 0) or `not ready` (exit 1). The endpoint is blocked at the public HTTPS edge and also rejects non-loopback socket peers. Readiness covers the database connection and Redis response; release migrations and external service checks remain separate requirements.

HSTS initially applies only to the canonical domain for one hour (`SECURE_HSTS_SECONDS=3600`, set in the root production environment). Increase it after verifying HTTPS and certificate renewal. `includeSubDomains` and browser preload are deliberately disabled until every affected domain is ready; Django `check --deploy` therefore reports the corresponding two advisory warnings. Do not enable preload just to remove these warnings.

For local regression checks, run `cd ilbi && uv run pytest apps/core/tests/test_production_settings.py -q`.
Shared-counter integration checks are in `apps/core/tests/test_shared_throttles.py`: they need Docker and an already available `redis:7-alpine` image, start a disposable Redis on a random loopback port, and exercise production throttles in separate Python processes without using an application database. See [the test guide](ilbi/README_TESTS.md).
Readiness checks are in `apps/core/tests/test_readiness.py`: they use a separate production WSGI process and new synthetic PostgreSQL/Redis containers, then stop/restart each test dependency to verify failure and recovery without using application data.
From the repository root, `python -m unittest discover -s tests/deployment -v` checks the rendered Compose configuration, a real isolated Nginx TLS edge, and encrypted backup/recovery against a synthetic PostgreSQL database. It requires Docker, OpenSSL, GnuPG (`gpg` / `gpgconf`) and already available `nginx:alpine`, `python:3.12-slim` and `postgres:16-alpine` images. It creates temporary test certificates/containers, uses no application database, and removes its resources afterwards.

[Encrypted data backup and recovery](docs/DATA_BACKUP_RESTORE_UZ.md) covers the PostgreSQL 16 database, local media and editable docs. The utility requires stopped writers and restores only into new isolated resources. MinIO storage needs a separate backup adapter. Production scheduling, off-server copies and actual server activation remain separate deployment tasks.

The existing backend entrypoint still applies migrations and collects static files; restructuring startup is a separate release task.

For optional MinIO storage, set `USE_MINIO=True` in the backend environment, use matching MinIO credentials in both environment files and add `--profile minio` to the Compose command. Startup creates the private media bucket if needed; browser image URLs use `/media/` through the application proxy.

Existing media and database volumes must be retained or migrated when switching layouts. The production retail POS remains disabled until the already required fiscal provider integration is configured.

Cash shifts now open explicitly. The previous counted balance is offered as the next opening balance; entering `0` starts an empty cashbox. Owners grant cashbox actions and purchase-cost visibility in the employee permissions form. Legacy debt payments whose cash/card tender was never recorded remain ledger corrections and are not guessed as cash income.

---

## Documentation

Full architectural documentation, guides, and policies are available in the [`docs/`](docs/) directory:

- [Documentation Index](docs/README.md)
- [Platform Admin Guide](docs/qollanmalar/platform_admin_qollanma.md)
- [Store Owner Guide](docs/qollanmalar/owner_qollanma.md)
- [Staff Guide](docs/qollanmalar/staff_qollanma.md)
- [Terms & Conditions](docs/hujjatlar/foydalanish_qoidalari.md)
- [Privacy Policy](docs/hujjatlar/maxfiylik_siyosati.md)

---

## License

Copyright (c) 2026 ILBI. All rights reserved. See [LICENSE](LICENSE) for details.

## Support and current guides

`/support` is available to visitors and signed-in users. It provides Uzbek, Russian and English support UI, private conversation history and image attachments. Platform administrators use the same route as an operator inbox. Public contacts are +998770212149 and @abdulxadiy_0; bot login uses @ilbi_bot. AI is not enabled in this release.

See [support setup and API](docs/SUPPORT.md) for Telegram recipient configuration and [documentation index](docs/README.md) for concise role guides and focused, annotated screenshots. After updating, apply backend migrations and rebuild the frontend.

Retail POS currently accepts UZS only. Production retail sales are blocked pending fiscal provider integration; the guide screenshots use synthetic demo data. USD catalog values and the currency calculator do not enable USD retail checkout.

## ILBI rebranding and existing deployments

Backend source is in `ilbi/`; frontend source is in `frontend/ilbi/`. The master plan is `ILBI_MASTER_PLAN.md`; the implementation checklist is [REBRANDING_AUDIT_ILBI_UZ.md](REBRANDING_AUDIT_ILBI_UZ.md). UI, loading, print, email and Telegram branding use ILBI / ilbi.uz without a PRO product badge.

For existing Docker installations, pin `COMPOSE_PROJECT_NAME` and the resource mapping in the ignored root `.env`. `ILBI_NETWORK_NAME` / `ILBI_NETWORK_EXTERNAL` and `ILBI_VENV_VOLUME` / `ILBI_VENV_EXTERNAL` allow reusing the original network and dependency volume. Existing PostgreSQL roles/databases and media buckets can retain their configured names; changing env text does not rename stored data. The backend service is now `ilbi`, with a temporary legacy DNS alias for internal clients. `FRONTEND_PORT` selects the Docker frontend port if a native Vite server already uses 5173.

Domain TLS/DNS and sender-domain verification are deployment tasks. Existing local SMTP credentials and its verified sender address are retained with the ILBI display name; the default/example sender for a new installation is `ILBI <noreply@ilbi.uz>`.
