'use client';

import React from 'react';
import { FunnelStage } from '@/lib/actions/analitik';
import { formatRupiah } from '@/lib/utils/currency';
import {
  ArrowDown,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface FunnelVisualizerProps {
  stages: FunnelStage[];
  overallConversionRate: number;
  totalRevenueLeakage: number;
  activeVelocityDays?: number;
}

export function AnalitikFunnelVisualizer({
  stages,
  overallConversionRate,
  totalRevenueLeakage,
  activeVelocityDays = 21,
}: FunnelVisualizerProps) {
  const [selectedStage, setSelectedStage] = React.useState<FunnelStage | null>(null);

  if (!stages || stages.length === 0) {
    return (
      <div className="p-8 text-center border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-secondary)]">
        Belum ada data tahapan konversi funnel.
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-4">
      {/* Funnel Header KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
            Top of Funnel (Leads)
          </span>
          <div className="text-lg font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
            {stages[0]?.count || 0} <span className="text-xs font-normal text-[var(--text-secondary)]">Siswa</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">100% Volume Masuk</span>
        </div>

        <div className="p-3 border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
            End-to-End Conversion
          </span>
          <div className="text-lg font-bold text-emerald-600 tabular-nums mt-0.5">
            {overallConversionRate}%
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {stages[stages.length - 1]?.count || 0} Siswa Lulus / Tamat
          </span>
        </div>

        <div className="p-3 border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
            Revenue Leakage (Loss)
          </span>
          <div className="text-lg font-bold text-rose-600 tabular-nums mt-0.5">
            {formatRupiah(totalRevenueLeakage)}
          </div>
          <span className="text-[10px] text-rose-500 font-medium">Potensi Omzet Tertahan/Lepas</span>
        </div>

        <div className="p-3 border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
            Avg. Cycle Velocity
          </span>
          <div className="text-lg font-bold text-[var(--brand-primary)] tabular-nums mt-0.5">
            ~{activeVelocityDays} <span className="text-xs font-normal text-[var(--text-secondary)]">Hari</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Lead ke Kelulusan</span>
        </div>
      </div>

      {/* Stepped Visual Funnel */}
      <div className="border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Visualisasi Funnel Konversi Siswa (Stepped Conversion Flow)</span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Melacak pergerakan calon siswa dari pendaftaran awal hingga kelulusan resmi & deteksi kebocoran konversi
            </p>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
            6 Stages Tracked
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {stages.map((stage, idx) => {
            const widthPct = Math.max(18, Math.round((stage.count / maxCount) * 100));
            const isSelected = selectedStage?.id === stage.id;
            const isFirst = idx === 0;
            const isLast = idx === stages.length - 1;

            return (
              <div key={stage.id} className="space-y-1">
                {/* Connecting drop-off badge between stages */}
                {!isFirst && (
                  <div className="flex items-center gap-2 pl-4 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    <ArrowDown className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="font-semibold text-emerald-600">
                      Konversi Tahap: {stage.stepConvRate}%
                    </span>
                    {stage.dropOffCount > 0 && (
                      <span className="flex items-center gap-1 text-rose-500 bg-rose-500/10 px-1.5 py-0.2 border border-rose-500/20">
                        <TrendingDown className="w-2.5 h-2.5" />
                        Drop-off: {stage.dropOffCount} siswa ({stage.dropOffRate}%)
                      </span>
                    )}
                    {stage.revenueLeakage > 0 && (
                      <span className="hidden md:inline text-rose-600 font-mono font-medium">
                        Potensi Tertahan: {formatRupiah(stage.revenueLeakage)}
                      </span>
                    )}
                  </div>
                )}

                {/* Stage Bar Card */}
                <div
                  onClick={() => setSelectedStage(isSelected ? null : stage)}
                  className={`p-3 border transition-all cursor-pointer select-none relative overflow-hidden ${
                    isSelected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-xs ring-1 ring-[var(--brand-primary)]'
                      : 'border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Subtle Background Width Fill */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent pointer-events-none transition-all duration-500"
                    style={{ width: `${widthPct}%` }}
                  />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <span className="w-5 h-5 flex items-center justify-center rounded-none bg-[var(--text-primary)] text-[var(--bg)] font-mono text-[10px] font-bold shrink-0 mt-0.5 sm:mt-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {stage.name}
                          </span>
                          {isLast && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Lulus 🎓
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                          {stage.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto shrink-0 font-mono">
                      <div className="text-right">
                        <span className="text-[10px] text-[var(--text-secondary)] block font-sans">
                          Jumlah Siswa
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {stage.count} <span className="text-[10px] font-normal text-[var(--text-secondary)]">({stage.overallConvRate}%)</span>
                        </span>
                      </div>

                      {stage.valueNominal > 0 && (
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-[var(--text-secondary)] block font-sans">
                            Nilai Transaksi
                          </span>
                          <span className="text-xs font-bold text-emerald-600 tabular-nums">
                            {formatRupiah(stage.valueNominal)}
                          </span>
                        </div>
                      )}

                      <ChevronRight
                        className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200 ${
                          isSelected ? 'rotate-90 text-[var(--brand-primary)]' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Stage Diagnostic Box */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-fadeIn">
                      <div className="p-2 bg-[var(--bg)] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium block">
                          Retensi dari Top of Funnel
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                          {stage.overallConvRate}%
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {stage.count} dari total {stages[0]?.count || 0} siswa terdaftar
                        </p>
                      </div>

                      <div className="p-2 bg-[var(--bg)] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium block">
                          Tingkat Drop-off / Terhenti
                        </span>
                        <span className="text-sm font-bold text-rose-600 font-mono">
                          {stage.dropOffCount} Siswa ({stage.dropOffRate}%)
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          Calon siswa yang tidak melangkah ke tahap selanjutnya
                        </p>
                      </div>

                      <div className="p-2 bg-[var(--bg)] border border-[var(--border)]">
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium block">
                          Estimasi Revenue Terkunci/Lepas
                        </span>
                        <span className="text-sm font-bold text-amber-600 font-mono">
                          {formatRupiah(stage.revenueLeakage || stage.valueNominal)}
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          Dampak finansial pada tahap ini
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
