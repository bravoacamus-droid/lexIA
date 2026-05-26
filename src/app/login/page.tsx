import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Iniciar sesión',
  description: 'Ingresa a LexIA con tu enlace mágico',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-50" />
      <div className="absolute inset-0 -z-10 bg-grid-light dark:bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

      <header className="container py-6 flex items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>

      <footer className="container py-6">
        <p className="text-center text-xs text-muted-foreground">
          ¿Aún no tienes acceso? Escríbenos a{' '}
          <Link
            href="mailto:hola@promptive.pe"
            className="text-foreground hover:text-brand-600 transition-colors"
          >
            hola@promptive.pe
          </Link>
        </p>
      </footer>
    </div>
  );
}
