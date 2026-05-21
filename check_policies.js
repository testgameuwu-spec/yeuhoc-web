const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1];

async function checkPolicies() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT polname, cmd, qual, with_check 
    FROM pg_policy 
    WHERE polrelid = 'storage.objects'::regclass
  `);
  console.log('Policies on storage.objects:');
  res.rows.forEach(r => console.log(r));
  await client.end();
}
checkPolicies();
