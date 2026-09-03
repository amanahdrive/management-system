const fs = require('fs');

const svgContent = fs.readFileSync('public/templates/sertifikat-siswa.svg', 'utf8');
console.log('SVG length:', svgContent.length);
console.log('SVG viewBox / width / height:', svgContent.substring(0, 300));
