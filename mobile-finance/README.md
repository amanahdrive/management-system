# 📱 Amanah Finance — Android React Native Application

Aplikasi mobile Android khusus divisi Keuangan (**Amanah Finance**) yang dirancang untuk performa tinggi, keamanan berstandar perbankan, **Over-The-Air (OTA) Updates** instan tanpa install ulang APK, serta **Push Notification background Android berprioritas tinggi (MAX)** yang tetap aktif saat aplikasi ditutup atau perangkat dalam kondisi *Doze Mode*.

---

## 🌟 Fitur Utama

1. **Over-The-Air (OTA) Updates (`expo-updates`)**:
   - Pembaruan kode dan UI dapat dirilis langsung dari cloud ke seluruh perangkat pengguna secara instan tanpa perlu membagikan ulang file `.apk` atau meminta pengguna install ulang.
   - Pengecekan otomatis di latar belakang saat aplikasi dibuka (`ON_LOAD`) serta tombol pengecekan manual di menu Pengaturan.

2. **Full Android Background Push Notifications**:
   - Terintegrasi dengan **Firebase Cloud Messaging (FCM)** dan **Expo Push Service**.
   - Channel Notifikasi Khusus Android dengan prioritas tertinggi:
     - 💰 `finance-money-in` (**Importance.MAX**): Notifikasi instan pembayaran siswa atau kas masuk (lampu hijau, getar ritmik, bypass DND).
     - 🚨 `finance-urgent` (**Importance.MAX**): Alert pengeluaran kas atau batas darurat keuangan (lampu merah, getar intensif).
     - 📊 `finance-daily` (**Importance.HIGH**): Pengingat rekapitulasi harian dan jatuh tempo hutang/piutang.
   - Dilengkapi **Headless Background Task** (`expo-task-manager`) untuk memproses push payload bahkan ketika proses aplikasi telah di-*kill* oleh sistem operasi Android.

3. **Keamanan Berlapis**:
   - Kunci layar **6 Digit Numeric PIN** dengan proteksi anti brute-force.
   - Dukungan autentikasi sensor **Biometrik / Sidik Jari (Fingerprint)** menggunakan hardware Android bawaan.

4. **Modul Keuangan Lengkap**:
   - **Dashboard Eksekutif**: Total Saldo Aktif, Kas Tunai Fisik, Saldo Bank, Pemasukan & Pengeluaran Bulan Berjalan, serta riwayat transaksi terkini.
   - **Pencatatan Transaksi**: Formulir cepat pemasukan/pengeluaran, kategori lengkap, pemilihan rekening bank, dan lampiran foto nota/kuitansi langsung dari kamera.
   - **Piutang Kursus Siswa**: Pemantauan tagihan belum lunas siswa dilengkapi tombol **Kirim Pengingat WhatsApp otomatis** dengan template pesan resmi.
   - **Hutang & Kewajiban**: Monitoring pinjaman usaha, tanggal jatuh tempo, dan pencatatan cicilan hutang terintegrasi.
   - **Offline-First Resilience**: Penyimpanan cache lokal AsyncStorage sehingga data tetap dapat dilihat saat koneksi internet lambat.

---

## 📂 Struktur Direktori Proyek

```
mobile-finance/
├── App.tsx                        # Root entrypoint aplikasi
├── app.json                       # Konfigurasi Expo & Android permissions
├── eas.json                       # Konfigurasi EAS Build & Update channels
├── package.json                   # Dependensi React Native & Expo SDK 52
├── tsconfig.json                  # Konfigurasi TypeScript
├── assets/                        # Ikon adaptive, splash, dan notifikasi
└── src/
    ├── api/
    │   └── client.ts              # API client ke backend Next.js dengan auto-retry
    ├── components/
    │   ├── MetricCard.tsx         # Komponen kartu statistik keuangan
    │   └── TransactionItem.tsx    # Komponen baris transaksi
    ├── navigation/
    │   ├── BottomTabNavigator.tsx # Navigasi 5 tab utama (Dashboard, Transaksi, Piutang, Hutang, Pengaturan)
    │   └── RootNavigator.tsx      # Guard PIN lock & navigasi modal
    ├── screens/
    │   ├── DashboardScreen.tsx    # Halaman utama overview keuangan
    │   ├── HutangScreen.tsx       # Manajemen hutang & cicilan
    │   ├── PinLockScreen.tsx      # Layar PIN 6 digit & Biometrik
    │   ├── PiutangScreen.tsx      # Piutang siswa & integrasi WhatsApp
    │   ├── SettingsScreen.tsx     # Pengaturan OTA, diagnosa push notifikasi, & server
    │   ├── TambahTransaksiScreen.tsx # Catat transaksi + foto nota
    │   └── TransaksiScreen.tsx    # Filter & pencarian riwayat transaksi
    ├── services/
    │   ├── notifications.ts       # Service background push & Android channels
    │   ├── storage.ts             # AsyncStorage persistent cache
    │   └── updates.ts             # EAS Over-The-Air (OTA) engine
    ├── store/
    │   └── authContext.tsx        # Context state autentikasi PIN & biometrik
    └── types/
        └── finance.ts             # Definisi tipe data TypeScript
```

