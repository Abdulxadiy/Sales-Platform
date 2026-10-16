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

Only frontend ports 80/443 are published. Nginx terminates TLS, redirects HTTP to the configured HTTPS domain, rejects unknown hosts, and overwrites client-supplied proxy headers. Django trusts this private edge, sets secure session/CSRF cookies, and redirects public HTTP requests. Internal authenticated `/api/v1/internal/` calls remain HTTP inside Docker; the public edge blocks this entire prefix. The backend must not be published directly. An additional load balancer or CDN requires its own reviewed proxy configuration; do not forward arbitrary client `X-Forwarded-*` headers through this edge.

Production uses `config.settings_production`, rejects debug/demo mode and wildcard hosts, requires an HTTPS frontend origin matching `ALLOWED_HOSTS`, and disables Gunicorn reload even if its environment flag is enabled. Development continues to use its existing `.env` and `config.settings`.

HSTS initially applies only to the canonical domain for one hour (`SECURE_HSTS_SECONDS=3600`, set in the root production environment). Increase it after verifying HTTPS and certificate renewal. `includeSubDomains` and browser preload are deliberately disabled until every affected domain is ready; Django `check --deploy` therefore reports the corresponding two advisory warnings. Do not enable preload just to remove these warnings.

For local regression checks, run `cd ilbi && uv run pytest apps/core/tests/test_production_settings.py -q`.
From the repository root, `python -m unittest discover -s tests/deployment -v` checks the rendered Compose configuration and a real isolated Nginx TLS edge. It requires Docker, OpenSSL and already available `nginx:alpine` / `python:3.12-slim` images. It creates temporary test certificates/containers, uses no application database, and removes its resources afterwards.

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
