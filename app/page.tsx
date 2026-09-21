'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Car,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { loginAction, getCurrentUser } from '@/lib/actions/auth';
import { UserRole } from '@/types/database';
import { sound } from '@/lib/sound/SoundFX';
import { ASSETS } from '@/lib/assets';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface LoggedInUser {
  id: string;
  username: string;
  nama: string;
  email: string;
  roles: UserRole[];
  staff_id: string | null;
}

export default function LoginPage() {
  const router = useRouter();

  // Form states
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Instructor choice modal state
  const [showInstructorModal, setShowInstructorModal] = React.useState(false);
  const [authenticatedUser, setAuthenticatedUser] = React.useState<LoggedInUser | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Check if already logged in
  React.useEffect(() => {
    async function checkSession() {
      try {
        const user = await getCurrentUser();
        if (user) {
          router.replace('/dashboard');
        }
      } catch {}
    }
    checkSession();
  }, [router]);

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      sound.error?.();
      setErrorMessage('Username dan password wajib diisi.');
      return;
    }

    try {
      setIsLoading(true);
      sound.click?.();

      const res = await loginAction({ username, password });

      if (!res.success || !res.user) {
        sound.error?.();
        setErrorMessage(res.error || 'Username atau password salah.');
        setIsLoading(false);
        return;
      }

      sound.success?.();
      const user = res.user;

      // Check if user has instruktur role
      const hasInstrukturRole = user.roles.includes('instruktur');

      if (hasInstrukturRole) {
        // Show choice modal for users with instructor role (Alfi, Syawal, Risky)
        setAuthenticatedUser(user);
        setShowInstructorModal(true);
        setIsLoading(false);
      } else {
        // Direct redirect for users without instructor role (e.g. Lia)
        setIsRedirecting(true);
        router.replace('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      sound.error?.();
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat login.');
      setIsLoading(false);
    }
  };

  // Instructor choice handlers
  const handleSelectInstructorPortal = () => {
    sound.click?.();
    setIsRedirecting(true);
    if (authenticatedUser?.staff_id) {
      try {
        localStorage.setItem('amanah_instruktur_id', authenticatedUser.staff_id);
      } catch {}
    }
    router.replace('/instruktur');
  };

  const handleSelectDashboardConsole = () => {
    sound.click?.();
    setIsRedirecting(true);
    router.replace('/dashboard');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      {/* Absolute Header Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Desktop Left Brand Column (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-center items-center text-center p-8">
          <div className="relative w-48 h-48 mb-6 drop-shadow-2xl animate-in fade-in zoom-in duration-500">
            <Image
              src="/assets/logo-amdri.png"
              alt="Amanah Drive Logo"
              width={192}
              height={192}
              priority
              unoptimized
              onError={(e) => {
                // Fallback to CDN logo if local missing
                const target = e.target as HTMLImageElement;
                target.src = ASSETS.logo.full;
              }}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Amanah Drive Console</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Sistem Manajemen Terpadu
            </h1>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              Platform operasional kursus mengemudi, penjadwalan sesi harian, arus kas, dan manajemen armada Palembang.
            </p>
          </div>
        </div>

        {/* Login Card Column (Adaptive Mobile & Desktop) */}
        <div className="w-full lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md bg-[var(--liquid-glass-bg)] backdrop-blur-2xl border border-[var(--liquid-glass-border)] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            {/* Mobile Landscape Logo Header (Hidden on Desktop) */}
            <div className="lg:hidden flex flex-col items-center mb-6 text-center">
              <div className="relative w-44 h-12 mb-2">
                <Image
                  src="/assets/logo-amdri-landscape.png"
                  alt="Amanah Drive"
                  width={176}
                  height={48}
                  priority
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = ASSETS.logo.landscape;
                  }}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Sistem Operasional & Manajemen Kursus
              </p>
            </div>

            {/* Desktop Card Header */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Selamat Datang</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Silakan masuk menggunakan akun kredensial Anda.
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Username atau Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    disabled={isLoading || isRedirecting}
                    autoCapitalize="none"
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[var(--bg)]/70 hover:bg-[var(--bg)] focus:bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--brand-primary)] rounded-xl outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)] shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    disabled={isLoading || isRedirecting}
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-[var(--bg)]/70 hover:bg-[var(--bg)] focus:bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--brand-primary)] rounded-xl outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)] shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isRedirecting}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] active:scale-[0.99] shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengarahkan...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Notice */}
            <div className="mt-6 pt-4 border-t border-[var(--liquid-glass-border)] text-center">
              <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Akses aman internal PT Amanah Drive Palembang</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: Instructor Route Choice (Alfi, Syawal, Risky) */}
      {showInstructorModal && authenticatedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
            {/* Modal Header */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Selamat Datang, {authenticatedUser.nama}!
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Akun Anda memiliki akses ganda. Silakan pilih ruang kerja yang ingin Anda buka:
              </p>
            </div>

            {/* Two Action Cards */}
            <div className="space-y-3 pt-1">
              {/* Option 1: Portal Instruktur */}
              <button
                type="button"
                onClick={handleSelectInstructorPortal}
                disabled={isRedirecting}
                className="w-full flex items-start gap-3.5 p-4 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15 text-left transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Car className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      Portal Instruktur
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                      Cockpit
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                    Buka jadwal sesi mengemudi harian, presensi siswa, & rekap komisi.
                  </p>
                </div>
              </button>

              {/* Option 2: Console Utama */}
              <button
                type="button"
                onClick={handleSelectDashboardConsole}
                disabled={isRedirecting}
                className="w-full flex items-start gap-3.5 p-4 rounded-2xl border border-[var(--border)] hover:border-[var(--brand-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--brand-primary-light)] text-left transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      Console Utama
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] font-semibold">
                      Dashboard
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                    Buka panel operasional terpadu sesuai modul izin aktif Anda.
                  </p>
                </div>
              </button>
            </div>

            {isRedirecting && (
              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-emerald-600 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membuka halaman...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
