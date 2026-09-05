import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { ButtonFeedback } from '@/components/shared/ButtonFeedback';
import { LivingGridBackground } from '@/components/shared/LivingGridBackground';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0F7A73' },
    { media: '(prefers-color-scheme: dark)', color: '#092e2b' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://management-amanahdrive.vercel.app'),
  title: {
    default: 'Amanah Drive - Sistem Manajemen & Operasional Kursus Mengemudi',
    template: '%s | Amanah Drive',
  },
  description:
    'Sistem manajemen operasional, penjadwalan sesi mengemudi siswa, keuangan kas, dan armada Amanah Drive Palembang.',
  keywords: [
    'Amanah Drive',
    'Kursus Mengemudi Palembang',
    'Belajar Mobil Palembang',
    'Manajemen Kursus Mengemudi',
    'Sistem Operasional Kursus',
    'Les Mobil Palembang',
  ],
  authors: [{ name: 'Amanah Drive Palembang', url: 'https://management-amanahdrive.vercel.app' }],
  creator: 'Amanah Drive Palembang',
  publisher: 'Amanah Drive Palembang',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Amanah Drive - Sistem Manajemen & Operasional Kursus Mengemudi',
    description: 'Sistem operasional dan manajemen kursus mengemudi Amanah Drive Palembang.',
    url: 'https://management-amanahdrive.vercel.app',
    siteName: 'Amanah Drive Management',
    images: [
      {
        url: '/assets/app-icon-1024.png',
        width: 1024,
        height: 1024,
        alt: 'Logo Amanah Drive Palembang',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amanah Drive - Sistem Manajemen & Operasional Kursus Mengemudi',
    description: 'Sistem operasional dan manajemen kursus mengemudi Amanah Drive Palembang.',
    images: ['/assets/app-icon-1024.png'],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/assets/app-icon-1024.png', type: 'image/png' },
    ],
    apple: [{ url: '/assets/app-icon-1024.png' }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head />
      <body className={`${inter.className} antialiased bg-[var(--bg-subtle)] text-[var(--text-primary)] font-sans selection:bg-[var(--brand-primary-muted)] selection:text-[var(--brand-primary-dark)] relative overflow-x-hidden min-h-screen`}>
        <ThemeProvider>
          {/* Ambient Brand Gradient Mesh Orbs for Liquid Glass Refraction */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-[#0F7A73] opacity-15 dark:opacity-28 blur-[130px]" />
            <div className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-[#10B981] opacity-10 dark:opacity-24 blur-[140px]" />
            <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-[#0A5954] opacity-12 dark:opacity-26 blur-[150px]" />
          </div>
          <LivingGridBackground />
          <ButtonFeedback />
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
