'use client';

import React from 'react';
import { LiquidGlassBottomNav, LiquidNavItem } from '@/components/navigation/LiquidGlassBottomNav';
import { FleetPicTelemetrySummary } from '@/lib/actions/kendaraan';
import { Car, Gauge, Fuel, Wrench, ClipboardCheck } from 'lucide-react';

export type ArmadaTab = 'armada' | 'trip' | 'bbm' | 'perawatan' | 'inspeksi';

interface FloatingArmadaNavProps {
  currentTab: ArmadaTab;
  onSelectTab: (tab: ArmadaTab) => void;
  telemetry?: FleetPicTelemetrySummary;
}

export function FloatingArmadaNav({
  currentTab,
  onSelectTab,
  telemetry,
}: FloatingArmadaNavProps) {
  const activeTripsCount = telemetry?.activeTripUnits?.length || 0;
  const unitButuhServis = telemetry?.unitButuhServis || 0;
  const pendingInsiden = telemetry?.insidenPending || 0;

  const navItems: LiquidNavItem[] = [
    {
      id: 'armada',
      label: 'Armada',
      icon: Car,
      onClick: () => onSelectTab('armada'),
    },
    {
      id: 'trip',
      label: 'Log Trip',
      icon: Gauge,
      badge: activeTripsCount > 0 ? activeTripsCount : undefined,
      onClick: () => onSelectTab('trip'),
    },
    {
      id: 'bbm',
      label: 'BBM',
      icon: Fuel,
      onClick: () => onSelectTab('bbm'),
    },
    {
      id: 'perawatan',
      label: 'Servis',
      icon: Wrench,
      badge: unitButuhServis > 0 ? unitButuhServis : undefined,
      onClick: () => onSelectTab('perawatan'),
    },
    {
      id: 'inspeksi',
      label: 'Inspeksi',
      icon: ClipboardCheck,
      badge: pendingInsiden > 0 ? pendingInsiden : undefined,
      onClick: () => onSelectTab('inspeksi'),
    },
  ];

  return (
    <LiquidGlassBottomNav
      items={navItems}
      activeId={currentTab}
    />
  );
}
