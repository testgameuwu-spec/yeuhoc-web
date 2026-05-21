const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function swap() {
  const { data } = await supabase.from('recap_slides').select('id, order_index').in('order_index', [12, 13]);
  
  const id12 = data.find(d => d.order_index === 12).id; // currently Góc Sinh Hoạt
  const id13 = data.find(d => d.order_index === 13).id; // currently Chương III Lớp 12

  await supabase.from('recap_slides').update({ order_index: 999 }).eq('id', id12);
  await supabase.from('recap_slides').update({ order_index: 12 }).eq('id', id13);
  await supabase.from('recap_slides').update({ order_index: 13 }).eq('id', id12);
  
  console.log('Swapped 12 and 13!');
}
swap();
