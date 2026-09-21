import {
  LayoutDashboard,
  BarChart3,
  Globe,
  Users,
  GraduationCap,
  Calendar,
  IdCard,
  Award,
  Car,
  AlertOctagon,
  Wallet,
  FileSpreadsheet,
  Layers,
  CreditCard,
  Landmark,
  Building2,
  Receipt,
  Package,
  Tag,
  ShieldCheck,
  Clock,
  Settings,
  LucideIcon,
  Inbox,
  UserCheck,
} from 'lucide-react';
import { UserRole } from '@/types/database';

export interface SubMenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  requiredRole?: UserRole | 'all';
  badge?: string;
}

export interface MenuItem {
  id: string;
  title: string;
  href?: string;
  icon: LucideIcon;
  requiredRole: UserRole | 'all';
  badge?: string;
  subItems?: SubMenuItem[];
}

export const NAVIGATION_REGISTRY: MenuItem[] = [
  // 1. Dashboard
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    requiredRole: 'all',
  },

  // 2. Analitik & Laporan
  {
    id: 'analitik',
    title: 'Pusat Analitik',
    href: '/analitik',
    icon: BarChart3,
    requiredRole: 'developer',
  },

  // 3. Homepage Manager
  {
    id: 'homepage-manager',
    title: 'Homepage Manager',
    icon: Globe,
    requiredRole: 'marketing',
    subItems: [
      { title: 'Internal Tracking', href: '/homepage-manager/tracking', icon: BarChart3, requiredRole: 'marketing' },
      { title: 'Form Submissions', href: '/homepage-manager/submissions', icon: Inbox, requiredRole: 'marketing' },
      { title: 'Homepage Updater', href: '/homepage-manager/information', icon: Globe, requiredRole: 'marketing' },
    ],
  },

  // 4. Manajemen Siswa
  {
    id: 'siswa-menu',
    title: 'Manajemen Siswa',
    icon: GraduationCap,
    requiredRole: 'siswa',
    subItems: [
      { title: 'Data Siswa', href: '/siswa', icon: Users, requiredRole: 'siswa' },
      { title: 'Manajemen SIM', href: '/sim', icon: IdCard, requiredRole: 'siswa' },
      { title: 'Sertifikat Siswa', href: '/sertifikat', icon: Award, requiredRole: 'siswa' },
    ],
  },

  // 5. Jadwal Operasional
  {
    id: 'jadwal-menu',
    title: 'Jadwal Kursus',
    href: '/jadwal',
    icon: Calendar,
    requiredRole: 'jadwal',
  },

  // 6. Kendaraan & Armada
  {
    id: 'kendaraan-menu',
    title: 'Kendaraan & Armada',
    icon: Car,
    requiredRole: 'armada',
    subItems: [
      { title: 'Manajemen Armada', href: '/kendaraan', icon: Car, requiredRole: 'armada' },
      { title: 'Data Insiden', href: '/insiden', icon: AlertOctagon, requiredRole: 'armada' },
    ],
  },

  // 7. Kas & Keuangan
  {
    id: 'kas-menu',
    title: 'Kas & Keuangan',
    icon: Wallet,
    requiredRole: 'keuangan',
    subItems: [
      { title: 'Overview Kas', href: '/kas', icon: Wallet, requiredRole: 'keuangan' },
      { title: 'Buku Besar (Cashflow)', href: '/kas/cashflow', icon: FileSpreadsheet, requiredRole: 'keuangan' },
      { title: 'Pos Pengeluaran', href: '/kas/pos', icon: Layers, requiredRole: 'keuangan' },
      { title: 'Manajemen Piutang', href: '/kas/piutang', icon: CreditCard, requiredRole: 'keuangan' },
      { title: 'Manajemen Hutang', href: '/kas/hutang', icon: Landmark, requiredRole: 'keuangan' },
      { title: 'Rekening Bank', href: '/kas/rekening', icon: Building2, requiredRole: 'keuangan' },
      { title: 'Cetak Nota', href: '/nota', icon: Receipt, requiredRole: 'keuangan' },
    ],
  },

  // 8. Portal Instruktur (Pintasan di dalam aplikasi)
  {
    id: 'instruktur-portal',
    title: 'Portal Instruktur',
    href: '/instruktur',
    icon: UserCheck,
    requiredRole: 'instruktur',
    badge: 'Cockpit',
  },

  // 9. Master Data
  {
    id: 'master-data',
    title: 'Master Data',
    icon: ShieldCheck,
    requiredRole: 'developer',
    subItems: [
      { title: 'Paket Kursus', href: '/master-data/paket', icon: Package, requiredRole: 'developer' },
      { title: 'Promosi Campaign', href: '/master-data/promosi', icon: Tag, requiredRole: 'developer' },
      { title: 'Staff & Instruktur', href: '/master-data/staff', icon: Users, requiredRole: 'developer' },
      { title: 'Daftar Jabatan', href: '/master-data/jabatan', icon: ShieldCheck, requiredRole: 'developer' },
      { title: 'Master Kendaraan', href: '/master-data/kendaraan', icon: Car, requiredRole: 'developer' },
      { title: 'Status Pembayaran', href: '/master-data/status-pembayaran', icon: CreditCard, requiredRole: 'developer' },
      { title: 'Slot Waktu', href: '/master-data/slot-waktu', icon: Clock, requiredRole: 'developer' },
    ],
  },

  // 10. Pengaturan & Sistem
  {
    id: 'settings-menu',
    title: 'Pengaturan Sistem',
    icon: Settings,
    requiredRole: 'developer',
    subItems: [
      { title: 'Pengaturan Umum', href: '/settings', icon: Settings, requiredRole: 'developer' },
      { title: 'Kelola Pengguna (RBAC)', href: '/settings/users', icon: Users, requiredRole: 'developer', badge: 'RBAC' },
      { title: 'Audit Log', href: '/settings/audit-log', icon: ShieldCheck, requiredRole: 'developer', badge: 'Dev' },
    ],
  },
];

/**
 * Filter navigation items based on user's active roles
 */
export function getVisibleMenuItems(userRoles: UserRole[] = []): MenuItem[] {
  const isDev = userRoles.includes('developer');

  return NAVIGATION_REGISTRY.map((item) => {
    // If user is developer, all sub-items are visible
    if (isDev) {
      return item;
    }

    // Check if parent menu matches
    const isParentAllowed =
      item.requiredRole === 'all' || userRoles.includes(item.requiredRole);

    if (!item.subItems) {
      return isParentAllowed ? item : null;
    }

    // Filter subitems
    const filteredSubItems = item.subItems.filter(
      (sub) => sub.requiredRole === 'all' || (sub.requiredRole && userRoles.includes(sub.requiredRole))
    );

    // If parent is allowed or has visible subitems
    if (filteredSubItems.length > 0 || isParentAllowed) {
      return {
        ...item,
        subItems: filteredSubItems,
      };
    }

    return null;
  }).filter((item): item is MenuItem => item !== null);
}
