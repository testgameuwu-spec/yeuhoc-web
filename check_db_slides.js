const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envPath = '.env.local';

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  for (let line of envConfig) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) process.env[key.trim()] = valueParts.join('=').trim();
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data: slides, error } = await supabase.from('recap_slides').select('id, content, order_index').order('order_index');
  if (error) {
    console.error(error);
    return;
  }
  
  for (let s of slides) {
      const html = s.content.html || '';
      console.log(`Slide ${s.order_index}: ID ${s.id} - ${html.substring(0, 50).replace(/\n/g, ' ')}`);
  }
}
main();
