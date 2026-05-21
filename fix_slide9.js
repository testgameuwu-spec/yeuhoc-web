const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSlide() {
  const slideId = '373c26db-06da-4dfa-b87c-ff95bd884634'; // Tiến Hóa Ngược
  const { data } = await supabase.from('recap_slides').select('content').eq('id', slideId).single();
  let html = data.content && data.content.html ? data.content.html : data.content;
  
  if (html.includes('<div class="scattered-gallery"></div>')) {
     html = html.replace('<div class="scattered-gallery"></div>', '');
     await supabase.from('recap_slides').update({ content: { html } }).eq('id', slideId);
     console.log('Fixed Slide 9: Removed empty scattered-gallery');
  } else {
     console.log('No empty scattered-gallery found in Slide 9');
  }
}
fixSlide();
