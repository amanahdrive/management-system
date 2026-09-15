'use client';

import React from 'react';
import Link from 'next/link';
import { BottleneckItem } from '@/lib/actions/analitik';
import {
  AlertTriangle,
  AlertOctagon,
  Lightbulb,
  ArrowRight,
  TrendingDown,
  Clock,
  Car,
  Wallet,
  Calendar,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface BottleneckRadarProps {
  bottlenecks: BottleneckItem[];
}

export function AnalitikBottleneckRadar({ bottlenecks }: BottleneckRadarProps) {
  const [filterSeverity, setFilterSeverity] = React.useState<string>('all');

  if (!bottlenecks || bottlenecks.length === 0) {
    return (
      <div className="p-8 border border-[var(--border)] bg-[var(--bg)] text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h4 className="text-sm font-bold text-[var(--text-primary)]">Tidak Ada Bottleneck Kritis Terdeteksi</h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Semua metrik operasional, keuangan, dan konversi siswa saat ini beroperasi dalam ambang batas efisiensi standar.
        </p>
      </div>
    );
  }

  const criticalCount = bottlenecks.filter((b) => b.severity === 'critical').length;
  const warningCount = bottlenecks.filter((b) => b.severity === 'warning').length;
  const optimizationCount = bottlenecks.filter((b) => b.severity === 'optimization').length;

  const filtered = filterSeverity === 'all'
    ? bottlenecks
    : bottlenecks.filter((b) => b.severity === filterSeverity);

  const getCategoryIcon = (cat: BottleneckItem['category']) => {
    switch (cat) {
      case 'keuangan':
        return <Wallet className="w-3.5 h-3.5" />;
      case 'siswa':
        return <Users className="w-3.5 h-3.5" />;
      case 'jadwal':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'armada':
        return <Car className="w-3.5 h-3.5" />;
      case 'instruktur':
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>Pusat Diagnostik Bottleneck Bisnis & Friksi Operasional</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Analisis otomatis titik-titik penyumbatan arus kas, kapasitas terbuang, dan hambatan proses bisnis
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterSeverity('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-none border transition-all ${
              filterSeverity === 'all'
                ? 'bg-[var(--text-primary)] text-[var(--bg)] border-transparent'
                : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            Semua ({bottlenecks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('critical')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-none border transition-all flex items-center gap-1.5 ${
              filterSeverity === 'critical'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-[var(--bg)] text-rose-600 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Kritis ({criticalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('warning')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-none border transition-all flex items-center gap-1.5 ${
              filterSeverity === 'warning'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-[var(--bg)] text-amber-600 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <span>Waspada ({warningCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('optimization')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-none border transition-all flex items-center gap-1.5 ${
              filterSeverity === 'optimization'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-[var(--bg)] text-blue-600 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30'
            }`}
          >
            <span>Optimasi ({optimizationCount})</span>
          </button>
        </div>
      </div>

      {/* Bottlenecks Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((item) => {
          const isCritical = item.severity === 'critical';
          const isWarning = item.severity === 'warning';

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 border rounded-none bg-[var(--bg)] space-y-3 relative overflow-hidden transition-all shadow-2xs ${
                isCritical
                  ? 'border-rose-300 dark:border-rose-900/60 hover:border-rose-500'
                  : isWarning
                  ? 'border-amber-300 dark:border-amber-900/60 hover:border-amber-500'
                  : 'border-blue-300 dark:border-blue-900/60 hover:border-blue-500'
              }`}
            >
              {/* Left Color Accent Bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  isCritical ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                }`}
              />

              {/* Title & Severity Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2">
                  <span
                    className={`p-1 rounded-none text-white ${
                      isCritical ? 'bg-rose-600' : isWarning ? 'bg-amber-600' : 'bg-blue-600'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon className="w-3.5 h-3.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Lightbulb className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      {item.title}
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center gap-1">
                      {getCategoryIcon(item.category)}
                      <span>{item.categoryLabel}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : isWarning
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {isCritical ? 'Kritis' : isWarning ? 'Waspada' : 'Peluang Optimasi'}
                  </span>
                </div>
              </div>

              {/* Impact Metric Strip */}
              <div className="p-2.5 rounded-none bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    {item.impactMetric}:
                  </span>
                  <span className="text-xs font-bold text-rose-600 font-mono">
                    {item.impactValue}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                  {item.description}
                </p>
              </div>

              {/* Root Cause & Tactical Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 border border-[var(--border)] bg-[var(--bg)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                    🔍 Akar Masalah (Root Cause)
                  </span>
                  <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                    {item.rootCause}
                  </p>
                </div>

                <div className="p-3 border border-emerald-200 dark:border-emerald-950 bg-emerald-500/5 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    💡 Rekomendasi Solusi Praktis
                  </span>
                  <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                    {item.actionRecommendation}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-1">
                <Link
                  href={item.actionRoute}
                  className="px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 text-xs font-bold rounded-none transition-all flex items-center gap-1.5 group"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
