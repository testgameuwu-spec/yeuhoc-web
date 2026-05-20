const fs = require('fs');
const cp = require('child_process');
const original = cp.execSync('git show HEAD~3:components/admin/slides_data.json', {encoding: 'utf8'});
const data = JSON.parse(original);
data.forEach((s, i) => {
    const match = s.match(/<h2[^>]*>(.*?)<\/h2>/) || s.match(/<p class="chapter-label[^>]*>(.*?)<\/p>/) || s.match(/<h1[^>]*>(.*?)<\/h1>/);
    console.log(i, match ? match[1] : 'no title');
});
