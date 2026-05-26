'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Processing } from '@/components/app/evaluator/processing';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'failed';
  offers: Array<{ name: string }>;
}

export function EvaluationPendingView({ id, title, status }: Props) {
  const router = useRouter();

  // Poll
  useEffect(() => {
    if (status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/evaluations/${id}`);
        const json = await res.json();
        const s = json?.evaluation?.status;
        if (s === 'done') router.refresh();
        if (s === 'failed') router.refresh();
      } catch {
        /* keep polling */
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [id, status, router]);

  if (status === 'failed') {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="p-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 mb-4">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h1 className="font-serif text-2xl tracking-tight mb-1">
            La evaluación falló
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            "{title}" no pudo procesarse. Esto puede ocurrir si los PDFs son escaneos
            (imagen sin OCR), están protegidos o exceden el tamaño máximo.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/evaluador">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild>
              <Link href="/evaluador/nuevo">
                <RefreshCw className="h-4 w-4" />
                Intentar de nuevo
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Processing />
    </div>
  );
}
