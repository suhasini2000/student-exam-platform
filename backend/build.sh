#!/usr/bin/env bash
# Render build script
set -o errexit

echo "--- SYSTEM: STARTING BUILD ---"

# Upgrade pip to latest version for better dependency resolution
pip install --upgrade pip setuptools wheel

# Install requirements with new resolver
pip install -r requirements.txt

echo "--- SYSTEM: COLLECTING STATIC ---"
python manage.py collectstatic --no-input

echo "--- SYSTEM: RUNNING MIGRATIONS ---"
python manage.py migrate

echo "--- SYSTEM: BUILD COMPLETE ---"
