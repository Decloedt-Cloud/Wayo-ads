import { Database as BunSqlite } from 'bun:sqlite';
import pg from 'pg';

const sqlite = new BunSqlite('db/custom.db');
const { Client } = pg;

const pgClient = new Client({
  connectionString: 'postgresql://postgres@localhost:5432/marketing_db'
});

function convertValue(key, value) {
  if (value === null) return null;
  if (typeof value === 'bigint') return Number(value);
  
  if (typeof value === 'number' && (key.toLowerCase().includes('at') || key.toLowerCase() === 'date')) {
    if (value > 1000000000000) {
      return new Date(value).toISOString();
    } else if (value > 1000000000) {
      return new Date(value * 1000).toISOString();
    }
  }
  
  return value;
}

async function migrate() {
  await pgClient.connect();
  
  await pgClient.query('SET session_replication_role = replica');
  console.log('Starting migration from SQLite to PostgreSQL...\n');

  const tables = sqlite.query(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
  `).all();

  let totalMigrated = 0;

  for (const { name: table } of tables) {
    try {
      const rows = sqlite.query(`SELECT * FROM ${table}`).all();
      if (rows.length > 0) {
        console.log(`Migrating ${table}: ${rows.length} records`);
        
        let inserted = 0;
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row).map((v, i) => convertValue(columns[i], v));
          
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const columnNames = columns.map(c => `"${c}"`).join(', ');
          
          const query = `
            INSERT INTO "${table}" (${columnNames}) 
            VALUES (${placeholders})
          `;
          
          try {
            await pgClient.query(query, values);
            inserted++;
          } catch (e) {
            console.log(`  Error: ${e.message.substring(0, 80)}`);
          }
        }
        
        console.log(`  Inserted ${inserted}/${rows.length} records`);
        totalMigrated += inserted;
      }
    } catch (e) {
      console.log(`Error migrating ${table}: ${e.message}`);
    }
  }

  await pgClient.query('SET session_replication_role = origin');
  console.log(`\nMigration complete! Total records migrated: ${totalMigrated}`);
  
  await pgClient.end();
  process.exit(0);
}

migrate().catch(async (e) => {
  console.error('Migration failed:', e);
  await pgClient.end();
  process.exit(1);
});
