const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlides() {
  const { data } = await supabase.from('recap_slides').select('id, content');
  data.forEach(slide => {
    if (slide.content && slide.content.html) {
      const match = slide.content.html.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/g);
      if (match) {
        console.log('Slide', slide.id, 'Images:', match.map(m => m.match(/src=["']([^"']*)["']/)[1]));
      }
    }
  });
}
checkSlides();
