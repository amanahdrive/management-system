/**
 * Amanah Drive Centralized Asset CDN Configuration
 * 
 * Supports Supabase Storage Public CDN:
 * https://yhwwhqqffgtiavapgjvc.supabase.co/storage/v1/object/public/assets
 */

export const SUPABASE_STORAGE_BASE =
  'https://yhwwhqqffgtiavapgjvc.supabase.co/storage/v1/object/public/assets';

export const ASSETS = {
  // Brand & Logos
  logo: {
    symbol: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri-symbol.webp`,
    symbolWhite: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri-symbol-white.webp`,
    symbolBlack: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri-symbol-black.webp`,
    landscape: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri-landscape.webp`,
    landscapeWhite: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri-landscape-white.webp`,
    landscapeBlack: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri-landscape-black.webp`,
    full: `${SUPABASE_STORAGE_BASE}/assets/logo-amdri.webp`,
    banner: `${SUPABASE_STORAGE_BASE}/assets/amdri-banner.webp`,
    cap: `${SUPABASE_STORAGE_BASE}/assets/cap-amanah.webp`,
    appIcon: `${SUPABASE_STORAGE_BASE}/assets/app-icon-1024.webp`,
    favicon: `${SUPABASE_STORAGE_BASE}/favicon.svg`,
  },
  // Staff & Instructors
  staff: {
    lia: `${SUPABASE_STORAGE_BASE}/staff_models/Lia.webp`,
    syawal: `${SUPABASE_STORAGE_BASE}/staff_models/Syawal.webp`,
    risky: `${SUPABASE_STORAGE_BASE}/staff_models/Risky.webp`,
    alpi: `${SUPABASE_STORAGE_BASE}/staff_models/Alpi.webp`,
    alfi: `${SUPABASE_STORAGE_BASE}/staff_models/Alfi.png`,
  },
  // Certificates & Documents
  certificates: {
    resmi: `${SUPABASE_STORAGE_BASE}/assets/sertifikat-resmi.webp`,
    siswaSvg: `${SUPABASE_STORAGE_BASE}/assets/sertifikat-siswa.svg`,
  },
} as const;

/**
 * Resolves an asset path to its full CDN URL if not already an absolute URL.
 */
export function getAssetUrl(path: string, fallback?: string): string {
  if (!path) return fallback || '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${SUPABASE_STORAGE_BASE}/${cleanPath}`;
}
