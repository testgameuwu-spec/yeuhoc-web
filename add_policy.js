const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function addPolicy() {
  const { data, error } = await supabase.rpc('query', { query_text: `
    CREATE POLICY "Allow anon uploads to recap_images" 
    ON storage.objects FOR INSERT TO public 
    WITH CHECK (bucket_id = 'recap_images');
  ` });
  
  if (error) {
    console.log('Error adding policy via RPC:', error.message);
  } else {
    console.log('Policy added via RPC!');
  }
}
addPolicy();
