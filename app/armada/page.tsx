'use client';

import React from 'react';
import { Kendaraan, HargaBBM, KendaraanLogHarian, KendaraanInspeksi } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import {
  getHargaBBMList,
  getKendaraanLogList,
  getKendaraanInspeksiList,
  getFleetPicTelemetrySummary,
  FleetPicTelemetrySummary,
} from '@/lib/actions/kendaraan';
import { FleetCockpitHeader } from '@/components/armada/FleetCockpitHeader';
import { FleetTelemetryCards } from '@/components/armada/FleetTelemetryCards';
import { FleetTripLogger } from '@/components/armada/FleetTripLogger';
import { FleetFuelManager } from '@/components/armada/FleetFuelManager';
import { FleetMaintenanceHub } from '@/components/armada/FleetMaintenanceHub';
import { FleetInspectionChecklist } from '@/components/armada/FleetInspectionChecklist';
import { FleetIncidentQuickModal } from '@/components/armada/FleetIncidentQuickModal';
import { FleetScheduleDrawer } from '@/components/armada/FleetScheduleDrawer';
import { PwaInstallModal } from '@/components/shared/PwaInstallModal';
import { sound } from '@/lib/sound/SoundFX';
import { formatRupiah } from '@/lib/utils/currency';
import {
  Car,
  Gauge,
  Fuel,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Layers,
  Zap,
} from 'lucide-react';

type ArmadaTab = 'armada' | 'trip' | 'bbm' | 'perawatan' | 'inspeksi';

