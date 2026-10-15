#!/bin/sh

set -e

if [ "$1" = "gunicorn" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "==> Syncing virtual environment..."
    uv sync --frozen --no-dev

    echo "==> Running migrations..."
    python manage.py migrate --noinput

    python manage.py ensure_media_bucket

    echo "==> Collecting static files..."
    python manage.py collectstatic --noinput
fi

# Activate virtual environment
. /app/.venv/bin/activate

echo "==> Preparations completed. Main process starting: $@"

exec "$@"
