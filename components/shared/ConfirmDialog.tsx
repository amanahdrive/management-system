'use client';

import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDanger = false,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl p-6 border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200">
        <h3 id="confirm-dialog-title" className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
        <p id="confirm-dialog-desc" className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{description}</p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors active:scale-98"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl text-white shadow-sm transition-all active:scale-98 ${
              isDanger
                ? 'bg-[var(--danger)] hover:bg-red-700'
                : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
