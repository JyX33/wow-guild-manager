/**
 * Performance testing script for database indexes
 * 
 * This script tests key database queries before and after index optimization
 * Run before applying migration, then after to compare performance
 */

const db = require('../../src/db/db').default;
const { performance } = require('perf_hooks');

const NUM_TESTS = 5; // Number of test iterations to run

async function runTest(name, queryFn) {
  console.log(`Running test: ${name}`);
  const times = [];
  
  for (let i = 0; i < NUM_TESTS; i++) {
    const start = performance.now();
    await queryFn();
    const end = performance.now();
    times.push(end - start);
  }
  
  const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  console.log(`Average time for ${name}: ${avgTime.toFixed(2)}ms`);
  
  return {
    name,
    times,
    avgTime
  };
}

async function runAllTests() {
  console.log('=== DATABASE INDEX PERFORMANCE TESTS ===');
  
  // Get sample IDs for testing
  let sampleGuildId = 1;
  let sampleRosterId = 1;
  let twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  try {
    const guildResult = await db.query('SELECT id FROM guilds LIMIT 1');
    if (guildResult.rows.length > 0) {
      sampleGuildId = guildResult.rows[0].id;
    }
    
    const rosterResult = await db.query('SELECT id FROM rosters LIMIT 1');
    if (rosterResult.rows.length > 0) {
      sampleRosterId = rosterResult.rows[0].id;
    }
    
    console.log(`Using sample guild ID: ${sampleGuildId}, roster ID: ${sampleRosterId}`);
  } catch (error) {
    console.error('Error finding sample IDs:', error);
    return;
  }
  
  const tests = [
    {
      name: 'Get guild roster members',
      fn: async () => {
        const query = `
          SELECT 
            rm.character_id as "characterId",
            c.name,
            c.class,
            gr.rank_name as rank,
            c.role 
          FROM roster_members rm
          JOIN characters c ON rm.character_id = c.id
          JOIN rosters r ON rm.roster_id = r.id
          LEFT JOIN guild_members gm ON rm.character_id = gm.character_id AND r.guild_id = gm.guild_id
          LEFT JOIN guild_ranks gr ON gm.rank = gr.rank_id AND gm.guild_id = gr.guild_id
          WHERE rm.roster_id = $1
          ORDER BY c.name ASC
        `;
        await db.query(query, [sampleRosterId]);
      }
    },
    {
      name: 'Find recent guild member joins',
      fn: async () => {
        const query = `
          SELECT *
          FROM guild_members
          WHERE guild_id = $1
            AND joined_at >= $2
            AND left_at IS NULL
        `;
        await db.query(query, [sampleGuildId, twoDaysAgo]);
      }
    },
    {
      name: 'Find recent guild member leaves',
      fn: async () => {
        const query = `
          SELECT *
          FROM guild_members
          WHERE guild_id = $1
            AND left_at >= $2
        `;
        await db.query(query, [sampleGuildId, twoDaysAgo]);
      }
    },
    {
      name: 'Get characters by class',
      fn: async () => {
        const query = `
          SELECT *
          FROM characters
          WHERE class = 'Warrior'
          LIMIT 50
        `;
        await db.query(query);
      }
    },
    {
      name: 'Get guild members by rank',
      fn: async () => {
        const query = `
          SELECT *
          FROM guild_members
          WHERE guild_id = $1 AND rank = 0
        `;
        await db.query(query, [sampleGuildId]);
      }
    },
    {
      name: 'Get upcoming events',
      fn: async () => {
        const query = `
          SELECT *
          FROM events
          WHERE guild_id = $1 AND event_time > NOW()
          ORDER BY event_time ASC
          LIMIT 10
        `;
        await db.query(query, [sampleGuildId]);
      }
    },
    {
      name: 'Get main characters in guild',
      fn: async () => {
        const query = `
          SELECT 
            gm.*,
            c.name,
            c.class,
            c.level,
            c.role
          FROM guild_members gm
          JOIN characters c ON gm.character_id = c.id
          WHERE gm.guild_id = $1 AND gm.is_main = true
        `;
        await db.query(query, [sampleGuildId]);
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await runTest(test.name, test.fn);
      results.push(result);
    } catch (error) {
      console.error(`Error running test ${test.name}:`, error);
    }
  }
  
  console.log('\n=== PERFORMANCE TEST SUMMARY ===');
  results.forEach(result => {
    console.log(`${result.name}: ${result.avgTime.toFixed(2)}ms`);
  });
  
  await db.end();
}

// Run all tests
runAllTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});