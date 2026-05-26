import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LexIA · Inteligencia artificial en Contrataciones del Estado',
    template: '%s · LexIA',
  },
  description:
    'LexIA es la primera inteligencia artificial especializada en Contrataciones del Estado del Perú. Fundamentada en la Ley N° 32069, su Reglamento, Opiniones del OSCE y Resoluciones del Tribunal.',
  keywords: [
    'Contrataciones del Estado',
    'OSCE',
    'Tribunal de Contrataciones',
    'Ley 32069',
    'IA legal Perú',
    'Licitaciones públicas',
    'LexIA',
  ],
  authors: [{ name: 'Promptive', url: 'https://promptive.pe' }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ),
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    title: 'LexIA · IA especializada en Contrataciones del Estado',
    description:
      'Consulta normativa, evalúa ofertas y genera documentos con IA fundamentada en el marco legal peruano.',
    siteName: 'LexIA',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