---

## 🚀 Cara Menjalankan untuk Development

1. Buka terminal dan masuk ke direktori `mobile-finance`:
   ```bash
   cd mobile-finance
   ```

2. Pasang seluruh dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembangan Expo:
   ```bash
   npx expo start
   ```

4. Scan QR code yang tampil menggunakan aplikasi **Expo Go** pada smartphone Android, atau hubungkan emulator Android via USB debugging.

---

## 🔄 Cara Melakukan Update OTA (Over-The-Air) Tanpa Install Ulang

Setiap kali Anda mengubah kode JavaScript/TypeScript pada `mobile-finance/src`, Anda **TIDAK PERLU** membuat file APK baru! Cukup kirim pembaruan melalui EAS Update:

```bash
# Untuk merilis pembaruan ke kanal produksi
eas update --branch production --message "Update fitur catatan piutang dan perbaikan UI"

# Atau untuk kanal preview pengujian
eas update --branch preview --message "Uji coba push notification"
```

Semua smartphone Android yang telah terpasang aplikasi akan otomatis mengunduh bundle terbaru saat aplikasi dibuka, dan langsung menjalankan versi paling mutakhir!

---

## 🔔 Cara Kerja Push Notification Background Android

1. **Registrasi Perangkat**:
   Saat aplikasi dibuka pertama kali, `registerForPushNotificationsAsync()` membuat Android Notification Channels dengan `Importance.MAX` dan mendaftarkan token unik perangkat ke endpoint backend `/api/notifications/register-device`.

2. **Trigger Notifikasi dari Server**:
   Setiap kali ada transaksi pemasukan kas baru atau admin memicu notifikasi, backend Next.js memanggil `/api/notifications/send-push` dengan payload berprioritas `high`.

3. **Background Delivery**:
   Karena channel terdaftar dengan `MAX` importance dan terhubung ke `expo-task-manager`, Android akan memunculkan banner notifikasi dan memutar suara getar meskipun aplikasi sedang berada di latar belakang atau tertutup penuh (*killed state*).

4. **Uji Coba**:
   Buka menu **Pengaturan** di aplikasi mobile, lalu tekan tombol **"Tes Push Notif"** untuk memverifikasi penerimaan notifikasi secara instan.

---

## 📦 Panduan Build File APK / AAB (Jika Ingin Dibuat)

> **Catatan Penting**: Sesuai instruksi Anda, build biner belum dijalankan dan menunggu konfirmasi/persetujuan eksplisit dari Anda.

Jika Anda sudah siap untuk meng-generate file installer `.apk` mandiri (dapat langsung di-install di HP tanpa perlu upload ke Play Store):

1. Pastikan Anda telah login ke akun Expo:
   ```bash
   npx eas login
   ```

2. Jalankan build APK:
   ```bash
   eas build --platform android --profile preview
   ```
   *(Pilih profile `preview` untuk menghasilkan file `.apk` langsung, atau `production` untuk `.aab` jika ingin dirilis ke Google Play Store)*.

3. Setelah build selesai di cloud Expo (biasanya 5–10 menit), tautan unduhan file `.apk` akan diberikan. Unduh dan install di HP Android Anda.
4. Setelah APK di-install sekali, semua pembaruan selanjutnya dapat dikirim lewat `eas update` tanpa perlu install ulang selamanya!
