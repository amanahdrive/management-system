'use client';

import React from 'react';
import { Kendaraan, KendaraanLogHarian, KendaraanInspeksi } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import {
  getKendaraanLogList,
  getKendaraanInspeksiList,
  getFleetPicTelemetrySummary,
  FleetPicTelemetrySummary,
} from '@/lib/actions/kendaraan';
import { FleetCockpitHeader } from '@/components/armada/FleetCockpitHeader';
import { FleetTelemetryCards } from '@/components/armada/FleetTelemetryCards';
import { FleetTripLogger } from '@/components/armada/FleetTripLogger';
import { FleetMaintenanceHub } from '@/components/armada/FleetMaintenanceHub';
import { FleetInspectionChecklist } from '@/components/armada/FleetInspectionChecklist';
import { FleetIncidentQuickModal } from '@/components/armada/FleetIncidentQuickModal';
import { FleetScheduleDrawer } from '@/components/armada/FleetScheduleDrawer';
import { FleetOdometerReportModal } from '@/components/armada/FleetOdometerReportModal';
import { FloatingArmadaNav, ArmadaTab } from '@/components/armada/FloatingArmadaNav';
import { PwaInstallModal } from '@/components/shared/PwaInstallModal';
import { sound } from '@/lib/sound/SoundFX';
import { formatDateIndo } from '@/lib/utils/date';
import {
  ShieldAlert,
  Calendar,
  Check,
  Plus,
  ArrowRight,
  History,
} from 'lucide-react';

export default function ArmadaPwaPage() {
  // Navigation Tab State
  const [activeTab, setActiveTab] = React.useState<ArmadaTab>('armada');

  // Data States
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
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
  const [showOdoModal, setShowOdoModal] = React.useState(false);
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
      const [kList, logList, inspList, telemSummary] = await Promise.all([
        getKendaraanMasterList(),
        getKendaraanLogList(),
        getKendaraanInspeksiList({ limit: 30 }),
        getFleetPicTelemetrySummary(),
      ]);

      setKendaraanList(kList);
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
  const handleOpenOdo = (k?: Kendaraan) => {
    sound.click();
    setSelectedKendaraanForAction(k?.id);
    setShowOdoModal(true);
  };

  const handleOpenOli = (k: Kendaraan) => {
    sound.click();
    setSelectedKendaraanForAction(k.id);
    setActiveTab('perawatan');
  };

  const handleOpenCuci = (k: Kendaraan) => {
    sound.click();
    setSelectedKendaraanForAction(k.id);
    setActiveTab('perawatan');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] pb-28 relative font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-950/90 text-emerald-200 text-xs font-bold rounded-xl shadow-xl border border-emerald-500/30 flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 1. Header Ringkas: Sapaan Alfi, Theme Icon Sun/Moon, Audio Toggle */}
      <FleetCockpitHeader
        onRefresh={() => {
          loadFleetData();
          showToast('Data armada berhasil disinkronkan!');
        }}
        isRefreshing={isRefreshing}
        onInstallPwa={() => {
          sound.pop();
          setShowInstallModal(true);
        }}
        canInstall={!!deferredPrompt}
      />

      {/* Main Content Area (Max-W-MD Mobile Centered) */}
      <main className="max-w-md mx-auto p-3.5 space-y-3.5">
        {/* 2. Tombol Aksi Utama: Input Laporan Odometer */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleOpenOdo()}
            className="w-full py-3 px-4 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Input Laporan Odometer</span>
          </button>

          {/* Quick Action Mini Row: Jadwal & Insiden */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.click();
                setShowScheduleDrawer(true);
              }}
              className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Jadwal Mobil</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.click();
                setShowIncidentModal(true);
              }}
              className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Lapor Insiden</span>
            </button>
          </div>
        </div>

        {/* 4. Active Tab Content Render */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]"
              />
            ))}
          </div>
        ) : (
          <div>
            {/* SUB-MENU 1: STATUS & TELEMETRI ARMADA UTAMA */}
            {activeTab === 'armada' && (
              <div className="space-y-4">
                {/* Kartu Status Armada Compact */}
                <FleetTelemetryCards
                  kendaraanList={kendaraanList}
                  onOpenOdoModal={handleOpenOdo}
                  onOpenOliModal={handleOpenOli}
                  onOpenCuciModal={handleOpenCuci}
                />

                {/* Riwayat Laporan Odometer Terkini (Compact Feed) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>Laporan Odometer Terbaru</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.click();
                        setActiveTab('trip');
                      }}
                      className="text-[11px] text-[var(--brand-primary)] font-semibold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Semua Log</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {logs.length === 0 ? (
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-center text-xs text-[var(--text-muted)]">
                      Belum ada laporan odometer yang tercatat.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.slice(0, 4).map((l) => {
                        const odoVal = l.odometer_basecamp_in || l.odometer_basecamp_out || 0;
                        const isMasuk = !!l.odometer_basecamp_in;

                        return (
                          <div
                            key={l.id}
                            className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[var(--text-primary)] truncate">
                                  {l.kendaraan?.nama_kendaraan || 'Armada'}
                                </span>
                                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                                  {l.kendaraan?.plat_nomor}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  • {formatDateIndo(l.tanggal)}
                                </span>
                              </div>

                              {/* Catatan Operasional */}
                              {l.catatan && (
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate italic">
                                  "{l.catatan}"
                                </p>
                              )}
                            </div>

                            {/* Odometer Angka & Status */}
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-xs text-[var(--text-primary)]">
                                {odoVal.toLocaleString('id-ID')} km
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                {l.jarak_tempuh ? `+${l.jarak_tempuh} km` : l.odometer_basecamp_in ? 'BC In' : 'BC Out'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-MENU 2: LOG TRIP & ODOMETER DETAIL */}
            {activeTab === 'trip' && (
              <FleetTripLogger
                kendaraanList={kendaraanList}
                logs={logs}
                onRefresh={loadFleetData}
                initialKendaraanId={selectedKendaraanForAction}
              />
            )}

            {/* SUB-MENU 3: PERAWATAN OLI & CUCI MOBIL */}
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

      {/* 5. Floating Bottom Navigation Dock (Liquid Glass) */}
      <FloatingArmadaNav
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        telemetry={telemetry}
      />

      {/* 6. Modal Lapor Odometer Armada */}
      <FleetOdometerReportModal
        isOpen={showOdoModal}
        onClose={() => setShowOdoModal(false)}
        kendaraanList={kendaraanList}
        defaultKendaraanId={selectedKendaraanForAction}
        onSuccess={(updatedKm, kendaraanNama) => {
          loadFleetData();
          showToast(
            `Laporan Odometer ${kendaraanNama || 'Armada'} (${(updatedKm || 0).toLocaleString('id-ID')} km) berhasil disimpan!`
          );
        }}
      />

      {/* 7. Modal Lapor Insiden Cepat */}
      <FleetIncidentQuickModal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        kendaraanList={kendaraanList}
        onSuccess={loadFleetData}
        defaultKendaraanId={selectedKendaraanForAction}
      />

      {/* 8. Drawer Alokasi Jadwal Hari Ini */}
      <FleetScheduleDrawer
        isOpen={showScheduleDrawer}
        onClose={() => setShowScheduleDrawer(false)}
        kendaraanList={kendaraanList}
      />

      {/* 9. PWA Install Prompt Modal */}
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
