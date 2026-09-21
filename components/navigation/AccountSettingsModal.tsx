'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  X,
  Camera,
  Lock,
  User,
  Shield,
  Check,
  AlertCircle,
  Loader2,
  LogOut,
  Eye,
  EyeOff,
  ZoomIn,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '@/types/database';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  updateProfilePhotoAction,
  changePasswordWithOldPasswordAction,
  logoutAction,
} from '@/lib/actions/auth';
import { sound } from '@/lib/sound/SoundFX';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  user,
}: AccountSettingsModalProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();

  // Active sub-tab in settings
  const [activeTab, setActiveTab] = React.useState<'profil' | 'keamanan'>('profil');

  // Photo Crop & Adjust State
  const [rawImageSrc, setRawImageSrc] = React.useState<string | null>(null);
  const [isCropping, setIsCropping] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [isSavingPhoto, setIsSavingPhoto] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // Password Change State
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);

  // Handle ESC key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Clean up object URLs when modal unmounts
  React.useEffect(() => {
    return () => {
      if (rawImageSrc && rawImageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(rawImageSrc);
      }
    };
  }, [rawImageSrc]);

  if (!isOpen || !user) return null;

  // 1. Photo Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Hanya file gambar (JPG, PNG, WebP) yang didukung.');
      return;
    }

    // Max 10MB input limit
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Ukuran gambar terlalu besar (maksimal 10MB).');
      return;
    }

    setPhotoError(null);
    setPhotoSuccess(null);
    const objectUrl = URL.createObjectURL(file);
    setRawImageSrc(objectUrl);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsCropping(true);
  };

  // 2. Interactive Pan Dragging Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 3. Convert to WebP via HTML5 Canvas & Upload
  const handleCropAndSave = async () => {
    if (!imageRef.current || !viewportRef.current) return;

    setIsSavingPhoto(true);
    setPhotoError(null);

    try {
      const canvas = document.createElement('canvas');
      const OUTPUT_SIZE = 256; // 256x256 high-def avatar
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Gagal menginisialisasi canvas grafis.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const img = imageRef.current;
      const viewport = viewportRef.current;
      const vpRect = viewport.getBoundingClientRect();

      // Displayed dimensions of image
      const displayedWidth = img.clientWidth;
      const displayedHeight = img.clientHeight;

      // Scale factor from displayed DOM to natural pixels
      const scaleX = img.naturalWidth / displayedWidth;
      const scaleY = img.naturalHeight / displayedHeight;

      // Center offset
      const vpCenterX = vpRect.width / 2;
      const vpCenterY = vpRect.height / 2;

      // Distance from img center to viewport center
      const currentCenterX = displayedWidth / 2 + pan.x;
      const currentCenterY = displayedHeight / 2 + pan.y;

      const diffX = vpCenterX - currentCenterX;
      const diffY = vpCenterY - currentCenterY;

      // Destination rendering on canvas
      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-OUTPUT_SIZE / 2, -OUTPUT_SIZE / 2);

      // Render image centered with current pan offset
      const drawWidth = OUTPUT_SIZE;
      const drawHeight = (img.naturalHeight / img.naturalWidth) * OUTPUT_SIZE;
      const destX = (OUTPUT_SIZE - drawWidth) / 2 + (pan.x / vpRect.width) * OUTPUT_SIZE;
      const destY = (OUTPUT_SIZE - drawHeight) / 2 + (pan.y / vpRect.height) * OUTPUT_SIZE;

      ctx.drawImage(img, destX, destY, drawWidth, drawHeight);
      ctx.restore();

      // Automatic conversion to WebP format
      const webpDataUrl = canvas.toDataURL('image/webp', 0.85);

      const res = await updateProfilePhotoAction(webpDataUrl);
      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan foto.');
      }

      sound.playConfirmChime();
      setUser({ ...user, foto_url: webpDataUrl });
      setPhotoSuccess('Foto profil berhasil dipotong dan dikonversi ke WebP!');
      setIsCropping(false);
      setRawImageSrc(null);
    } catch (err: any) {
      console.error('Photo crop error:', err);
      setPhotoError(err?.message || 'Gagal memproses gambar ke WebP.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // 4. Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword) {
      setPasswordError('Password lama wajib diisi.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak sesuai.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePasswordWithOldPasswordAction({
        oldPassword,
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        sound.error?.();
        setPasswordError(res.error || 'Gagal mengubah password.');
        return;
      }

      sound.playConfirmChime();
      setPasswordSuccess('Password akun Anda berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      sound.error?.();
      setPasswordError(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 5. Logout Handler
  const handleLogout = async () => {
    sound.playTactileClick();
    onClose();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('amanah_instruktur_id');
    }
    await logoutAction();
    router.replace('/');
  };

  const displayAvatar = user.foto_url || (user.staff?.foto_url ? user.staff.foto_url : null);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Akun"
    >
      <div
        className="w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[var(--brand-primary)] flex items-center justify-center border border-emerald-500/20 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[var(--text-primary)] leading-tight">
                Pengaturan Akun
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Kelola profil internal & keamanan akun
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex border-b border-[var(--border)] px-5 bg-black/[0.01] dark:bg-white/[0.01]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profil');
              setIsCropping(false);
            }}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profil'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Profil Pengguna
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keamanan')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'keamanan'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Keamanan & Sandi
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'profil' ? (
            <div className="space-y-5">
              {/* Photo Notifications */}
              {photoSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{photoSuccess}</span>
                </div>
              )}
              {photoError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}

              {/* Photo Crop & Adjust Workspace */}
              {isCropping && rawImageSrc ? (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        Potong & Sesuaikan Foto
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Geser gambar dan atur zoom sebelum dikonversi ke WebP
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCropping(false);
                        setRawImageSrc(null);
                      }}
                      className="text-[11px] text-[var(--text-muted)] hover:text-rose-600"
                    >
                      Batal
                    </button>
                  </div>

                  {/* Interactive Crop Viewport */}
                  <div
                    ref={viewportRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="relative w-60 h-60 mx-auto rounded-2xl overflow-hidden bg-black/40 border-2 border-[var(--brand-primary)] cursor-grab active:cursor-grabbing select-none shadow-inner flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={rawImageSrc}
                      alt="Crop Preview"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                      }}
                      draggable={false}
                    />

                    {/* Circular Mask Guide */}
                    <div className="absolute inset-0 pointer-events-none rounded-full border border-white/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                  </div>

                  {/* Zoom Slider Controls */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-medium">
                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Skala Zoom ({zoom.toFixed(1)}x)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          setPan({ x: 0, y: 0 });
                        }}
                        className="flex items-center gap-1 text-[10px] text-[var(--brand-primary)] hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Posisi</span>
                      </button>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-[var(--brand-primary)] cursor-pointer"
                    />
                  </div>

                  {/* Apply WebP Button */}
                  <button
                    type="button"
                    onClick={handleCropAndSave}
                    disabled={isSavingPhoto}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengonversi ke WebP & Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Konversi ke WebP & Terapkan Foto</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Avatar Display with Change Trigger */
                <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-emerald-600/10 border border-emerald-600/20 shrink-0 flex items-center justify-center font-bold text-lg text-emerald-600">
                    {displayAvatar ? (
                      <Image
                        src={displayAvatar}
                        alt={user.nama}
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      user.nama?.slice(0, 2).toUpperCase() || 'AD'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Foto Profil
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                      Unggah foto, potong & sesuaikan, otomatis dikonversi ke WebP.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>Ganti Foto Profil</span>
                    </button>
                  </div>
                </div>
              )}

              {/* User Name (Read-Only) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Nama Pengguna (Read-Only)
                  </label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Tidak dapat diubah
                  </span>
                </div>
                <input
                  type="text"
                  value={user.nama}
                  disabled
                  readOnly
                  className="w-full px-3.5 py-2.5 text-xs bg-black/[0.04] dark:bg-white/[0.04] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium cursor-not-allowed opacity-90"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Nama akun dikunci oleh sistem demi integritas presensi dan laporan operasional.
                </p>
              </div>

              {/* Username & Email (Read-Only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Username
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    readOnly
                    className="w-full px-3 py-2 text-xs bg-black/[0.04] dark:bg-white/[0.04] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-mono cursor-not-allowed opacity-90"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Email
                  </label>
                  <input
                    type="text"
                    value={user.email}
                    disabled
                    readOnly
                    className="w-full px-3 py-2 text-xs bg-black/[0.04] dark:bg-white/[0.04] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-mono cursor-not-allowed opacity-90 truncate"
                  />
                </div>
              </div>

              {/* Roles Badges (Clean square rounded-md, no pill) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Hak Akses Role Aktif
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {user.roles?.includes('developer') ? (
                    <span className="text-[10px] px-2 py-1 rounded-md font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Developer (All-Access)
                    </span>
                  ) : (
                    user.roles?.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-1 rounded-md font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 capitalize"
                      >
                        {r}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Security Tab: Change Password */
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Untuk keamanan akun, masukkan password lama Anda saat ini sebelum memasukkan password baru.
              </p>

              {/* Old Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Password Lama
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    required
                    disabled={isChangingPassword}
                    className="w-full pl-9 pr-9 py-2 text-xs bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--brand-primary)] rounded-xl outline-none transition-all text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    disabled={isChangingPassword}
                    className="w-full pl-9 pr-9 py-2 text-xs bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--brand-primary)] rounded-xl outline-none transition-all text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Ulangi Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru persis sama"
                    required
                    minLength={6}
                    disabled={isChangingPassword}
                    className="w-full pl-9 pr-9 py-2 text-xs bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--brand-primary)] rounded-xl outline-none transition-all text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memperbarui Sandi...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Perbarui Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer with Logout Button */}
        <div className="px-5 py-3.5 border-t border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Akun</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
