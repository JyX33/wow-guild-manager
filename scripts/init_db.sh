#!/bin/bash

# WoW Guild Manager - Database Initialization Script
# This script runs both the custom raw SQL migrations and Knex migrations
# to fully initialize the PostgreSQL database schema.

set -e  # Exit immediately if a command exits with a non-zero status
set -o pipefail

echo "Starting database initialization..."

# Determine the absolute path to the backend directory
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT=$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "Project Root: $PROJECT_ROOT"
echo "Backend Directory: $BACKEND_DIR"

# Load environment variables from .env if present
if [ -f "$BACKEND_DIR/.env" ]; then
  echo "Loading environment variables from $BACKEND_DIR/.env"
  export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
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

echo "Running custom raw SQL migrations via Bun (using absolute path)..."
bun run migrate --cwd "$BACKEND_DIR"

echo "Running Knex migrations via Bunx (using absolute path)..."
bunx knex migrate:latest --knexfile "$BACKEND_DIR/knexfile.js" --cwd "$BACKEND_DIR" --env development

echo "Database initialization complete."