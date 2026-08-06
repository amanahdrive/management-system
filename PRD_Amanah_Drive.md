# PRD — Sistem Manajemen Amanah Drive

**Versi:** 1.0
**Tipe Dokumen:** Product Requirements Document (untuk dieksekusi oleh AI coding agent / Antigravity)
**Target Stack:** Next.js 15 (App Router) + Supabase (Postgres + Auth + Storage) + Vercel (Hosting)

---

## 0. CATATAN UNTUK AI CODING AGENT

Dokumen ini ditulis agar bisa dieksekusi **langkah demi langkah tanpa perlu reasoning kompleks**. Setiap section berisi:
- Nama tabel & kolom database secara eksplisit (jangan improvisasi nama kolom lain).
- Nama route/halaman secara eksplisit.
- Daftar komponen yang dibutuhkan.
- Aturan bisnis (business logic) secara eksplisit step-by-step.

**Aturan wajib saat membangun:**
1. Bangun **Fase per Fase** sesuai urutan di Section 12 (Roadmap Implementasi). Jangan lompat fase.
2. Gunakan **satu source of truth** untuk tipe data: buat file `types/database.ts` hasil generate dari Supabase schema, lalu pakai di semua tempat.
3. Semua angka uang disimpan sebagai `integer` (rupiah, tanpa desimal) di database. Jangan pakai `float`/`numeric` untuk uang.
4. Semua tanggal disimpan sebagai `timestamptz` di Supabase (UTC), ditampilkan dalam zona waktu `Asia/Jakarta (WIB)`.
5. Jangan bikin desain baru di luar Section 9 (Design System). Ikuti token warna & spacing yang sudah ditentukan.
6. Aset logo brand sudah tersedia di `/assets/` (berisi file PNG & JPG logo Amanah Drive dalam berbagai bentuk). Gunakan file yang paling sesuai konteks (logo lengkap untuk header/topbar, ikon saja untuk favicon/sidebar collapsed).
7. **v1 sistem ini TIDAK memakai login/autentikasi** (lihat Section 4). Jangan bangun halaman login atau proteksi route di fase ini — tapi bangun struktur data (`staff`, `staff_jabatan`) sedemikian rupa agar Supabase Auth bisa ditambahkan belakangan tanpa migrasi ulang skema besar.

---

## 1. RINGKASAN PRODUK

Amanah Drive adalah bisnis kursus mengemudi di Palembang. Sistem ini adalah **web internal (admin panel)**, bukan aplikasi publik/customer-facing, dipakai oleh admin & finance untuk mengelola:
- Data siswa & pembayaran
- Jadwal sesi mengemudi harian per instruktur
- Kondisi & operasional kendaraan
- Arus kas perusahaan (kas masuk/keluar, hutang piutang)
- Master data (paket, promo, kendaraan, staff & jabatan, dsb)

**Prinsip utama produk:**
- Performa tinggi (data grid besar harus tetap cepat).
- Mobile-first tapi tetap dense/detail di desktop.
- Bagian Kas dikunci PIN karena data paling sensitif.
- Semua master data (paket, harga, promo, slot waktu, staff & jabatan, kendaraan, status pembayaran) bisa diedit tanpa perlu redeploy → **futureproof**.

---

## 2. TECH STACK

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router, Server Components + Server Actions) |
| Bahasa | TypeScript |
| Database | Supabase (Postgres). **Supabase Auth belum dipakai di v1** (lihat Section 4) — siap diaktifkan di fase mendatang |
| Storage file | Supabase Storage (foto nota, foto staff, foto kendaraan) |
| Hosting | Vercel |
| Styling | Tailwind CSS v4 |
| Komponen UI | shadcn/ui (base) — dikustom sesuai Design System Section 9 |
| Tabel data | TanStack Table (client-side untuk tabel < 1000 baris, server-side pagination untuk data besar) |
| Form & validasi | React Hook Form + Zod |
| Grafik dashboard | Recharts |
| Export Excel | `exceljs` (bukan `xlsx` lama, karena `exceljs` support styling rapi) |
| Export PDF | `@react-pdf/renderer` untuk layout PDF presisi |
| Notifikasi | Telegram Bot API (`sendMessage`) untuk pengingat & laporan harian otomatis |
| Scheduler | Vercel Cron Jobs (`vercel.json`) — trigger laporan harian tiap jam 06.00 WIB |
| State ringan client | Zustand (untuk state UI seperti sidebar, modal, PIN kas session) |
| Icon | `lucide-react` |
| Tema | `next-themes` (dark/light) |

---

## 3. STRUKTUR FOLDER PROJECT

```
amanah-drive/
├── assets/                          # (SUDAH ADA) logo & aset brand PNG/JPG
├── app/
│   ├── (dashboard)/                 # v1: TIDAK ada (auth)/login, seluruh app langsung dapat diakses
│   │   ├── layout.tsx               # sidebar + topbar + theme provider
│   │   ├── dashboard/page.tsx
│   │   ├── siswa/
│   │   │   ├── page.tsx             # tabel siswa
│   │   │   └── [id]/page.tsx        # detail siswa
│   │   ├── jadwal/
│   │   │   ├── page.tsx             # overview jadwal
│   │   │   └── [id]/page.tsx        # detail sesi
│   │   ├── kendaraan/
│   │   │   ├── page.tsx             # list status kendaraan
│   │   │   └── [id]/page.tsx        # detail kendaraan
│   │   ├── kas/
│   │   │   ├── page.tsx             # overview + input + cashflow
│   │   │   ├── hutang/page.tsx      # manajemen hutang
│   │   │   └── pin-gate.tsx         # komponen gate PIN
│   │   ├── master-data/
│   │   │   ├── paket/page.tsx
│   │   │   ├── promosi/page.tsx
│   │   │   ├── kendaraan/page.tsx
│   │   │   ├── staff/page.tsx
│   │   │   ├── jabatan/page.tsx
│   │   │   ├── status-pembayaran/page.tsx
│   │   │   └── slot-waktu/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── export/
│   │   │   ├── xlsx/route.ts
│   │   │   └── pdf/route.ts
│   │   └── cron/
│   │       └── laporan-harian/route.ts   # dipanggil Vercel Cron tiap 06.00 WIB
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                          # base shadcn components (sudah dikustom token)
│   ├── dashboard/
│   ├── siswa/
│   ├── jadwal/
│   ├── kendaraan/
│   ├── kas/
│   ├── master-data/
│   └── shared/                      # DataTable, ExportButton, PageHeader, dll
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # browser client
│   │   ├── server.ts                # server client
│   │   └── middleware.ts            # disiapkan tapi belum diaktifkan di v1 (lihat Section 4)
│   ├── actions/                     # server actions per domain (siswa.ts, jadwal.ts, kas.ts, dll)
│   ├── telegram/
│   │   ├── client.ts                # helper sendTelegramMessage()
│   │   └── laporan-harian.ts        # builder teks laporan harian
│   ├── utils/
│   │   ├── currency.ts              # format rupiah
│   │   ├── date.ts                  # format tanggal WIB
│   │   └── whatsapp-markdown.ts     # generator markdown WA jadwal
│   └── validations/                 # skema Zod per domain
├── types/
│   └── database.ts                  # generated dari Supabase
├── middleware.ts                    # v1: no-op / tidak aktif, placeholder untuk proteksi auth di fase mendatang
├── vercel.json                      # konfigurasi Vercel Cron Jobs
├── .env.local.example               # daftar nama env var yang dibutuhkan (TANPA nilai asli)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 4. AKTOR & AKSES

**v1: TANPA sistem login.** Seluruh aplikasi bisa diakses langsung oleh siapa pun yang punya link (dipakai internal dalam jaringan terbatas/lokasi kerja). Tidak ada halaman `/login`, tidak ada proteksi route berbasis session user.

Alasan & rencana ke depan: sistem tetap dirancang **siap-login** (auth-ready) supaya migrasi ke Supabase Auth di fase berikutnya tidak butuh perombakan skema:
- Simpan referensi "siapa yang melakukan aksi" bukan lewat `auth.uid()`, melainkan lewat **pemilihan staff secara eksplisit di form** (dropdown "Dikerjakan oleh" mengambil dari tabel `staff`) di tempat-tempat yang butuh jejak (mis. PIC transaksi kas, siapa yang update status kendaraan). Ini menggantikan fungsi "user login" untuk sementara.
- Tabel `staff` (Section 6.6) dibangun terpisah dari auth sejak awal, agar nanti tinggal ditambahkan tabel penghubung `auth.users.id → staff.id` tanpa mengubah data staff yang sudah ada.
- RLS Supabase untuk v1 cukup **public read/write via anon key** (karena belum ada konsep user login). Saat login diaktifkan nanti, RLS diperketat menjadi `auth.uid() is not null`.
- `middleware.ts` dan folder `(auth)` disiapkan sebagai placeholder kosong, tidak diaktifkan dulu (lihat Section 12, Fase 11 — Roadmap Masa Depan).

**Gate PIN Kas** tetap ada dan **tidak bergantung pada login** — ini adalah PIN transaksi independen (lihat Section 8.5), wajib diminta setiap kali ada yang mau **create/update/delete** data di section Kas, terlepas dari ada sistem login atau tidak.

---

## 5. DESIGN SYSTEM (WAJIB DIIKUTI)

### 5.1 Warna (ambil dari brand asset di `/assets/`)

```css
:root {
  --brand-primary: #0F7A73;        /* teal utama Amanah Drive */
  --brand-primary-dark: #0B5F59;
  --brand-primary-light: #E6F3F2;
  --brand-navy: #0B2545;           /* dari elemen "slot malam" */
  --brand-navy-dark: #071A33;

  --bg: #FFFFFF;
  --bg-subtle: #F7F9F9;
  --border: #E2E8E7;
  --text-primary: #10231F;
  --text-secondary: #5C6E6B;

  --success: #1B8A5A;
  --warning: #B9821B;
  --danger: #C13D3D;
  --info: #2563A8;
}

