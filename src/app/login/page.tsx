import { Suspense } from 'react';
import { LoginCard } from '@/components/auth/login-card';
import { LogoMark } from '@/components/brand';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Iniciar sesión',
  description: 'Ingresa a LexIA con tu cuenta de Google o Facebook',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(circle_at_20%_20%,rgba(5,131,242,0.10),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(2,29,64,0.06),transparent_50%)]" />
      <div className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgba(2,29,64,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,29,64,0.05)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)] opacity-50" />

      <header className="container py-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center">
          <LogoMark height={48} />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={null}>
          <LoginCard />
        </Suspense>
      </main>

      <footer className="container py-6">
        <p className="text-center text-xs text-slate-500">
          ¿Aún no tienes acceso? Escríbenos a{' '}
          <Link
            href="mailto:hola@promptive.pe"
            className="text-slate-900 hover:text-brand-600 transition-colors font-medium"
          >
            hola@promptive.pe
          </Link>
        </p>
      </footer>
    </div>
  );
}
