const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlides() {
  const { data } = await supabase.from('recap_slides').select('id, order_index, content').order('order_index');
  data.forEach((s, idx) => {
    let html = s.content && s.content.html ? s.content.html : '';
    const textSnippet = html.replace(/<[^>]*>?/gm, '').substring(0, 50).trim().replace(/\n/g, ' ');
    console.log(`Idx ${idx} (Order ${s.order_index}): ${textSnippet}`);
  });
}
checkSlides();
