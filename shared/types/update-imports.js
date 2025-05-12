#!/usr/bin/env node

/**
 * Script to help update imports using the new type structure
 * 
 * This script scans TypeScript files and identifies imports from shared/types,
 * then suggests updates to use the new modular structure.
 * 
 * Usage: node update-imports.js [path]
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

// Import mappings for types to new locations
const TYPE_MAPPINGS = {
  // API types
  'ApiResponse': 'api/responses',
  'ApiError': 'api/responses',
  'PaginatedResponse': 'api/responses',
  'BasePaginationParams': 'api/pagination',
  'PaginationParams': 'api/pagination',
  'HttpMethod': 'api/http',
  'ApiRequestConfig': 'api/http',
  'Roster': 'api/roster',
  'RosterMember': 'api/roster',
  'RosterMemberAddition': 'api/roster',
  
  // DB types
  'DbQueryParams': 'db/query',
  'DbQueryCondition': 'db/query',
  'DbPaginatedResult': 'db/query',
  'DbGuild': 'db/models/guild',
  'DbCharacter': 'db/models/character',
  'DbGuildMember': 'db/models/member',
  'DbGuildRank': 'db/models/rank',
  'DbEvent': 'db/models/event',
  
  // Enhanced DB models
  'DbGuildEnhanced': 'db/enhanced/guild',
  'DbCharacterEnhanced': 'db/enhanced/character',
  'DbGuildMemberEnhanced': 'db/enhanced/member',
  'DbUserEnhanced': 'db/enhanced/user',
  
  // BattleNet types
  'BattleNetGuild': 'battlenet/guild',
  'BattleNetGuildMember': 'battlenet/guild',
  'BattleNetGuildRoster': 'battlenet/guild',
  'BattleNetCharacter': 'battlenet/character',
  'TokenResponse': 'battlenet/auth',
  'RefreshResponse': 'battlenet/auth',
  
  // Model types
  'User': 'models/user',
  'UserWithTokens': 'models/user',
  'Guild': 'models/guild',
  'GuildMember': 'models/guild',
  'Character': 'models/character',
  'Event': 'models/event',
  'EventSubscription': 'models/event',
  
  // Enum types
  'UserRole': 'enums/user',
  'BattleNetRegion': 'enums/user',
  'CharacterRole': 'enums/guild',
  'EventType': 'enums/event',
  
  // Error types
  'ErrorCode': 'utils/errors',
  'ErrorDetail': 'utils/errors'
};

// Namespace groupings for related types
const NAMESPACE_GROUPS = {
  'api': [
    'ApiResponse', 'ApiError', 'PaginatedResponse', 'BasePaginationParams', 
    'PaginationParams', 'HttpMethod', 'ApiRequestConfig', 'Roster', 
    'RosterMember', 'RosterMemberAddition'
  ],
  'db': [
    'DbQueryParams', 'DbQueryCondition', 'DbPaginatedResult', 'DbGuild', 
    'DbCharacter', 'DbGuildMember', 'DbGuildRank', 'DbEvent', 
    'DbGuildEnhanced', 'DbCharacterEnhanced', 'DbGuildMemberEnhanced', 'DbUserEnhanced'
  ],
  'battlenet': [
    'BattleNetGuild', 'BattleNetGuildMember', 'BattleNetGuildRoster', 
    'BattleNetCharacter', 'TokenResponse', 'RefreshResponse'
  ],
  'models': [
    'User', 'UserWithTokens', 'Guild', 'GuildMember', 'Character', 
    'Event', 'EventSubscription'
  ],
  'enums': [
    'UserRole', 'BattleNetRegion', 'CharacterRole', 'EventType'
  ],
  'utils': [
    'ErrorCode', 'ErrorDetail'
  ]
};

// Regular expression for finding imports from shared/types
const SHARED_TYPES_IMPORT_REGEX = /import\s+{([^}]+)}\s+from\s+['"]([^'"]*?shared\/types[^'"]*?)['"]/g;
const INDIVIDUAL_TYPE_REGEX = /\s*([A-Za-z0-9_]+)\s*,?/g;

// Function to get all TypeScript files in a directory
async function findTypeScriptFiles(dir, filelist = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = await stat(filepath);
    
    if (stats.isDirectory()) {
      filelist = await findTypeScriptFiles(filepath, filelist);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      filelist.push(filepath);
    }
  }
  
  return filelist;
}

// Function to analyze imports in a file
async function analyzeFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const importMatches = [...content.matchAll(SHARED_TYPES_IMPORT_REGEX)];
  
  if (importMatches.length === 0) {
    return null; // No shared types imports
  }
  
  const results = [];
  
  for (const match of importMatches) {
    const importBlock = match[1];
    const importPath = match[2];
    const typeMatches = [...importBlock.matchAll(INDIVIDUAL_TYPE_REGEX)];
    
    const types = typeMatches.map(m => m[1].trim()).filter(Boolean);
    
    // Group types by their target namespace
    const groupedTypes = {};
    const ungroupableTypes = [];
    
    for (const type of types) {
      let found = false;
      
      // Find which namespace this type belongs to
      for (const [namespace, typesInGroup] of Object.entries(NAMESPACE_GROUPS)) {
        if (typesInGroup.includes(type)) {
          if (!groupedTypes[namespace]) {
            groupedTypes[namespace] = [];
          }
          groupedTypes[namespace].push(type);
          found = true;
          break;
        }
      }
      
      if (!found) {
        ungroupableTypes.push(type);
      }
    }
    
    // Prepare suggestions
    const suggestions = [];
    
    // Suggest namespace imports for groups with multiple types
    for (const [namespace, typesInGroup] of Object.entries(groupedTypes)) {
      if (typesInGroup.length >= 2) {
        suggestions.push({
          type: 'namespace',
          namespace,
          types: typesInGroup,
          importStatement: `import * as ${namespace.charAt(0).toUpperCase() + namespace.slice(1)} from '../../shared/types/${namespace}';`
        });
      } else if (typesInGroup.length === 1) {
        const type = typesInGroup[0];
        const targetPath = TYPE_MAPPINGS[type];
        if (targetPath) {
          suggestions.push({
            type: 'direct',
            typeName: type,
            importStatement: `import { ${type} } from '../../shared/types/${targetPath}';`
          });
        }
      }
    }
    
    // Suggest direct imports for ungroupable types
    for (const type of ungroupableTypes) {
      const targetPath = TYPE_MAPPINGS[type];
      if (targetPath) {
        suggestions.push({
          type: 'direct',
          typeName: type,
          importStatement: `import { ${type} } from '../../shared/types/${targetPath}';`
        });
      } else {
        suggestions.push({
          type: 'unknown',
          typeName: type,
          importStatement: `// Unknown mapping for ${type} - keep original import`
        });
      }
    }
    
    results.push({
      originalImport: match[0],
      importPath,
      types,
      suggestions
    });
  }
  
  return {
    filePath,
    results
  };
}

// Main function
async function main() {
  try {
    // Get directory to scan from command line args or use current directory
    const scanDir = process.argv[2] || process.cwd();
    console.log(`Scanning ${scanDir} for TypeScript files...`);
    
    // Find all TypeScript files
    const files = await findTypeScriptFiles(scanDir);
    console.log(`Found ${files.length} TypeScript files.`);
    
    // Analyze each file
    let filesWithImports = 0;
    
    for (const file of files) {
      const analysis = await analyzeFile(file);
      
      if (analysis && analysis.results.length > 0) {
        filesWithImports++;
        
        console.log(`\n${filesWithImports}. ${path.relative(scanDir, file)}`);
        
        for (const result of analysis.results) {
          console.log(`  Original: ${result.originalImport.trim()}`);
          console.log('  Suggested replacements:');
          
          for (const suggestion of result.suggestions) {
            console.log(`    ${suggestion.importStatement}`);
          }
        }
      }
    }
    
    console.log(`\nFound shared type imports in ${filesWithImports} files.`);
    console.log('Review the suggestions and update your imports manually or use a code refactoring tool.');
    console.log('For guidance on the new type structure, see shared/types/USAGE_GUIDE.md');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();