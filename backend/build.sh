#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Collect static files into staticfiles directory
python manage.py collectstatic --no-input

# Run migrations if database is accessible
python manage.py migrate --no-input

# Seed initial demo data (users, courses, sample leads) idempotently
python manage.py seed_demo_data
