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
} from 'lucide-react';

const PRESET_AVATARS = [
  { name: 'Kak Lia (Student Care)', url: '/staff_models/Lia.webp' },
  { name: 'Kak Syawal (Lead Instructor)', url: '/staff_models/Syawal.webp' },
  { name: 'Kak Risky (Instructor)', url: '/staff_models/Risky.webp' },
  { name: 'Kak Alpi (Instructor)', url: '/staff_models/Alpi.webp' },
];

export default function HomepageInformationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<HomepageContactInfo>({
    phone: '628137790961',
    display_phone: '0813-7790-961',
    name: 'Kak Lia (Nur Awalia)',
    role: 'Student Care & Konsultasi Resmi',
    avatar_url: '/staff_models/Lia.webp',
  });
  const [maps, setMaps] = useState<HomepageMapsInfo>({
    address: 'Jl. Demang Lebar Daun No. 45, Palembang, Sumatera Selatan',
    embed_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d45078.95267279368!2d104.69953335300335!3d-2.9714931721378597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b758980fc77a1%3A0x3a59dd8b6033f81b!2sAmanah%20Drive%20Palembang%20-%20KURSUS%20MENGEMUDI%20PALEMBANG!5e0!3m2!1sen!2sid!4v1789146853835!5m2!1sen!2sid',
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
      if (res.contact_info) setContact(res.contact_info);
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
        title="Update Information Homepage"
        description="Kelola informasi publik homepage Amanah Drive: nomor WhatsApp resmi, PIC kontak & foto profil, serta iframe Google Maps."
        breadcrumbs={[
          { label: 'Homepage Manager', href: '/homepage-manager/submissions' },
          { label: 'Update Information' },
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
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#0F7A73] bg-zinc-100 shrink-0">
                  <Image
                    src={contact.avatar_url || '/staff_models/Lia.webp'}
                    alt={contact.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback if avatar fails
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

            <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
              Perubahan pada nomor dan PIC kontak akan langsung diterapkan ke tombol WhatsApp mengambang (floating CTA), formulir booking, navbar, dan footer homepage tanpa perlu redeploy.
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
                placeholder="Jl. Demang Lebar Daun No. 45, Palembang, Sumatera Selatan"
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
