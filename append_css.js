const fs = require('fs');
const css = `
/* ===== CUSTOM ORIENTATIONS ===== */
.scattered-gallery .img-placeholder.img-landscape {
    aspect-ratio: 16/9 !important;
    width: auto !important;
    height: 45% !important;
    max-width: 50% !important;
}
.scattered-gallery .img-placeholder.img-portrait {
    aspect-ratio: 3/4 !important;
    width: auto !important;
    height: 50% !important;
    max-width: 40% !important;
}
`;
fs.appendFileSync('public/recap/recap.css', css);
console.log('Appended CSS successfully');
