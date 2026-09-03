'use client';

import React from 'react';

export interface CertificateSvgCanvasProps {
  nomorSertifikat: string;
  namaSiswa: string;
  kodeSiswa?: string;
  paketNama?: string;
  tanggalRangeSesi: string; // e.g. "24 - 31 Agustus 2026"
  tanggalCetak: string; // e.g. "31 Agustus 2026"
  namaInstruktur: string; // e.g. "Syawal Putra"
  namaPimpinan?: string; // default "Nur Awalia Rianti"
  predikat?: string; // default "DENGAN PREDIKAT BAIK"
  lokasi?: string; // default "Palembang"
}

export const CertificateSvgCanvas = React.forwardRef<HTMLDivElement, CertificateSvgCanvasProps>(
  (
    {
      nomorSertifikat,
      namaSiswa,
      kodeSiswa,
      tanggalRangeSesi,
      tanggalCetak,
      namaInstruktur,
      namaPimpinan = 'Nur Awalia Rianti',
      predikat = 'DENGAN PREDIKAT BAIK',
      lokasi = 'Palembang',
    },
    ref
  ) => {
    // Auto-scale font size if student name is very long
    const nameLength = (namaSiswa || '').length;
    let nameFontSize = 34; // default in px
    if (nameLength > 35) {
      nameFontSize = 22;
    } else if (nameLength > 25) {
      nameFontSize = 26;
    } else if (nameLength > 20) {
      nameFontSize = 30;
    }

    return (
      <div
        ref={ref}
        id="amanah-certificate-svg-canvas"
        style={{
          width: '842.25px',
          height: '595.5px',
          minWidth: '842.25px',
          minHeight: '595.5px',
          maxWidth: '842.25px',
          maxHeight: '595.5px',
        }}
        className="relative bg-[#fafdfd] text-[#1e293b] font-sans select-none overflow-hidden box-border shadow-2xl"
      >
        {/* ================= 1. CANVA SVG TEMPLATE BACKGROUND ================= */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/templates/sertifikat-siswa.svg"
          alt="Canva Certificate Template Background"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
        />

        {/* ================= 2. DYNAMIC OVERLAYS WITH WHITEOUT COVERS ================= */}

        {/* --- A. NOMOR SERTIFIKAT --- */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '144px',
            transform: 'translateX(-50%)',
            width: '320px',
            height: '24px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm"
        >
          <span className="text-[11.5px] font-sans font-medium text-[#475569] tracking-wide">
            Nomor: <span className="font-semibold text-[#1e293b] font-mono">{nomorSertifikat}</span>
          </span>
        </div>

        {/* --- B. NAMA LENGKAP SISWA --- */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '215px',
            transform: 'translateX(-50%)',
            width: '680px',
            height: '58px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm px-4"
        >
          <h1
            style={{
              fontSize: `${nameFontSize}px`,
              lineHeight: 1.1,
              letterSpacing: '0.04em',
            }}
            className="font-extrabold uppercase text-[#083344] text-center font-sans tracking-wide truncate max-w-full"
          >
            {namaSiswa}
          </h1>
        </div>

        {/* --- C. RENTANG TANGGAL SESI --- */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '334px',
            transform: 'translateX(-50%)',
            width: '520px',
            height: '22px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm"
        >
          <span className="text-[11.5px] font-sans text-[#334155] text-center">
            pada tanggal <strong className="font-bold text-[#0f172a]">{tanggalRangeSesi}</strong> dan dinyatakan:
          </span>
        </div>

        {/* --- D. PREDIKAT KELULUSAN --- */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '357px',
            transform: 'translateX(-50%)',
            width: '660px',
            height: '24px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm"
        >
          <span className="text-[11px] font-sans font-extrabold text-[#083344] text-center tracking-wide">
            “LULUS PELATIHAN KETERAMPILAN &amp; TEKNIS MENGEMUDI MOBIL {predikat}”
          </span>
        </div>

        {/* --- E. TANGGAL TERBIT & LOKASI --- */}
        <div
          style={{
            position: 'absolute',
            left: '460px',
            top: '394px',
            width: '260px',
            height: '22px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm"
        >
          <span className="text-[12px] font-sans font-medium text-[#334155]">
            {lokasi}, {tanggalCetak}
          </span>
        </div>

        {/* --- F. NAMA INSTRUKTUR (KIRI) --- */}
        <div
          style={{
            position: 'absolute',
            left: '185px',
            top: '504px',
            width: '210px',
            height: '22px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm"
        >
          <span className="text-[13.5px] font-sans font-bold text-[#0f172a] text-center truncate">
            {namaInstruktur}
          </span>
        </div>

        {/* --- G. NAMA PIMPINAN (KANAN) --- */}
        <div
          style={{
            position: 'absolute',
            left: '475px',
            top: '504px',
            width: '210px',
            height: '22px',
          }}
          className="z-10 flex items-center justify-center bg-[#fafdfd] rounded-sm"
        >
          <span className="text-[13.5px] font-sans font-bold text-[#0f172a] text-center truncate">
            {namaPimpinan}
          </span>
        </div>
      </div>
    );
  }
);

CertificateSvgCanvas.displayName = 'CertificateSvgCanvas';
