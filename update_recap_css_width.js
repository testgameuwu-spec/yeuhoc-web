const fs = require('fs');

let css = fs.readFileSync('public/recap/recap.css', 'utf8');

css = css.replace(
  /\.vd-stats-section\s*\{\s*width:\s*100%;\s*max-width:\s*700px;/,
  '.vd-stats-section {\n    width: 100%;\n    max-width: 1100px;'
);

css = css.replace(
  /\.vd-stats-grid\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(4, 1fr\);\s*gap:\s*6px;\s*margin-bottom:\s*10px;\s*\}/,
  '.vd-stats-grid {\n    display: grid;\n    grid-template-columns: repeat(4, 1fr);\n    gap: 6px;\n    margin: 0 auto 10px;\n    max-width: 750px;\n}'
);

css = css.replace(
  /\.vd-fun-fact\s*\{\s*margin-top:\s*12px;\s*background:\s*#fafafa;\s*border:\s*1px solid #f0f0f0;\s*border-radius:\s*10px;\s*padding:\s*10px 14px;\s*font-size:\s*0\.8rem;/,
  '.vd-fun-fact {\n    margin: 12px auto 0;\n    max-width: 750px;\n    background: #fafafa;\n    border: 1px solid #f0f0f0;\n    border-radius: 10px;\n    padding: 10px 14px;\n    font-size: 0.8rem;'
);

fs.writeFileSync('public/recap/recap.css', css);
console.log('CSS updated successfully.');
