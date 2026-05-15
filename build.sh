#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

cd backend
python manage.py collectstatic --no-input
python manage.py migrate

if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  python manage.py shell < load_sample_data.py
fi
