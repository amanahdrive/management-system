# Panduan Setup Awal: Supabase & Vercel Environment

Dokumen panduan langkah demi langkah untuk mengonfigurasi **Supabase** (Database, Storage, Migrasi) dan **Vercel** (Hosting, Environment Variables, Vercel Cron Jobs) untuk **Sistem Manajemen Amanah Drive**.

---

## 1. Panduan Setup Supabase

### Langkah 1: Membuat Project Baru di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan login ke akun Anda.
2. Klik tombol **New Project**.
3. Pilih nama project (misal: `amanah-drive-db`).
4. Buat **Database Password** yang kuat dan simpan password tersebut.
5. Pada pilihan **Region**, rekomendasikan pilih **Singapore (ap-southeast-1)** untuk latensi tercepat ke Indonesia (Palembang).
6. Klik **Create new project** dan tunggu proses inisialisasi (~1–2 menit).

---

### Langkah 2: Eksekusi Migrasi SQL & Seed Data
1. Setelah project siap, buka menu **SQL Editor** pada sidebar kiri Supabase.
2. Klik **New Query**.
3. Salin seluruh kode SQL dari file migrasi project:
   `supabase/migrations/20260807000000_init_schema.sql` (atau dari repositori GitHub [amanahdrive/management-system](https://github.com/amanahdrive/management-system/blob/main/supabase/migrations/20260807000000_init_schema.sql)).
4. Tempelkan (paste) kode SQL tersebut ke dalam SQL Editor Supabase.
5. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
6. **Verifikasi**:
   - Buka menu **Table Editor** pada sidebar kiri.
   - Pastikan terdapat **19 tabel** (antara lain: `paket`, `promosi`, `siswa`, `staff`, `jabatan`, `slot_waktu`, `jadwal_sesi`, `kendaraan`, `kas_transaksi`, `hutang`, `settings`, `notifikasi_log`).
   - Buka tabel `paket` dan `slot_waktu` untuk memastikan data *seed* awal sudah otomatis terisi.

---

### Langkah 3: Membuat Storage Buckets (Untuk Upload Foto)
1. Buka menu **Storage** &rarr; **Buckets** pada sidebar kiri Supabase.
2. Buat 3 Buckets baru dengan mengklik **New Bucket**:

| Nama Bucket | Public / Private | Kegunaan |
|---|---|---|
| `staff` | **Public** | Menyimpan foto profil & tanda tangan staff/instruktur |
| `kendaraan` | **Public** | Menyimpan foto armada mobil operasional |
| `nota` | **Private** | Menyimpan foto bukti nota transaksi kas & keuangan |

---

### Langkah 4: Mengambil Credentials Supabase (API Keys)
1. Buka **Project Settings** (ikon roda gigi di bagian bawah sidebar) &rarr; **API**.
2. Catat / Salin 3 nilai kredensial berikut:
   - **Project URL**: (Contoh: `https://xxxx.supabase.co`)
   - **anon / public key**: (API key publik untuk Next.js client)
   - **service_role key**: (API key admin rahasia)

---

## 2. Panduan Setup Vercel

### Langkah 1: Import Project dari GitHub
1. Buka [https://vercel.com/new](https://vercel.com/new) dan login dengan akun Vercel Anda.
2. Di bagian *Import Git Repository*, pilih repositori **`amanahdrive/management-system`**.
3. Klik tombol **Import**.

---

### Langkah 2: Konfigurasi Environment Variables di Vercel
Sebelum mengklik Deploy, buka accordion **Environment Variables** dan tambahkan variabel-variabel berikut:

| Nama Variabel (Key) | Nilai / Contoh (Value) | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Salin dari Supabase (Project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiI...` | Salin dari Supabase (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiI...` | Salin dari Supabase (service_role key) |
| `TELEGRAM_BOT_TOKEN` | `7953727563:AAEDOvsMdcQbSdmLP1bZBSE5oX7ipJuahbo` | Token Bot Telegram |
| `TELEGRAM_CHAT_ID` | `8333108212` | Chat ID penerima laporan Telegram |
| `CRON_SECRET` | `amanah_drive_cron_secret_2026` | Token acak pengaman Vercel Cron API |

---

### Langkah 3: Deploy & Verifikasi Vercel Cron
1. Klik tombol **Deploy**.
2. Vercel akan secara otomatis membangun (build) aplikasi Next.js 15.
3. Setelah deployment selesai, Vercel secara otomatis membaca file `vercel.json` dan mendaftarkan jadwal **Vercel Cron Job**:
   - **Path**: `/api/cron/laporan-harian`
   - **Schedule**: `0 23 * * *` (Setiap jam 23:00 UTC = **06:00 WIB Pagi**)
4. Buka tab **Cron Jobs** di Dashboard Vercel project Anda untuk melihat status eksekusi otomatisnya.

---

## 3. Panduan Pengujian Setelah Deployment

1. **Akses Web Admin Panel**:
   - Buka URL yang diberikan oleh Vercel (contoh: `https://management-system-amanahdrive.vercel.app`).
2. **Uji PIN Gate Kas**:
   - Buka menu **Kas & Keuangan** dari sidebar.
   - Masukkan PIN default: **`210100`**.
   - Pastikan data statistik kas dan form transaksi terbuka.
3. **Uji Tes Notifikasi Telegram**:
   - Buka menu **Pengaturan (Settings)**.
   - Klik tombol **"Kirim Tes Notifikasi Telegram"**.
   - Periksa aplikasi Telegram Anda, pastikan pesan *"TES NOTIFIKASI AMANAH DRIVE"* telah masuk.
4. **Uji Penjadwalan & Generator WA**:
   - Buka menu **Jadwal Sesi**.
   - Klik tombol **"Copy Jadwal (WA)"**.
   - Paste di WhatsApp, pastikan format teks sudah sesuai dengan format standar instansi.

---

### File Referensi Lokal
File template env juga dapat dilihat secara lokal di project Anda:
- [`.env.local.example`](file:///c:/Users/Zyrex/Music/adam-project/.env.local.example)
- [`supabase/migrations/20260807000000_init_schema.sql`](file:///c:/Users/Zyrex/Music/adam-project/supabase/migrations/20260807000000_init_schema.sql)
- [`vercel.json`](file:///c:/Users/Zyrex/Music/adam-project/vercel.json)
