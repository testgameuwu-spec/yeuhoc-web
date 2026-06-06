const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function reduceGallery() {
  const slideOrderIndex = 9; // Tiến Hóa Ngược Của Tình Bạn
  const { data } = await supabase.from('recap_slides').select('id, content').eq('order_index', slideOrderIndex).single();
  
  let html = data.content && data.content.html ? data.content.html : data.content;
  
  // Extract existing images
  const matches = html.match(/<img[^>]+src="([^"]+)"/g) || [];
  const existingImages = matches.map(m => m.match(/src="([^"]+)"/)[1]);
  // Filter out any accidental matches (keep only /slides/)
  const validImages = existingImages.filter(src => src.includes('/slides/'));
  // Remove duplicate extracted images since the previous tracks had duplicate blocks
  const uniqueImages = [...new Set(validImages)];
  // Wait! The extracted images might already contain duplicates because my previous script injected them twice!
  // Actually, Set is perfect to remove the duplicate marquee loops.
  
  let tracksHtml = '';
  // Only 2 tracks
  for (let trackIndex = 0; trackIndex < 2; trackIndex++) {
     const dirClass = trackIndex === 1 ? 'dir-right' : 'dir-left';
     tracksHtml += `\n            <div class="gallery-track ${dirClass}" bis_skin_checked="1">`;
     
     let trackInner = '';
     for (let i = 0; i < 15; i++) {
        const globalIndex = trackIndex * 15 + i;
        if (globalIndex < uniqueImages.length) {
           trackInner += `\n                <div class="img-placeholder" bis_skin_checked="1"><img src="${uniqueImages[globalIndex]}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded" /></div>`;
        } else {
           trackInner += `\n                <div class="img-placeholder" bis_skin_checked="1"><span class="ph-icon">👽</span><span>Ảnh ${globalIndex + 1}</span></div>`;
        }
     }
     
     tracksHtml += trackInner;
     tracksHtml += `\n                <!-- Duplicate -->`;
     tracksHtml += trackInner;
     tracksHtml += `\n            </div>`;
  }
  
  const slideshowHtml = `<div class="gallery-slideshow anim" data-delay="800" bis_skin_checked="1">${tracksHtml}\n        </div>`;
  
  // Replace the existing slideshow block
  const newHtml = html.replace(/<div class="gallery-slideshow[\s\S]*?(?=<p class="slide-quote|<div class="scattered-gallery"|<div class="vd-compact-gallery|<\/div>\s*$)/, slideshowHtml + '\n        ');
  
  await supabase.from('recap_slides').update({ content: { html: newHtml } }).eq('id', data.id);
  console.log(`Reduced gallery for slide Order ${slideOrderIndex} to 2 tracks (${uniqueImages.length} images kept)`);
}

reduceGallery();
