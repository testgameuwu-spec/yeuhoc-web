const fs = require('fs');
const data = JSON.parse(fs.readFileSync('components/admin/slides_data.json', 'utf8'));

let hasImages = false;

data.forEach((slideHtml, index) => {
  const html = typeof slideHtml === 'string' ? slideHtml : (slideHtml.content ? slideHtml.content.html || slideHtml.content : '');
  if (typeof html === 'string') {
    const matches = html.match(/<img[^>]+src="([^"]+)"/g);
    if (matches && matches.length > 0) {
      console.log(`Slide Index ${index} has ${matches.length} images:`);
      matches.forEach(m => console.log('  ', m));
      hasImages = true;
    }
  }
});

if (!hasImages) {
  console.log('No image links found in any slide in slides_data.json backup.');
}
