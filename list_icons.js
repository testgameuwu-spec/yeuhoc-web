const fs = require('fs');
const path = require('path');

function findIcons(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(findIcons(file, ext));
    } else if (file.endsWith(ext)) {
      results.push(file);
    }
  });
  return results;
}

const allFiles = findIcons(__dirname, '.js').concat(findIcons(__dirname, '.jsx')).concat(findIcons(__dirname, '.ts')).concat(findIcons(__dirname, '.tsx'));

const lucideIcons = new Set();
const phosphorIcons = new Set();

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // match lucide-react imports
  const lucideRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  let match;
  while ((match = lucideRegex.exec(content)) !== null) {
    const icons = match[1].split(',').map(i => i.trim().split(/\s+as\s+/)[0]).filter(i => i);
    icons.forEach(i => lucideIcons.add(i));
  }

  // match phosphor-icons imports
  const phosphorRegex = /import\s+\{([^}]+)\}\s+from\s+['"]@phosphor-icons\/react['"]/g;
  while ((match = phosphorRegex.exec(content)) !== null) {
    const icons = match[1].split(',').map(i => i.trim().split(/\s+as\s+/)[0]).filter(i => i);
    icons.forEach(i => phosphorIcons.add(i));
  }
});

console.log("Lucide Icons:");
console.log(Array.from(lucideIcons).sort().join(', '));
console.log("\nPhosphor Icons:");
console.log(Array.from(phosphorIcons).sort().join(', '));
