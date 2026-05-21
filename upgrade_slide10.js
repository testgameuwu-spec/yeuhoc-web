const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function upgradeSlide10() {
  const slideId = 'ab3507c9-f4b3-495d-a747-5799e3693210'; // Liveshow Thăng Long Trong Tôi
  const { data } = await supabase.from('recap_slides').select('content').eq('id', slideId).single();
  let html = data.content && data.content.html ? data.content.html : data.content;
  
  // Extract existing images
  const matches = html.match(/<img[^>]+src="([^"]+)"/g) || [];
  const existingImages = matches.map(m => m.match(/src="([^"]+)"/)[1]);
  
  // Generate 45 placeholders (3 tracks of 15)
  let tracksHtml = '';
  for (let trackIndex = 0; trackIndex < 3; trackIndex++) {
     const dirClass = trackIndex === 1 ? 'dir-right' : 'dir-left';
     const extraStyle = trackIndex === 2 ? ' style="animation-duration: 30s;"' : '';
     tracksHtml += `\n            <div class="gallery-track ${dirClass}"${extraStyle} bis_skin_checked="1">`;
     
     for (let i = 0; i < 15; i++) {
        const globalIndex = trackIndex * 15 + i;
        if (globalIndex < existingImages.length) {
           tracksHtml += `\n                <div class="img-placeholder" bis_skin_checked="1"><img src="${existingImages[globalIndex]}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded" /></div>`;
        } else {
           tracksHtml += `\n                <div class="img-placeholder" bis_skin_checked="1"><span class="ph-icon">👽</span><span>Ảnh ${globalIndex + 1}</span></div>`;
        }
     }
     
     // Add duplicate for seamless marquee
     tracksHtml += `\n                <!-- Duplicate -->`;
     for (let i = 0; i < 15; i++) {
        const globalIndex = trackIndex * 15 + i;
        if (globalIndex < existingImages.length) {
           tracksHtml += `\n                <div class="img-placeholder" bis_skin_checked="1"><img src="${existingImages[globalIndex]}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded" /></div>`;
        } else {
           tracksHtml += `\n                <div class="img-placeholder" bis_skin_checked="1"><span class="ph-icon">👽</span><span>Ảnh ${globalIndex + 1}</span></div>`;
        }
     }
     
     tracksHtml += `\n            </div>`;
  }
  
  const slideshowHtml = `<div class="gallery-slideshow anim" data-delay="800" bis_skin_checked="1">${tracksHtml}\n        </div>`;
  
  // Replace scattered-gallery with new slideshow
  const newHtml = html.replace(/<div class="scattered-gallery">[\s\S]*?<\/div>/, slideshowHtml);
  
  await supabase.from('recap_slides').update({ content: { html: newHtml } }).eq('id', slideId);
  console.log('Upgraded Slide 10 to 45-image gallery!');
}

upgradeSlide10();