[data-theme="dark"] {
  --bg: #0B1614;
  --bg-subtle: #10201D;
  --border: #1F3230;
  --text-primary: #EDF5F3;
  --text-secondary: #9AB1AD;
  --brand-primary-light: #123531;
}
```

### 5.2 Aturan Layout (WAJIB)

- **Corner radius**: maksimal `6px` (`rounded-md`). **Dilarang** `rounded-xl`/`rounded-2xl`/`rounded-full` kecuali untuk avatar foto & badge kecil.
- **Container**: gunakan garis border tipis (`1px solid var(--border)`), bukan shadow besar/soft-glow berlebihan.
- **Spacing desktop**: padding container `24px`, gap antar card `16px`.
- **Spacing mobile**: padding container `12px`, gap antar card `8px`.
- **Grid dashboard**: desktop 4 kolom kartu ringkasan, tablet 2 kolom, mobile 1 kolom (data tetap lengkap, bukan disembunyikan — gunakan layout ringkas/compact row bukan menghapus data).
- **Font**: `Inter` atau `Plus Jakarta Sans` (pilih satu, konsisten). Heading bold 600–700, body 400–500.
- **Tabel di mobile**: jangan scroll horizontal sebagai solusi utama. Gunakan **card-list view** (setiap baris jadi card ringkas) di breakpoint < 768px, dengan opsi tap untuk expand detail.

### 5.3 Komponen Reusable Wajib Dibuat Lebih Dulu

1. `<DataTable />` — generic table dengan sorting, filter, pagination, responsive→card fallback.
2. `<PageHeader title breadcrumb actions />`
3. `<StatCard label value trend icon />` untuk dashboard.
4. `<ExportButton type="xlsx"|"pdf" data columns filename />`
5. `<CurrencyInput />` — auto format ke `Rp 1.234.567` saat mengetik.
6. `<DatePickerWIB />`
7. `<ConfirmDialog />` — untuk aksi delete/batal.
8. `<PinGateDialog />` — modal input PIN 6 digit, dipakai khusus di section Kas.
9. `<ThemeToggle />`

---

## 6. DATABASE SCHEMA (SUPABASE / POSTGRES)

> Semua tabel pakai `id uuid default gen_random_uuid() primary key`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` kecuali disebutkan lain. Aktifkan **Row Level Security**, policy: user yang sudah login (`auth.uid() is not null`) boleh select/insert/update semua tabel (karena ini internal tool satu role).

### 6.1 `paket` (Master Data Paket)
| Kolom | Tipe | Keterangan |
|---|---|---|
| nama_paket | text | mis. "Basic", "Basic + SIM", "Pro", "Pro + SIM", "Refresh (Pelancaran)", "Khusus" |
| jumlah_sesi | integer | 5, 10, 3, dst |
| termasuk_sim | boolean | |
| harga_normal | integer | rupiah |
| harga_promo | integer nullable | rupiah, jika ada promo tetap di level paket |
| jenis_mobil | text[] | array: `{manual, matic, mobil_sendiri}` — opsi mobil yang berlaku untuk paket ini |
| aktif | boolean default true | |

Seed awal dari data harga saat ini:
- Basic (5x) — Rp 800.000 (promo, normal Rp 950.000)
- Basic + SIM (5x) — Rp 1.700.000
- Pro (10x) — Rp 1.600.000
- Pro + SIM (10x) — Rp 2.300.000
- Refresh/Pelancaran (3x) — Rp 500.000
- Khusus — harga input manual per siswa (harga_normal = 0, ada flag `is_custom = true`)

Tambahkan kolom `is_custom boolean default false` di atas.

### 6.2 `promosi` (Campaign)
| Kolom | Tipe |
|---|---|
| nama_promo | text |
| paket_id | uuid FK → paket.id, nullable (nullable = berlaku semua paket) |
| tipe_potongan | text | `persen` \| `nominal` |
| nilai_potongan | integer | jika persen: 0–100, jika nominal: rupiah |
| tanggal_mulai | date |
| tanggal_selesai | date |
| aktif | boolean default true |

### 6.3 `sumber_leads` (opsional lookup, atau cukup enum)
Gunakan Postgres enum `sumber_leads_enum`: `meta_ads`, `tiktok`, `referensi`, `kustom`. Jika `kustom` dipilih, siswa punya kolom teks bebas `sumber_kustom_text`.

### 6.4 `status_pembayaran_master` (Master Data — editable)
| Kolom | Tipe |
|---|---|
| kode | text unique | `belum_bayar`, `dp`, `lunas`, `batal` (default seed, bisa nambah kode baru) |
| label | text | label tampilan, dan **label untuk markdown WA** (editable) |
| warna_badge | text | hex, untuk badge UI |
| urutan | integer |

### 6.5 `siswa`
| Kolom | Tipe | Keterangan |
|---|---|---|
| kode_siswa | text unique | auto-generate: `SS` + nomor urut 3 digit, mis. `SS003` (lihat 8.2.1) |
| nama | text | |
| tanggal_booking | date | |
| tanggal_rencana_mulai | date | |
| no_whatsapp | text | |
| alamat | text | |
| paket_id | uuid FK → paket.id | |
| harga_final | integer | hasil kalkulasi (harga paket − diskon), tapi tetap bisa override manual untuk paket "Khusus" |
| promosi_id | uuid FK → promosi.id nullable | |
| status_pembayaran_kode | text FK → status_pembayaran_master.kode | |
| dp_nominal | integer nullable | hanya diisi jika status = `dp` |
| dp_tanggal | date nullable | |
| sumber | sumber_leads_enum | |
| sumber_kustom_text | text nullable | |
| catatan | text nullable | |

