const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  // 1. Restore Slide 10
  const slide10Data = JSON.parse(fs.readFileSync('slide10.json', 'utf8'));
  await supabase.from('recap_slides').update({ content: slide10Data }).eq('id', 'ab3507c9-f4b3-495d-a747-5799e3693210');
  console.log('Restored Liveshow slide!');

  // 2. List all slides
  const { data } = await supabase.from('recap_slides').select('id, order_index, content').order('order_index');
  data.forEach((s, idx) => {
    const html = typeof s.content === 'string' ? s.content : (s.content && s.content.html ? s.content.html : '');
    const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'No Title';
    console.log(`Idx ${idx + 1} | Order ${s.order_index} | ${title.substring(0, 30)}`);
  });
}
fix();
