#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running character migration script...');

// Path to the TypeScript file from the repo root
const migrationScriptPath = path.join(__dirname, '../backend/src/migrations/character-migration.ts');

// Run the migration using ts-node
const process = spawn('npx', ['ts-node', migrationScriptPath], { 
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

process.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Character migration completed successfully!');
  } else {
    console.error(`❌ Character migration failed with exit code ${code}`);
  }
});