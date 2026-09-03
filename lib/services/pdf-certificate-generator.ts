import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { CertificateFieldConfig, CertificateTemplate, DynamicCertificateValues } from '@/types/certificate';
import fs from 'fs';
import path from 'path';

function parseHexColor(hex: string) {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return rgb(r, g, b);
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0.05, 0.2, 0.25); // Default dark teal
}

/**
 * Loads template PDF bytes from disk or remote URL/base64
 */
export async function loadTemplatePdfBytes(templateUrl: string): Promise<Uint8Array> {
  if (templateUrl.startsWith('data:application/pdf;base64,')) {
    const base64Data = templateUrl.replace('data:application/pdf;base64,', '');
    return Buffer.from(base64Data, 'base64');
  }

  // Check local filesystem in public folder
  const relativePath = templateUrl.startsWith('/') ? templateUrl.slice(1) : templateUrl;
  const localFilePath = path.join(process.cwd(), 'public', relativePath.replace(/^templates\//, 'templates/'));

  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }

  const fallbackPath = path.join(process.cwd(), 'public', 'templates', 'sertifikat-template.pdf');
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath);
  }

  // Fetch via HTTP if remote URL
  if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
    const res = await fetch(templateUrl);
    const arrayBuf = await res.arrayBuffer();
    return new Uint8Array(arrayBuf);
  }

  throw new Error(`Template PDF tidak ditemukan di lokasi: ${templateUrl}`);
}

/**
 * Generates high-precision PDF certificate using pdf-lib overlay on template
 */
export async function generatePrecisionCertificatePdf(
  template: CertificateTemplate,
  values: DynamicCertificateValues
): Promise<{ pdfBytes: Uint8Array; base64: string }> {
  // 1. Load template PDF
  const templateBytes = await loadTemplatePdfBytes(template.pdf_template_url);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // 2. Embed Standard Fonts
  const fonts: Record<string, PDFFont> = {
    'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'Helvetica-Bold': await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    'Times-Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'Times-Bold': await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
    'Courier-Bold': await pdfDoc.embedFont(StandardFonts.CourierBold),
  };

  const pages = pdfDoc.getPages();
  const page: PDFPage = pages[0];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // 3. Draw dynamic fields
  for (const field of template.fields) {
    if (!field.is_enabled) continue;

    let rawValue = values[field.field_key] || '';
    if (!rawValue && field.field_key === 'student_name') rawValue = values.student_name || 'SISWA AMANAH DRIVE';
    if (!rawValue && field.field_key === 'certificate_number') rawValue = values.certificate_number || 'SS001/AMD/VIII/2026';
    if (!rawValue && field.field_key === 'instructor_name') rawValue = values.instructor_name || 'Syawal Putra';
    if (!rawValue && field.field_key === 'leader_name') rawValue = values.leader_name || 'Nur Awalia Rianti';
    if (!rawValue && field.field_key === 'grade_text') rawValue = values.grade_text || 'DENGAN PREDIKAT BAIK';

    // Apply text transform
    if (field.text_transform === 'uppercase') {
      rawValue = rawValue.toUpperCase();
    } else if (field.text_transform === 'lowercase') {
      rawValue = rawValue.toLowerCase();
    } else if (field.text_transform === 'capitalize') {
      rawValue = rawValue.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const displayText = `${field.prefix || ''}${rawValue}${field.suffix || ''}`;
    if (!displayText.trim()) continue;

    // Pick font
    const font = fonts[field.font_family] || fonts['Helvetica-Bold'];
    let fontSize = field.font_size || 12;
    let textWidth = font.widthOfTextAtSize(displayText, fontSize);

    // Auto-scale font if text exceeds max_width
    const maxWidth = field.max_width || (field.width ? field.width * 1.2 : pageWidth * 0.85);
    if (textWidth > maxWidth && maxWidth > 0) {
      fontSize = fontSize * (maxWidth / textWidth);
      textWidth = font.widthOfTextAtSize(displayText, fontSize);
    }

    // Clear background if configured
    if (field.clear_background) {
      const clearWidth = (field.width || textWidth) + 20;
      const clearHeight = (field.height || fontSize * 1.4) + 6;
      let clearX = field.x - clearWidth / 2;
      if (field.alignment === 'left') clearX = field.x - 6;
      if (field.alignment === 'right') clearX = field.x - clearWidth + 6;

      const clearY = field.y - (fontSize * 0.25);
      const bgCol = parseHexColor(field.bg_color || '#fcfdfd');

      page.drawRectangle({
        x: Math.max(0, clearX),
        y: Math.max(0, clearY - (clearHeight * 0.2)),
        width: Math.min(pageWidth, clearWidth),
        height: clearHeight,
        color: bgCol,
      });
    }

    // Calculate exact X position based on alignment
    let xPos = field.x;
    if (field.alignment === 'center') {
      xPos = field.x - textWidth / 2;
    } else if (field.alignment === 'right') {
      xPos = field.x - textWidth;
    }

    // Draw text with exact coordinates
    const textColor = parseHexColor(field.color || '#083344');
    page.drawText(displayText, {
      x: xPos,
      y: field.y,
      size: fontSize,
      font: font,
      color: textColor,
    });
  }

  // 4. Save and return PDF
  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');

  return {
    pdfBytes,
    base64: `data:application/pdf;base64,${base64}`,
  };
}
