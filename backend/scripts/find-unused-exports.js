#!/usr/bin/env node

/**
 * find-unused-exports.js
 *
 * A script to find unused exports in the codebase using ts-prune.
 *
 * Usage:
 *   npm run find-unused-exports
 *   npm run find-unused-exports -- --path src
 *   npm run find-unused-exports -- --filter "error-factory"
 *   npm run find-unused-exports -- --ignore "(used in module)"
 *   npm run find-unused-exports -- --json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let path_prefix = '';
let filter = '';
let ignoreUsedInModule = false;
let outputJson = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--path' && i + 1 < args.length) {
    path_prefix = args[i + 1];
    i++;
  } else if (args[i] === '--filter' && i + 1 < args.length) {
    filter = args[i + 1];
    i++;
  } else if (args[i] === '--ignore' && i + 1 < args.length) {
    if (args[i + 1] === '(used in module)') {
      ignoreUsedInModule = true;
    }
    i++;
  } else if (args[i] === '--json') {
    outputJson = true;
  }
}

// Run ts-prune and capture output
let command = 'npx ts-prune';
if (path_prefix) {
  command += ` --project "${path_prefix}"`;
}

try {
  const output = execSync(command, { encoding: 'utf8' });
  const lines = output.split('\n').filter(line => line.trim().length > 0);
  
  // Process and filter the output
  const results = lines.map(line => {
    // Parse the ts-prune output line
    const matches = line.match(/([^:]+):(\d+) - (\S+)(.*)$/);
    if (!matches) return null;
    
    const [_, filePath, lineNumber, exportName, comment] = matches;
    return { filePath, lineNumber: parseInt(lineNumber), exportName, comment: comment.trim() };
  }).filter(result => result !== null);
  
  // Apply filters if provided
  let filteredResults = results;
  
  if (ignoreUsedInModule) {
    filteredResults = filteredResults.filter(result => !result.comment.includes('(used in module)'));
  }
  
  if (filter) {
    filteredResults = filteredResults.filter(result => 
      result.filePath.includes(filter) || 
      result.exportName.includes(filter)
    );
  }
  
  // Output the results
  if (outputJson) {
    console.log(JSON.stringify(filteredResults, null, 2));
  } else {
    console.log(`Found ${filteredResults.length} potentially unused exports:`);
    console.log('---------------------------------------------');
    
    filteredResults.forEach(result => {
      console.log(`${result.filePath}:${result.lineNumber} - ${result.exportName}${result.comment}`);
    });
    
    console.log('---------------------------------------------');
    console.log(`Run with --filter to narrow down results`);
    console.log(`Run with --ignore "(used in module)" to exclude exports marked as used`);
    console.log(`Run with --json to get output in JSON format`);
  }
  
} catch (error) {
  console.error('Error running ts-prune:', error.message);
  process.exit(1);
}