**Business logic terkait:**
- `harga_final` dihitung otomatis di server action saat create/update: ambil `paket.harga_promo ?? paket.harga_normal`, lalu terapkan potongan dari `promosi` (persen atau nominal), hasil dibulatkan ke ribuan terdekat. User tetap bisa override manual (field editable) — jika di-override, simpan flag `harga_manual_override boolean`.
- Saat status diubah jadi `dp`, form otomatis menampilkan 2 field tambahan: nominal DP & tanggal DP (wajib diisi).
- Saat status = `dp` disimpan → otomatis buat 1 baris di tabel `kas_transaksi` (Section 6.8) sebagai pemasukan piutang-terbayar sebagian, kategori `dp_siswa`, terhubung via `siswa_id`. (Ini yang dimaksud user: "piutang jika disana terdapat baris pemasukan dp dari data siswa" muncul otomatis di cashflow).
- Saat status diubah jadi `lunas`, sistem otomatis buat baris kas_transaksi pemasukan sisa pelunasan (`harga_final - dp_nominal` jika sebelumnya DP, atau `harga_final` penuh jika sebelumnya belum_bayar).
- Saat status = `batal`, tidak menghapus data, hanya menandai batal (soft state), histori kas tetap ada (tidak auto-refund otomatis; refund dicatat manual lewat menu Kas > pengeluaran jika perlu).

### 6.6 `staff` & `jabatan` (Master Data — Data Staff Amanah Drive)

Instruktur **bukan lagi tabel terpisah** — instruktur adalah salah satu **jabatan** yang melekat pada staff. Satu staff bisa punya **lebih dari satu jabatan sekaligus** (many-to-many).

**Tabel `jabatan`** (master jabatan, bisa tambah/hapus dari UI):
| Kolom | Tipe | Keterangan |
|---|---|---|
| nama_jabatan | text unique | |
| aktif | boolean default true | soft delete — jangan hard delete jika masih dipakai staff |

Seed awal:
`Owner`, `Manager Utama`, `Manager Keuangan`, `Manager Bisnis`, `Instruktur`, `Admin`, `Social Media Specialist`, `Content Creator`, `Fleet Officer (Pengawas Kendaraan Operasional)`.

**Tabel `staff`** (data induk orang):
| Kolom | Tipe | Keterangan |
|---|---|---|
| nama | text | seed instruktur awal: Syawal, Riski, Alfi (dengan jabatan Instruktur) |
| foto_url | text nullable | Supabase Storage bucket `staff/` |
| tahun_bergabung | integer | |
| no_whatsapp | text | |
| alamat | text | |
| tanda_tangan_url | text nullable | PNG no-background, Supabase Storage — relevan terutama untuk jabatan Instruktur, tapi field ini generik untuk semua staff (kosongkan jika tidak perlu) |
| aktif | boolean default true | staff resign → set false, jangan hard delete (histori jadwal/kas tetap harus valid) |

**Tabel penghubung `staff_jabatan`** (many-to-many):
| Kolom | Tipe |
|---|---|
| staff_id | uuid FK → staff.id |
| jabatan_id | uuid FK → jabatan.id |

Constraint: `unique(staff_id, jabatan_id)` agar tidak duplikat.

**Business logic terkait:**
- Di form tambah/edit staff, jabatan dipilih via **multi-select checkbox/tag** dari tabel `jabatan` aktif.
- Dropdown "Instruktur" di section Jadwal (Section 6.8/8.3) **hanya menampilkan staff yang memiliki jabatan `Instruktur`** dan `aktif = true` — query filter via join `staff_jabatan` → `jabatan.nama_jabatan = 'Instruktur'`.
- Dropdown "PIC Admin" di section Kas (Section 8.5) sebaiknya juga diambil dari staff dengan jabatan `Admin`/`Manager Keuangan` (bukan free text penuh) agar konsisten — tapi tetap sediakan opsi input manual sebagai fallback untuk kasus di luar staff terdaftar.

### 6.7 `slot_waktu` (Master Data — editable, sesuai gambar referensi)
| Kolom | Tipe |
|---|---|
| nama_slot | text | "Slot 1".."Slot 6" |
| jam_mulai | time | |
| jam_selesai | time | |
| kategori | text | `reguler` \| `malam` |
| urutan | integer |
| aktif | boolean default true |

Seed dari gambar:
- Slot 1: 09.00–10.30 (reguler)
- Slot 2: 11.00–12.30 (reguler)
- Slot 3: 13.30–15.00 (reguler)
- Slot 4: 15.30–17.00 (reguler)
- Slot 5: 18.30–20.00 (malam)
- Slot 6: 20.30–22.00 (malam)

### 6.8 `jadwal_sesi`
Ini tabel utama untuk section Jadwal Siswa. **Satu siswa akan punya banyak baris** (satu baris per sesi, sejumlah `paket.jumlah_sesi`), TAPI generate baris sesi bisa dilakukan bertahap (generate sesi berikutnya setelah sesi sebelumnya selesai), bukan wajib sekaligus 10 baris di awal — lihat 8.3.1.

| Kolom | Tipe | Keterangan |
|---|---|---|
| siswa_id | uuid FK → siswa.id | |
| staff_id | uuid FK → staff.id | wajib staff yang punya jabatan `Instruktur` (divalidasi di server action, bukan hanya UI) |
| jenis_mobil | text | `manual` \| `matic` \| `mobil_sendiri` |
| tanggal_sesi | date | |
| slot_waktu_id | uuid FK → slot_waktu.id | (jika 1 sesi butuh 2 slot berturut seperti contoh "Slot 1-2", simpan sebagai `slot_waktu_id_akhir` nullable → rentang) |
| slot_waktu_id_akhir | uuid FK nullable | untuk kasus gabung slot |
| nomor_sesi_ke | integer | mis. 7 dari total 10 |
| total_sesi_paket | integer | disalin dari paket saat pembuatan (snapshot, agar aman jika paket berubah nanti) |
| status_sesi | text | `terjadwal` \| `selesai` \| `batal` |
| catatan_sesi | text nullable | |

**Business logic:**
- Kode siswa, nama siswa dropdown (bisa juga isi manual/kustom via free text jika bukan dari siswa terdaftar — untuk kasus edge, tapi utamakan dari tabel siswa).
- Setiap baris overview jadwal bisa diklik → buka detail (route `/jadwal/[id]`) untuk update `status_sesi` jadi `selesai` atau `batal` pada hari itu.
- Saat sesi terakhir (`nomor_sesi_ke == total_sesi_paket`) di-set `selesai`, sistem otomatis update field turunan siswa (opsional kolom `siswa.status_progress` = `belum_dijadwalkan | on_progress | selesai`, dihitung, bukan disimpan manual — lihat 8.1 dashboard).

### 6.9 `kendaraan` (Master Data)
| Kolom | Tipe |
|---|---|
| nama_kendaraan | text | mis. "Toyota Calya" |
| tahun_produksi | integer |
| status_pembelian | text | `baru` \| `second` |
| tahun_pembelian | integer |
| plat_nomor | text |
| tipe_transmisi | text | `manual` \| `matic` |
| warna | text |
| foto_url | text nullable |
| aktif | boolean default true |

### 6.10 `kendaraan_status` (kondisi kendaraan saat ini — 1 baris per kendaraan, diupdate terus)
| Kolom | Tipe |
|---|---|
| kendaraan_id | uuid FK unique → kendaraan.id | |
| odometer_terkini | integer | km |
| oli_tanggal_terakhir | date nullable | |
| oli_km_terakhir | integer nullable | |
| cuci_tanggal_terakhir | date nullable | |
| bensin_tanggal_terakhir | date nullable | |
| bensin_jenis_terakhir | text nullable | `pertalite` \| `pertamax` |
| bensin_nominal_terakhir | integer nullable | rupiah |
| bensin_liter_terakhir | numeric nullable | hasil kalkulasi otomatis (lihat logic) |