export default function ArmadaPwaPage() {
  // Navigation Tab State
  const [activeTab, setActiveTab] = React.useState<ArmadaTab>('armada');

  // Data States
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [hargaBbmList, setHargaBbmList] = React.useState<HargaBBM[]>([]);
  const [logs, setLogs] = React.useState<KendaraanLogHarian[]>([]);
  const [inspeksiList, setInspeksiList] = React.useState<KendaraanInspeksi[]>([]);
  const [telemetry, setTelemetry] = React.useState<FleetPicTelemetrySummary>({
    totalUnit: 0,
    unitSiapJalan: 0,
    unitSedangTrip: 0,
    unitButuhServis: 0,
    totalKmHariIni: 0,
    bbmHariIniNominal: 0,
    bbmHariIniLiter: 0,
    insidenPending: 0,
    cuciPerluTindakan: 0,
    activeTripUnits: [],
  });

  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Modals & Drawers State
  const [showIncidentModal, setShowIncidentModal] = React.useState(false);
  const [showScheduleDrawer, setShowScheduleDrawer] = React.useState(false);
  const [selectedKendaraanForAction, setSelectedKendaraanForAction] = React.useState<string | undefined>(undefined);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallModal, setShowInstallModal] = React.useState(false);

  // Load All Fleet Data
  const loadFleetData = React.useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [kList, bbmList, logList, inspList, telemSummary] = await Promise.all([
        getKendaraanMasterList(),
        getHargaBBMList(),
        getKendaraanLogList(),
        getKendaraanInspeksiList({ limit: 30 }),
        getFleetPicTelemetrySummary(),
      ]);

      setKendaraanList(kList);
      setHargaBbmList(bbmList);
      setLogs(logList);
      setInspeksiList(inspList);
      setTelemetry(telemSummary);
    } catch (err) {
      console.error('Error loading fleet data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadFleetData();
  }, [loadFleetData]);

  // PWA Install Event Listener
  React.useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Quick Action triggers from vehicle cards
  const handleOpenOdo = (k: Kendaraan) => {
    setSelectedKendaraanForAction(k.id);
    setActiveTab('trip');
  };

  const handleOpenBbm = (k: Kendaraan) => {
    setSelectedKendaraanForAction(k.id);
    setActiveTab('bbm');
  };

  const handleOpenOli = (k: Kendaraan) => {
    setSelectedKendaraanForAction(k.id);
    setActiveTab('perawatan');
  };

  const handleOpenCuci = (k: Kendaraan) => {
    setSelectedKendaraanForAction(k.id);
    setActiveTab('perawatan');
  };

  const handleOpenBan = (k: Kendaraan) => {
    setSelectedKendaraanForAction(k.id);
    setActiveTab('perawatan');
  };

  const handleOpenInspeksi = (k: Kendaraan) => {
    setSelectedKendaraanForAction(k.id);
    setActiveTab('inspeksi');
  };

  const TABS: { id: ArmadaTab; label: string; icon: React.ReactNode }[] = [
    { id: 'armada', label: 'Armada', icon: <Car className="w-4 h-4" /> },
    { id: 'trip', label: 'Trip & Odo', icon: <Gauge className="w-4 h-4" /> },
    { id: 'bbm', label: 'BBM', icon: <Fuel className="w-4 h-4" /> },
    { id: 'perawatan', label: 'Servis', icon: <Wrench className="w-4 h-4" /> },
    { id: 'inspeksi', label: 'Inspeksi', icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen pb-24 relative selection:bg-emerald-500/20">
      {/* 1. Header Cockpit dengan Live WIB Theme Scheduler */}
      <FleetCockpitHeader
        onRefresh={loadFleetData}
        isRefreshing={isRefreshing}
        onOpenIncident={() => {
          sound.click();
          setShowIncidentModal(true);
        }}
        onOpenSchedule={() => {
          sound.click();
          setShowScheduleDrawer(true);
        }}
        onInstallPwa={() => {
          sound.pop();
          setShowInstallModal(true);
        }}
        canInstall={!!deferredPrompt}
      />

      <main className="max-w-4xl mx-auto px-3.5 pt-3.5 space-y-4">
        {/* 2. Quick KPI / Telemetry Summary Bar */}
        <div className="grid grid-cols-4 gap-2">
          {/* Card 1: Armada Siap / Jalan */}
          <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
              <Car className="w-3 h-3 text-emerald-500" />
              <span className="truncate">Armada</span>
            </div>
            <div className="text-sm font-black font-mono text-[var(--text-primary)]">
              {telemetry.unitSiapJalan}
              <span className="text-[10px] font-medium text-[var(--text-muted)] ml-0.5">/{telemetry.totalUnit}</span>
            </div>
            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
              {telemetry.unitSedangTrip > 0 ? `${telemetry.unitSedangTrip} Di Jalan` : 'Siap Jalan'}
            </div>
          </div>

          {/* Card 2: KM Hari Ini */}
          <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
              <TrendingUp className="w-3 h-3 text-[var(--brand-primary)]" />
              <span className="truncate">KM Hari Ini</span>
            </div>
            <div className="text-sm font-black font-mono text-[var(--text-primary)]">
              +{telemetry.totalKmHariIni}
              <span className="text-[9px] font-bold text-[var(--text-muted)] ml-0.5">KM</span>
            </div>
            <div className="text-[9px] text-[var(--text-muted)] truncate">Trip harian</div>
          </div>

          {/* Card 3: BBM Hari Ini */}
          <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
              <Fuel className="w-3 h-3 text-cyan-500" />
              <span className="truncate">BBM Hari Ini</span>
            </div>
            <div className="text-sm font-black font-mono text-[var(--text-primary)] truncate">
              {telemetry.bbmHariIniNominal > 0 ? formatRupiah(telemetry.bbmHariIniNominal) : 'Rp 0'}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] truncate">
              {telemetry.bbmHariIniLiter > 0 ? `${telemetry.bbmHariIniLiter} L` : 'Belum ada'}
            </div>
          </div>

          {/* Card 4: Status Peringatan Servis / Cuci */}
          <div className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
              <Wrench className="w-3 h-3 text-amber-500" />
              <span className="truncate">Servis</span>
            </div>
            <div className="text-sm font-black font-mono text-[var(--text-primary)]">
              {telemetry.unitButuhServis > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {telemetry.unitButuhServis}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Aman</span>
              )}
            </div>
            <div className="text-[9px] text-[var(--text-muted)] truncate">
              {telemetry.cuciPerluTindakan > 0 ? `${telemetry.cuciPerluTindakan} Perlu Cuci` : 'Semua Bersih'}
            </div>
          </div>
        </div>

        {/* 3. Sub-Menu View Tabs (Segmented Control Futuristik) */}
        <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--border)] gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  sound.click();
                  setActiveTab(t.id);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Active Tab Content Render */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]"
              />
            ))}
          </div>
        ) : (
          <div>
            {/* SUB-MENU 1: STATUS & TELEMETRI ARMADA */}
            {activeTab === 'armada' && (
              <FleetTelemetryCards
                kendaraanList={kendaraanList}
                onOpenOdoModal={handleOpenOdo}
                onOpenBbmModal={handleOpenBbm}
                onOpenOliModal={handleOpenOli}
                onOpenCuciModal={handleOpenCuci}
                onOpenBanModal={handleOpenBan}
                onOpenInspeksiModal={handleOpenInspeksi}
              />
            )}

            {/* SUB-MENU 2: LOG TRIP & ODOMETER */}
            {activeTab === 'trip' && (
              <FleetTripLogger
                kendaraanList={kendaraanList}
                logs={logs}
                onRefresh={loadFleetData}
                initialKendaraanId={selectedKendaraanForAction}
              />
            )}

            {/* SUB-MENU 3: BBM & KAS OPERASIONAL */}
            {activeTab === 'bbm' && (
              <FleetFuelManager
                kendaraanList={kendaraanList}
                hargaBbmList={hargaBbmList}
                logs={logs}
                onRefresh={loadFleetData}
                initialKendaraanId={selectedKendaraanForAction}
              />
            )}

            {/* SUB-MENU 4: PERAWATAN & BAN 5 TITIK */}
            {activeTab === 'perawatan' && (
              <FleetMaintenanceHub
                kendaraanList={kendaraanList}
                onRefresh={loadFleetData}
                initialKendaraanId={selectedKendaraanForAction}
              />
            )}

            {/* SUB-MENU 5: CHECKLIST INSPEKSI FISIK */}
            {activeTab === 'inspeksi' && (
              <FleetInspectionChecklist
                kendaraanList={kendaraanList}
                inspeksiList={inspeksiList}
                onRefresh={loadFleetData}
                initialKendaraanId={selectedKendaraanForAction}
              />
            )}
          </div>
        )}
      </main>

      {/* 5. Liquid Glass Bottom Navigation Dock */}
      <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-0 z-40 flex justify-center px-3 pointer-events-none select-none">
        <div className="pointer-events-auto relative w-full max-w-sm h-14 bg-[var(--liquid-glass-dock-bg)] backdrop-blur-2xl rounded-2xl border border-[var(--border)] shadow-xl flex items-center justify-around px-2">
          {TABS.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  sound.click();
                  setActiveTab(t.id);
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-black'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 w-5 h-1 bg-emerald-500 rounded-full shadow-glow" />
                )}
                <div className="w-5 h-5 flex items-center justify-center">{t.icon}</div>
                <span className="text-[10px] tracking-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 6. Modal Lapor Insiden Cepat */}
      <FleetIncidentQuickModal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        kendaraanList={kendaraanList}
        onSuccess={loadFleetData}
        defaultKendaraanId={selectedKendaraanForAction}
      />

      {/* 7. Drawer Alokasi Jadwal Hari Ini */}
      <FleetScheduleDrawer
        isOpen={showScheduleDrawer}
        onClose={() => setShowScheduleDrawer(false)}
        kendaraanList={kendaraanList}
      />

      {/* 8. PWA Install Prompt Modal */}
      <PwaInstallModal
        appName="PIC Armada Amanah Drive"
        appDescription="Aplikasi PWA Operasional, Odometer & Servis Armada"
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => {
          sound.pop();
          setDeferredPrompt(null);
        }}
      />
    </div>
  );
}
