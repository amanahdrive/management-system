# AMANAH DRIVE — BRANDING & DESIGN SYSTEM SPECIFICATION
*Version 2.2 — Clean Minimalist Data Console Architecture*

Dokumen ini merupakan panduan resmi (*Single Source of Truth*) untuk identitas visual, tipografi, warna, dan sistem komponen antarmuka aplikasi **Amanah Drive Management System**. Setiap redesign dan penambahan fitur di masa mendatang **WAJIB** berpedoman pada spesifikasi ini.

---

## 1. Brand Identity & Philosophy

Amanah Drive memadukan **profesionalitas modern**, **presisi data operasional (*data console*)**, dan **desain minimalis bersih (*sleek, crisp, uncluttered*)**.
Prinsip utama:
- **Minimalist Rounded Containers**: Sudut lengkung minimalis dan proporsional (**12px** untuk kartu/kontainer, **8px** untuk kontrol input/tombol, **6px** untuk badge). Tidak menggunakan lengkungan berlebihan / over-rounded (*anti-bubbly*).
- **Spacious & Comfortable Whitespace**: Setiap kartu dan kontainer data wajib memiliki bantalan (*internal padding*) minimal **16px - 24px** agar elemen form dan data tidak pernah menempel pada tepi border.
- **Single Cohesive Search & Filter**: Satu modul pencarian terpadu per halaman (tidak ada duplikasi bar pencarian).
- **Hairline Precision**: Border rambut halus 1px yang tegas dan kontras seimbang.
- **Tipografi Tunggal**: Keluarga font **Inter** dengan angka *tabular-nums*.

---

## 2. Typography Rules

Keluarga font tunggal: **Inter**.

| Peran | Font Family | Bobot / Weights | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Headings & Titles** | **Inter** | 700 (Bold), 800 (ExtraBold) with `tracking-tight` | Judul halaman (`PageHeader`), logo brand, angka metrik utama, dan judul seksi data. |
| **UI Body, Controls & Table Cells** | **Inter** | 400 (Regular), 500 (Medium), 600 (SemiBold) | Teks isi, label form, tombol, sel tabel, badges, dan angka operasional tabular (`font-feature-settings: 'tnum'`). |

---

## 3. Color Palette & Token System

### 3.1. Warna Utama (*Brand Chroma*)
- **Primary Brand Teal**: `#0F7A73` (Light Mode) / `#14B8A6` (Dark Mode)
- **Deep Brand Teal (Hero Surface)**: `#092E2B` / `#0D3A36`
- **Brand Teal Light (Accent Background)**: `#E6F4F2` (Light) / `#0A2421` (Dark)
- **Brand Teal Glow & Border Highlight**: `rgba(15, 122, 115, 0.25)`

### 3.2. Warna Data-Viz & Kategori Operasional
- **Emerald (Selesai / Lunas / Sukses)**: `#10B981` (Dark) / `#14713A` (Light)
- **Amber / Gold (Progress / Pending / Booking)**: `#F59E0B` (Dark) / `#B9821B` (Light)
- **Rose / Crimson (Hutang / Batal / Insiden / Danger)**: `#F43F5E` (Dark) / `#B3112D` (Light)
- **Sky / Blue (Jadwal / Siswa Baru / Info)**: `#38BDF8` (Dark) / `#1A4FB0` (Light)

### 3.3. Tema Light & Dark (*Fully Adaptive, Default: Light*)
- **Light Mode (Default)**:
  - Ground: `#F3F4F6`
  - Container Surface: `#FFFFFF`
  - Hero Surface: `#F0FDFA`
  - Border: `#E2E8F0` / `#CBD5E1`
  - Headings: `#0F172A` | Body: `#475569` | Eyebrow/Muted: `#64748B`
- **Dark Mode**:
  - Ground: `#0E0F14`
  - Container Surface: `#16181F`
  - Hero Surface: `#1B1E27`
  - Border: `#262A35` / `#3A4050`
  - Headings: `#F2F3F7` | Body: `#A6ABB8` | Eyebrow/Muted: `#6B7180`

---

## 4. Container & Layout Standards

```css
/* Standar Kontainer Minimalis */
.card-container,
.bento-tile {
  background-color: var(--bento-bg);
  border: 1px solid var(--bento-border);
  border-radius: 12px; /* Minimalis, ramping, profesional */
  padding: 20px;       /* Ruang napas internal nyaman */
  box-shadow: var(--bento-shadow), var(--bento-inset-highlight);
}

@media (min-width: 768px) {
  .card-container,
  .bento-tile {
    padding: 24px;
  }
}
```

---

## 5. Larangan Desain (*Anti-Patterns*)

1. ❌ **Dilarang menggunakan radius berlebihan / over-rounded** (maksimal 12px untuk kontainer).
2. ❌ **Dilarang membuat kontainer tanpa padding internal** (wajib minimal `p-4` / 16px di mobile dan `p-6` / 24px di desktop).
3. ❌ **Dilarang menduplikasi input search bar** di dalam dan di luar tabel data.
4. ❌ **Dilarang menggunakan font selain Inter**.

---

*Dokumen ini sah dan mengikat untuk seluruh modul sistem manajemen Amanah Drive.*
