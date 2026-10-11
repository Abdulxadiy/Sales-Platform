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
- [Node.js](https://nodejs.org/) v20+ & npm (optional for bare-metal frontend development)

### 1. Environment Setup

Copy example environment files to configure your local environment:

```bash
cp .env.example .env
cp inventra/.env.example inventra/.env
```

Review and adjust variables in `.env` and `inventra/.env` as needed.

---

## Running the Application

### Development (Docker Compose)

Start the entire platform including backend, frontend, database, redis, celery, and nginx:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/v1/
- **API Documentation (Swagger)**: http://localhost:8000/api/schema/swagger-ui/
- **API Documentation (Redoc)**: http://localhost:8000/api/schema/redoc/

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

1. Ensure all secret keys and database passwords in `.env` and `inventra/.env` are securely randomized.
2. Ensure `DJANGO_DEBUG=False`.
3. Launch with Docker Compose:
```bash
docker compose up -d
```
4. Run migrations and collect static assets:
```bash
docker compose exec inventra python manage.py migrate
docker compose exec inventra python manage.py collectstatic --noinput
```

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
