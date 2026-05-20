const fs = require('fs');

const cssChanges = `
.card-photo {
    width: 240px;
    height: 280px;
    border-radius: 0;
    margin-bottom: 15px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: visible;
}

.card-photo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 15px rgba(0,0,0,0.15));
}

.card-info-wrap {
    text-align: center;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.card-name {
    font-size: 1.5rem;
    font-weight: 800;
    color: #222;
    margin-bottom: 10px;
}

.card-name-divider {
    width: 35px;
    height: 3px;
    background: #e74c3c;
    margin: 0 auto 15px;
    border-radius: 2px;
}

.card-achievements {
    background: #fff;
    border: 1px solid #eaeaea;
    border-radius: 12px;
    padding: 20px 15px;
    color: #333;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    width: 100%;
    max-width: 280px;
}

.ach-label {
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #777;
    margin-bottom: 12px;
    letter-spacing: 0.05em;
}

.ach-text {
    font-size: 1rem;
    line-height: 1.6;
    font-weight: 700;
    color: #444;
}

/* Static card for gallery-slideshow */
.personal-award-card.static-card {
    position: relative;
    top: auto;
    left: auto;
    transform: none !important;
    opacity: 1 !important;
    pointer-events: auto;
    z-index: 10;
    flex-shrink: 0;
    margin: 0 15px 0 0;
    background: transparent;
    width: 300px;
}
`;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the old blocks
    content = content.replace(/\.card-photo\s*\{[^}]+\}/, '');
    content = content.replace(/\.card-photo\s+img\s*\{[^}]+\}/, '');
    content = content.replace(/\.card-info-wrap\s*\{[^}]+\}/, '');
    content = content.replace(/\.card-name\s*\{[^}]+\}/, '');
    content = content.replace(/\.card-name-divider\s*\{[^}]+\}/, '');
    content = content.replace(/\.card-achievements\s*\{[^}]+\}/, '');
    content = content.replace(/\.ach-label\s*\{[^}]+\}/, '');
    content = content.replace(/\.ach-text\s*\{[^}]+\}/, '');
    content = content.replace(/\/\*\s*Static card for gallery-slideshow\s*\*\/[\s\S]*?\.personal-award-card\.static-card\s*\{[^}]+\}/, '');
    
    // Append the new block at the end
    content += '\n' + cssChanges;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
}

processFile('public/recap/recap.css');
processFile('a5tongket/a5tongke-styles.css');
