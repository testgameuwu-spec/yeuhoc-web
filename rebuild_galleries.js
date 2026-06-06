const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function rebuildGalleries() {
  const targetOrders = [5, 9, 13, 14]; // Nơi Tình Bạn (5), Tiến Hóa Ngược (9), Lầy Lội (13), Kỷ Yếu (14)
  const { data: slides } = await supabase.from('recap_slides').select('id, order_index, content').in('order_index', targetOrders);
  
  for (const slide of slides) {
    let html = slide.content && slide.content.html ? slide.content.html : slide.content;
    
    // Extract existing images
    const matches = html.match(/<img[^>]+src="([^"]+)"/g) || [];
    const existingImages = matches.map(m => m.match(/src="([^"]+)"/)[1]);
    
    // Filter out logo.png if accidentally matched, though usually they are in recap_images/slides
    const validImages = existingImages.filter(src => src.includes('/slides/'));
    
    let tracksHtml = '';
    for (let trackIndex = 0; trackIndex < 3; trackIndex++) {
       const dirClass = trackIndex === 1 ? 'dir-right' : 'dir-left';
       tracksHtml += `\n            <div class="gallery-track ${dirClass}" bis_skin_checked="1">`;
       
       let trackInner = '';
       for (let i = 0; i < 15; i++) {
          const globalIndex = trackIndex * 15 + i;
          if (globalIndex < validImages.length) {
             trackInner += `\n                <div class="img-placeholder" bis_skin_checked="1"><img src="${validImages[globalIndex]}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="uploaded" /></div>`;
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
    
    // Replace existing slideshow
    if (html.includes('class="gallery-slideshow')) {
       html = html.replace(/<div class="gallery-slideshow[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, slideshowHtml);
       // The regex above might be brittle. Let's use a simpler replace or substring.
    }
    
    // Actually, a better regex to replace the entire gallery-slideshow block:
    // It starts with <div class="gallery-slideshow
    // We can just find that and the matching closing div.
    // Or we can just use a regex that matches until <p class="slide-quote
    const newHtml = html.replace(/<div class="gallery-slideshow[\s\S]*?(?=<p class="slide-quote|<div class="scattered-gallery"|<div class="vd-compact-gallery|<\/div>\s*$)/, slideshowHtml + '\n        ');
    
    await supabase.from('recap_slides').update({ content: { html: newHtml } }).eq('id', slide.id);
    console.log(`Rebuilt gallery for slide Order ${slide.order_index} (${validImages.length} images)`);
  }
  console.log('All galleries rebuilt!');
}

rebuildGalleries();
