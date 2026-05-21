const fs = require('fs');

function check() {
  const dataStr = fs.readFileSync('recap_backup_2026-05-21.json', 'utf8');
  const data = JSON.parse(dataStr);
  const slides = data.slides;
  
  slides.forEach((s, i) => {
    const html = typeof s.content === 'string' ? s.content : (s.content && s.content.html ? s.content.html : '');
    const matches = html.match(/<img[^>]+src="([^"]+)"/g) || [];
    if (matches.length > 0) {
      console.log(`Slide ID ${s.id} (Order ${s.order_index}) has ${matches.length} images`);
      // check if any of these are recap_images (uploaded ones)
      const uploaded = matches.filter(m => m.includes('recap_images'));
      if (uploaded.length > 0) {
         console.log(`  -> ${uploaded.length} of them are uploaded images!`);
      }
    }
  });
}

check();
