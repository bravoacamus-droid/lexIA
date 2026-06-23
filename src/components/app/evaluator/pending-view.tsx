'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Processing } from '@/components/app/evaluator/processing';
import { ArrowLeft, AlertCircle, RefreshCw, FileScan } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'failed';
  offers: Array<{ name: string }>;
  backHref?: string;
}

interface ErrorDetail {
  error?: string;
  error_code?: string;
  error_stack?: string;
  failed_at?: string;
}

export function EvaluationPendingView({ id, title, status, backHref = '/evaluador' }: Props) {
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
    const isOcrIssue = errorDetail?.error_code === 'pdf_needs_ocr';

    if (isOcrIssue) {
      return (
        <div className="container max-w-2xl py-12">
          <Card className="p-10">
            <div className="text-center mb-6">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mb-4">
                <FileScan className="h-6 w-6" />
              </span>
              <h1 className="font-semibold text-2xl tracking-tight mb-2">
                Tu PDF está escaneado
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                LexIA no puede leer imágenes todavía. Necesitas pasar el PDF
                por OCR antes de subirlo. Es rápido y gratis:
              </p>
            </div>

            <div className="rounded-lg border border-border bg-secondary/40 p-5 mb-5 space-y-3">
              <div className="flex gap-3 items-start">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                  1
                </span>
                <div className="text-sm">
                  <p className="font-semibold mb-0.5">Adobe Acrobat (recomendado)</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Abre el PDF → Herramientas → <strong>Reconocer texto</strong> →
                    En este archivo. Guarda y vuelve a subirlo.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                  2
                </span>
                <div className="text-sm">
                  <p className="font-semibold mb-0.5">Online gratis (sin instalar)</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    <a
                      href="https://www.ilovepdf.com/es/ocr-pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      ilovepdf.com/es/ocr-pdf
                    </a>{' '}
                    o{' '}
                    <a
                      href="https://smallpdf.com/es/ocr-pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      smallpdf.com/es/ocr-pdf
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                  3
                </span>
                <div className="text-sm">
                  <p className="font-semibold mb-0.5">Microsoft Word</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Abre el PDF directamente en Word (hace OCR automático) y
                    exporta como PDF.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-brand-50 border border-brand-200/40 p-3 mb-5 text-[11px] text-brand-900/80">
              <strong>Próximamente</strong>: LexIA incluirá OCR automático
              integrado para que no tengas que hacer este paso manualmente.
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </Link>
              </Button>
              <Button asChild>
                <Link href={`${backHref}/nuevo`}>
                  <RefreshCw className="h-4 w-4" />
                  Subir PDF con OCR
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="container max-w-2xl py-12">
        <Card className="p-10">
          <div className="text-center mb-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 mb-4">
              <AlertCircle className="h-5 w-5" />
            </span>
            <h1 className="font-semibold text-2xl tracking-tight mb-1">
              La evaluación falló
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              "{title}" no pudo procesarse. Esto puede ocurrir si los PDFs están
              protegidos, o si el LLM tuvo un problema temporal.
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
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${backHref}/nuevo`}>
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
