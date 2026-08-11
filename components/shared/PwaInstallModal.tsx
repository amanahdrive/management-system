'use client';

import React from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Check } from 'lucide-react';

interface PwaInstallModalProps {
  appName: string;
  appDescription?: string;
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled?: () => void;
}

export function PwaInstallModal({
  appName,
  appDescription,
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}: PwaInstallModalProps) {
  const [isIos, setIsIos] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const standaloneCheck =
        window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      setIsIos(iosCheck);
      setIsStandalone(standaloneCheck);
    }
  }, []);

  if (!isOpen || isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstalled?.();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 animate-in fade-in">
      <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl rounded-3xl p-6 space-y-4 border border-[var(--border-strong)] animate-in slide-in-from-bottom-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{appName}</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">{appDescription || 'Aplikasi PWA Amanah Drive'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIos || !deferredPrompt ? (
          /* iOS / Universal Manual Guide */
          <div className="space-y-3 text-xs">
            <p className="font-semibold text-[var(--text-primary)]">Cara Pasang di Layar Utama HP (iOS / Android):</p>
            <div className="space-y-2.5 bg-[var(--bg-subtle)] p-3.5 rounded-2xl border border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    Ketuk tombol <span className="font-bold text-blue-600 dark:text-blue-400">Bagikan (Share)</span>{' '}
                    <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> di bilah browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    Pilih opsi <span className="font-bold text-[var(--brand-primary)]">Tambahkan ke Layar Utama</span>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[var(--brand-primary)]" />.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">
                    Ketuk <span className="font-bold text-[var(--text-primary)]">Tambah</span> di pojok kanan atas.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[var(--brand-primary)] text-white text-xs font-bold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-colors"
            >
              Saya Mengerti
            </button>
          </div>
        ) : (
          /* Android / Native Chrome Install Prompt */
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              Pasang aplikasi ke layar utama untuk akses instan cepat, performa maksimal, dan bekerja optimal di HP.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl"
              >
                Nanti
              </button>
              <button
                onClick={handleInstallClick}
                className="px-5 py-2 text-xs font-bold bg-[var(--brand-primary)] text-white rounded-xl hover:bg-[var(--brand-primary-dark)] flex items-center gap-1.5 shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang Sekarang</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
