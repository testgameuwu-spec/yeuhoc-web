const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAll() {
  const { data: slides } = await supabase.from('recap_slides').select('id, content');
  
  for (const slide of slides) {
    let html = slide.content && slide.content.html ? slide.content.html : slide.content;
    let modified = false;
    
    // Fix 1: Remove inline animation-duration
    if (html.includes('style="animation-duration: 30s;"')) {
       html = html.replace(/style="animation-duration:\s*30s;"/g, '');
       modified = true;
    }
    if (html.includes('style="animation-duration: 25s;"')) {
       html = html.replace(/style="animation-duration:\s*25s;"/g, '');
       modified = true;
    }
    if (html.includes('animation-duration:')) {
       html = html.replace(/animation-duration:\s*\d+s;?/g, '');
       modified = true;
    }
    
    // Fix 2: Remove naked images on Slide 10
    if (slide.id === 'ab3507c9-f4b3-495d-a747-5799e3693210') {
      const regex = /<\/div>\s*<div class="img-placeholder anim" data-delay="\d+" style=""><img src="[^"]+" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded"><\/div>\s*<div class="img-placeholder anim" data-delay="\d+" style=""><img src="[^"]+" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded"><\/div>\s*<div class="img-placeholder anim" data-delay="\d+" style=""><img src="[^"]+" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded"><\/div>\s*<div class="img-placeholder anim" data-delay="\d+" style=""><img src="[^"]+" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded"><\/div>\s*<div class="img-placeholder anim" data-delay="\d+" style=""><img src="[^"]+" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded"><\/div><\/div>/g;
      
      if (regex.test(html)) {
         html = html.replace(regex, '');
         // Clean up any remaining extra </div> if needed, but wait:
         // The original html had `</div></div>` at the end of the naked images.
         // Let's just do a simpler replace for Slide 10.
         modified = true;
      }
      
      // A safer regex for the naked images:
      const nakedImagesRegex = /(<\/div>)\s*(<div class="img-placeholder anim"[\s\S]*?<\/div><\/div>)/;
      const match = html.match(nakedImagesRegex);
      if (match && match[2].includes('https://ahcgigcacmaerammxzqe.supabase.co/storage/v1/object/public/recap_images/slides/0.7390757151905193.png')) {
         // This is definitely the junk part.
         html = html.replace(match[2], '');
         modified = true;
      }
    }
    
    if (modified) {
       // Clean up empty style="" attributes
       html = html.replace(/ style=""/g, '');
       await supabase.from('recap_slides').update({ content: { html } }).eq('id', slide.id);
       console.log(`Fixed slide ${slide.id}`);
    }
  }
  console.log('All fixes applied!');
}

fixAll();
