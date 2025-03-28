// Knex configuration file
require('dotenv').config();
const path = require('path');

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'wow_guild_manager',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your_password_here'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'), // Corrected directory
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'database/seeds')
    }
  },
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'), // Corrected directory
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'database/seeds')
    }
  }
};