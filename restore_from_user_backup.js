const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreFromBackup() {
  const dataStr = fs.readFileSync('recap_backup_2026-05-21.json', 'utf8');
  const data = JSON.parse(dataStr);
  
  // The backup has { slides: [...], vdMembers: [...] }
  const slides = data.slides;
  
  const layloi = slides.find(s => {
     let html = s.content && s.content.html ? s.content.html : (typeof s.content === 'string' ? s.content : '');
     return html.includes('Lầy Lội Lần Cuối');
  });
  
  if (layloi) {
     let html = layloi.content && layloi.content.html ? layloi.content.html : (typeof layloi.content === 'string' ? layloi.content : '');
     const matches = html.match(/<img[^>]+src="([^"]+)"/g);
     if (matches && matches.length > 0) {
       console.log(`Found ${matches.length} images in Lầy Lội Lần Cuối!`);
       console.log(matches.map(m => m.match(/src="([^"]+)"/)[1]).slice(0, 5));
       
       // Restore it to the DB
       const layLoiId = '71b647b9-fa41-4ad1-8c65-a736a419c3b0';
       await supabase.from('recap_slides').update({ 
           content: { html },
           duration: layloi.duration || 15
       }).eq('id', layLoiId);
       
       console.log('Successfully restored Lầy Lội Lần Cuối from user backup!');
     } else {
       console.log('Found Lầy Lội Lần Cuối in backup, but no images found in it.');
     }
  } else {
     console.log('Lầy Lội Lần Cuối not found in the provided backup.');
  }
}

restoreFromBackup();
