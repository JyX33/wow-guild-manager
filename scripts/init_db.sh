#!/bin/bash

# WoW Guild Manager - Database Initialization Script
# This script runs both the custom raw SQL migrations and Knex migrations
# to fully initialize the PostgreSQL database schema.

set -e  # Exit immediately if a command exits with a non-zero status
set -o pipefail

echo "Starting database initialization..."

# Load environment variables from .env if present
if [ -f backend/.env ]; then
  echo "Loading environment variables from backend/.env"
  export $(grep -v '^#' backend/.env | xargs)
fi

# Set defaults if variables are not set
export DB_HOST="${DB_HOST:-10.0.1.9}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-wow_guild_manager}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-KaAfXwHMpZ0psze3obKsukTVOSLKKLRNGV23x90luh8Uq8tslIvi67xj6q1urwOD}"

echo "Database connection details:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Name: $DB_NAME"
echo "User: $DB_USER"

echo "Changing directory to backend/"
pushd backend > /dev/null

echo "Running custom raw SQL migrations via Bun..."
bun run migrate

echo "Running Knex migrations via Bunx..."
bunx knex migrate:latest --knexfile knexfile.js --env development

popd > /dev/null
echo "Returned to original directory."

echo "Database initialization complete."