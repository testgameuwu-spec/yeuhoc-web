const fs = require('fs');
const path = require('path');

const directoryToScan = 'f:\\yeuhoc\\yeuhoc-main\\yeuhoc-main';
const excludeDirs = ['.git', '.next', 'node_modules', '.agents', '.augment'];
const targetRegex = /https:\/\/ahcgigcacmaerammxzqe\.supabase\.co\/storage\/v1\/object\/public\/[^"'\s\\]+/g;
const replacement = '/placeholder.png';

let totalReplaced = 0;
let filesModified = 0;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!excludeDirs.includes(file)) {
                scanDirectory(fullPath);
            }
        } else {
            // Only process text files like js, json, html, css
            if (/\.(js|jsx|ts|tsx|json|html|css|md|txt)$/.test(file)) {
                try {
                    let content = fs.readFileSync(fullPath, 'utf8');
                    let matches = content.match(targetRegex);
                    
                    if (matches && matches.length > 0) {
                        const newContent = content.replace(targetRegex, replacement);
                        if (content !== newContent) {
                            fs.writeFileSync(fullPath, newContent, 'utf8');
                            totalReplaced += matches.length;
                            filesModified++;
                            console.log(`Updated ${matches.length} links in ${fullPath}`);
                        }
                    }
                } catch (e) {
                    console.error(`Error reading ${fullPath}: ${e.message}`);
                }
            }
        }
    }
}

scanDirectory(directoryToScan);
console.log(`\nDone! Replaced ${totalReplaced} links across ${filesModified} files.`);