**Business logic harga BBM (Master Data > Settings agar bisa diubah, bukan hardcode):**
- Buat tabel kecil `harga_bbm` (`jenis` text unique, `harga_per_liter` integer): seed `pertalite=10000`, `pertamax=16300`.
- Saat input pengisian BBM: user pilih jenis + input nominal rupiah → sistem hitung `liter = nominal / harga_per_liter` otomatis dan tampilkan real-time di form.

### 6.11 `kendaraan_ban` (ganti ban per ban, banyak baris riwayat)
| Kolom | Tipe |
|---|---|
| kendaraan_id | uuid FK → kendaraan.id | |
| posisi_ban | text | `depan_kiri` \| `depan_kanan` \| `belakang_kiri` \| `belakang_kanan` \| `serep` |
| tanggal_ganti | date | |
| km_saat_ganti | integer | |
| status_beli | text | `baru` \| `second` |

### 6.12 `kendaraan_log_harian` (untuk rekap basecamp in/out & jarak harian)
| Kolom | Tipe |
|---|---|
| kendaraan_id | uuid FK → kendaraan.id | |
| tanggal | date | |
| odometer_basecamp_out | integer nullable | |
| odometer_basecamp_in | integer nullable | |
| jarak_tempuh | integer nullable | generated: `odometer_basecamp_in - odometer_basecamp_out` |
| total_slot_selesai | integer nullable | jumlah sesi yang diselesaikan kendaraan ini hari itu (input manual atau auto count dari `jadwal_sesi` yang match kendaraan+tanggal, jika field kendaraan ditambahkan ke jadwal_sesi — lihat catatan) |

> Catatan: agar rekap ini valid, tambahkan kolom opsional `kendaraan_id` (nullable) di `jadwal_sesi` khusus untuk kasus `jenis_mobil != mobil_sendiri`, supaya `total_slot_selesai` bisa dihitung otomatis dari jadwal, bukan input manual murni. Tetap sediakan override manual.

Rekap weekly/monthly = query agregat (view SQL `kendaraan_rekap_mingguan`, `kendaraan_rekap_bulanan`) menjumlahkan `jarak_tempuh` dan `total_slot_selesai`, dibandingkan dengan total pengeluaran BBM periode yang sama dari `kas_transaksi` (filter kategori `bbm`).

### 6.13 `kas_transaksi` (Jantung Section Kas)
| Kolom | Tipe | Keterangan |
|---|---|---|
| tanggal | date | |
| tipe | text | `pemasukan` \| `pengeluaran` |
| kategori | text | `dp_siswa`, `pelunasan_siswa`, `bbm`, `operasional`, `gaji`, `cicilan_hutang`, `lainnya`, dll (bisa nambah — simpan sebagai lookup table `kas_kategori` agar editable, bukan enum tetap) |
| keterangan | text | |
| nominal | integer | selalu positif, tanda + / − ditentukan `tipe` |
| pic_tipe | text | `admin` \| `finance` |
| pic_nama | text | jika `finance` → auto isi "Lia"; jika `admin` → input manual nama admin |
| foto_nota_url | text nullable | Supabase Storage |
| siswa_id | uuid FK nullable → siswa.id | terisi otomatis jika transaksi berasal dari DP/pelunasan siswa |
| hutang_id | uuid FK nullable → hutang.id | terisi jika transaksi adalah pembayaran cicilan hutang |
| sumber_otomatis | boolean default false | true jika digenerate sistem (dari siswa/hutang), false jika input manual — untuk membedakan di UI (badge "Otomatis") |

### 6.14 `kas_kategori` (Master Data, editable)
| Kolom | Tipe |
|---|---|
| nama_kategori | text unique |
| tipe | text | `pemasukan` \| `pengeluaran` \| `keduanya` |

### 6.15 `hutang` (Manajemen Hutang/Cicilan)
| Kolom | Tipe |
|---|---|
| nama_hutang | text | mis. "Cicilan Mobil Calya", "Pinjaman Modal Bank X" |
| jenis | text | `cicilan_kendaraan` \| `pinjaman_perusahaan` \| `lainnya` |
| total_hutang | integer | rupiah |
| sisa_hutang | integer | dihitung otomatis dari total − akumulasi pembayaran |
| tanggal_mulai | date | |
| jatuh_tempo_bulanan | integer nullable | tanggal cicilan tiap bulan (1–31), untuk reminder |
| cicilan_per_bulan | integer nullable | rupiah |
| status | text | `berjalan` \| `lunas` |

### 6.16 `hutang_pembayaran` (riwayat bayar cicilan)
| Kolom | Tipe |
|---|---|
| hutang_id | uuid FK → hutang.id | |
| tanggal_bayar | date | |
| nominal | integer | |
| kas_transaksi_id | uuid FK nullable → kas_transaksi.id | link ke pengeluaran yang otomatis dibuat |

**Business logic:** setiap bayar cicilan → insert `hutang_pembayaran` + auto insert `kas_transaksi` (tipe `pengeluaran`, kategori `cicilan_hutang`, `hutang_id` terisi) + update `hutang.sisa_hutang`.

### 6.17 `settings` (System Settings, key-value, futureproof)
| Kolom | Tipe |
|---|---|
| key | text unique | mis. `pin_kas`, `nama_perusahaan`, `kota_operasional`, `wa_footer_template` |
| value | text | |
| deskripsi | text |

Seed: `pin_kas = 210100` (**disimpan ter-hash**, lihat 8.5 — bukan plaintext meski seednya angka ini).

### 6.18 `users_profile` (belum dipakai di v1 — disiapkan untuk fase login mendatang)
| Kolom | Tipe |
|---|---|
| id | uuid FK → auth.users.id | |
| staff_id | uuid FK → staff.id nullable | penghubung akun login ke data staff yang sudah ada |
| role | text default 'admin' | futureproof: `admin`, `finance`, `viewer` |

> Tabel ini **tidak perlu dibangun di Fase 1–10**. Baru dibangun saat Fase 11 (login) diaktifkan — dicatat di sini semata agar skema `staff` sudah kompatibel sejak awal.

### 6.19 `notifikasi_log` (Riwayat Notifikasi Telegram)
| Kolom | Tipe | Keterangan |
|---|---|---|
| tipe | text | `laporan_harian` \| `reminder_servis_kendaraan` \| `reminder_hutang_jatuh_tempo` \| `reminder_sesi_besok` |
| judul | text | ringkasan singkat isi notifikasi |
| isi_pesan | text | isi lengkap pesan yang dikirim (untuk audit/debug) |
| status_kirim | text | `terkirim` \| `gagal` |
| error_message | text nullable | pesan error dari Telegram API jika `gagal` |
| dikirim_at | timestamptz | waktu pengiriman aktual |

**Kegunaan:** mencegah kirim ganda (cek apakah `laporan_harian` untuk tanggal hari ini sudah pernah `terkirim` sebelum kirim lagi), serta jadi log untuk debugging jika notifikasi gagal terkirim (mis. token invalid, chat_id salah, rate limit).

---

## 7. RINGKASAN ROUTE / HALAMAN

