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
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5433}"
export DB_NAME="${DB_NAME:-wow_guild_manager}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-your_password_here}"

echo "Database connection details:"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Name: $DB_NAME"
echo "User: $DB_USER"

echo "Running custom raw SQL migrations via npm run migrate..."
npm --prefix backend run migrate

echo "Running Knex migrations..."
npx knex migrate:latest --knexfile backend/knexfile.js --env development

echo "Database initialization complete."