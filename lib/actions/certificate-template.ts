'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import {
  CertificateFieldConfig,
  CertificateTemplate,
  DynamicCertificateValues,
  IssuedCertificate,
} from '@/types/certificate';
import { generatePrecisionCertificatePdf } from '@/lib/services/pdf-certificate-generator';
import { formatSesiDateRange, generateNomorSertifikat } from '@/lib/utils/certificate';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

const DEFAULT_FIELDS: CertificateFieldConfig[] = [
  {
    field_key: 'certificate_number',
    label: 'Nomor Sertifikat',
    x: 421.12,
    y: 446,
    width: 300,
    height: 20,
    font_family: 'Helvetica',
    font_size: 11.5,
    font_weight: 'normal',
    color: '#1e293b',
    alignment: 'center',
    prefix: 'Nomor: ',
    suffix: '',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
  {
    field_key: 'student_name',
    label: 'Nama Siswa',
    x: 421.12,
    y: 350,
    width: 680,
    height: 44,
    font_family: 'Helvetica-Bold',
    font_size: 34,
    font_weight: 'bold',
    color: '#083344',
    alignment: 'center',
    max_width: 680,
    text_transform: 'uppercase',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
  {
    field_key: 'session_date_range',
    label: 'Rentang Tanggal Sesi',
    x: 421.12,
    y: 255,
    width: 500,
    height: 18,
    font_family: 'Helvetica-Bold',
    font_size: 11.5,
    font_weight: 'bold',
    color: '#0f172a',
    alignment: 'center',
    prefix: 'pada tanggal ',
    suffix: ' dan dinyatakan:',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
  {
    field_key: 'grade_text',
    label: 'Predikat Kelulusan',
    x: 421.12,
    y: 232,
    width: 650,
    height: 18,
    font_family: 'Helvetica-Bold',
    font_size: 11,
    font_weight: 'bold',
    color: '#083344',
    alignment: 'center',
    prefix: '“LULUS PELATIHAN KETERAMPILAN & TEKNIS MENGEMUDI MOBIL ',
    suffix: '”',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
  {
    field_key: 'completion_date',
    label: 'Tanggal Terbit & Lokasi',
    x: 560,
    y: 198,
    width: 250,
    height: 18,
    font_family: 'Helvetica',
    font_size: 11.5,
    font_weight: 'normal',
    color: '#334155',
    alignment: 'center',
    prefix: 'Palembang, ',
    suffix: '',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
  {
    field_key: 'instructor_name',
    label: 'Nama Instruktur',
    x: 290,
    y: 94,
    width: 220,
    height: 20,
    font_family: 'Helvetica-Bold',
    font_size: 13,
    font_weight: 'bold',
    color: '#0f172a',
    alignment: 'center',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
  {
    field_key: 'leader_name',
    label: 'Nama Pimpinan',
    x: 575,
    y: 94,
    width: 220,
    height: 20,
    font_family: 'Helvetica-Bold',
    font_size: 13,
    font_weight: 'bold',
    color: '#0f172a',
    alignment: 'center',
    is_enabled: true,
    clear_background: true,
    bg_color: '#fcfdfd',
  },
];

/**
 * Fetch the active certificate template from DB (or fallback default)
 */
export async function getActiveCertificateTemplate(): Promise<CertificateTemplate> {
  const cacheKey = 'active_cert_template';
  const cached = cacheGet<CertificateTemplate>(cacheKey);
  if (cached) return cached;

  try {
    const row = await dbQuerySingle<any>(
      `SELECT * FROM certificate_templates WHERE is_active = true ORDER BY updated_at DESC LIMIT 1`
    );

    if (row) {
      const template: CertificateTemplate = {
        id: row.id,
        name: row.name,
        pdf_template_url: row.pdf_template_url || '/templates/sertifikat-template.pdf',
        page_width: Number(row.page_width) || 842.25,
        page_height: Number(row.page_height) || 595.5,
        is_active: Boolean(row.is_active),
        fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields || DEFAULT_FIELDS,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      cacheSet(cacheKey, template, 180);
      return template;
    }
  } catch (err) {
    console.error('Error fetching active certificate template:', err);
  }

  // Fallback template
  const fallback: CertificateTemplate = {
    id: 'default-template',
    name: 'Template Sertifikat Resmi Amanah Drive (A4 Landscape)',
    pdf_template_url: '/templates/sertifikat-template.pdf',
    page_width: 842.25,
    page_height: 595.5,
    is_active: true,
    fields: DEFAULT_FIELDS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return fallback;
}

/**
 * Save / update certificate template
 */
export async function saveCertificateTemplate(
  template: Partial<CertificateTemplate>
): Promise<{ success: boolean; error?: string; template?: CertificateTemplate }> {
  try {
    const fieldsJson = JSON.stringify(template.fields || DEFAULT_FIELDS);

    if (template.id && template.id !== 'default-template') {
      await dbQuery(
        `UPDATE certificate_templates 
         SET name = $1, pdf_template_url = $2, page_width = $3, page_height = $4, fields = $5, updated_at = NOW() 
         WHERE id = $6`,
        [
          template.name || 'Template Sertifikat Amanah Drive',
          template.pdf_template_url || '/templates/sertifikat-template.pdf',
          template.page_width || 842.25,
          template.page_height || 595.5,
          fieldsJson,
          template.id,
        ]
      );
    } else {
      const res = await dbQuerySingle<any>(
        `INSERT INTO certificate_templates (name, pdf_template_url, page_width, page_height, is_active, fields)
         VALUES ($1, $2, $3, $4, true, $5)
         RETURNING *`,
        [
          template.name || 'Template Sertifikat Amanah Drive',
          template.pdf_template_url || '/templates/sertifikat-template.pdf',
          template.page_width || 842.25,
          template.page_height || 595.5,
          fieldsJson,
        ]
      );
      if (res) template.id = res.id;
    }

    cacheInvalidate('active_cert_template*');
    revalidatePath('/sertifikat');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving certificate template:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan template sertifikat' };
  }
}

/**
 * Upload a new PDF template file from admin
 */
export async function uploadCertificateTemplatePdf(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('template_pdf') as File;
    if (!file) {
      return { success: false, error: 'File PDF tidak ditemukan' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `template-custom-${Date.now()}.pdf`;
    const targetDir = path.join(process.cwd(), 'public', 'templates');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/templates/${filename}`;
    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('Error uploading template PDF:', err);
    return { success: false, error: err?.message || 'Gagal mengupload template PDF' };
  }
}

/**
 * Generate PDF for a student and record to issued_certificates
 */
export async function generateAndRecordCertificate(
  studentId: string,
  overrides?: Partial<DynamicCertificateValues>
): Promise<{
  success: boolean;
  pdfBase64?: string;
  certificateNumber?: string;
  error?: string;
}> {
  try {
    // 1. Fetch student info and sessions from DB
    const student = await dbQuerySingle<any>(
      `SELECT s.*, p.nama_paket, p.jumlah_sesi 
       FROM siswa s 
       LEFT JOIN paket p ON s.paket_id = p.id 
       WHERE s.id = $1`,
      [studentId]
    );

    if (!student) {
      return { success: false, error: 'Data siswa tidak ditemukan' };
    }

    // 2. Fetch session stats & instructor
    const sessionStats = await dbQuerySingle<any>(
      `SELECT 
        MIN(tanggal_sesi) AS min_tgl,
        MAX(tanggal_sesi) AS max_tgl,
        (
          SELECT st.nama 
          FROM jadwal_sesi js2 
          JOIN staff st ON js2.staff_id = st.id 
          WHERE js2.siswa_id = $1 AND js2.staff_id IS NOT NULL 
          GROUP BY st.nama 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        ) AS instructor_name
       FROM jadwal_sesi 
       WHERE siswa_id = $1 AND status_sesi != 'batal'`,
      [studentId]
    );

    const tglMulai = sessionStats?.min_tgl?.slice(0, 10) || student.tanggal_rencana_mulai || student.tanggal_booking;
    const tglSelesai = sessionStats?.max_tgl?.slice(0, 10) || student.tanggal_rencana_mulai || student.tanggal_booking;
    const dateRange = formatSesiDateRange(tglMulai, tglSelesai);
    const certNumber = overrides?.certificate_number || generateNomorSertifikat(student.kode_siswa, tglSelesai);

    // 3. Assemble dynamic values
    const values: DynamicCertificateValues = {
      student_name: overrides?.student_name || student.nama,
      certificate_number: certNumber,
      session_date_range: overrides?.session_date_range || dateRange,
      completion_date: overrides?.completion_date || formatDateIndo(getTodayDateString()),
      instructor_name: overrides?.instructor_name || sessionStats?.instructor_name || 'Syawal Putra',
      leader_name: overrides?.leader_name || 'Nur Awalia Rianti',
      grade_text: overrides?.grade_text || 'DENGAN PREDIKAT BAIK',
      program_name: overrides?.program_name || student.nama_paket || 'Kursus Mengemudi Mobil',
      location: overrides?.location || 'Palembang',
    };

    // 4. Get active template
    const template = await getActiveCertificateTemplate();

    // 5. Generate precision PDF
    const { base64 } = await generatePrecisionCertificatePdf(template, values);

    // 6. Record to issued_certificates table
    await dbQuery(
      `INSERT INTO issued_certificates (student_id, certificate_number, template_id, issued_at, status, metadata)
       VALUES ($1, $2, $3, NOW(), 'valid', $4)
       ON CONFLICT (certificate_number) DO UPDATE
       SET issued_at = NOW(), metadata = EXCLUDED.metadata, updated_at = NOW()`,
      [
        studentId,
        certNumber,
        template.id !== 'default-template' ? template.id : null,
        JSON.stringify({
          student_name: values.student_name,
          student_code: student.kode_siswa,
          package_name: student.nama_paket,
          session_dates: values.session_date_range,
          instructor_name: values.instructor_name,
          leader_name: values.leader_name,
          issue_date: values.completion_date,
        }),
      ]
    );

    cacheInvalidate('issued_certs*');
    return {
      success: true,
      pdfBase64: base64,
      certificateNumber: certNumber,
    };
  } catch (err: any) {
    console.error('Error generating and recording certificate:', err);
    return { success: false, error: err?.message || 'Gagal membuat sertifikat PDF' };
  }
}

/**
 * Fetch list of issued certificates
 */
export async function getIssuedCertificatesList(): Promise<IssuedCertificate[]> {
  const cacheKey = 'issued_certs_list';
  const cached = cacheGet<IssuedCertificate[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<any>(
      `SELECT ic.*, s.nama AS student_nama, s.kode_siswa AS student_kode, ct.name AS template_name
       FROM issued_certificates ic
       LEFT JOIN siswa s ON ic.student_id = s.id
       LEFT JOIN certificate_templates ct ON ic.template_id = ct.id
       ORDER BY ic.issued_at DESC`
    );

    const items: IssuedCertificate[] = rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      certificate_number: r.certificate_number,
      template_id: r.template_id,
      issued_at: r.issued_at,
      generated_pdf_path: r.generated_pdf_path,
      status: r.status || 'valid',
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    cacheSet(cacheKey, items, 60);
    return items;
  } catch (err) {
    console.error('Error fetching issued certificates:', err);
    return [];
  }
}