| Route | Deskripsi |
|---|---|
| `/login` | Login Supabase Auth |
| `/dashboard` | Ringkasan bisnis |
| `/siswa` | Tabel semua siswa + tambah siswa |
| `/siswa/[id]` | Detail & edit siswa |
| `/jadwal` | Overview jadwal (filter tanggal, instruktur), tombol Copy Markdown WA |
| `/jadwal/[id]` | Detail sesi + update progress |
| `/kendaraan` | List status kendaraan (card per kendaraan) |
| `/kendaraan/[id]` | Detail kendaraan: odometer, oli, ban, cuci, BBM, log harian |
| `/kas` | Overview saldo, hutang, piutang + input transaksi + list terakhir (PIN gate) |
| `/kas/cashflow` | Detail overview cashflow read-only + filter (PIN gate) |
| `/kas/hutang` | Manajemen hutang (PIN gate) |
| `/master-data/paket` | CRUD paket |
| `/master-data/promosi` | CRUD promosi/campaign |
| `/master-data/kendaraan` | CRUD kendaraan operasional |
| `/master-data/staff` | CRUD data staff (nama, foto, kontak, jabatan multi-select, dll) |
| `/master-data/jabatan` | CRUD daftar jabatan |
| `/master-data/status-pembayaran` | CRUD status pembayaran |
| `/master-data/slot-waktu` | CRUD slot waktu |
| `/settings` | Pengaturan sistem umum |
| `/api/cron/laporan-harian` | **Bukan halaman UI** — endpoint yang dipanggil Vercel Cron tiap 06.00 WIB untuk kirim laporan harian ke Telegram |

---

## 8. DETAIL FUNGSIONAL PER SECTION

### 8.1 Dashboard

**Kartu ringkasan utama (bulan berjalan, berdasarkan `tanggal_rencana_mulai`/status sesi):**
1. **Siswa Belum Dijadwalkan** — jumlah siswa bulan ini yang statusnya bukan `batal` DAN belum punya baris `jadwal_sesi` sama sekali.
2. **Siswa On Progress** — siswa yang sudah punya minimal 1 sesi `selesai` tapi belum mencapai `total_sesi_paket`.
3. **Siswa Selesai** — siswa dengan jumlah sesi `selesai` == `total_sesi_paket`, diselesaikan bulan ini.
4. **Siswa Baru (Booking Bulan Ini)** — total booking baru bulan berjalan.

**Kartu tambahan yang direkomendasikan (silakan tambahkan):**
5. **Total Pendapatan Bulan Ini** (jumlah `harga_final` siswa lunas/dp bulan ini) — ambil dari `kas_transaksi` kategori pemasukan siswa.
6. **Saldo Kas Aktif** (ringkas, klik → ke `/kas`, tetap butuh PIN untuk detail).
7. **Sesi Terjadwal Hari Ini** (jumlah baris `jadwal_sesi` dengan `tanggal_sesi = hari ini`).
8. **Tingkat Konversi Sumber Leads** — pie/bar chart jumlah siswa per `sumber` bulan ini.
9. **Kendaraan Perlu Perhatian** — badge jika ada kendaraan dengan servis oli overdue (rule sederhana: >2000km sejak ganti terakhir atau >2 bulan) atau BBM terakhir diisi >3 hari lalu tanpa log.
10. **Grafik Tren Pendaftaran Siswa 6 Bulan Terakhir** (bar chart).
11. **Grafik Cashflow 6 Bulan Terakhir** (line chart pemasukan vs pengeluaran).

### 8.2 Data Siswa

**Tabel utama** kolom: Kode, Nama, Tgl Booking, Paket, Status Pembayaran (badge warna dari `status_pembayaran_master`), Sumber, Progress Sesi (mis. "3/10"), Aksi.
Fitur: search nama/kode, filter status pembayaran, filter paket, filter sumber, filter rentang tanggal booking, export xlsx/pdf.

**Form Tambah Siswa** (field sesuai Section 6.5), dengan behaviour:
- Pilih paket → auto-fill harga (read-only display, ada tombol "Override Harga").
- Pilih promosi (dropdown, hanya promo aktif & sesuai paket dipilih, atau "Tidak ada") → harga_final ter-update live di preview.
- Pilih status pembayaran → jika `dp`, munculkan input nominal DP + tanggal DP (dengan validasi nominal DP ≤ harga_final).
- Pilih sumber → jika `Kustom`, munculkan field teks bebas.

#### 8.2.1 Generate Kode Siswa
Format: `SS` + 3 digit nomor urut berdasarkan seluruh data siswa yang pernah dibuat (bukan hanya yang aktif), contoh: `SS001`, `SS002`, ... `SS010`, `SS100`. Implementasi: gunakan Postgres sequence `siswa_kode_seq`, trigger `before insert` set `kode_siswa = 'SS' || lpad(nextval('siswa_kode_seq')::text, 3, '0')`.

### 8.3 Jadwal Siswa

**Overview:** tabel/list dengan filter: tanggal (date picker, default hari ini), instruktur (dropdown termasuk "Semua" — sumber data dari `staff` yang punya jabatan `Instruktur`, lihat Section 6.6). Kolom: Kode Siswa, Nama, Instruktur, Jenis Mobil, Slot, Sesi (X/Y), Status, Aksi.

Di mobile → tampil sebagai card compact per siswa per sesi.

**Tambah Jadwal Sesi:** pilih siswa (dropdown dari data siswa aktif, atau opsi input manual/kustom untuk kasus di luar sistem), instruktur, jenis mobil (dibatasi opsi sesuai `paket.jenis_mobil` siswa tsb), tanggal, slot (bisa pilih 1 atau rentang 2 slot berurutan), nomor sesi ke berapa (auto-suggest = jumlah sesi `selesai` siswa itu + 1, tapi bisa diubah manual).

#### 8.3.1 Generate Sesi Berikutnya
Setelah user menandai `status_sesi = selesai` di detail sesi, sistem tampilkan tombol "+ Jadwalkan Sesi Berikutnya" (hanya muncul jika `nomor_sesi_ke < total_sesi_paket`) yang membuka form tambah jadwal dengan nomor_sesi_ke sudah otomatis terisi +1.

**Detail Sesi (`/jadwal/[id]`):** tampilkan semua data sesi, tombol besar "Tandai Selesai" / "Tandai Batal", field catatan sesi (opsional, mis. alasan batal).

#### 8.3.2 Generator Markdown WhatsApp (Fitur Kunci)

Lokasi: tombol "Copy Jadwal (WA)" di halaman `/jadwal`, dengan date picker (pilih 1 tanggal) dan filter instruktur (opsional, default semua instruktur yang punya sesi di tanggal itu).

**Logic generate string:**
1. Ambil semua `jadwal_sesi` dengan `tanggal_sesi = tanggal dipilih` dan `status_sesi = terjadwal`, join ke `siswa`, `staff` (via `staff_id`, ini adalah instrukturnya), `slot_waktu`, `paket`.
2. Grupkan per instruktur.
3. Format tanggal Indonesia: `Nama_Hari, DD/MM/YYYY` (mis. `Jum'at, 07/08/2026`) — gunakan mapping manual hari Indonesia (Senin–Minggu), jangan andalkan locale server.
4. Format slot: jika 1 slot → `Slot X: JJ.MM - JJ.MM`; jika 2 slot berurutan → `Slot X - Y: JJ.MM(slot awal) - JJ.MM(slot akhir)`.
5. Template output **PERSIS** seperti berikut (gunakan template string literal, JANGAN pakai emoji):

```
*JADWAL OPERASIONAL AMANAH DRIVE*
Tanggal: {tanggal_format_indonesia}
----------------------------------------
*Jadwal Sesi Kursus:*

Instruktur: *{NAMA_INSTRUKTUR_UPPERCASE}*

 
• *{nama_siswa}* ({kode_siswa})
  Sesi: {nomor_sesi_ke}/{total_sesi_paket} | Slot {slot_display}: {jam_mulai} - {jam_selesai}
  Paket: {jumlah_sesi}x | Mobil: {jenis_mobil_label}
  Alamat: {alamat}
  No. WA: {no_whatsapp}

{ulangi untuk tiap siswa di instruktur ini}

{ulangi seluruh blok "Instruktur:" untuk tiap instruktur}
----------------------------------------
*Catatan Instruktur:*
• Minta share lokasi kepada klien sebelum berangkat.
• Laporan keluar Basecamp beserta foto odometer.
• Laporan saat sesi dimulai.
• Laporan saat sesi selesai.
• Laporan kembali ke Basecamp beserta foto odometer.
```

