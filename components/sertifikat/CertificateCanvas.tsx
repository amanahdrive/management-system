'use client';

import React from 'react';
import Image from 'next/image';

export interface CertificateCanvasProps {
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

export const CertificateCanvas = React.forwardRef<HTMLDivElement, CertificateCanvasProps>(
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
    return (
      <div
        ref={ref}
        id="amanah-certificate-a4"
        style={{
          width: '1123px',
          height: '794px',
          minWidth: '1123px',
          minHeight: '794px',
          maxWidth: '1123px',
          maxHeight: '794px',
        }}
        className="relative bg-[#fafdfd] text-[#1e293b] font-sans select-none overflow-hidden box-border shadow-2xl flex flex-col justify-between p-12"
      >
        {/* ================= BACKGROUND SVG DECORATIVE VECTORS ================= */}
        {/* Top-Right Decorative Wavy Ribbons & Halftone Grid */}
        <svg
          className="absolute top-0 right-0 pointer-events-none w-[420px] h-[320px]"
          viewBox="0 0 420 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Halftone Dot Grid Pattern */}
          <g opacity="0.25">
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 12 }).map((_, col) => (
                <circle
                  key={`dot-tr-${row}-${col}`}
                  cx={230 + col * 14}
                  cy={30 + row * 14}
                  r={row % 2 === 0 ? 1.8 : 1.4}
                  fill="#007a87"
                />
              ))
            )}
          </g>

          {/* Smooth Wavy Ribbons */}
          {/* Outer Mint Swoosh */}
          <path
            d="M90 0 C 190 20, 270 90, 360 180 C 390 210, 410 240, 420 270 L 420 0 Z"
            fill="#5eead4"
            opacity="0.85"
          />
          {/* Teal Ribbon */}
          <path
            d="M130 0 C 230 40, 300 130, 380 230 C 395 250, 410 280, 420 310 L 420 0 Z"
            fill="#0d9488"
          />
          {/* Dark Teal Accent Ribbon */}
          <path
            d="M190 0 C 270 40, 340 120, 400 200 C 410 215, 418 230, 420 240 L 420 0 Z"
            fill="#043b42"
          />
          {/* Thin Highlight Curve */}
          <path
            d="M80 0 C 180 20, 260 85, 350 170 C 380 200, 405 235, 420 270"
            stroke="#14b8a6"
            strokeWidth="3.5"
            fill="none"
          />
        </svg>

        {/* Bottom-Left Decorative Wavy Ribbons & Halftone Grid */}
        <svg
          className="absolute bottom-0 left-0 pointer-events-none w-[420px] h-[320px]"
          viewBox="0 0 420 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Halftone Dot Grid Pattern */}
          <g opacity="0.25">
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 12 }).map((_, col) => (
                <circle
                  key={`dot-bl-${row}-${col}`}
                  cx={30 + col * 14}
                  cy={180 + row * 14}
                  r={row % 2 === 0 ? 1.8 : 1.4}
                  fill="#007a87"
                />
              ))
            )}
          </g>

          {/* Smooth Wavy Ribbons */}
          {/* Outer Mint Swoosh */}
          <path
            d="M0 50 C 10 80, 30 110, 60 140 C 150 230, 230 300, 330 320 L 0 320 Z"
            fill="#5eead4"
            opacity="0.85"
          />
          {/* Teal Ribbon */}
          <path
            d="M0 10 C 10 40, 25 70, 40 90 C 120 190, 190 280, 290 320 L 0 320 Z"
            fill="#0d9488"
          />
          {/* Dark Teal Accent Ribbon */}
          <path
            d="M0 80 C 20 105, 80 185, 160 265 C 190 295, 215 315, 230 320 L 0 320 Z"
            fill="#043b42"
          />
          {/* Thin Highlight Curve */}
          <path
            d="M0 50 C 15 85, 40 120, 70 150 C 160 235, 240 300, 340 320"
            stroke="#14b8a6"
            strokeWidth="3.5"
            fill="none"
          />
        </svg>

        {/* Bottom-Right Large Semi-transparent Watermark Icon */}
        <div className="absolute -bottom-16 -right-16 pointer-events-none opacity-[0.22]">
          <svg width="340" height="340" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="#0d9488" strokeWidth="8" />
            <path
              d="M32 68 L50 25 L68 68 M38 52 L62 52"
              stroke="#0d9488"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* ================= HEADER SECTION ================= */}
        <div className="relative z-10 flex items-start justify-between">
          {/* Top Left: Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 relative flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="44" stroke="#007a87" strokeWidth="8" fill="#e6f7f8" />
                <path
                  d="M32 68 L50 25 L68 68 M38 52 L62 52"
                  stroke="#007a87"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight text-[#007a87] font-sans leading-tight">
                Amanah Drive
              </div>
              <div className="text-[10px] tracking-wide text-[#334155] font-medium mt-0.5">
                — Belajar Nyaman, Mengemudi Aman —
              </div>
            </div>
          </div>

          {/* Top Center/Right: Calligraphic Title "Sertifikat" */}
          <div className="text-center pr-14 pt-1">
            <div
              style={{
                fontFamily: '"Great Vibes", "Brush Script MT", "Pinyon Script", "Alex Brush", cursive',
                letterSpacing: '1px',
              }}
              className="text-[64px] leading-none text-[#022e33] font-normal"
            >
              Sertifikat
            </div>
            <div className="text-xs tracking-wide font-medium text-[#475569] mt-2">
              Nomor: <span className="font-semibold text-[#1e293b]">{nomorSertifikat}</span>
            </div>
          </div>
        </div>

        {/* ================= BODY CONTENT SECTION ================= */}
        <div className="relative z-10 text-center my-auto px-16 space-y-4">
          <div className="text-sm font-medium text-[#475569] tracking-normal">
            Sertifikat ini diberikan kepada:
          </div>

          {/* Student Name in Large Bold Uppercase Navy/Teal */}
          <div className="py-1">
            <h1 className="text-[40px] leading-tight font-extrabold uppercase tracking-wide text-[#083344]">
              {namaSiswa}
            </h1>
            <div className="w-24 h-0.5 bg-[#0d9488]/40 mx-auto mt-2 rounded-full" />
          </div>

          {/* Certificate Description Text */}
          <div className="text-[13px] leading-relaxed text-[#334155] max-w-3xl mx-auto font-normal space-y-1">
            <p>
              karena telah mengikuti pelatihan teknis mengemudi mobil di Lembaga Pelatihan Keterampilan &amp;
            </p>
            <p>
              Teknis Mengemudi: Kursus Mengemudi Mobil di
            </p>
            <p className="font-bold text-[#0f172a] text-[13.5px] tracking-wide">
              “AMANAH DRIVE PALEMBANG”
            </p>
            <p className="pt-0.5">
              pada tanggal <span className="font-semibold text-[#0f172a]">{tanggalRangeSesi}</span> dan dinyatakan:
            </p>
            <p className="font-extrabold text-[#083344] text-[13px] pt-1.5 tracking-wide">
              “LULUS PELATIHAN KETERAMPILAN &amp; TEKNIS MENGEMUDI MOBIL {predikat}”
            </p>
          </div>
        </div>

        {/* ================= FOOTER & SIGNATURES SECTION ================= */}
        <div className="relative z-10 px-16 pb-2">
          {/* Date of Issue */}
          <div className="text-right text-[13px] font-medium text-[#334155] mb-4 pr-16">
            {lokasi}, {tanggalCetak}
          </div>

          {/* Two Signatures (Instructor on Left, Leader on Right) */}
          <div className="grid grid-cols-2 gap-32 items-end">
            {/* Left Signature: Instruktur */}
            <div className="text-center flex flex-col items-center">
              {/* Signature space */}
              <div className="h-16 flex items-end justify-center w-full">
                {/* Clean signature placeholder / stylized ink mark */}
                <svg width="120" height="42" viewBox="0 0 120 42" fill="none" opacity="0.7">
                  <path
                    d="M10 32 C25 15, 35 10, 50 25 C65 40, 75 8, 90 20 C100 28, 105 32, 115 28"
                    stroke="#0b3b49"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M25 35 L75 32"
                    stroke="#0b3b49"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="w-48 border-b border-[#334155] mb-1.5" />
              <div className="font-bold text-[14px] text-[#0f172a]">{namaInstruktur}</div>
              <div className="text-xs text-[#64748b] font-medium">Instruktur</div>
            </div>

            {/* Right Signature: Pimpinan (Nur Awalia Rianti) */}
            <div className="text-center flex flex-col items-center">
              {/* Real Cursive Signature matching PDF screenshot */}
              <div className="h-16 flex items-end justify-center w-full">
                <svg width="150" height="52" viewBox="0 0 150 52" fill="none">
                  {/* Handwritten ink path for Nur Awalia Rianti */}
                  <path
                    d="M12 40 C15 28, 22 10, 28 8 C33 7, 36 26, 40 38 C44 20, 52 14, 58 36 C64 18, 70 12, 78 34 C82 22, 90 20, 96 32 C104 22, 115 16, 128 24 C136 28, 142 34, 146 36"
                    stroke="#081d22"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 16 C28 14, 45 16, 52 20"
                    stroke="#081d22"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M85 24 C95 22, 110 24, 130 30"
                    stroke="#081d22"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="w-48 border-b border-[#334155] mb-1.5" />
              <div className="font-bold text-[14px] text-[#0f172a]">{namaPimpinan}</div>
              <div className="text-xs text-[#64748b] font-medium">Pimpinan</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateCanvas.displayName = 'CertificateCanvas';
