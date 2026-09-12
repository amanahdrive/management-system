'use client';

import React from 'react';
import { X, Settings2, Fuel, Wrench, Gauge, Check, Loader2, Save } from 'lucide-react';
import { FleetSettings, saveFleetSettings } from '@/lib/actions/settings';
import { formatRupiah } from '@/lib/utils/currency';

interface FleetSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSettings: FleetSettings;
  onSaved?: (updated: FleetSettings) => void;
}

export function FleetSettingsModal({ open, onClose, initialSettings, onSaved }: FleetSettingsModalProps) {
  const [form, setForm] = React.useState<FleetSettings>({ ...initialSettings });
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm({ ...initialSettings });
  }, [initialSettings]);

  if (!open) return null;

  const handleChange = (key: keyof FleetSettings, value: number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const res = await saveFleetSettings(form);
    setSaving(false);
    if (res.success) {
      setSuccess(true);
      onSaved?.(form);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } else {
      setError(res.error || 'Gagal menyimpan pengaturan armada');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">Pengaturan Armada</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Konfigurasi tarif & parameter kalkulasi biaya operasional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Fuel className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
                Harga BBM per Liter
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'pertalitePrice' as const, label: 'Pertalite' },
                { key: 'pertamaxPrice' as const, label: 'Pertamax' },
                { key: 'solarPrice' as const, label: 'Solar / Dexlite' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">{label}</label>
                  <input
                    type="number"
                    min={1000}
                    step={100}
                    value={form[key]}
                    onChange={(e) => handleChange(key, Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-bold text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">{formatRupiah(form[key])}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
                Cadangan Maintenance
              </span>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                Tarif Cadangan Maintenance (Rp / km)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={form.tarifMaintenancePerKm}
                onChange={(e) => handleChange('tarifMaintenancePerKm', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-bold text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                required
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Setiap 1 km ditempuh, sistem akan menyisihkan{' '}
                <span className="font-bold text-orange-600">{formatRupiah(form.tarifMaintenancePerKm)}</span>{' '}
                sebagai cadangan biaya servis/perbaikan.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
                Target Efisiensi BBM
              </span>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                Target Efisiensi (km / Liter)
              </label>
              <input
                type="number"
                min={1}
                step={0.5}
                value={form.targetEfisiensiBbm}
                onChange={(e) => handleChange('targetEfisiensiBbm', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-bold text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                required
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Digunakan sebagai acuan indikator efisiensi pada overview armada. Rata-rata kendaraan bensin: 8–12 km/L.
              </p>
            </div>
          </div>

          {success && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 font-bold text-center flex items-center justify-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Pengaturan armada berhasil disimpan!</span>
            </div>
          )}
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 font-semibold text-center animate-in fade-in">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:opacity-90 text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