- Baris "Catatan Instruktur" harus editable dari `/settings` (simpan sebagai template di tabel `settings` key `wa_footer_template`, dengan baris dipisah `\n`), agar tidak hardcode.
- `jenis_mobil_label`: `manual` → "Manual", `matic` → "Matic", `mobil_sendiri` → "Mobil Sendiri".
- Tombol "Copy" menyalin ke clipboard (`navigator.clipboard.writeText`) hasil string lengkap gabungan semua instruktur, tanpa emoji apapun, tanpa markdown selain yang dicontohkan (`*bold*` gaya WhatsApp).

### 8.4 Kendaraan Operasional

**List (`/kendaraan`):** card per kendaraan menampilkan foto, nama, plat, odometer terkini, status ringkas (badge merah jika ada item overdue perawatan). Card bisa diklik → buka detail.

**Detail (`/kendaraan/[id]`):**
- Section "Odometer & BBM" — punya 3 tombol khusus:
  1. **Basecamp Out** → input odometer saat keluar (insert/update `kendaraan_log_harian` hari ini, kolom `odometer_basecamp_out`).
  2. **Basecamp In** → input odometer saat kembali (`odometer_basecamp_in`), sistem otomatis hitung `jarak_tempuh`.
  3. **Total Slot Selesai** → auto-terisi dari hitung `jadwal_sesi` (kendaraan_id + tanggal hari ini + status selesai), dengan opsi override manual.
- Section "Oli" — tombol "Update Oli" → input tanggal + odometer saat ganti.
- Section "Ban" — 5 baris (per posisi ban) masing-masing tombol "Update Ban" → input tanggal, km, status beli (baru/second). Riwayat per posisi ditampilkan sebagai histori collapsible.
- Section "Cuci Mobil" — tombol "Update Cuci" → input tanggal saja.
- Section "BBM" — tombol "Update Pengisian BBM" → pilih jenis BBM, input nominal rupiah → sistem tampilkan liter hasil kalkulasi otomatis (real time) sebelum submit; setelah submit, otomatis insert `kas_transaksi` kategori `bbm` (tipe pengeluaran) agar konsisten dengan Kas.
- Section "Rekap Weekly/Monthly" — tab toggle, tampilkan total jarak tempuh, total slot selesai, total liter BBM terpakai, total biaya BBM, dan rasio km/liter, dibandingkan periode sebelumnya (naik/turun %).

### 8.5 Kas (Section Sensitif — Wajib PIN)

**Mekanisme PIN Gate:**
- PIN disimpan di tabel `settings` (key `pin_kas`), **di-hash** (bcrypt) saat disimpan/diubah — bukan plaintext, meskipun nilainya `210100`.
- Setiap masuk halaman `/kas`, `/kas/cashflow`, `/kas/hutang`, atau setiap kali klik tombol create/update/delete di ketiga halaman ini, munculkan `<PinGateDialog />`.
- PIN yang sudah diverifikasi disimpan di session (Zustand + expiry, mis. 15 menit) agar tidak input ulang tiap klik dalam satu sesi kerja, tapi wajib input ulang setiap kali browser di-refresh atau setelah expiry.
- Semua verifikasi PIN dilakukan di **server action** (bukan validasi client-side saja) agar tidak bisa dibypass dari devtools.
- PIN bisa diubah lewat `/settings` (dengan konfirmasi PIN lama).

**8.5.1 Overview (`/kas`):**
- 3 kartu ringkasan: **Total Saldo Aktif** (Σ pemasukan − Σ pengeluaran seluruh waktu), **Total Piutang** (Σ `harga_final - dp_nominal - pelunasan` siswa yang belum lunas), **Total Hutang** (Σ `sisa_hutang` dari tabel hutang).
- Form input cepat "Tambah Transaksi": tanggal, tipe (pemasukan/pengeluaran), kategori (dropdown dari `kas_kategori`), keterangan, nominal (`<CurrencyInput/>`), PIC (admin/finance — jika admin munculkan field nama, jika finance auto "Lia"), upload foto nota (opsi: kamera langsung `capture="environment"`, galeri, atau file picker biasa — gunakan `<input type="file" accept="image/*" capture="environment">` dengan fallback pilihan sumber).
- List transaksi terakhir (10 terbaru) dengan badge tipe & kategori, thumbnail nota.

**8.5.2 Cashflow Detail (`/kas/cashflow`):**
- Read-only table lengkap seluruh `kas_transaksi`, join info siswa/hutang bila `sumber_otomatis = true` (badge "Otomatis: DP Siswa", dsb).
- Filter lengkap: rentang tanggal, tipe, kategori, PIC, sumber (otomatis/manual).
- Export xlsx/pdf.

**8.5.3 Manajemen Hutang (`/kas/hutang`):**
- Tabel daftar hutang: nama, jenis, total, sisa, status, jatuh tempo.
- Tombol "Tambah Hutang Baru" (isi Section 6.15).
- Tombol per baris "Bayar Cicilan" → input tanggal & nominal, otomatis update `sisa_hutang` & insert `kas_transaksi` + `hutang_pembayaran`.

### 8.6 Master Data

Setiap sub-halaman (`paket`, `promosi`, `kendaraan`, `staff`, `jabatan`, `status-pembayaran`, `slot-waktu`) memakai pola CRUD yang identik: tabel list + tombol "Tambah" (dialog/drawer form) + aksi edit/hapus (soft delete via kolom `aktif=false`, jangan hard delete data yang sudah direferensikan tabel lain — validasi sebelum hard delete diperbolehkan).

**Khusus Promosi:** form pilih paket (atau "Semua Paket"), tipe potongan (radio: Persen / Nominal), nilai potongan, tanggal mulai–selesai, preview harga akhir contoh.

**Khusus Staff (`/master-data/staff`):** tabel list menampilkan foto, nama, jabatan (badge multi — bisa tampil lebih dari satu badge per baris), no. WA, status aktif. Form tambah/edit: nama, foto profil, tahun bergabung, no. WA, alamat, **jabatan (multi-select checkbox/tag, wajib minimal 1)**, upload tanda tangan (PNG transparan, opsional) — semua foto/tanda-tangan ke Supabase Storage bucket `staff/`.

**Khusus Jabatan (`/master-data/jabatan`):** tabel sederhana nama jabatan + jumlah staff yang memegangnya (badge count) + toggle aktif. Tombol tambah jabatan baru (bebas, tidak dibatasi 9 seed awal — misal nanti nambah "Marketing Lead"). Validasi: jabatan yang masih dipakai minimal 1 staff tidak bisa dihapus permanen, hanya bisa dinonaktifkan.

**Khusus Kendaraan (master):** upload foto/display picture ke bucket `kendaraan/`.

#### 8.6.1 Prinsip Pembagian: Master Data vs Settings

Karena user sering bingung menaruh sesuatu di mana, berikut aturan baku yang dipakai di seluruh sistem ini:

| Kriteria | Master Data | Settings |
|---|---|---|
| Sifat data | **List entitas bisnis** yang jumlahnya bisa terus bertambah/berkurang dan **direferensikan** oleh data transaksi lain (siswa, jadwal, kas, kendaraan) | **Parameter/konfigurasi tunggal** milik sistem, biasanya satu nilai per key, bukan daftar entitas yang dikelola satu-satu |
| Contoh | Paket, Promosi, Kendaraan, **Staff**, **Jabatan**, Status Pembayaran, Slot Waktu, Kategori Kas | Nama perusahaan, kota operasional, template footer WA, harga BBM per liter, PIN Kas, ambang batas notifikasi servis, tema default |
| Pola UI | Tabel list + CRUD dialog per baris | Form pengaturan langsung (tanpa tabel list terpisah), atau list kecil khusus 1-2 field (mis. harga BBM) |

