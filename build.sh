#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

cd backend
mkdir -p temp_uploads media
python manage.py collectstatic --no-input
python manage.py migrate

if [ -n "${ADMIN_USERNAME:-}" ] && [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  python manage.py ensure_admin
fi

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  python manage.py load_data
fi
