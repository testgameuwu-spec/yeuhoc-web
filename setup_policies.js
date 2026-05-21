const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const connectionString = env.match(/DATABASE_URL=(.*)/)[1];

async function setupPolicies() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    await client.query(`
      DROP POLICY IF EXISTS "Give public access to recap_images" ON storage.objects;
      DROP POLICY IF EXISTS "Give public insert to recap_images" ON storage.objects;
      DROP POLICY IF EXISTS "Give public update to recap_images" ON storage.objects;
      DROP POLICY IF EXISTS "Give public delete to recap_images" ON storage.objects;
      
      CREATE POLICY "Give public access to recap_images" ON storage.objects FOR SELECT USING (bucket_id = 'recap_images');
      CREATE POLICY "Give public insert to recap_images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recap_images');
      CREATE POLICY "Give public update to recap_images" ON storage.objects FOR UPDATE USING (bucket_id = 'recap_images');
      CREATE POLICY "Give public delete to recap_images" ON storage.objects FOR DELETE USING (bucket_id = 'recap_images');
    `);
    console.log('Policies created successfully!');
  } catch (err) {
    console.error('Error creating policies:', err);
  } finally {
    await client.end();
  }
}
setupPolicies();