Dengan aturan ini: **Staff & Jabatan masuk Master Data** (karena keduanya adalah entitas bisnis yang bertambah dan direferensikan oleh Jadwal & Kas), sedangkan **harga BBM, template WA, dan PIN Kas masuk Settings** (karena sifatnya parameter sistem, bukan daftar entitas yang tumbuh).

### 8.7 Settings

Halaman `/settings` berisi (semua tersimpan di tabel `settings`, key-value, agar mudah nambah setting baru tanpa migrasi):
- Nama Perusahaan, Kota Operasional (untuk header laporan/export).
- Template footer WA (Section 8.3.2).
- Ganti PIN Kas (dengan verifikasi PIN lama).
- Master harga BBM (`harga_bbm` table — pertalite/pertamax, bisa tambah jenis baru).
- Ambang batas notifikasi servis kendaraan (km & hari, untuk logic di 8.1 poin 9).
- **Pengaturan Notifikasi Telegram** (lihat detail Section 8.8): jam kirim laporan harian (default `06:00` WIB), toggle on/off tiap jenis reminder, tombol "Kirim Tes Notifikasi".
- Toggle tema default sistem (light/dark/system).
- Info versi sistem & link ke halaman bantuan (opsional).

### 8.8 Notifikasi Telegram & Laporan Harian Otomatis

**Tujuan:** owner/manager bisa memantau bisnis tanpa perlu buka sistem, lewat pesan Telegram — baik pengingat kondisional (reminder) maupun laporan terjadwal tiap pagi.

#### 8.8.1 Kredensial & Keamanan

Bot Telegram sudah dibuat oleh user, dengan kredensial berikut:
- `TG_CHAT_ID`: `8333108212`
- `TG_TOKEN`: `7953727563:AAEDOvsMdcQbSdmLP1bZBSE5oX7ipJuahbo`

**Aturan wajib penyimpanan (untuk AI coding agent):**
- Kredensial ini **TIDAK BOLEH** disimpan di tabel `settings` (database) maupun di-hardcode langsung di source code.
- Simpan sebagai **Environment Variables**: `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID`, didaftarkan manual oleh user di Vercel Project Settings → Environment Variables (untuk production) dan file `.env.local` (untuk development lokal, dan pastikan `.env.local` masuk `.gitignore`).
- Buat file `.env.local.example` di root project berisi **nama variabel saja tanpa nilai asli**, sebagai dokumentasi:
  ```
  TELEGRAM_BOT_TOKEN=
  TELEGRAM_CHAT_ID=
  CRON_SECRET=
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  ```
- Tambahkan juga `CRON_SECRET` (string acak buatan sendiri) untuk melindungi endpoint `/api/cron/laporan-harian` agar tidak bisa dipicu sembarang orang dari luar (lihat 8.8.4).

#### 8.8.2 Helper Pengiriman (`lib/telegram/client.ts`)

Fungsi generik `sendTelegramMessage(text: string)`:
- Memanggil `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage` dengan method `POST`, body `{ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }`.
- Gunakan `parse_mode: "HTML"` (bukan Markdown) agar tidak perlu escaping karakter khusus yang rawan error (mis. tanda kurung, titik pada nominal rupiah) — cukup pakai tag `<b>...</b>` untuk bold.
- Setiap pemanggilan, hasilnya (sukses/gagal) dicatat ke tabel `notifikasi_log` (Section 6.19).
- Wrap dengan try-catch, jangan sampai kegagalan kirim Telegram membuat proses lain (mis. simpan data siswa) ikut gagal — notifikasi bersifat "best effort", bukan critical path.

#### 8.8.3 Jenis Notifikasi

**A. Laporan Harian Otomatis (terjadwal, wajib)**
Dikirim setiap hari jam **06:00 WIB** (lihat 8.8.4 untuk mekanisme cron), isi laporan mencakup:
- Rekap kemarin: jumlah sesi selesai, jumlah siswa baru (booking kemarin), total pemasukan & pengeluaran kas kemarin.
- Jadwal hari ini: jumlah sesi terjadwal hari ini, dikelompokkan per instruktur (nama + jumlah sesi).
- Saldo kas aktif terkini (angka ringkas, tanpa rincian sensitif per transaksi).
- Peringatan kendaraan (jika ada kendaraan yang servis oli overdue sesuai ambang batas di Settings).
- Peringatan hutang jatuh tempo dalam 3 hari ke depan (jika ada).

Format contoh (HTML Telegram, tanpa emoji berlebihan — 1-2 penekanan visual saja boleh):
```
<b>LAPORAN HARIAN AMANAH DRIVE</b>
Jumat, 07/08/2026

Ringkasan Kemarin:
- Sesi selesai: 6
- Siswa baru: 2
- Pemasukan: Rp 1.800.000
- Pengeluaran: Rp 250.000

Jadwal Hari Ini:
- Syawal: 3 sesi
- Riski: 2 sesi
- Alfi: 1 sesi

Saldo Kas Aktif: Rp 14.250.000

Perhatian:
- Toyota Calya (BG 1234 XY): servis oli terlambat 400 km
- Cicilan "Pinjaman Modal Bank X" jatuh tempo 3 hari lagi
```

**B. Reminder Kondisional (event-based, opsional/toggle di Settings)**
- **Reminder Sesi Besok** — dikirim sore hari (jam bisa diatur, default 19:00 WIB) berisi daftar sesi terjadwal besok, agar admin bisa siapkan konfirmasi ke siswa/instruktur.
- **Reminder Servis Kendaraan** — dikirim segera saat status kendaraan diupdate dan terdeteksi melewati ambang batas servis (Section 8.7).
- **Reminder Hutang Jatuh Tempo** — dikirim H-3 sebelum `jatuh_tempo_bulanan` tiap hutang aktif.

Semua toggle jenis reminder ini disimpan di tabel `settings` (key seperti `notif_reminder_sesi_besok_aktif`, dst) supaya bisa dimatikan/nyalakan tanpa redeploy.

#### 8.8.4 Mekanisme Cron (Vercel Cron Jobs)

Konfigurasi `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/laporan-harian",
      "schedule": "0 23 * * *"
    }
  ]
}
```
> Catatan waktu: Vercel Cron memakai UTC. `06:00 WIB` = `23:00 UTC` hari sebelumnya, sehingga schedule `0 23 * * *` (setiap hari jam 23:00 UTC) akan tereksekusi tepat jam 06:00 pagi waktu Indonesia (WIB).

**Endpoint `app/api/cron/laporan-harian/route.ts`:**
1. Validasi header request berisi `Authorization: Bearer ${CRON_SECRET}` yang cocok dengan env var `CRON_SECRET` — tolak (401) jika tidak cocok, agar endpoint tidak bisa dipicu publik.
2. Cek ke `notifikasi_log`: apakah `laporan_harian` untuk tanggal hari ini (WIB) sudah `terkirim` — jika sudah, langsung return (hindari kirim dobel bila cron ke-trigger ulang).
3. Query semua data yang dibutuhkan (Section 8.8.3-A), susun teks pesan via `lib/telegram/laporan-harian.ts`.
4. Panggil `sendTelegramMessage()`, catat hasil ke `notifikasi_log`.

**Tombol "Kirim Tes Notifikasi"** di `/settings` memanggil server action yang langsung menjalankan logic yang sama seperti endpoint cron (reuse fungsi yang sama), untuk memastikan konfigurasi token/chat id sudah benar sebelum mengandalkan jadwal otomatis.

