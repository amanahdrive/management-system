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
  ArrowRight,
  Check,
  Plus,
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
  const [toast, setToast] = React.useState<string | null>(null);

  // Modals & Drawers State
  const [showIncidentModal, setShowIncidentModal] = React.useState(false);
  const [showScheduleDrawer, setShowScheduleDrawer] = React.useState(false);
  const [selectedKendaraanForAction, setSelectedKendaraanForAction] = React.useState<string | undefined>(undefined);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallModal, setShowInstallModal] = React.useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] pb-32 relative selection:bg-emerald-500/20">
      {/* Toast Notification (Mirip PWA Finance) */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-950/90 backdrop-blur-md text-emerald-200 text-xs font-bold rounded-full shadow-2xl border border-emerald-500/40 flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Header Cockpit dengan Sapaan "Selamat Pagi, Alfi" & Live WIB Theme Switcher */}
      <FleetCockpitHeader
        onRefresh={() => {
          loadFleetData();
          showToast('Data armada berhasil disinkronkan!');
        }}
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

      {/* Main Content Area Container (Max-W-MD Mirip Finance & Console Mobile) */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* 2. Hero Cockpit Card (Mirip Hero Card Saldo di PWA Finance) */}
        <div className="p-6 rounded-3xl bg-linear-to-br from-[#0F7A73] via-[#0D6B65] to-[#084844] text-white shadow-[0_16px_40px_rgba(15,122,115,0.22),_inset_0_1.5px_1.5px_rgba(255,255,255,0.3)] border border-white/20 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase opacity-85">
              Status Armada Operasional
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-white/20 backdrop-blur-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime • WIB</span>
            </span>
          </div>

          <div
            onClick={() => {
              sound.click();
              setActiveTab('trip');
            }}
            className="cursor-pointer group"
            title="Klik untuk melihat log trip & odometer harian"
          >
            <div className="flex items-center justify-between">
              <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono group-hover:underline">
                +{telemetry.totalKmHariIni}{' '}
                <span className="text-sm font-normal opacity-85">KM</span>
              </div>
              <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {telemetry.unitSiapJalan}/{telemetry.totalUnit} Siap Jalan
              </span>
            </div>
            <div className="text-[11px] opacity-80 mt-1 font-medium">
              {telemetry.unitSedangTrip > 0
                ? `${telemetry.unitSedangTrip} unit armada sedang dipakai di lapangan`
                : 'Semua armada standby di basecamp'}
            </div>
          </div>

          {/* Sub-cards: BBM Hari Ini vs Status Servis (Mirip Saldo Tunai vs Bank di Finance) */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20 text-xs">
            {/* Sub-Card 1: BBM Hari Ini */}
            <div
              onClick={() => {
                sound.click();
                setActiveTab('bbm');
              }}
              className="bg-black/20 hover:bg-black/30 rounded-2xl p-3 cursor-pointer transition-all border border-white/10 space-y-1"
              title="Klik untuk input pengisian BBM armada"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] opacity-80 font-medium">BBM Hari Ini</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold inline-flex items-center gap-0.5">
                  <span>Isi</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
              <div className="font-bold text-sm tabular-nums truncate">
                {telemetry.bbmHariIniNominal > 0 ? formatRupiah(telemetry.bbmHariIniNominal) : 'Rp 0'}
              </div>
              <div className="text-[9px] opacity-75 truncate">
                {telemetry.bbmHariIniLiter > 0 ? `${telemetry.bbmHariIniLiter} Liter` : 'Belum ada isi bensin'}
              </div>
            </div>

            {/* Sub-Card 2: Status Servis & Cuci */}
            <div
              onClick={() => {
                sound.click();
                setActiveTab('perawatan');
              }}
              className="bg-black/20 hover:bg-black/30 rounded-2xl p-3 cursor-pointer transition-all border border-white/10 space-y-1"
              title="Klik untuk cek status servis oli & cuci"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] opacity-80 font-medium">Servis & Ban</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold inline-flex items-center gap-0.5">
                  <span>Cek</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
              <div className="font-bold text-sm truncate">
                {telemetry.unitButuhServis > 0 ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {telemetry.unitButuhServis} Perlu Servis
                  </span>
                ) : (
                  <span className="text-emerald-200">Semua Prima</span>
                )}
              </div>
              <div className="text-[9px] opacity-75 truncate">
                {telemetry.cuciPerluTindakan > 0 ? `${telemetry.cuciPerluTindakan} Perlu Dicuci` : 'Kondisi Bersih'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick 1-Tap Action Pills (Thumb-Friendly Bar) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => {
              sound.click();
              setShowScheduleDrawer(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] shrink-0 transition-all active:scale-95 shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Jadwal Mobil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.click();
              setActiveTab('inspeksi');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] shrink-0 transition-all active:scale-95 shadow-2xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Checklist Fisik</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.click();
              setShowIncidentModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0 transition-all active:scale-95 shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Lapor Insiden</span>
          </button>
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
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
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
          <div className="animate-fadeIn">
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

      {/* 5. Liquid Glass Bottom Navigation Dock (Mirip PWA Finance & Amanah Drive Mobile) */}
      <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-0 z-40 flex justify-center px-3 pointer-events-none select-none">
        <div className="pointer-events-auto relative w-full max-w-md h-16 bg-[var(--liquid-glass-dock-bg)] backdrop-blur-2xl rounded-3xl border border-[var(--liquid-glass-border)] shadow-[0_12px_36px_rgba(0,0,0,0.18)] flex items-center justify-around px-2">
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
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-black'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 w-6 h-1 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                )}
                <div className="w-5 h-5 flex items-center justify-center">{t.icon}</div>
                <span className="text-[10px] tracking-tight mt-0.5">{t.label}</span>
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
