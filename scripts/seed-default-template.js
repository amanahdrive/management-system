const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const DEFAULT_FIELDS = [
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
    bg_color: '#fcfdfd'
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
    bg_color: '#fcfdfd'
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
    bg_color: '#fcfdfd'
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
    bg_color: '#fcfdfd'
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
    bg_color: '#fcfdfd'
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
    bg_color: '#fcfdfd'
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
    bg_color: '#fcfdfd'
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM certificate_templates WHERE is_active = true LIMIT 1');
    if (existing.rows.length === 0) {
      console.log('Seeding default template...');
      await client.query(`
        INSERT INTO certificate_templates (name, pdf_template_url, page_width, page_height, is_active, fields)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'Template Sertifikat Resmi Amanah Drive (A4 Landscape)',
        '/templates/sertifikat-template.pdf',
        842.25,
        595.5,
        true,
        JSON.stringify(DEFAULT_FIELDS)
      ]);
      console.log('Default template seeded successfully!');
    } else {
      console.log('Active template already exists in database with id:', existing.rows[0].id);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
