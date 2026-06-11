import Link from 'next/link';
import { LogoMark } from '@/components/brand';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Legal · LexIA' };

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container max-w-5xl py-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <LogoMark height={28} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl py-12 sm:py-16 prose-lexia">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="container max-w-5xl py-6 text-xs text-muted-foreground text-center space-y-1">
          <p>
            <Link href="/legal/terminos" className="hover:underline">
              Términos
            </Link>
            {' · '}
            <Link href="/legal/privacidad" className="hover:underline">
              Privacidad
            </Link>
            {' · '}
            <Link href="/legal/cookies" className="hover:underline">
              Cookies
            </Link>
          </p>
          <p>© {new Date().getFullYear()} Promptive · LexIA Contrataciones</p>
        </div>
      </footer>
    </div>
  );
}
