const fs = require('fs');

const html = fs.readFileSync('c:/Users/Admin/Downloads/a5tongket/a5tongke.html', 'utf-8');

// Find all slides
const slides = [];
const parts = html.split('<div class="slide');
for (let i = 1; i < parts.length; i++) {
    // get everything until the next slide or script tag
    let content = '<div class="slide' + parts[i];
    
    // We need to cut off before the next slide or script
    // Actually, splitting by `<div class="slide` already does this for the start!
    // But the last slide will include the `<script>` tags at the bottom.
    if (i === parts.length - 1) {
        content = content.split('<script')[0].trim();
    } else {
        // Find the last closing div before the next slide started (which was split)
        // Wait, split just removes `<div class="slide`. The end of the previous chunk is the end of the slide!
        // Actually, no. HTML comments or other things could be between `</div>` and the next `<div class="slide"`.
        content = content.split('<!-- =')[0].trim(); 
        content = content.split('<!-- Slide')[0].trim();
    }
    slides.push(content);
}

fs.writeFileSync('slides_data.json', JSON.stringify(slides, null, 2));
console.log('Saved', slides.length, 'slides');
