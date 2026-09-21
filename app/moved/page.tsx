'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function MovedPage() {
  const targetUrl = 'https://panel.amanahdrive.my.id';
  const [countdown, setCountdown] = React.useState(5);

  React.useEffect(() => {
    if (countdown <= 0) {
      window.location.href = targetUrl;
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, targetUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-subtle)] relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--brand-primary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center relative z-10">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-black/40 border border-[var(--border)] shadow-xs">
            <Image
              src="https://yhwwhqqffgtiavapgjvc.supabase.co/storage/v1/object/public/assets/assets/logo-amdri-symbol.webp"
              alt="Logo Amanah Drive"
              width={64}
              height={64}
              priority
              className="w-14 h-14 object-contain"
            />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Migrasi Domain Resmi</span>
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Oops... Alamat Telah Dipindahkan ke panel.amanahdrive.my.id
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Sistem operasional dan manajemen internal <strong>CV Amanah Drive</strong> kini beralih sepenuhnya ke domain resmi produksi:
          </p>
        </div>

        {/* Target Domain Card */}
        <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
          <span className="text-[11px] text-[var(--text-secondary)] font-semibold block">
            Domain Resmi Baru:
          </span>
          <a
            href={targetUrl}
            className="text-base sm:text-lg font-black font-mono text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1.5"
          >
            <span>panel.amanahdrive.my.id</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Redirect Button */}
        <div className="space-y-2">
          <a
            href={targetUrl}
            className="w-full py-3 px-5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
          >
            <span>Buka panel.amanahdrive.my.id Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="text-[11px] text-[var(--text-muted)]">
            Otomatis dialihkan dalam <strong className="text-[var(--text-primary)] font-mono">{countdown} detik</strong>...
          </p>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Koneksi Aman & Terverifikasi (HTTPS)</span>
          </p>
          <p>Harap perbarui bookmark dan instalasi PWA Anda ke alamat resmi baru.</p>
        </div>
      </div>
    </div>
  );
}
