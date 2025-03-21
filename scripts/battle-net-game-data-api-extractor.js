/**
 * Battle.net Game Data API Structure Extractor
 * 
 * This script calls multiple WoW Game Data API endpoints, extracts their structure,
 * and outputs everything to a single markdown file.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration - MODIFY THESE VALUES AS NEEDED
const config = {
  // Your access token
  accessToken: 'EUq6r1rGD6tduR2GUCWKE7cBbvYUkpbORS',
  
  // Region to use for API calls
  region: 'eu',
  
  // Default values for endpoint parameters
  defaults: {
    realm: 'hyjal',
    realmSlug: 'hyjal',
    characterName: 'amïlia',
    guild: 'this-is-not-a-guild',
    connectedRealmId: '581',
    achievementId: '6',
    azeriteEssenceId: '2',
    covenantId: '1',
    creatureId: '30',
    creatureDisplayId: '30',
    creatureFamilyId: '1',
    creatureTypeId: '1',
    borderId: '1',
    emblemId: '1',
    heirloomId: '1',
    itemId: '19019',
    itemClassId: '2',
    itemSubclassId: '1',
    itemSetId: '1',
    appearanceId: '1',
    appearanceSetId: '1',
    slotType: 'head',
    journalExpansionId: '68',
    journalEncounterId: '89',
    journalInstanceId: '63',
    categoryId: '1',
    slotTypeId: '1',
    mountId: '6',
    keystoneAffixId: '1',
    dungeonId: '2',
    periodId: '641',
    seasonId: '1',
    playableClassId: '1',
    classId: '1',
    playableRaceId: '1',
    specId: '1',
    powerTypeId: '0',
    professionId: '164',
    skillTierId: '2477',
    recipeId: '1631',
    pvpSeasonId: '27',
    pvpBracket: '3v3',
    pvpTierId: '1',
    questId: '2',
    questCategoryId: '1',
    questAreaId: '1',
    questTypeId: '1',
    regionId: '1',
    reputationFactionId: '21',
    reputationTiersId: '1',
    spellId: '196607',
    talentId: '23106',
    talentTreeId: '786',
    pvpTalentId: '3',
    techTalentTreeId: '1',
    techTalentId: '863',
    titleId: '1'
  },
  
  // Output file path
  outputFile: 'battle-net-game-data-api-structures.md'
};

// List of endpoints to call
// Format: [endpoint, namespace, description]
const endpoints = [
  // Achievement API
  ['/data/wow/achievement/index', 'static-${region}', 'Achievements Index'],
  ['/data/wow/achievement/${achievementId}', 'static-${region}', 'Achievement'],
  ['/data/wow/media/achievement/${achievementId}', 'static-${region}', 'Achievement Media'],
  
  // Auction House API
  ['/data/wow/auctions/commodities', 'dynamic-${region}', 'Commodities'],
  
  // Azerite Essence API
  ['/data/wow/azerite-essence/index', 'static-${region}', 'Azerite Essences Index'],
  ['/data/wow/azerite-essence/${azeriteEssenceId}', 'static-${region}', 'Azerite Essence'],
  
  // Connected Realm API
  ['/data/wow/connected-realm/index', 'dynamic-${region}', 'Connected Realms Index'],
  ['/data/wow/connected-realm/${connectedRealmId}', 'dynamic-${region}', 'Connected Realm'],
  
  // Covenant API
  ['/data/wow/covenant/index', 'static-${region}', 'Covenant Index'],
  ['/data/wow/covenant/${covenantId}', 'static-${region}', 'Covenant'],
  ['/data/wow/covenant/soulbind/index', 'static-${region}', 'Soulbind Index'],
  ['/data/wow/covenant/conduit/index', 'static-${region}', 'Conduit Index'],
  
  // Creature API
  ['/data/wow/creature/${creatureId}', 'static-${region}', 'Creature'],
  ['/data/wow/media/creature-display/${creatureDisplayId}', 'static-${region}', 'Creature Display Media'],
  ['/data/wow/creature-family/index', 'static-${region}', 'Creature Families Index'],
  ['/data/wow/creature-type/index', 'static-${region}', 'Creature Types Index'],
  
  // Guild Crest API
  ['/data/wow/guild-crest/index', 'static-${region}', 'Guild Crest Components Index'],
  ['/data/wow/media/guild-crest/border/${borderId}', 'static-${region}', 'Guild Crest Border Media'],
  
  // Heirloom API
  ['/data/wow/heirloom/index', 'static-${region}', 'Heirloom Index'],
  ['/data/wow/heirloom/${heirloomId}', 'static-${region}', 'Heirloom'],
  
  // Item API
  ['/data/wow/item/${itemId}', 'static-${region}', 'Item'],
  ['/data/wow/media/item/${itemId}', 'static-${region}', 'Item Media'],
  ['/data/wow/item-class/index', 'static-${region}', 'Item Classes Index'],
  ['/data/wow/item-set/index', 'static-${region}', 'Item Sets Index'],
  ['/data/wow/item-class/${itemClassId}/item-subclass/${itemSubclassId}', 'static-${region}', 'Item Subclass'],
  
  // Journal API
  ['/data/wow/journal-expansion/index', 'static-${region}', 'Journal Expansions Index'],
  ['/data/wow/journal-encounter/index', 'static-${region}', 'Journal Encounters Index'],
  ['/data/wow/journal-instance/index', 'static-${region}', 'Journal Instances Index'],
  
  // Modified Crafting API
  ['/data/wow/modified-crafting/index', 'static-${region}', 'Modified Crafting Index'],
  
  // Mount API
  ['/data/wow/mount/index', 'static-${region}', 'Mounts Index'],
  ['/data/wow/mount/${mountId}', 'static-${region}', 'Mount'],
  
  // Mythic Keystone APIs
  ['/data/wow/keystone-affix/index', 'static-${region}', 'Mythic Keystone Affixes Index'],
  ['/data/wow/mythic-keystone/index', 'dynamic-${region}', 'Mythic Keystone Index'],
  ['/data/wow/mythic-keystone/season/index', 'dynamic-${region}', 'Mythic Keystone Seasons Index'],
  
  // Pet API
  ['/data/wow/pet/index', 'static-${region}', 'Pets Index'],
  ['/data/wow/pet-ability/index', 'static-${region}', 'Pet Abilities Index'],
  
  // Playable Class/Race/Specialization
  ['/data/wow/playable-class/index', 'static-${region}', 'Playable Classes Index'],
  ['/data/wow/playable-class/${classId}', 'static-${region}', 'Playable Class'],
  ['/data/wow/playable-race/index', 'static-${region}', 'Playable Races Index'],
  ['/data/wow/playable-specialization/index', 'static-${region}', 'Playable Specializations Index'],
  
  // Power Type API
  ['/data/wow/power-type/index', 'static-${region}', 'Power Types Index'],
  
  // Profession API
  ['/data/wow/profession/index', 'static-${region}', 'Professions Index'],
  ['/data/wow/profession/${professionId}', 'static-${region}', 'Profession'],
  ['/data/wow/recipe/${recipeId}', 'static-${region}', 'Recipe'],
  
  // PvP APIs
  ['/data/wow/pvp-season/index', 'dynamic-${region}', 'PvP Seasons Index'],
  ['/data/wow/pvp-tier/index', 'static-${region}', 'PvP Tiers Index'],
  
  // Quest API
  ['/data/wow/quest/index', 'static-${region}', 'Quests Index'],
  ['/data/wow/quest/${questId}', 'static-${region}', 'Quest'],
  ['/data/wow/quest/category/index', 'static-${region}', 'Quest Categories Index'],
  
  // Realm API
  ['/data/wow/realm/index', 'dynamic-${region}', 'Realms Index'],
  ['/data/wow/realm/${realmSlug}', 'dynamic-${region}', 'Realm'],
  
  // Region API
  ['/data/wow/region/index', 'dynamic-${region}', 'Regions Index'],
  
  // Reputations API
  ['/data/wow/reputation-faction/index', 'static-${region}', 'Reputation Factions Index'],
  ['/data/wow/reputation-tiers/index', 'static-${region}', 'Reputation Tiers Index'],
  
  // Spell API
  ['/data/wow/spell/${spellId}', 'static-${region}', 'Spell'],
  ['/data/wow/media/spell/${spellId}', 'static-${region}', 'Spell Media'],
  
  // Talent API
  ['/data/wow/talent-tree/index', 'static-${region}', 'Talent Tree Index'],
  ['/data/wow/talent/index', 'static-${region}', 'Talents Index'],
  ['/data/wow/pvp-talent/index', 'static-${region}', 'PvP Talents Index'],
  
  // Tech Talent API
  ['/data/wow/tech-talent-tree/index', 'static-${region}', 'Tech Talent Tree Index'],
  ['/data/wow/tech-talent/index', 'static-${region}', 'Tech Talent Index'],
  
  // Title API
  ['/data/wow/title/index', 'static-${region}', 'Titles Index'],
  ['/data/wow/title/${titleId}', 'static-${region}', 'Title'],
  
  // Toy API
  ['/data/wow/toy/index', 'static-${region}', 'Toy Index'],
  
  // WoW Token API
  ['/data/wow/token/index', 'dynamic-${region}', 'WoW Token Index']
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
    .replace(/\${realmSlug}/g, config.defaults.realmSlug)
    .replace(/\${characterName}/g, config.defaults.characterName)
    .replace(/\${guild}/g, config.defaults.guild)
    .replace(/\${connectedRealmId}/g, config.defaults.connectedRealmId)
    .replace(/\${achievementId}/g, config.defaults.achievementId)
    .replace(/\${azeriteEssenceId}/g, config.defaults.azeriteEssenceId)
    .replace(/\${covenantId}/g, config.defaults.covenantId)
    .replace(/\${creatureId}/g, config.defaults.creatureId)
    .replace(/\${creatureDisplayId}/g, config.defaults.creatureDisplayId)
    .replace(/\${creatureFamilyId}/g, config.defaults.creatureFamilyId)
    .replace(/\${creatureTypeId}/g, config.defaults.creatureTypeId)
    .replace(/\${borderId}/g, config.defaults.borderId)
    .replace(/\${emblemId}/g, config.defaults.emblemId)
    .replace(/\${heirloomId}/g, config.defaults.heirloomId)
    .replace(/\${itemId}/g, config.defaults.itemId)
    .replace(/\${itemClassId}/g, config.defaults.itemClassId)
    .replace(/\${itemSubclassId}/g, config.defaults.itemSubclassId)
    .replace(/\${itemSetId}/g, config.defaults.itemSetId)
    .replace(/\${appearanceId}/g, config.defaults.appearanceId)
    .replace(/\${appearanceSetId}/g, config.defaults.appearanceSetId)
    .replace(/\${slotType}/g, config.defaults.slotType)
    .replace(/\${journalExpansionId}/g, config.defaults.journalExpansionId)
    .replace(/\${journalEncounterId}/g, config.defaults.journalEncounterId)
    .replace(/\${journalInstanceId}/g, config.defaults.journalInstanceId)
    .replace(/\${categoryId}/g, config.defaults.categoryId)
    .replace(/\${slotTypeId}/g, config.defaults.slotTypeId)
    .replace(/\${mountId}/g, config.defaults.mountId)
    .replace(/\${keystoneAffixId}/g, config.defaults.keystoneAffixId)
    .replace(/\${dungeonId}/g, config.defaults.dungeonId)
    .replace(/\${periodId}/g, config.defaults.periodId)
    .replace(/\${seasonId}/g, config.defaults.seasonId)
    .replace(/\${playableClassId}/g, config.defaults.playableClassId)
    .replace(/\${classId}/g, config.defaults.classId)
    .replace(/\${playableRaceId}/g, config.defaults.playableRaceId)
    .replace(/\${specId}/g, config.defaults.specId)
    .replace(/\${powerTypeId}/g, config.defaults.powerTypeId)
    .replace(/\${professionId}/g, config.defaults.professionId)
    .replace(/\${skillTierId}/g, config.defaults.skillTierId)
    .replace(/\${recipeId}/g, config.defaults.recipeId)
    .replace(/\${pvpSeasonId}/g, config.defaults.pvpSeasonId)
    .replace(/\${pvpBracket}/g, config.defaults.pvpBracket)
    .replace(/\${pvpTierId}/g, config.defaults.pvpTierId)
    .replace(/\${questId}/g, config.defaults.questId)
    .replace(/\${questCategoryId}/g, config.defaults.questCategoryId)
    .replace(/\${questAreaId}/g, config.defaults.questAreaId)
    .replace(/\${questTypeId}/g, config.defaults.questTypeId)
    .replace(/\${regionId}/g, config.defaults.regionId)
    .replace(/\${reputationFactionId}/g, config.defaults.reputationFactionId)
    .replace(/\${reputationTiersId}/g, config.defaults.reputationTiersId)
    .replace(/\${spellId}/g, config.defaults.spellId)
    .replace(/\${talentId}/g, config.defaults.talentId)
    .replace(/\${talentTreeId}/g, config.defaults.talentTreeId)
    .replace(/\${pvpTalentId}/g, config.defaults.pvpTalentId)
    .replace(/\${techTalentTreeId}/g, config.defaults.techTalentTreeId)
    .replace(/\${techTalentId}/g, config.defaults.techTalentId)
    .replace(/\${titleId}/g, config.defaults.titleId);
}

/**
 * Generate markdown for the API structures
 */
async function generateApiStructureDocument() {
  let markdown = `# Battle.net Game Data API Response Structures\n\n`;
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
