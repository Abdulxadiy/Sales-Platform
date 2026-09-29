#!/bin/sh

set -e

# Sync virtual environment if dependencies changed or volume mounted
uv sync --frozen --no-dev

# Activate virtual environment
. /app/.venv/bin/activate

if [ "$1" = "gunicorn" ] || [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "==> Running migrations..."
    python manage.py migrate --noinput

    echo "==> Collecting static files..."
    python manage.py collectstatic --noinput
fi

echo "==> Preparations completed. Main process starting: $@"

exec "$@"
