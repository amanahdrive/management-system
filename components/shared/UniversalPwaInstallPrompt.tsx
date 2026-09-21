'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Share, PlusSquare, ArrowUpRight } from 'lucide-react';

export function UniversalPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan dalam mode standalone (sudah terpasang sebagai PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      return isStandaloneMedia || isNavigatorStandalone;
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return;
    }

    // 2. Cek apakah user pernah menolak/menutup banner pada sesi ini
    const isDismissed = sessionStorage.getItem('pwa_console_dismissed');
    if (isDismissed) return;

    // 3. Deteksi iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIosDevice && isSafari) {
      setIsIos(true);
      // Munculkan prompt setelah sedikit delay (3 detik) agar tidak mengganggu load awal
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Deteksi Browser Android / Chromium dengan beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_console_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Floating Pill Banner di Bawah Layar Mobile */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3 p-3.5 bg-white/95 dark:bg-[#0c2421]/95 backdrop-blur-md rounded-2xl border border-emerald-500/20 shadow-xl shadow-black/10">
          <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden border border-emerald-500/30 bg-[#0c2421]">
            <Image
              src="/assets/app-icon-1024.png"
              alt="Amanah Drive Console"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
              Amanah Drive Console
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Pasang aplikasi untuk akses instan & offline
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Tutup"
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c2421] border border-emerald-500/20 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#0c2421]">
                  <Image
                    src="/assets/app-icon-1024.png"
                    alt="Amanah Drive Console"
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Pasang di iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
              <p>Untuk menginstal aplikasi di iOS Safari:</p>
              <ol className="space-y-2.5 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">1.</span>
                  <span>
                    Ketuk tombol <strong className="inline-flex items-center gap-1 text-gray-900 dark:text-white"><Share className="w-3.5 h-3.5 inline text-blue-500" /> Bagikan (Share)</strong> di bagian bawah layar Safari Anda.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">2.</span>
                  <span>
                    Gulir menu ke bawah lalu pilih <strong className="inline-flex items-center gap-1 text-gray-900 dark:text-white"><PlusSquare className="w-3.5 h-3.5 inline" /> Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">3.</span>
                  <span>
                    Ketuk <strong className="text-emerald-600 dark:text-emerald-400">Tambah</strong> di pojok kanan atas. Aplikasi siap digunakan!
                  </span>
                </li>
              </ol>
            </div>

            <button
              onClick={() => {
                setShowIosModal(false);
                handleDismiss();
              }}
              className="w-full py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
