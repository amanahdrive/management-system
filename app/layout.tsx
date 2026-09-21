import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { ButtonFeedback } from '@/components/shared/ButtonFeedback';
import { LivingGridBackground } from '@/components/shared/LivingGridBackground';
import { UniversalPwaInstallPrompt } from '@/components/shared/UniversalPwaInstallPrompt';

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
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0F7A73' },
    { media: '(prefers-color-scheme: dark)', color: '#092e2b' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://panel.amanahdrive.my.id'),
  applicationName: 'Amanah Drive Console',
  title: {
    default: 'Amanah Drive Console - Sistem Operasional & Manajemen',
    template: '%s | Amanah Drive Console',
  },
  description:
    'Sistem operasional dan manajemen internal kursus mengemudi CV Amanah Drive Palembang.',
  keywords: [
    'Amanah Drive',
    'Kursus Mengemudi Palembang',
    'Belajar Mobil Palembang',
    'Manajemen Kursus Mengemudi',
    'Sistem Operasional Kursus',
    'Les Mobil Palembang',
  ],
  authors: [{ name: 'Amanah Drive Palembang', url: 'https://panel.amanahdrive.my.id' }],
  creator: 'CV Amanah Drive Palembang',
  publisher: 'CV Amanah Drive Palembang',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Amanah Console',
  },
  openGraph: {
    title: 'Amanah Drive Console - Sistem Operasional & Manajemen',
    description: 'Sistem operasional dan manajemen internal kursus mengemudi CV Amanah Drive Palembang.',
    url: 'https://panel.amanahdrive.my.id',
    siteName: 'Amanah Drive Console',
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
    title: 'Amanah Drive Console - Sistem Operasional & Manajemen',
    description: 'Sistem operasional dan manajemen internal kursus mengemudi CV Amanah Drive Palembang.',
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
          <LivingGridBackground />
          <ButtonFeedback />
          <UniversalPwaInstallPrompt />
          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
