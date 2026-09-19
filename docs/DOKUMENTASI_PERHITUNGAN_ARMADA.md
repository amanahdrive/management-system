# Dokumentasi Rumus & Perhitungan Efisiensi Armada (Amanah Drive)

Dokumen ini menjelaskan secara rinci asal-usul data, tabel database, rumus matematika, dan logika bisnis di balik seluruh angka yang tampil pada kartu **Overview Operasional Armada** di modul `Manajemen Armada` (`/kendaraan`).

---

## 1. Lokasi Kode Sumber Implementasi

Perhitungan seluruh metrik armada diimplementasikan pada file:
- **Backend / Server Actions:** [`lib/actions/kendaraan.ts`](file:///c:/Users/Zyrex/Music/adam-project/lib/actions/kendaraan.ts#L983-L1095) &rarr; fungsi `getArmadaOperasionalMonthlyStats(bulan, tarifMaintenancePerKm, targetEfisiensiBbm)`
- **Frontend / UI Component:** [`components/kendaraan/FleetOperationalOverview.tsx`](file:///c:/Users/Zyrex/Music/adam-project/components/kendaraan/FleetOperationalOverview.tsx#L106-L208) &rarr; komponen `ArmadaSpotlightCard` dan `EfficiencyBar`
- **Konfigurasi Target & Tarif:** [`components/kendaraan/FleetSettingsModal.tsx`](file:///c:/Users/Zyrex/Music/adam-project/components/kendaraan/FleetSettingsModal.tsx) &rarr; dialog pengaturan `tarif_maintenance_per_km` dan `target_efisiensi_bbm`

---

## 2. Sumber Data Mentah (Database Tables)

Data ditarik dari 4 entitas database Supabase:

| Data Mentah | Sumber Tabel & Kolom | Keterangan |
| :--- | :--- | :--- |
| **Jarak Tempuh (KM)** | `kendaraan_log_harian.jarak_tempuh` | Akumulasi selisih odometer basecamp keluar & masuk (`odometer_basecamp_in - odometer_basecamp_out`) dalam bulan yang dipilih. |
| **Konsumsi BBM (Liter & Rp)** | `kendaraan_log_harian.bbm_liter` & `bbm_nominal` *(Fallback: `kas_transaksi` kategori `'bbm'`)* | Pengisian bahan bakar riil yang dicatat instruktur/admin per hari. Jika log liter kosong, estimasi konversi dari nominal kas dibagi harga standar bensin. |
| **Sesi Latihan Selesai** | `jadwal_sesi.status_sesi = 'selesai'` & `kendaraan_id` | Jumlah sesi kursus siswa yang berhasil diselesaikan di lapangan dengan unit mobil bersangkutan pada bulan tersebut. |
| **Biaya Servis Aktual** | `kas_transaksi.nominal` *(kategori: `'servis'`, `'perbaikan'`, `'sparepart'`, `'ban'`, `'oli'`)* | Pengeluaran riil dari kas operasional yang tercatat untuk perawatan mobil bersangkutan. |
| **Tarif Cadangan & Target** | `general_settings` (`tarif_maintenance_per_km`, `target_efisiensi_bbm`) | Default: Cadangan = Rp 1.000 / km, Target Efisiensi = 12 km/L (dapat disesuaikan di modal pengaturan). |

---

## 3. Rumus Matematika & Logika Perhitungan

### A. Efisiensi BBM (km/L)
Mengukur berapa kilometer jarak yang dapat ditempuh oleh kendaraan untuk setiap 1 Liter bahan bakar yang dikonsumsi:

$$\text{Efisiensi BBM (km/L)} = \frac{\text{Total Jarak Tempuh (km)}}{\text{Total Konsumsi BBM (Liter)}}$$

**Indikator Warna Bar Efisiensi (`EfficiencyBar`):**
- **Hijau (`#10B981`):** Efisiensi aktual $\ge \text{Target}$ (kendaraan sangat hemat).
- **Kuning (`#F59E0B`):** Efisiensi aktual antara $75\% \text{ s.d. } 99\%$ dari Target (cukup wajar / dalam batas toleransi).
- **Merah (`#F43F5E`):** Efisiensi aktual $< 75\%$ dari Target (boros / indikasi kebocoran BBM, rute macet ekstrem, atau ada pengisian bensin yang belum diimbangi pencatatan odometer).

---

### B. Cadangan Maintenance (*Sinking Fund*)
Metode akuntansi manajerial untuk mengantisipasi biaya perbaikan besar (turun mesin, ganti kopling, servis rem) dengan menyisihkan dana secara proporsional dari setiap kilometer yang ditempuh:

1. **Disisihkan:**
   $$\text{Cadangan Disisihkan} = \text{Total KM} \times \text{Tarif Cadangan per KM}$$
   *(Default tarif: Rp 1.000 / km)*

2. **Terpakai (Servis Aktual):**
   $$\text{Terpakai} = \sum \text{Pengeluaran Servis \& Perbaikan di Buku Kas bulan ini}$$

3. **Saldo Cadangan:**
   $$\text{Saldo Cadangan} = \text{Cadangan Disisihkan} - \text{Terpakai}$$
   - Jika bernilai positif (hijau), dana cadangan surplus.
   - Jika bernilai negatif (merah), pengeluaran servis melampaui alokasi km (defisit).

---

### C. Tiga Metrik Utama Bisnis (*3 Big Answer Badges*)

1. **Biaya / Bulan (Total Beban Komprehensif):**
   Total biaya operasional yang dibebankan kepada armada, menggabungkan konsumsi BBM langsung dengan cadangan depresiasi/maintenance mesin:
   $$\text{Biaya / Bulan} = \text{Total Biaya BBM} + \text{Cadangan Maintenance Disisihkan}$$

2. **Biaya / KM:**
   Berapa biaya riil yang dikeluarkan perusahaan untuk setiap 1 km mobil melaju:
   $$\text{Biaya / KM} = \frac{\text{Biaya / Bulan}}{\text{Total KM}}$$

3. **Biaya / Sesi:**
   Beban biaya operasional kendaraan untuk melayani 1 sesi latihan siswa:
   $$\text{Biaya / Sesi} = \frac{\text{Biaya / Bulan}}{\text{Jumlah Sesi Selesai}}$$

---

## 4. Bedah Kasus Berdasarkan Data Aktual (Screenshot Anda)

Berikut pembuktian matematis persis dari data dua unit mobil pada tampilan Anda:

### 1. Unit Ayla (BG 1156 IN)
- **Data Masukan:**
  - Jarak Tempuh = **1.652 km**
  - BBM = **150,0 Liter** (Total Biaya BBM = Rp 1.700.000)
  - Sesi Selesai = **43 Sesi**
  - Servis Terpakai = **Rp 0 (-)**
  - Tarif Cadangan = **Rp 1.000 / km**
  - Target Efisiensi = **12 km/L**

- **Hasil Perhitungan:**
  1. **Efisiensi BBM:**
     $$\frac{1.652\text{ km}}{150,0\text{ L}} = 11,013\dots \approx \mathbf{11,0\text{ km/L}}$$
     *(Warna kuning karena mencapai 91,7% dari target 12 km/L — wajar untuk rute latihan mengemudi stop-and-go).*
  2. **Cadangan Maintenance Disisihkan:**
     $$1.652\text{ km} \times \text{Rp } 1.000 = \mathbf{Rp\ 1.652.000}$$
  3. **Biaya / Bulan:**
     $$\text{Rp } 1.700.000\text{ (BBM)} + \text{Rp } 1.652.000\text{ (Cadangan)} = \mathbf{Rp\ 3.352.000}$$
  4. **Biaya / KM:**
     $$\frac{\text{Rp } 3.352.000}{1.652\text{ km}} = \mathbf{Rp\ 2.029\text{ / km}}$$
  5. **Biaya / Sesi:**
     $$\frac{\text{Rp } 3.352.000}{43\text{ sesi}} = \mathbf{Rp\ 77.953\text{ / sesi}}$$

---

### 2. Unit Xenia (BG 1524 RD)
- **Data Masukan:**
  - Jarak Tempuh = **360 km**
  - BBM = **100,0 Liter** (Total Biaya BBM = Rp 1.000.000)
  - Sesi Selesai = **4 Sesi**
  - Servis Terpakai = **Rp 0 (-)**
  - Tarif Cadangan = **Rp 1.000 / km**

- **Hasil Perhitungan:**
  1. **Efisiensi BBM:**
     $$\frac{360\text{ km}}{100,0\text{ L}} = \mathbf{3,6\text{ km/L}}$$
     *(Warna merah karena hanya 30% dari target 12 km/L).*
  2. **Cadangan Maintenance Disisihkan:**
     $$360\text{ km} \times \text{Rp } 1.000 = \mathbf{Rp\ 360.000}$$
  3. **Biaya / Bulan:**
     $$\text{Rp } 1.000.000\text{ (BBM)} + \text{Rp } 360.000\text{ (Cadangan)} = \mathbf{Rp\ 1.360.000}$$
  4. **Biaya / KM:**
     $$\frac{\text{Rp } 1.360.000}{360\text{ km}} = \mathbf{Rp\ 3.778\text{ / km}}$$
  5. **Biaya / Sesi:**
     $$\frac{\text{Rp } 1.360.000}{4\text{ sesi}} = \mathbf{Rp\ 340.000\text{ / sesi}}$$

> [!NOTE]
> **Mengapa Efisiensi Xenia tercatat rendah (3,6 km/L)?**
> Angka ini muncul murni secara matematis karena sistem mendeteksi input BBM sebesar **100 Liter**, namun log odometer yang tercatat baru **360 km** (hanya 4 sesi). Hal ini umumnya terjadi apabila bensin diisi penuh di awal untuk persiapan minggu depan, atau log odometer harian belum seluruhnya diinput oleh instruktur. Begitu log odometer diperbarui sesuai rute sesungguhnya, angka efisiensi akan naik secara otomatis.
