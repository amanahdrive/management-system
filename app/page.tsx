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
  HelpCircle,
  X,
  MessageCircle,
} from 'lucide-react';
import { loginAction } from '@/lib/actions/auth';
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

const REMEMBER_KEY = 'amanah_remember_username';

export default function LoginPage() {
  const router = useRouter();

  // Form states
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Instructor choice modal state
  const [showInstructorModal, setShowInstructorModal] = React.useState(false);
  const [authenticatedUser, setAuthenticatedUser] = React.useState<LoggedInUser | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Help modal state
  const [showHelpModal, setShowHelpModal] = React.useState(false);

  // Load remembered username
  React.useEffect(() => {
    try {
      const savedUser = localStorage.getItem(REMEMBER_KEY);
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
    } catch {}
  }, []);

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

      const res = await loginAction({ username: username.trim(), password });

      if (!res.success || !res.user) {
        sound.error?.();
        setErrorMessage(res.error || 'Username atau password salah.');
        setIsLoading(false);
        return;
      }

      // Save or remove remembered username
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, username.trim());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {}

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
    <div className="min-h-screen relative flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-x-hidden bg-[var(--bg-subtle)] selection:bg-[var(--brand-primary-muted)] selection:text-[var(--brand-primary-dark)]">
      {/* Subtle Ambient Background Light */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-[var(--brand-primary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Theme Toggle Top Right */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Main Responsive Split-Card Container */}
      <div className="w-full max-w-5xl xl:max-w-6xl bg-white dark:bg-[#0c2421]/95 backdrop-blur-2xl border border-gray-200/80 dark:border-emerald-500/20 rounded-[28px] sm:rounded-[36px] shadow-2xl shadow-black/5 dark:shadow-black/40 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 transition-all duration-300">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CLEAN & PROFESSIONAL LOGIN FORM                             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 xl:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative">
          
          <div>
            {/* Top Brand Identity */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-emerald-500/10 border border-emerald-500/20 shadow-xs flex items-center justify-center">
                  <Image
                    src={ASSETS.logo.symbol}
                    alt="Amanah Drive Logo"
                    width={40}
                    height={40}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white leading-none">
                    Amanah Console
                  </h3>
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Sistem Internal CV Amanah Drive
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Visual Hero Banner (Visible only on < lg) */}
            <div className="lg:hidden mb-6 relative rounded-2xl overflow-hidden border border-emerald-500/20 shadow-md">
              <div className="relative h-28 w-full bg-[#0c2421]">
                <Image
                  src={ASSETS.logo.banner}
                  alt="Amanah Drive Fleet"
                  fill
                  unoptimized
                  className="object-cover object-center opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c2421] via-black/40 to-transparent flex items-end p-3">
                  <div className="relative w-28 h-7">
                    <Image
                      src={ASSETS.logo.landscapeWhite}
                      alt="Amanah Drive"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Title & Greeting */}
            <div className="space-y-1.5 mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Selamat Datang
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Silakan masukkan kredensial akun untuk mengakses sistem operasional internal.
              </p>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Username atau Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: alfyalfi atau email"
                    disabled={isLoading || isRedirecting}
                    autoCapitalize="none"
                    autoComplete="username"
                    required
                    className="w-full h-12 pl-10 pr-3.5 text-sm bg-gray-50/80 hover:bg-gray-50 dark:bg-black/30 dark:hover:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-500/10 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500 group-focus-within:text-[var(--brand-primary)] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun"
                    disabled={isLoading || isRedirecting}
                    autoComplete="current-password"
                    required
                    className="w-full h-12 pl-10 pr-11 text-sm bg-gray-50/80 hover:bg-gray-50 dark:bg-black/30 dark:hover:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-500/10 transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      sound.pop?.();
                      setShowPassword(!showPassword);
                    }}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Help Options */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      sound.pop?.();
                      setRememberMe(e.target.checked);
                    }}
                    className="w-4 h-4 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer accent-[var(--brand-primary)]"
                  />
                  <span className="font-medium">Ingat Saya</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    sound.pop?.();
                    setShowHelpModal(true);
                  }}
                  className="font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
                >
                  Butuh Bantuan?
                </button>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading || isRedirecting}
                className="w-full h-12 mt-2 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] active:scale-[0.98] shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membuka Ruang Kerja...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Console</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Legal & Security */}
          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-white/5 text-center space-y-1">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sistem Operasional & Manajemen Internal · CV Amanah Drive</span>
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Copyrights M. Firdaus Alfarizi 2026
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: PROFESSIONAL FUTURISTIC MINIMALIST SHOWCASE (DESKTOP)     */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex lg:col-span-6 xl:col-span-6 relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white min-h-[580px] bg-[#0c2421]">
          {/* High-Resolution Background Banner via Supabase CDN */}
          <div className="absolute inset-0 z-0">
            <Image
              src={ASSETS.logo.banner}
              alt="Amanah Drive Modern Fleet & Circuit"
              fill
              unoptimized
              className="object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
            />
            {/* Cinematic Minimalist Dark Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#041412] via-[#08221f]/90 to-[#0c2e2a]/70" />
            <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-black/40 pointer-events-none" />
          </div>

          {/* Top Brand Mark */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="relative w-44 h-11 drop-shadow-md">
              <Image
                src={ASSETS.logo.landscapeWhite}
                alt="CV Amanah Drive"
                fill
                unoptimized
                className="object-contain object-left"
              />
            </div>
          </div>

          {/* Middle Typography & Internal System Focus */}
          <div className="relative z-10 space-y-4 my-auto py-8">
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-md">
              Sistem Operasional & Manajemen Internal
            </h2>

            <p className="text-sm xl:text-base text-emerald-100/90 leading-relaxed max-w-md drop-shadow">
              Akses khusus staf internal CV Amanah Drive Palembang untuk monitoring pendaftaran siswa, penjadwalan latihan, log armada, dan pencatatan keuangan.
            </p>
          </div>

          {/* Bottom Clean Signature Quote */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/80">
            <span className="font-semibold italic">
              &ldquo;Belajar Nyaman, Mengemudi Aman&rdquo;
            </span>
            <span>Palembang, Sumatera Selatan</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL: INSTRUCTOR ROUTE CHOICE (Alfi, Syawal, Risky)               */}
      {/* ========================================================================= */}
      {showInstructorModal && authenticatedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0c2421] border border-gray-200 dark:border-emerald-500/20 rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
            {/* Modal Header */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Selamat Datang, {authenticatedUser.nama}!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Akun Anda memiliki akses ganda. Silakan pilih ruang kerja yang ingin Anda buka:
              </p>
            </div>

            {/* Two Action Cards (Without pill badges) */}
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
                  <span className="font-bold text-sm text-gray-900 dark:text-white block">
                    Portal Instruktur
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    Buka jadwal sesi mengemudi harian, presensi siswa, & rekap komisi.
                  </p>
                </div>
              </button>

              {/* Option 2: Console Utama */}
              <button
                type="button"
                onClick={handleSelectDashboardConsole}
                disabled={isRedirecting}
                className="w-full flex items-start gap-3.5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-[var(--brand-primary)] bg-gray-50 dark:bg-black/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-gray-900 dark:text-white block">
                    Console Utama
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
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

      {/* ========================================================================= */}
      {/* POPUP MODAL: BANTUAN & LUPA PASSWORD (DIRECT KE WA ALFI)                 */}
      {/* ========================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c2421] border border-gray-200 dark:border-emerald-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm">
                <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Bantuan Akun Internal</span>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                Sistem ini dikhususkan untuk operasional staf internal <strong>CV Amanah Drive</strong>.
              </p>
              
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 space-y-2.5">
                <p className="font-bold text-gray-900 dark:text-white text-xs">
                  Lupa Password atau Terkendala Masuk?
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Silakan hubungi <strong>Developer (Alfi)</strong> untuk reset password, pembaruan data, atau penyesuaian hak akses peran (RBAC) Anda.
                </p>
                
                {/* Simple WhatsApp Button */}
                <a
                  href="https://wa.me/6282176152196?text=Halo%20Alfi%2C%20saya%20butuh%20bantuan%20terkait%20akun%20Amanah%20Drive%20Console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Hubungi WhatsApp Developer (Alfi)</span>
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
