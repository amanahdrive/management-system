import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/shared/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
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
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
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
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased bg-[var(--bg)] text-[var(--text-primary)] font-sans`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
