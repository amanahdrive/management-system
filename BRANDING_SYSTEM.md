# AMANAH DRIVE — BRANDING & DESIGN SYSTEM SPECIFICATION
*Version 2.0 — Bento Data Console Architecture*

Dokumen ini merupakan panduan resmi (*Single Source of Truth*) untuk identitas visual, tipografi, warna, dan sistem komponen antarmuka aplikasi **Amanah Drive Management System**. Setiap redesign dan penambahan fitur di masa mendatang **WAJIB** berpedoman pada spesifikasi ini.

---

## 1. Brand Identity & Philosophy

Amanah Drive memadukan **profesionalitas modern**, **presisi data operasional (*data console*)**, dan **keanggunan terpercaya (*trust & elegance*)**.
Gaya desain yang diusung adalah **Bento Data Console**:
- Ubin-ubin bento (*matte tiles*) presisi dengan sudut lengkung halus (**22px**).
- Garis tepi rambut (*1px hairline border*).
- Efek *subtle inset top highlight* yang memberikan kesan ekstrusi fisik mewah.
- Efek *springy hover-lift* dengan kurva fisika `cubic-bezier(.34, 1.4, .64, 1)`.
- Tipografi angka tabular yang rapi dan disiplin.

---

## 2. Typography Rules

Sistem tipografi menggunakan kombinasi 2 font utama:

| Peran | Font Family | Bobot / Weights | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Brand Headings & Hero Titles** | **Playfair Display** | 600 (SemiBold), 700 (Bold), 800 (ExtraBold) | Judul halaman (`PageHeader`), logo brand, angka metrik utama, sertifikat, dan judul seksi penting. Memberikan kesan berwibawa, mewah, dan terpercaya. |
| **UI Body, Controls & Data Console** | **Inter** | 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold) | Teks isi, label form, tombol navigasi, tabel data, filter, badges, dan angka operasional tabular (`font-feature-settings: 'tnum'`). |

```css
/* Variabel Font */
--font-brand: 'Playfair Display', Georgia, serif;
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

---

## 3. Color Palette & Token System

### 3.1. Warna Utama (*Brand Chroma*)
- **Primary Brand Teal**: `#0F7A73` (Light Mode) / `#14B8A6` (Dark Mode)
- **Deep Brand Teal (Dark Hero Tile)**: `#092E2B` / `#0D3A36`
- **Brand Teal Light (Accent Background)**: `#E6F4F2` (Light) / `#0A2421` (Dark)
- **Brand Teal Glow & Border Highlight**: `rgba(15, 122, 115, 0.25)`

### 3.2. Warna Data-Viz & Kategori Operasional (*Category-Native Only*)
Warna-warna ini **HANYA** digunakan untuk grafik data, status operasional, dan segmen metrik (tidak pernah sebagai background acak):
- **Emerald (Selesai / Lunas / Sukses)**: `#10B981` (Dark) / `#14713A` (Light)
- **Amber / Gold (Progress / Pending / Booking)**: `#F59E0B` (Dark) / `#B9821B` (Light)
- **Rose / Crimson (Hutang / Batal / Insiden / Danger)**: `#F43F5E` (Dark) / `#B3112D` (Light)
- **Sky / Blue (Jadwal / Siswa Baru / Info)**: `#38BDF8` (Dark) / `#1A4FB0` (Light)
- **Violet / Purple (Paket Khusus / Multi-Slot)**: `#8B5CF6` (Dark) / `#6D28D9` (Light)

### 3.3. Tema Light & Dark (*Fully Adaptive*)
Aplikasi mendukung tema ganda dengan **Default: Light Theme**.

#### 🌞 Light Mode (Default)
- **Ground Background**: `#F3F4F6` (Cool graphite-white)
- **Bento Tile Surface**: `#FFFFFF` (Solid matte white)
- **Hero Bento Surface**: `#F0FDFA` (Subtle teal tint)
- **Hairline Border**: `#E2E8F0` / `#CBD5E1`
- **Inset Top Highlight**: `inset 0 1px 0 rgba(255, 255, 255, 0.9)`
- **Heading Text**: `#0F172A` (Deep Slate)
- **Body Text**: `#475569` (Cool Slate)
- **Muted Eyebrow / Axis Text**: `#94A3B8` (Tracked uppercase caps)

#### 🌙 Dark Mode (Cool Graphite Data Console)
- **Ground Background**: `#0E0F14` (Deep cool graphite)
- **Bento Tile Surface**: `#16181F` (Matte dark tile)
- **Hero Bento Surface**: `#1B1E27` (Matte elevated hero tile)
- **Hairline Border**: `#262A35` (1px precision hairline)
- **Inset Top Highlight**: `inset 0 1px 0 rgba(255, 255, 255, 0.06)`
- **Heading Text**: `#F2F3F7` (Bone white)
- **Body Text**: `#A6ABB8` (Cool grey)
- **Muted Eyebrow / Axis Text**: `#6B7180` (Tracked uppercase caps)

---

## 4. Bento Box Component Architecture

Setiap kartu atau kontainer data dalam antarmuka mengadopsi spesifikasi **Bento Tile**:

```css
.bento-tile {
  background-color: var(--bento-bg);
  border: 1px solid var(--bento-border);
  border-radius: 22px;
  box-shadow: var(--bento-shadow), var(--bento-inset-highlight);
  transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1),
              box-shadow 0.3s ease,
              border-color 0.2s ease;
}

.bento-tile:hover {
  transform: translateY(-4px);
  box-shadow: var(--bento-shadow-hover), var(--bento-inset-highlight);
  border-color: var(--bento-border-hover);
}
```

### 4.1. Hirarki Bento Tile:
1. **Hero Bento (`.bento-hero`)**: Digunakan untuk metrik finansial utama / sorotan kas / status operasional terpenting.
2. **Standard Bento (`.bento-tile`)**: Digunakan untuk StatCard, card tabel, formulir pengaturan, timeline insiden, dan grafik performa.
3. **Eyebrow Label (`.eyebrow-label`)**: Label berhuruf kapital dengan tracking lebar (`tracking-wider text-[10px] font-bold uppercase text-[var(--text-muted)]`).
4. **Tabular Numerals (`.tabular-num`)**: Setiap angka metrik, saldo kas, tanggal, dan slot jam waktu menggunakan font angka sejajar (`font-mono` / `tabular-nums`).

---

## 5. Larangan Desain (*Design Anti-Patterns*)

1. ❌ **Dilarang menggunakan emoji dekoratif** di header atau label tombol antarmuka (gunakan Lucide icons monokromatik presisi).
2. ❌ **Dilarang menggunakan background gradien liar / ungu / indigo acak** sebagai dekorasi latar belakang.
3. ❌ **Dilarang mengubah sudut lengkung menjadi tajam** (standar lengkungan bento adalah 22px).
4. ❌ **Dilarang mengganti warna identitas brand Teal `#0F7A73`** dengan warna lain sebagai warna primer.
5. ❌ **Dilarang menggunakan font sembarangan** selain **Playfair Display** dan **Inter**.

---

*Dokumen ini sah dan mengikat untuk seluruh modul sistem manajemen Amanah Drive.*
