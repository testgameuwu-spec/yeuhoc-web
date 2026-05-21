const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function reorder() {
  // Current:
  // 12: Chương III Lớp 12 (id12)
  // 13: Lầy Lội Lần Cuối (id13)
  // 14: Góc Sinh Hoạt Lạc Quan (id14)
  
  const { data } = await supabase.from('recap_slides').select('id, order_index').in('order_index', [12, 13, 14]);
  
  const id12 = data.find(d => d.order_index === 12).id;
  const id13 = data.find(d => d.order_index === 13).id;
  const id14 = data.find(d => d.order_index === 14).id; // Góc sinh hoạt

  // We want Góc Sinh Hoạt to be 12.
  // Chương III to be 13.
  // Lầy Lội to be 14.
  
  await supabase.from('recap_slides').update({ order_index: 999 }).eq('id', id14); // temp
  await supabase.from('recap_slides').update({ order_index: 14 }).eq('id', id13);
  await supabase.from('recap_slides').update({ order_index: 13 }).eq('id', id12);
  await supabase.from('recap_slides').update({ order_index: 12 }).eq('id', id14);
  
  console.log('Reordered!');
}
reorder();
