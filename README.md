# INVENTRA Sales Platform

INVENTRA is an enterprise-grade multi-tenant retail and wholesale sales platform designed for inventory tracking, point-of-sale (POS) operations, cash register (cashbox) accounting, debt management, and B2B commerce.

---

## Tech Stack

- **Backend**: Python 3.12, Django 6.1, Django REST Framework, Celery, Gunicorn + Gevent
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
cp inventra/.env.example inventra/.env
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
cd inventra
uv sync
uv run python manage.py migrate
uv run python manage.py runserver 0.0.0.0:8000
```

#### Frontend:
```bash
cd frontend/inventra
npm install
npm run dev
```

---

## Running Tests

Run the backend test suite using the isolated test database stack:

```bash
# 1. Start test Postgres and Redis
docker compose -f inventra/docker-compose.test.yml up -d

# 2. Run pytest with coverage
cd inventra
uv run pytest
```

Run frontend linting:

```bash
cd frontend/inventra
npm run lint
```

---

## Production Deployment

Production uses a separate Compose file with a built React bundle served by Nginx. The development Vite server is used only by `docker-compose.yml`.

1. Configure `.env`, `inventra/.env` and `telegram_bot_sms/.env`, replacing example credentials. Set explicit `ALLOWED_HOSTS` and the actual `FRONTEND_URL`; wildcard hosts are rejected with `DEBUG=False`.
2. Launch the production layout when deploying:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The backend entrypoint applies migrations and collects static files. Only the frontend HTTP port is published. Domain selection and HTTPS termination are configured when the deployment address is chosen.

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

Copyright (c) 2026 INVENTRA. All rights reserved. See [LICENSE](LICENSE) for details.
