'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { FunnelStage, FunnelStudent } from '@/lib/actions/analitik';
import { formatRupiah } from '@/lib/utils/currency';
import {
  ArrowDown,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Search,
  Filter,
  Sparkles,
  Waves,
  BarChart2,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Car,
  Award,
  DollarSign,
  Share2,
} from 'lucide-react';

const AnalitikFunnelStreamChart = dynamic(
  () => import('./AnalitikInteractiveCharts').then((mod) => mod.AnalitikFunnelStreamChart),
  { ssr: false, loading: () => <div className="h-72 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" /> }
);

interface FunnelVisualizerProps {
  stages: FunnelStage[];
  overallConversionRate: number;
  totalRevenueLeakage: number;
  activeVelocityDays?: number;
  students?: FunnelStudent[];
}

type FunnelViewMode = 'wave' | 'waterfall' | 'stream';

export function AnalitikFunnelVisualizer({
  stages,
  overallConversionRate,
  totalRevenueLeakage,
  activeVelocityDays = 21,
  students = [],
}: FunnelVisualizerProps) {
  const [viewMode, setViewMode] = React.useState<FunnelViewMode>('wave');
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [stageFilter, setStageFilter] = React.useState<string>('all');

  // Selected stage object
  const selectedStage = stages.find((s) => s.id === selectedStageId) || null;

  if (!stages || stages.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-xs text-[var(--text-secondary)]">
        Belum ada data tahapan konversi funnel.
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  // When selectedStageId changes, synchronize with table filter
  const handleStageSelect = (stageId: string) => {
    if (selectedStageId === stageId) {
      setSelectedStageId(null);
      setStageFilter('all');
    } else {
      setSelectedStageId(stageId);
      setStageFilter(stageId);
    }
  };

  // Filter students based on search and active stage filter
  const filteredStudents = students.filter((st) => {
    // Search query filter
    const matchesSearch =
      !searchQuery ||
      st.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.noWhatsapp.includes(searchQuery) ||
      st.namaPaket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.sumber.toLowerCase().includes(searchQuery.toLowerCase());

    // Stage filter
    if (!matchesSearch) return false;
    if (stageFilter === 'all') return true;

    // Filter students by stage:
    // If filtering by specific stage ID:
    if (stageFilter === 'leads') return true; // All registered
    if (stageFilter === 'paket') return Boolean(st.namaPaket);
    if (stageFilter === 'dp') return st.statusPembayaranKode === 'dp' || st.statusPembayaranKode === 'lunas';
    if (stageFilter === 'lunas') return st.statusPembayaranKode === 'lunas';
    if (stageFilter === 'latihan') return st.selesaiSesi > 0 || st.totalSesi > 0;
    if (stageFilter === 'lulus') return st.currentStageId === 'lulus' || st.selesaiSesi >= st.totalSesi;

    return st.currentStageId === stageFilter;
  });

  // SVG Wave Calculation for Image 2 Mode (Continuous Organic Wave)
  const svgWidth = 1000;
  const svgHeight = 160;
  const numStages = stages.length;
  const stagePoints = stages.map((s, idx) => {
    const x = ((idx + 0.5) / numStages) * svgWidth;
    const ratio = Math.max(0.18, s.count / maxCount);
    // Highest point at top has smaller y
    const y = svgHeight - ratio * (svgHeight - 40) - 10;
    return { x, y, stage: s };
  });

  // Build continuous cubic bezier path
  let wavePath = `M 0,${stagePoints[0].y}`;
  wavePath += ` L ${stagePoints[0].x * 0.4},${stagePoints[0].y}`;

  for (let i = 0; i < stagePoints.length - 1; i++) {
    const p1 = stagePoints[i];
    const p2 = stagePoints[i + 1];
    const mx = (p1.x + p2.x) / 2;
    wavePath += ` C ${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}`;
  }
  const lastPoint = stagePoints[stagePoints.length - 1];
  wavePath += ` L ${svgWidth},${lastPoint.y}`;

  const closedWavePath = `${wavePath} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  return (
    <div className="space-y-5">
      {/* 1. TOP METRIC STRIP (Bento Scorecards with Ambient Gradients) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs relative overflow-hidden group hover:border-[var(--brand-primary)]/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
            Top of Funnel (Leads Masuk)
          </span>
          <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono tabular-nums mt-1">
            {stages[0]?.count || 0} <span className="text-xs font-normal text-[var(--text-muted)]">Siswa</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% Volume Pendaftaran
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
            End-to-End Conversion
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tabular-nums mt-1">
            {overallConversionRate}%
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] block mt-1 font-medium">
            {stages[stages.length - 1]?.count || 0} Siswa Lulus Resmi / Alumni
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
            Revenue Leakage (Loss)
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono tabular-nums mt-1">
            {formatRupiah(totalRevenueLeakage)}
          </div>
          <span className="text-[11px] text-rose-500 font-semibold block mt-1">
            Potensi Omzet Tertahan di Jalur
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
            Avg. Cycle Velocity
          </span>
          <div className="text-xl sm:text-2xl font-black text-[var(--brand-primary)] font-mono tabular-nums mt-1">
            ~{activeVelocityDays} <span className="text-xs font-normal text-[var(--text-muted)]">Hari</span>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] block mt-1 font-medium">
            Rata-rata Pendaftaran ke Kelulusan
          </span>
        </div>
      </div>

      {/* 2. MASTER FUNNEL VISUALIZER CARD */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        {/* Header Bar with 3-Mode View Switcher */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[var(--bg-subtle)] via-transparent to-[var(--bg-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Visualisasi Funnel Konversi Siswa Multi-Tahap</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] font-mono font-bold">
                6 Tahapan
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Klik tahapan mana pun untuk melihat diagnosa friksi dan memfilter siswa di tahapan tersebut
            </p>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('wave')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'wave'
                  ? 'bg-[var(--card-bg)] text-[var(--brand-primary)] shadow-xs font-bold border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Tampilan Kurva Gelombang Kontinu (Ref 2)"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Organic Wave</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('waterfall')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'waterfall'
                  ? 'bg-[var(--card-bg)] text-[var(--brand-primary)] shadow-xs font-bold border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Tampilan Kolom Berundak Waterfall (Ref 3)"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Waterfall</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('stream')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'stream'
                  ? 'bg-[var(--card-bg)] text-[var(--brand-primary)] shadow-xs font-bold border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Tampilan Alur Area Trend (Ref 1)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stream Flow</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* MODE 1: ORGANIC WAVE FUNNEL (Inspired by Image 2)   */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'wave' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Top Wave Canvas with Floating Conversion Pill */}
            <div className="relative w-full rounded-2xl bg-gradient-to-b from-[var(--bg-subtle)] via-[var(--bg-subtle)]/70 to-transparent border border-[var(--border)]/70 pt-6 pb-2 px-2 overflow-hidden">
              {/* Floating Overall Conversion Badge (Image 2 style) */}
              <div className="absolute top-3 right-4 z-20 flex items-center gap-2 bg-[var(--card-bg)]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[var(--border)] shadow-md">
                <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono leading-none">
                  {overallConversionRate}%
                </span>
                <span className="text-[10px] sm:text-xs text-[var(--text-secondary)] font-medium">
                  Conversion Rate
                </span>
              </div>

              {/* Continuous SVG Wave Flow */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-28 sm:h-36 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="waveFillGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.85} />
                      <stop offset="25%" stopColor="#6366F1" stopOpacity={0.78} />
                      <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.7} />
                      <stop offset="75%" stopColor="#0EA5E9" stopOpacity={0.62} />
                      <stop offset="90%" stopColor="#0F7A73" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.45} />
                    </linearGradient>

                    <linearGradient id="waveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="50%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>

                    <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#6366F1" floodOpacity="0.25" />
                    </filter>
                  </defs>

                  {/* Filled Wave Body */}
                  <path d={closedWavePath} fill="url(#waveFillGrad)" filter="url(#waveGlow)" />

                  {/* Glowing Top Stroke Line */}
                  <path
                    d={wavePath}
                    fill="none"
                    stroke="url(#waveStrokeGrad)"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />

                  {/* Step Points & Interactive Target Node for Selected Stage (Image 2 style) */}
                  {stagePoints.map((pt) => {
                    const isSelected = selectedStageId === pt.stage.id;
                    return (
                      <g
                        key={pt.stage.id}
                        className="cursor-pointer transition-all"
                        onClick={() => handleStageSelect(pt.stage.id)}
                      >
                        {/* Vertical Guide Line */}
                        <line
                          x1={pt.x}
                          y1={pt.y}
                          x2={pt.x}
                          y2={svgHeight}
                          stroke={isSelected ? 'var(--brand-primary)' : 'rgba(255,255,255,0.4)'}
                          strokeDasharray="2 2"
                          strokeWidth={isSelected ? 1.5 : 1}
                        />

                        {/* Selected Circular Indicator Ring (Glassmorphic node like Image 2) */}
                        {isSelected && (
                          <g>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={18}
                              fill="rgba(255,255,255,0.3)"
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              className="animate-pulse"
                            />
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={10}
                              fill="#FFFFFF"
                              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.25))"
                            />
                            <circle cx={pt.x} cy={pt.y} r={4} fill="#6366F1" />
                          </g>
                        )}

                        {!isSelected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={5}
                            fill="#FFFFFF"
                            stroke="#6366F1"
                            strokeWidth={2}
                            className="hover:scale-125 transition-transform"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Bottom Row of Interactive Stage Cards (Image 2 style) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {stages.map((stage, idx) => {
                const isSelected = selectedStageId === stage.id;
                const isFirst = idx === 0;

                return (
                  <div
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[var(--card-bg)] border-[var(--brand-primary)] shadow-lg ring-2 ring-[var(--brand-primary)]/40 -translate-y-1'
                        : 'bg-[var(--bg-subtle)] border-[var(--border)] hover:bg-[var(--card-bg)] hover:shadow-xs hover:border-[var(--brand-primary)]/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-medium">
                        <span>Tahap {idx + 1}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-ping" />
                        )}
                      </div>

                      <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-mono tabular-nums leading-tight">
                        {stage.count}
                      </div>

                      <div className="text-xs font-bold text-[var(--text-primary)] truncate" title={stage.shortLabel}>
                        {stage.shortLabel}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border)]/60 mt-2 space-y-0.5 text-[10px]">
                      <div className="flex items-center justify-between text-[var(--text-secondary)]">
                        <span className="font-mono">Avg: {stage.avgDays || (idx + 1) * 3} hari</span>
                        <span className="font-mono font-bold text-emerald-600">{stage.overallConvRate}%</span>
                      </div>
                      {!isFirst && stage.dropOffCount > 0 && (
                        <div className="text-rose-500 font-mono text-[9px] flex items-center justify-between">
                          <span>Drop-off:</span>
                          <span className="font-bold">-{stage.dropOffCount} ({stage.dropOffRate}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE 2: STEPPED WATERFALL FUNNEL (Inspired by Image 3)*/}
        {/* ---------------------------------------------------- */}
        {viewMode === 'waterfall' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end min-h-[260px] pt-4">
              {stages.map((stage, idx) => {
                const heightPct = Math.max(22, Math.round((stage.count / maxCount) * 100));
                const isSelected = selectedStageId === stage.id;
                const isFirst = idx === 0;

                return (
                  <div
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    className="flex flex-col h-full justify-end cursor-pointer group"
                  >
                    {/* Top Stage Header Label */}
                    <div className="text-center pb-2">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)] block truncate">
                        {idx + 1}. {stage.shortLabel}
                      </span>
                      <span className="text-base sm:text-lg font-black text-[var(--text-primary)] font-mono tabular-nums">
                        {stage.count}
                      </span>
                    </div>

                    {/* Waterfall Step Bar with Rounded Top-Right (Image 3 style) */}
                    <div
                      className={`w-full rounded-tr-2xl rounded-tl-sm transition-all duration-300 relative flex flex-col justify-end p-2 ${
                        isSelected
                          ? 'ring-2 ring-[var(--brand-primary)] shadow-lg brightness-110'
                          : 'group-hover:brightness-105'
                      }`}
                      style={{
                        height: `${heightPct}%`,
                        minHeight: '48px',
                        background: `linear-gradient(180deg, ${stage.gradientFrom || '#3B82F6'}, ${
                          stage.gradientTo || '#1D4ED8'
                        })`,
                      }}
                    >
                      <span className="text-[10px] font-bold text-white/90 text-center font-mono">
                        {stage.overallConvRate}%
                      </span>
                    </div>

                    {/* Bottom Drop-off Indicator Pill (Image 3 style: 33k 11.2% ↘) */}
                    <div className="pt-2 text-center">
                      {!isFirst ? (
                        <div
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                            stage.dropOffCount > 0
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600'
                          }`}
                        >
                          <span>{stage.count}</span>
                          {stage.dropOffCount > 0 && (
                            <span className="flex items-center text-rose-500">
                              {stage.dropOffRate}% <TrendingDown className="w-2.5 h-2.5 inline" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[var(--text-muted)] font-mono">Top of Funnel</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* MODE 3: STREAM FLOW AREA (Inspired by Image 1)       */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'stream' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Leads Flow Overview & Retensi Per Tahapan
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Pergerakan volume calon siswa terdata sepanjang pipeline konversi
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600">
                Omzet Tertahan: {formatRupiah(totalRevenueLeakage)}
              </span>
            </div>

            <AnalitikFunnelStreamChart stages={stages} />
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* EXPANDED STAGE DIAGNOSTIC DRAWER (When Stage Selected)*/}
        {/* ---------------------------------------------------- */}
        {selectedStage && (
          <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border)] animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shadow-xs"
                  style={{ backgroundColor: selectedStage.accentColor || '#3B82F6' }}
                />
                <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                  Diagnosa Detail: {selectedStage.name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  ({selectedStage.count} Siswa)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedStageId(null);
                  setStageFilter('all');
                }}
                className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Reset Filter (Tampilkan Semua)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                  Retensi dari Awal
                </span>
                <span className="text-base font-bold text-[var(--text-primary)] font-mono">
                  {selectedStage.overallConvRate}%
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  {selectedStage.count} dari total {stages[0]?.count || 0} pendaftar
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                  Drop-off / Terhenti
                </span>
                <span className="text-base font-bold text-rose-600 font-mono">
                  {selectedStage.dropOffCount} Siswa ({selectedStage.dropOffRate}%)
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  Calon siswa terhambat di tahapan ini
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                  Estimasi Omzet Tertahan
                </span>
                <span className="text-base font-bold text-amber-600 font-mono">
                  {formatRupiah(selectedStage.revenueLeakage || selectedStage.valueNominal)}
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  Dampak finansial pada tahapan ini
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                  Rata-rata Waktu Siklus
                </span>
                <span className="text-base font-bold text-[var(--brand-primary)] font-mono">
                  ~{selectedStage.avgDays || 3} Hari
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  Kecepatan konversi ke tahap ini
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 3. INTERACTIVE LEADS & STUDENTS DRILLDOWN TABLE (Image 1 & 3)    */}
      {/* ---------------------------------------------------------------- */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Daftar Siswa & Progres Pipeline Funnel ({filteredStudents.length} Data)</span>
            </h4>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Klik nama siswa atau tombol WhatsApp untuk tindakan percepatan konversi / penagihan
            </p>
          </div>

          {/* Search Bar and Stage Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Cari siswa, paket, WA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] w-48 sm:w-56"
              />
            </div>

            {/* Quick Stage Filter Buttons */}
            <div className="flex items-center p-0.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[11px] font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setStageFilter('all');
                  setSelectedStageId(null);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  stageFilter === 'all'
                    ? 'bg-[var(--card-bg)] text-[var(--brand-primary)] font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Semua
              </button>

              {stages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStageFilter(s.id);
                    setSelectedStageId(s.id);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all whitespace-nowrap ${
                    stageFilter === s.id
                      ? 'bg-[var(--card-bg)] text-[var(--brand-primary)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Kontak & Siswa</th>
                <th className="py-2.5 px-3 font-semibold">Saluran Akuisisi</th>
                <th className="py-2.5 px-3 font-semibold">Paket Kursus</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status Pembayaran</th>
                <th className="py-2.5 px-3 font-semibold text-center">Progres Sesi</th>
                <th className="py-2.5 px-3 font-semibold text-right">Tagihan / Sisa</th>
                <th className="py-2.5 px-3 font-semibold text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-secondary)]">
                    Tidak ada siswa yang sesuai dengan kriteria filter tahapan ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.slice(0, 15).map((st) => {
                  const isLunas = st.statusPembayaranKode === 'lunas';
                  const isDp = st.statusPembayaranKode === 'dp';
                  const isBelum = !isLunas && !isDp;
                  const progressPct =
                    st.totalSesi > 0 ? Math.min(100, Math.round((st.selesaiSesi / st.totalSesi) * 100)) : 0;

                  // Initials
                  const initials = st.nama
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={st.id} className="hover:bg-[var(--bg-subtle)]/60 transition-colors">
                      {/* 1. Contact (Avatar + Name + Phone) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--brand-primary)] to-emerald-400 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)] line-clamp-1">{st.nama}</div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">{st.noWhatsapp}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Channel Badge */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)]">
                          {st.sumber}
                        </span>
                      </td>

                      {/* 3. Package & SIM */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[var(--text-primary)]">{st.namaPaket}</div>
                        {st.termasukSim && (
                          <span className="inline-block px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            + SIM
                          </span>
                        )}
                      </td>

                      {/* 4. Payment Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isLunas ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            Lunas
                          </span>
                        ) : isDp ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                            DP Sebagian
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                            Belum Bayar
                          </span>
                        )}
                      </td>

                      {/* 5. Sessions Progress */}
                      <td className="py-2.5 px-3">
                        <div className="w-28 mx-auto space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                            <span>{st.selesaiSesi} / {st.totalSesi} Sesi</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border)]">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-emerald-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Tagihan / Sisa Piutang */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {st.sisaPiutang > 0 ? (
                          <div className="text-rose-600 font-bold">
                            {formatRupiah(st.sisaPiutang)}
                            <span className="text-[9px] text-[var(--text-muted)] block font-sans">Sisa Piutang</span>
                          </div>
                        ) : (
                          <div className="text-emerald-600 font-semibold">
                            {formatRupiah(st.hargaFinal)}
                            <span className="text-[9px] text-emerald-600/80 block font-sans">Terbayar Lunas</span>
                          </div>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-2.5 px-3 text-center">
                        {st.noWhatsapp ? (
                          <a
                            href={`https://wa.me/${st.noWhatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] transition-colors shadow-xs"
                            title="Chat WhatsApp untuk Follow-up"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>WA</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredStudents.length > 15 && (
          <div className="text-center pt-2 text-[11px] text-[var(--text-muted)] font-mono">
            Menampilkan 15 dari {filteredStudents.length} siswa pada filter ini.
          </div>
        )}
      </div>
    </div>
  );
}
