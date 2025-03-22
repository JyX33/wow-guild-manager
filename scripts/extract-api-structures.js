/**
 * Battle.net API Structure Extractor
 * 
 * This script calls multiple Battle.net API endpoints, extracts their structure,
 * and outputs everything to a single markdown file.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - MODIFY THESE VALUES AS NEEDED
const config = {
  // Your access token
  accessToken: 'EU45qkdKw3KRcv5Tm7F22a1kA7eRkIYwyn',
  
  // Region to use for API calls
  region: 'eu',
  
  // Default values for endpoint parameters
  defaults: {
    realm: 'hyjal',
    character: 'rødeo',
    guild: 'this-is-not-a-guild',
    realmId: '542',
    characterId: '205626680',
    pvpBracket: '2v2',
    seasonId: '14'
  },
  
  // Output file path
  outputFile: 'battle-net-api-structures.md'
};

// List of endpoints to call
// Format: [endpoint, namespace, description]
const endpoints = [
  // Account Profile API
  ['/profile/user/wow', 'profile-${region}', 'Account Profile Summary'],
  
  // Character Profile APIs
  ['/profile/wow/character/${realm}/${character}', 'profile-${region}', 'Character Profile Summary'],
  ['/profile/wow/character/${realm}/${character}/achievements', 'profile-${region}', 'Character Achievements Summary'],
  ['/profile/wow/character/${realm}/${character}/achievements/statistics', 'profile-${region}', 'Character Achievement Statistics'],
  ['/profile/wow/character/${realm}/${character}/appearance', 'profile-${region}', 'Character Appearance Summary'],
  ['/profile/wow/character/${realm}/${character}/collections', 'profile-${region}', 'Character Collections Index'],
  ['/profile/wow/character/${realm}/${character}/equipment', 'profile-${region}', 'Character Equipment Summary'],
  ['/profile/wow/character/${realm}/${character}/hunter-pets', 'profile-${region}', 'Character Hunter Pets Summary'],
  ['/profile/wow/character/${realm}/${character}/media', 'profile-${region}', 'Character Media Summary'],
  ['/profile/wow/character/${realm}/${character}/mythic-keystone-profile', 'profile-${region}', 'Character Mythic Keystone Profile Index'],
  ['/profile/wow/character/${realm}/${character}/professions', 'profile-${region}', 'Character Professions Summary'],
  ['/profile/wow/character/${realm}/${character}/pvp-summary', 'profile-${region}', 'Character PvP Summary'],
  ['/profile/wow/character/${realm}/${character}/quests', 'profile-${region}', 'Character Quests'],
  ['/profile/wow/character/${realm}/${character}/reputations', 'profile-${region}', 'Character Reputations Summary'],
  ['/profile/wow/character/${realm}/${character}/specializations', 'profile-${region}', 'Character Specializations Summary'],
  ['/profile/wow/character/${realm}/${character}/statistics', 'profile-${region}', 'Character Statistics Summary'],
  ['/profile/wow/character/${realm}/${character}/titles', 'profile-${region}', 'Character Titles Summary'],
  
  // Guild API
  ['/data/wow/guild/${realm}/${guild}', 'profile-${region}', 'Guild'],
  ['/data/wow/guild/${realm}/${guild}/roster', 'profile-${region}', 'Guild Roster']
];

/**
 * Extract the structure of a JSON object (keys and types)
 */
function extractJsonStructure(obj, path = '') {
  if (obj === null) return { type: 'null' };
  
  const type = Array.isArray(obj) ? 'array' : typeof obj;
  
  if (type === 'object') {
    const structure = {};
    for (const key in obj) {
      structure[key] = extractJsonStructure(obj[key], `${path}.${key}`);
    }
    return { type, properties: structure };
  } else if (type === 'array' && obj.length > 0) {
    // For arrays, look at the first item to determine the structure
    return { 
      type, 
      itemType: extractJsonStructure(obj[0], `${path}[0]`),
      length: obj.length
    };
  } else {
    return { type };
  }
}

