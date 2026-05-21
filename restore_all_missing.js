const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAll() {
  const dataStr = fs.readFileSync('recap_backup_2026-05-21.json', 'utf8');
  const backupData = JSON.parse(dataStr);
  const backupSlides = backupData.slides;
  
  const { data: dbSlides } = await supabase.from('recap_slides').select('id, content');
  
  for (const bSlide of backupSlides) {
    const bHtml = typeof bSlide.content === 'string' ? bSlide.content : (bSlide.content && bSlide.content.html ? bSlide.content.html : '');
    const bMatches = bHtml.match(/<img[^>]+src="([^"]+)"/g) || [];
    
    // Find matching slide in DB by ID
    const dbSlide = dbSlides.find(d => d.id === bSlide.id);
    if (!dbSlide) continue;
    
    const dbHtml = typeof dbSlide.content === 'string' ? dbSlide.content : (dbSlide.content && dbSlide.content.html ? dbSlide.content.html : '');
    const dbMatches = dbHtml.match(/<img[^>]+src="([^"]+)"/g) || [];
    
    if (bMatches.length > dbMatches.length) {
      console.log(`Slide ${bSlide.id} has ${bMatches.length} images in backup but only ${dbMatches.length} in DB. Restoring...`);
      await supabase.from('recap_slides').update({ 
         content: { html: bHtml },
         duration: bSlide.duration || 15
      }).eq('id', bSlide.id);
      console.log(`Restored slide ${bSlide.id}`);
    }
  }
  console.log('Check and restore complete.');
}

restoreAll();
