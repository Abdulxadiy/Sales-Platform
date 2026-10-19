FROM python:3.14-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-install-project

COPY . .
RUN uv sync --frozen

ENV PATH="/app/.venv/bin:$PATH"


CMD ["python", "main.py"]

FROM base AS production
RUN uv sync --frozen --no-dev \
    && useradd --uid 10001 --create-home --shell /usr/sbin/nologin ilbi-bot
USER 10001:10001

FROM base AS development