/**
 * Format the structure for display
 */
function formatStructure(structure, indent = 0) {
  const indentStr = '  '.repeat(indent);
  
  if (structure.type === 'object') {
    let result = `${indentStr}{\n`;
    
    for (const key in structure.properties) {
      result += `${indentStr}  "${key}": ${formatStructure(structure.properties[key], indent + 1)},\n`;
    }
    
    // Remove trailing comma and newline if properties exist
    if (Object.keys(structure.properties).length > 0) {
      result = result.slice(0, -2) + '\n';
    }
    
    result += `${indentStr}}`;
    return result;
  } else if (structure.type === 'array') {
    if (!structure.itemType) {
      return `${indentStr}[ /* empty array */ ]`;
    }
    return `[\n${indentStr}  // Array of ${structure.itemType.type}\n${indentStr}  ${formatStructure(structure.itemType, indent + 1)}\n${indentStr}]`;
  } else {
    return `"${structure.type}"`;
  }
}

/**
 * Make an API request
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Accept': 'application/json'
      }
    }, (response) => {
      let data = '';
      
      // A chunk of data has been received
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      // The whole response has been received
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        } else {
          reject(new Error(`API request failed with status code ${response.statusCode}: ${data}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`API request error: ${error.message}`));
    });
  });
}

/**
 * Replace template variables in a string
 */
function replaceTemplateVars(str) {
  return str
    .replace(/\${region}/g, config.region)
    .replace(/\${realm}/g, config.defaults.realm)
    .replace(/\${character}/g, config.defaults.character)
    .replace(/\${guild}/g, config.defaults.guild)
    .replace(/\${realmId}/g, config.defaults.realmId)
    .replace(/\${characterId}/g, config.defaults.characterId)
    .replace(/\${pvpBracket}/g, config.defaults.pvpBracket)
    .replace(/\${seasonId}/g, config.defaults.seasonId);
}

/**
 * Generate markdown for the API structures
 */
async function generateApiStructureDocument() {
  let markdown = `# Battle.net API Response Structures\n\n`;
  markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;
  markdown += `## Table of Contents\n\n`;
  
  // Generate TOC
  for (const [endpoint, , description] of endpoints) {
    const slug = description.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    markdown += `- [${description}](#${slug})\n`;
  }
  
  markdown += `\n## Endpoints\n\n`;
  
  // Process each endpoint
  for (const [endpoint, namespace, description] of endpoints) {
    console.log(`Processing endpoint: ${description}`);
    
    const processedEndpoint = replaceTemplateVars(endpoint);
    const processedNamespace = replaceTemplateVars(namespace);
    
    markdown += `### ${description}\n\n`;
    markdown += `**Endpoint:** \`${processedEndpoint}\`\n\n`;
    markdown += `**Namespace:** \`${processedNamespace}\`\n\n`;
    
    try {
      // Make the API request
      const url = `https://${config.region}.api.blizzard.com${processedEndpoint}?namespace=${processedNamespace}`;
      console.log(`Making request to: ${url}`);
      
      const data = await makeRequest(url);
      
      // Extract and format the structure
      const structure = extractJsonStructure(data);
      const formattedStructure = formatStructure(structure);
      
      markdown += `**Response Structure:**\n\n\`\`\`json\n${formattedStructure}\n\`\`\`\n\n`;
      markdown += `---\n\n`;
    } catch (error) {
      console.error(`Error processing ${description}:`, error.message);
      markdown += `**Error:** ${error.message}\n\n`;
      markdown += `---\n\n`;
    }
  }
  
  // Write the markdown file
  fs.writeFileSync(config.outputFile, markdown);
  console.log(`Markdown file generated at: ${path.resolve(config.outputFile)}`);
}

// Run the script
generateApiStructureDocument().catch(error => {
  console.error('Script execution failed:', error);
});