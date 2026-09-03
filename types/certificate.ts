export type CertificateFieldKey =
  | 'student_name'
  | 'certificate_number'
  | 'session_date_range'
  | 'completion_date'
  | 'instructor_name'
  | 'leader_name'
  | 'grade_text'
  | 'program_name'
  | 'location'
  | string;

export interface CertificateFieldConfig {
  field_key: CertificateFieldKey;
  label: string;
  x: number; // in PDF points (0 to page_width)
  y: number; // in PDF points (0 to page_height, measured from bottom)
  width?: number;
  height?: number;
  font_family: 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Times-Bold' | 'Courier' | 'Courier-Bold';
  font_size: number;
  font_weight?: 'normal' | 'bold';
  color: string; // Hex color e.g. '#083344'
  alignment: 'center' | 'left' | 'right';
  max_width?: number;
  text_transform?: 'uppercase' | 'capitalize' | 'lowercase' | 'none';
  prefix?: string;
  suffix?: string;
  is_enabled: boolean;
  clear_background?: boolean;
  bg_color?: string; // Hex color e.g. '#fcfdfd'
}

export interface CertificateTemplate {
  id: string;
  name: string;
  pdf_template_url: string;
  page_width: number;
  page_height: number;
  is_active: boolean;
  fields: CertificateFieldConfig[];
  created_at: string;
  updated_at: string;
}

export interface IssuedCertificate {
  id: string;
  student_id: string;
  certificate_number: string;
  template_id: string | null;
  issued_at: string;
  generated_pdf_path: string | null;
  status: 'valid' | 'revoked';
  metadata: {
    student_name: string;
    student_code: string;
    package_name?: string;
    session_dates?: string;
    instructor_name?: string;
    leader_name?: string;
    issue_date?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface DynamicCertificateValues {
  student_name: string;
  certificate_number: string;
  session_date_range: string;
  completion_date: string;
  instructor_name: string;
  leader_name?: string;
  grade_text?: string;
  program_name?: string;
  location?: string;
  [key: string]: string | undefined;
}
