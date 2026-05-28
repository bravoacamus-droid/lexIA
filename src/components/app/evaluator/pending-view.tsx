'use client';

import { useEffect, useState } from 'react';
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

interface ErrorDetail {
  error?: string;
  error_stack?: string;
  failed_at?: string;
}

export function EvaluationPendingView({ id, title, status }: Props) {
  const router = useRouter();
  const [errorDetail, setErrorDetail] = useState<ErrorDetail | null>(null);

  // Cuando falla, traer el detalle del error desde la BD
  useEffect(() => {
    if (status !== 'failed') return;
    (async () => {
      try {
        const res = await fetch(`/api/evaluations/${id}`);
        const json = await res.json();
        const result = json?.evaluation?.result as ErrorDetail | null;
        if (result?.error) setErrorDetail(result);
      } catch {
        /* ignore */
      }
    })();
  }, [id, status]);

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
        <Card className="p-10">
          <div className="text-center mb-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 mb-4">
              <AlertCircle className="h-5 w-5" />
            </span>
            <h1 className="font-serif text-2xl tracking-tight mb-1">
              La evaluación falló
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              "{title}" no pudo procesarse. Esto puede ocurrir si los PDFs son escaneos
              (imagen sin OCR), están protegidos, o si el LLM tuvo un problema temporal.
            </p>
          </div>

          {errorDetail?.error && (
            <details className="mt-4 mb-4 group" open>
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                Detalle técnico del error
              </summary>
              <div className="mt-2 rounded-md border border-border bg-secondary/40 p-3">
                <p className="text-[13px] text-foreground font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {errorDetail.error}
                </p>
                {errorDetail.error_stack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[10px] text-muted-foreground">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-[10px] text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {errorDetail.error_stack}
                    </pre>
                  </details>
                )}
              </div>
            </details>
          )}

          <div className="flex items-center justify-center gap-2">
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
