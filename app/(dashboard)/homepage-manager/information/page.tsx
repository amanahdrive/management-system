'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  getHomepageSettings,
  updateHomepageSettings,
} from '@/lib/actions/homepage-manager';
import { HomepageContactInfo, HomepageMapsInfo } from '@/types/database';
import {
  Phone,
  User,
  MapPin,
  Globe,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Sliders,
  ZoomIn,
  Move,
  Target,
  RotateCcw,
} from 'lucide-react';

const SUPABASE_STORAGE_URL =
  'https://yhwwhqqffgtiavapgjvc.supabase.co/storage/v1/object/public/assets';

const PRESET_AVATARS = [
  { name: 'Kak Lia (Student Care)', url: `${SUPABASE_STORAGE_URL}/staff_models/Lia.webp` },
  { name: 'Kak Syawal (Lead Instructor)', url: `${SUPABASE_STORAGE_URL}/staff_models/Syawal.webp` },
  { name: 'Kak Risky (Instructor)', url: `${SUPABASE_STORAGE_URL}/staff_models/Risky.webp` },
  { name: 'Kak Alpi (Instructor)', url: `${SUPABASE_STORAGE_URL}/staff_models/Alpi.webp` },
];

export default function HomepageInformationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<HomepageContactInfo>({
    phone: '628137790961',
    display_phone: '0813-7790-961',
    name: 'Kak Lia (Nur Awalia)',
    role: 'Student Care & Konsultasi Resmi',
    avatar_url: `${SUPABASE_STORAGE_URL}/staff_models/Lia.webp`,
    avatar_position_x: 50,
    avatar_position_y: 20,
    avatar_scale: 100,
  });
  const [maps, setMaps] = useState<HomepageMapsInfo>({
    address: 'Jl. Macan Kumbang XVIII, Siring Agung, Kec. Ilir Bar. I, Kota Palembang, Sumatera Selatan 30153',
    embed_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31875.470275216805!2d104.71889829445799!3d-2.9770358522609737!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b758980fc77a1%3A0x3a59dd8b6033f81b!2sAmanah%20Drive%20Palembang%20-%20KURSUS%20MENGEMUDI%20PALEMBANG!5e0!3m2!1sen!2sid!4v1789155812105!5m2!1sen!2sid',
  });
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getHomepageSettings();
      if (res.contact_info) {
        setContact({
          ...res.contact_info,
          avatar_position_x: res.contact_info.avatar_position_x ?? 50,
          avatar_position_y: res.contact_info.avatar_position_y ?? 20,
          avatar_scale: res.contact_info.avatar_scale ?? 100,
        });
      }
      if (res.maps_info) setMaps(res.maps_info);
    } catch (err) {
      console.error('Error loading homepage settings:', err);
      showToast('error', 'Gagal memuat pengaturan homepage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateHomepageSettings({
        contact_info: contact,
        maps_info: maps,
      });

      if (res.success) {
        showToast('success', 'Informasi homepage berhasil diperbarui dan tersinkronisasi!');
      } else {
        showToast('error', res.error || 'Gagal menyimpan data');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan sistem saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <PageHeader
        title="Homepage Updater"
        description="Kelola informasi publik homepage Amanah Drive: nomor WhatsApp resmi, PIC kontak, posisi & ukuran foto profil agar tidak kepotong, serta embed Google Maps."
        breadcrumbs={[
          { label: 'Homepage Manager', href: '/homepage-manager/submissions' },
          { label: 'Homepage Updater' },
        ]}
        actions={
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Perubahan</span>
          </button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Contact WhatsApp & Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Fields (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 text-[var(--brand-primary)]">
              <Phone className="w-4 h-4" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Kontak WhatsApp &amp; PIC Student Care
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nomor WhatsApp Raw (Format 62xxx):
                </label>
                <input
                  type="text"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="628137790961"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] font-mono"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Digunakan untuk link URL https://wa.me/628xxx
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nomor WhatsApp Tampilan (Display):
                </label>
                <input
                  type="text"
                  value={contact.display_phone}
                  onChange={(e) => setContact({ ...contact, display_phone: e.target.value })}
                  placeholder="0813-7790-961"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] font-mono"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Teks yang dibaca oleh pengunjung website
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nama PIC Customer Care:
                </label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Kak Lia (Nur Awalia)"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Role / Jabatan PIC:
                </label>
                <input
                  type="text"
                  value={contact.role}
                  onChange={(e) => setContact({ ...contact, role: e.target.value })}
                  placeholder="Student Care &amp; Konsultasi Resmi"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                URL Foto Profil Avatar:
              </label>
              <input
                type="text"
                value={contact.avatar_url}
                onChange={(e) => setContact({ ...contact, avatar_url: e.target.value })}
                placeholder="/staff_models/Lia.webp atau URL gambar"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] font-mono"
                required
              />

              {/* Preset Avatar Selection */}
              <div className="mt-2.5">
                <span className="text-[11px] text-[var(--text-muted)] block mb-1.5 font-medium">
                  Pilih dari foto profil staff yang tersedia:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setContact({ ...contact, avatar_url: avatar.url })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        contact.avatar_url === avatar.url
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {avatar.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Positioning & Zoom Controls */}
              <div className="mt-4 pt-3.5 border-t border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                    <Sliders className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Atur Posisi &amp; Ukuran Display Picture</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    Pos: {contact.avatar_position_x ?? 50}% {contact.avatar_position_y ?? 20}% | Zoom: {contact.avatar_scale ?? 100}%
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setContact({
                        ...contact,
                        avatar_position_x: 50,
                        avatar_position_y: 15,
                        avatar_scale: 110,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
                  >
                    <Target className="w-3 h-3" />
                    <span>Fokus Wajah (Rekomendasi)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setContact({
                        ...contact,
                        avatar_position_x: 50,
                        avatar_position_y: 50,
                        avatar_scale: 100,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-500/20 border border-[var(--border)] transition-all"
                  >
                    <User className="w-3 h-3" />
                    <span>Tengah (Standar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setContact({
                        ...contact,
                        avatar_position_x: 50,
                        avatar_position_y: 10,
                        avatar_scale: 135,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border border-blue-500/30 transition-all"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>Close-up Wajah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setContact({
                        ...contact,
                        avatar_position_x: 50,
                        avatar_position_y: 20,
                        avatar_scale: 100,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/20 border border-[var(--border)] transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Sliders Grid */}
                <div className="space-y-3 bg-[var(--bg)] p-3 rounded-lg border border-[var(--border)]">
                  {/* Zoom / Scale Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      <label className="flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                        <span>Ukuran Foto (Zoom / Skala):</span>
                      </label>
                      <span className="font-mono text-[var(--brand-primary)] font-bold">
                        {contact.avatar_scale ?? 100}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={200}
                      step={5}
                      value={contact.avatar_scale ?? 100}
                      onChange={(e) =>
                        setContact({ ...contact, avatar_scale: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--brand-primary)] cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                      <span>70% (Jauh)</span>
                      <span>100% (Normal)</span>
                      <span>200% (Close-up)</span>
                    </div>
                  </div>

                  {/* Posisi Vertikal Y */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      <label className="flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                        <span>Posisi Vertikal (Fokus Wajah / Atas-Bawah):</span>
                      </label>
                      <span className="font-mono text-[var(--brand-primary)] font-bold">
                        {contact.avatar_position_y ?? 20}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={contact.avatar_position_y ?? 20}
                      onChange={(e) =>
                        setContact({ ...contact, avatar_position_y: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--brand-primary)] cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                      <span>0% (Kepala / Atas)</span>
                      <span>50% (Dada / Tengah)</span>
                      <span>100% (Bawah)</span>
                    </div>
                  </div>

                  {/* Posisi Horizontal X */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      <label className="flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-[var(--brand-primary)] rotate-90" />
                        <span>Posisi Horizontal (Kiri - Kanan):</span>
                      </label>
                      <span className="font-mono text-[var(--brand-primary)] font-bold">
                        {contact.avatar_position_x ?? 50}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={contact.avatar_position_x ?? 50}
                      onChange={(e) =>
                        setContact({ ...contact, avatar_position_x: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--brand-primary)] cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                      <span>0% (Kiri)</span>
                      <span>50% (Tengah)</span>
                      <span>100% (Kanan)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Card (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Live Preview Tampilan Homepage</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                Aktif
              </span>
            </div>

            {/* Widget Simulated on Homepage */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[#ffffff] text-[#121317] space-y-3 shadow-sm">
              <div className="text-[11px] font-semibold text-[#45474d] flex items-center justify-between">
                <span>1. Dialog WhatsApp Pop-up</span>
                <span className="text-[10px] text-[#0F7A73] font-mono">48x48 px</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#0F7A73] bg-zinc-100 shrink-0 shadow-xs">
                  <Image
                    src={contact.avatar_url || `${SUPABASE_STORAGE_URL}/staff_models/Lia.webp`}
                    alt={contact.name}
                    fill
                    sizes="48px"
                    className="object-cover transition-all duration-150"
                    style={{
                      objectPosition: `${contact.avatar_position_x ?? 50}% ${contact.avatar_position_y ?? 20}%`,
                      transform: `scale(${(contact.avatar_scale ?? 100) / 100})`,
                    }}
                    onError={(e) => {
                      (e.target as any).src = '/staff_models/Lia.webp';
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#121317]">{contact.name}</div>
                  <div className="text-[11px] text-[#0F7A73] font-medium">{contact.role}</div>
                  <div className="text-[10px] text-[#45474d] font-mono mt-0.5">
                    WhatsApp: {contact.display_phone}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                <span className="text-[#10B981] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  Online Siap Konsultasi
                </span>
                <a
                  href={`https://wa.me/${contact.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-[#0F7A73] text-white text-[10px] font-semibold flex items-center gap-1 hover:opacity-90"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Chat Sekarang</span>
                </a>
              </div>
            </div>

            {/* Additional Simulations: Floating CTA & Navbar */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[#ffffff] text-[#121317] space-y-3 shadow-sm">
              <div className="text-[11px] font-semibold text-[#45474d] flex items-center justify-between">
                <span>2. Simulasi Komponen Lainnya</span>
                <span className="text-[10px] text-emerald-600 font-medium">Auto Sinkron</span>
              </div>

              {/* Floating Button Simulation */}
              <div className="flex items-center justify-between p-2 rounded-lg border border-zinc-150 bg-zinc-50 text-[#121317]">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 bg-white shrink-0">
                    <Image
                      src={contact.avatar_url || `${SUPABASE_STORAGE_URL}/staff_models/Lia.webp`}
                      alt={contact.name}
                      fill
                      sizes="32px"
                      className="object-cover transition-all duration-150"
                      style={{
                        objectPosition: `${contact.avatar_position_x ?? 50}% ${contact.avatar_position_y ?? 20}%`,
                        transform: `scale(${(contact.avatar_scale ?? 100) / 100})`,
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-[#0F7A73] font-bold block uppercase tracking-wider">Floating CTA</span>
                    <span className="text-xs font-bold">Chat Kak Lia</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">32x32</span>
              </div>

              {/* Navbar Button Simulation */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0F7A73] text-white">
                <div className="flex items-center gap-2">
                  <div className="relative w-4 h-4 rounded-md overflow-hidden border border-white/40 bg-black/20 shrink-0">
                    <Image
                      src={contact.avatar_url || `${SUPABASE_STORAGE_URL}/staff_models/Lia.webp`}
                      alt={contact.name}
                      fill
                      sizes="16px"
                      className="object-cover transition-all duration-150"
                      style={{
                        objectPosition: `${contact.avatar_position_x ?? 50}% ${contact.avatar_position_y ?? 20}%`,
                        transform: `scale(${(contact.avatar_scale ?? 100) / 100})`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">Chat Kak Lia (Navbar)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 text-white font-mono">16x16</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
              Posisi dan zoom yang disimpan di sini akan langsung mengatur CSS display picture di seluruh homepage (floating CTA, navbar, kalkulator kursus, dan footer) agar wajah tidak terpotong.
            </div>
          </div>
        </div>

        {/* Section 2: Google Maps Embed & Location */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Fields (6 cols) */}
          <div className="lg:col-span-6 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 text-[var(--brand-primary)]">
              <MapPin className="w-4 h-4" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Lokasi Kantor &amp; Google Maps Embed
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Alamat Lengkap Kantor Operasional:
              </label>
              <textarea
                value={maps.address}
                onChange={(e) => setMaps({ ...maps, address: e.target.value })}
                placeholder="Jl. Macan Kumbang XVIII, Siring Agung, Kec. Ilir Bar. I, Kota Palembang, Sumatera Selatan 30153"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Google Maps Embed Iframe URL:
              </label>
              <textarea
                value={maps.embed_url}
                onChange={(e) => setMaps({ ...maps, embed_url: e.target.value })}
                placeholder="https://www.google.com/maps/embed?pb=..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] font-mono text-[11px]"
                required
              />
              <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                Salin nilai dari atribut `src` pada kode embed iframe Google Maps resmi.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Simpan Semua Pengaturan</span>
              </button>
            </div>
          </div>

          {/* Maps Live Preview (6 cols) */}
          <div className="lg:col-span-6 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <Globe className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Live Preview Peta Lokasi</span>
              </div>
              <a
                href="https://maps.app.goo.gl/yQW2X"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
              >
                <span>Buka Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-[var(--border)] bg-zinc-100 dark:bg-zinc-800 relative">
              <iframe
                src={maps.embed_url}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Peta Lokasi Kantor Amanah Drive"
                className="w-full h-full block"
              />
            </div>

            <div className="text-xs text-[var(--text-secondary)] font-medium">
              Alamat tampil: <span className="text-[var(--text-primary)] font-bold">{maps.address}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
