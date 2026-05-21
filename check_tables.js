const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1];

async function checkSchema() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `);
  console.log('Tables:', res.rows.map(r => r.table_name));
  await client.end();
}
checkSchema();
