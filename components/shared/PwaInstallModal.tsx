'use client';

import React from 'react';
import { Download, X, Smartphone } from 'lucide-react';

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
      <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-2xl rounded-2xl p-5 space-y-4 border border-[var(--border)] animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{appName}</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">{appDescription || 'Aplikasi Web Terpadu'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {isIos || !deferredPrompt
            ? 'Untuk memasang aplikasi di perangkat iOS, pilih opsi Tambahkan ke Layar Utama pada menu browser Anda.'
            : 'Instal aplikasi untuk akses cepat dan performa maksimal langsung dari layar utama perangkat Anda.'}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg"
          >
            Tutup
          </button>
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2 text-xs font-bold bg-[var(--brand-primary)] text-white rounded-lg hover:bg-[var(--brand-primary)]/90 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instal Aplikasi</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