---

## 9. EXPORT (XLSX & PDF)

Semua halaman dengan tabel data (Data Siswa, Jadwal, Cashflow, Hutang, Rekap Kendaraan) wajib punya `<ExportButton />` dengan 2 opsi: **Export Excel (.xlsx)** dan **Export PDF**.

**Aturan layout export (wajib rapi):**
- Header dokumen: logo Amanah Drive (dari `/assets/`) + judul laporan + rentang filter yang aktif + tanggal cetak.
- Xlsx: freeze header row, lebar kolom auto-fit, format currency untuk kolom nominal (`Rp #.##0`), border tipis tiap sel, alternating row color ringan sesuai brand.
- PDF: orientasi landscape untuk tabel lebar (Jadwal, Cashflow), portrait untuk data ringkas (Siswa list sederhana). Footer halaman berisi nomor halaman & "Dicetak oleh Sistem Amanah Drive".
- Nama file: `amanahdrive_{nama-section}_{YYYYMMDD}.xlsx/pdf`.

---

## 10. RESPONSIVE & UX

- **Breakpoint:** mobile `<768px`, tablet `768–1279px`, desktop `≥1280px`.
- **Mobile navigation:** bottom nav bar (5 ikon utama: Dashboard, Siswa, Jadwal, Kendaraan, Lainnya) + sidebar drawer untuk sisanya (Kas, Master Data, Settings) dari ikon "Lainnya".
- **Desktop navigation:** sidebar kiri fixed, collapsible, menampilkan semua menu.
- **Data table mobile:** wajib card view (bukan horizontal scroll), field prioritas tinggi ditampilkan di card, field sekunder di-expand saat card ditap.
- **Loading state:** skeleton loading, bukan spinner polos, untuk semua tabel & kartu data.
- **Empty state:** ilustrasi/teks jelas + CTA (mis. "Belum ada siswa. + Tambah Siswa").

---

## 11. NON-FUNCTIONAL REQUIREMENTS

- **Performance:** gunakan Server Components untuk data fetching awal (hindari waterfall client fetch), pagination server-side untuk tabel dengan potensi >200 baris (Siswa, Jadwal, Cashflow). Gunakan `next/image` untuk semua foto (nota, siswa, kendaraan) dengan lazy load.
- **Caching:** gunakan Next.js `revalidatePath`/`revalidateTag` setelah server action mutasi data, jangan full page reload.
- **Keamanan:** Supabase RLS aktif di semua tabel. Bucket foto nota **private** (akses via signed URL, bukan public bucket), karena berisi data finansial.
- **Audit trail minimum:** kolom `updated_at` auto-update via trigger di semua tabel penting (khususnya `kas_transaksi`, `siswa`, `jadwal_sesi`).
- **Offline resilience minor:** form input (terutama input transaksi kas & update sesi) sebaiknya disable-submit-double-click & tampilkan toast error jelas jika gagal submit, agar tidak ada input ganda dari koneksi lambat lapangan.

---

## 12. ROADMAP IMPLEMENTASI (URUTAN WAJIB UNTUK AI AGENT)

**Fase 1 — Fondasi**
1. Setup Next.js 15 project, Tailwind, shadcn/ui, koneksi Supabase, `next-themes`.
2. Buat semua tabel di Section 6 via Supabase migration SQL (termasuk seed data paket, slot waktu, staff, jabatan, staff_jabatan, status pembayaran, kas_kategori, harga_bbm, settings pin_kas). **Lewati** tabel `users_profile` — belum dipakai.
3. RLS diset public read/write via anon key (tanpa login, lihat Section 4). **Jangan** bangun halaman login atau middleware proteksi route di fase ini.
4. Bangun layout dasar: sidebar, topbar, theme toggle, komponen reusable Section 5.3.

**Fase 2 — Master Data (dibangun duluan karena semua modul lain bergantung ke sini)**
5. CRUD Paket, Slot Waktu, Jabatan, Staff (dengan multi-select jabatan), Status Pembayaran, Kendaraan (master), Promosi.

**Fase 3 — Data Siswa**
6. Tabel siswa + form tambah/edit lengkap dengan semua logic (auto kode, auto harga, dp handling).

**Fase 4 — Jadwal Siswa**
7. Overview jadwal + detail sesi + update progress.
8. Generator Markdown WhatsApp + tombol copy.

**Fase 5 — Kendaraan Operasional**
9. List & detail kendaraan, semua sub-section (odometer, oli, ban, cuci, BBM, log harian, rekap).

**Fase 6 — Kas (paling kompleks & sensitif, dibangun setelah modul lain siap karena banyak integrasi otomatis)**
10. PIN gate mechanism.
11. Overview kas + input transaksi manual + upload nota.
12. Integrasi otomatis: DP/pelunasan siswa → kas_transaksi; BBM kendaraan → kas_transaksi.
13. Cashflow detail read-only + filter.
14. Manajemen hutang + cicilan.

**Fase 7 — Dashboard**
15. Bangun dashboard terakhir (setelah semua data source tersedia) agar semua kartu & grafik punya data nyata untuk query agregat.

**Fase 8 — Notifikasi Telegram & Laporan Harian Otomatis**
16. Setup env var `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CRON_SECRET` (di Vercel & `.env.local`), buat `.env.local.example`.
17. Buat tabel `notifikasi_log`, helper `lib/telegram/client.ts` (`sendTelegramMessage`).
18. Buat `lib/telegram/laporan-harian.ts` (builder teks laporan) + endpoint `app/api/cron/laporan-harian/route.ts` + `vercel.json` cron config (`0 23 * * *` UTC = 06:00 WIB).
19. Tambahkan pengaturan notifikasi & tombol "Kirim Tes Notifikasi" di `/settings`.
20. (Opsional, bisa menyusul) Implementasi reminder kondisional: sesi besok, servis kendaraan, hutang jatuh tempo.

**Fase 9 — Export & Settings**
21. Export xlsx/pdf di semua halaman tabel.
22. Lengkapi sisa halaman Settings (di luar notifikasi yang sudah dibangun di Fase 8).

**Fase 10 — Polish**
23. Responsive audit di semua halaman (mobile card view, spacing, dark mode contrast).
24. Performance audit (Lighthouse, query N+1 check).

**Fase 11 — Login System (MASA DEPAN, di luar scope v1)**
25. Aktifkan Supabase Auth (email/password), bangun halaman `/login`, aktifkan `middleware.ts` untuk proteksi seluruh route `(dashboard)`.
26. Buat tabel `users_profile`, hubungkan tiap akun login ke `staff_id` yang sudah ada.
27. Perketat RLS dari public menjadi `auth.uid() is not null` (atau lebih granular per role bila diperlukan).
28. Ganti field "Dikerjakan oleh" yang tadinya dropdown manual (Section 4) menjadi auto-terisi dari user yang sedang login.

---

## 13. HAL YANG SENGAJA TIDAK DIMASUKKAN (OUT OF SCOPE v1)

- **Tidak ada sistem login/autentikasi** — seluruh aplikasi terbuka tanpa proteksi user, kecuali PIN Kas yang berdiri sendiri. Login direncanakan menyusul (Section 12, Fase 11) — struktur data `staff` sudah disiapkan agar transisinya mulus.
- Tidak ada aplikasi customer-facing (booking mandiri oleh siswa).
- Tidak ada sistem notifikasi WhatsApp otomatis (blast) — tombol copy markdown cukup untuk v1, integrasi WA API bisa jadi fase berikutnya.
- Tidak ada payment gateway online — pencatatan pembayaran tetap manual oleh admin/finance.
- Tidak ada role granular kompleks di v1 (role staff baru relevan setelah Fase 11/login diaktifkan; PIN gate tetap dipakai untuk Kas terlepas dari itu).
