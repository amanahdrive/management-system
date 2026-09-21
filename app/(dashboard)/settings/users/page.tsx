'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Check,
  X,
  Loader2,
  ArrowLeft,
  UserCheck,
  CheckSquare,
  Square,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { getAllUsersAction, updateUserRolesAction, updateUserPasswordAction } from '@/lib/actions/auth';
import { UserProfile, UserRole } from '@/types/database';
import { PageHeader } from '@/components/shared/PageHeader';
import { sound } from '@/lib/sound/SoundFX';

const ROLE_OPTIONS: { role: UserRole; label: string; desc: string }[] = [
  {
    role: 'developer',
    label: 'Developer / Superadmin',
    desc: 'Akses penuh tanpa batas ke seluruh modul, audit log, & master data',
  },
  {
    role: 'siswa',
    label: 'Data Siswa & Dokumen',
    desc: 'Kelola data siswa kursus, status pembayaran, SIM, dan sertifikat',
  },
  {
    role: 'jadwal',
    label: 'Pengelolaan Jadwal',
    desc: 'Atur jadwal sesi mengemudi harian & penugasan instruktur',
  },
  {
    role: 'keuangan',
    label: 'Kas & Keuangan',
    desc: 'Kelola kas masuk/keluar, cashflow, POS, hutang piutang, dan rekening',
  },
  {
    role: 'armada',
    label: 'Kendaraan & Armada',
    desc: 'Monitoring kondisi armada mobil, log harian, BBM, inspeksi, dan insiden',
  },
  {
    role: 'instruktur',
    label: 'Instruktur Lapangan',
    desc: 'Akses ke Portal Instruktur Cockpit, presensi sesi, & rekap komisi',
  },
  {
    role: 'marketing',
    label: 'Homepage & Marketing',
    desc: 'Kelola lead website publik, form submit, & tracking analitik',
  },
];

export default function UsersManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal edit roles state
  const [selectedUserForRoles, setSelectedUserForRoles] = React.useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = React.useState<UserRole[]>([]);
  const [savingRoles, setSavingRoles] = React.useState(false);

  // Modal change password state
  const [selectedUserForPassword, setSelectedUserForPassword] = React.useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all users
  const loadUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllUsersAction();
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
      showToast(err?.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open Edit Roles Dialog
  const handleOpenRolesModal = (u: UserProfile) => {
    sound.click?.();
    setSelectedUserForRoles(u);
    setSelectedRoles([...(u.roles || [])]);
  };

  // Toggle role in modal
  const handleToggleRole = (role: UserRole) => {
    sound.click?.();
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  // Save updated roles
  const handleSaveRoles = async () => {
    if (!selectedUserForRoles) return;

    try {
      setSavingRoles(true);
      sound.click?.();

      const res = await updateUserRolesAction(selectedUserForRoles.id, selectedRoles);
      if (!res.success) {
        sound.error?.();
        showToast(res.error || 'Gagal memperbarui role.');
        setSavingRoles(false);
        return;
      }

      sound.success?.();
      showToast(`Role untuk ${selectedUserForRoles.nama} berhasil diperbarui.`);
      setSelectedUserForRoles(null);
      await loadUsers();
    } catch (err: any) {
      sound.error?.();
      showToast(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSavingRoles(false);
    }
  };

  // Save new password
  const handleSavePassword = async () => {
    if (!selectedUserForPassword) return;
    if (!newPassword || newPassword.length < 6) {
      sound.error?.();
      showToast('Password baru minimal 6 karakter.');
      return;
    }

    try {
      setSavingPassword(true);
      sound.click?.();

      const res = await updateUserPasswordAction(selectedUserForPassword.id, newPassword);
      if (!res.success) {
        sound.error?.();
        showToast(res.error || 'Gagal mengubah password.');
        setSavingPassword(false);
        return;
      }

      sound.success?.();
      showToast(`Password untuk ${selectedUserForPassword.nama} berhasil diubah.`);
      setSelectedUserForPassword(null);
      setNewPassword('');
    } catch (err: any) {
      sound.error?.();
      showToast(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Guard: If not developer, show Access Denied
  if (currentUser && !currentUser.roles?.includes('developer')) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Akses Ditolak</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">
          Halaman ini khusus untuk peran Developer. Anda tidak memiliki izin untuk mengelola akun pengguna.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-700 text-white shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
          <ShieldCheck className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Manajemen Pengguna & Hak Akses
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Panel Developer untuk mengatur izin multi-role berbasis checkbox bagi 4 staf Amanah Drive.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>RBAC Engine v2.0</span>
        </div>
      </div>

      {/* User Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          <p className="text-xs text-[var(--text-secondary)]">Memuat daftar akun...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {users.map((u) => {
            const isDev = u.roles?.includes('developer');

            return (
              <div
                key={u.id}
                className="bg-[var(--liquid-glass-bg)] backdrop-blur-xl border border-[var(--liquid-glass-border)] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                {/* User Info Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                      {u.nama?.slice(0, 2) || 'AD'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[var(--text-primary)] truncate">
                          {u.nama}
                        </h3>
                        {isDev && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Superadmin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        @{u.username} • <span className="text-[var(--text-muted)]">{u.email}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      u.aktif
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    {u.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Staff Link & Roles Tags */}
                <div className="space-y-2 pt-1 border-t border-[var(--border)]/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Tautan Staff Lapangan:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {u.staff?.nama ? `${u.staff.nama} (${u.staff.no_whatsapp})` : 'Tidak Terhubung'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Modul Izin Aktif ({u.roles?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles && u.roles.length > 0 ? (
                        u.roles.map((r) => (
                          <span
                            key={r}
                            className="text-[10px] px-2 py-0.5 rounded-lg font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 capitalize"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-rose-500 font-medium">Belum ada role</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]/60">
                  <button
                    type="button"
                    onClick={() => handleOpenRolesModal(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)] transition-colors cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Ubah Hak Akses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.click?.();
                      setSelectedUserForPassword(u);
                      setNewPassword('');
                    }}
                    className="p-2 rounded-xl border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] transition-colors cursor-pointer"
                    title="Ubah Password Akun"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DIALOG 1: Ubah Role Checkbox */}
      {selectedUserForRoles && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Hak Akses: {selectedUserForRoles.nama}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Centang modul yang diizinkan untuk pengguna ini
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForRoles(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Options Checkbox List */}
            <div className="space-y-2.5">
              {ROLE_OPTIONS.map((opt) => {
                const isChecked = selectedRoles.includes(opt.role);

                return (
                  <div
                    key={opt.role}
                    onClick={() => handleToggleRole(opt.role)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]'
                        : 'border-[var(--border)] hover:border-[var(--brand-primary)]/50 bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="mt-0.5 text-[var(--brand-primary)]">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs text-[var(--text-primary)] block">
                        {opt.label}
                      </span>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedUserForRoles(null)}
                disabled={savingRoles}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveRoles}
                disabled={savingRoles}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingRoles ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2: Ganti Password */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Ubah Password: {selectedUserForPassword.nama}</span>
              </h3>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="p-1 rounded-lg hover:bg-black/5 text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Password Baru (Minimal 6 karakter)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ketik password baru..."
                className="w-full px-3 py-2 text-sm bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--brand-primary)] text-[var(--text-primary)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedUserForPassword(null)}
                disabled={savingPassword}
                className="px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                disabled={savingPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? 'Menyimpan...' : 'Perbarui Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
