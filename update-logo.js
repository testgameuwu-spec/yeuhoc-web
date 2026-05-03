const fs = require('fs');
const svg = fs.readFileSync('file-cropped (5).svg', 'utf8');
const paths = svg.match(/<path[^>]*>/g);
let pathsJSX = paths.map(p => p.replace('fill="#000000"', 'fill={color}').replace(/opacity="1\.000000"/g, '').replace(/stroke="none"/g, '')).join('\n      ');
const content = `'use client';

export default function LogoIcon({ size = 32, color = 'currentColor', className = '' }) {
  return (
    <svg
      viewBox="313.5232 108.3264 391.168 416.64"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    >
      ${pathsJSX}
    </svg>
  );
}
`;
fs.writeFileSync('components/LogoIcon.js', content);
