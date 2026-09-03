const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function testGenerate() {
  const templateBytes = fs.readFileSync('public/templates/sertifikat-template.pdf');
  const pdfDoc = await PDFDocument.load(templateBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { width, height } = page.getSize();
  console.log('Template page size:', { width, height });

  // Test drawing text
  const studentName = 'SYADZA NAHARA RIZQAN';
  let nameSize = 34;
  let textWidth = helveticaBold.widthOfTextAtSize(studentName, nameSize);
  const maxWidth = 650;
  if (textWidth > maxWidth) {
    nameSize = nameSize * (maxWidth / textWidth);
    textWidth = helveticaBold.widthOfTextAtSize(studentName, nameSize);
  }

  // Draw Student Name (Centered at X = width / 2)
  const nameX = (width - textWidth) / 2;
  const nameY = 352; // PDF points from bottom

  page.drawText(studentName, {
    x: nameX,
    y: nameY,
    size: nameSize,
    font: helveticaBold,
    color: rgb(8 / 255, 51 / 255, 68 / 255), // #083344
  });

  const outputBytes = await pdfDoc.save();
  fs.writeFileSync('public/templates/test-generated.pdf', outputBytes);
  console.log('Successfully generated test PDF at public/templates/test-generated.pdf (size:', outputBytes.length, 'bytes)');
}

testGenerate().catch(console.error);
