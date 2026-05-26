import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface Props {
  searchParams: { message?: string };
}

const FRIENDLY: Record<string, string> = {
  missing_code: 'El enlace que abriste ya no es válido o está incompleto.',
  otp_expired: 'Este enlace mágico expiró. Solicita uno nuevo.',
};

export default function AuthErrorPage({ searchParams }: Props) {
  const raw = searchParams.message || '';
  const friendly = FRIENDLY[raw] || raw || 'Algo salió mal al iniciar sesión.';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="container py-6">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md p-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 mx-auto mb-4">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h1 className="font-serif text-2xl tracking-tight">No pudimos iniciar tu sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">{friendly}</p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </Button>
        </Card>
      </main>
    </div>
  );
}
