'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Processing } from '@/components/app/evaluator/processing';
import { ArrowLeft, AlertCircle, RefreshCw, FileScan, Check, Loader2, X } from 'lucide-react';
import type { ResumenProgreso } from '@/lib/evaluacion/ejecucion';
import { EliminarEvaluacion } from '@/components/app/evaluator/eliminar-evaluacion';

interface Props {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'failed';
  offers: Array<{ name: string }>;
  backHref?: string;
  /**
   * La evaluación por etapas avanza por vueltas (`/etapas`): esta pantalla
   * muestra el avance real que se guarda en la fila y pide la vuelta
   * siguiente si ninguna está trabajando.
   */
  porEtapas?: boolean;
  creada?: string;
}

interface ErrorDetail {
  error?: string;
  error_code?: string;
  error_stack?: string;
  failed_at?: string;
}

export function EvaluationPendingView({ id, title, status, backHref = '/evaluador', porEtapas, creada }: Props) {
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
    if (status === 'failed' || porEtapas) return;
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
  }, [id, status, router, porEtapas]);

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
                A-LexIA no puede leer imágenes todavía. Necesitas pasar el PDF
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
              <strong>Próximamente</strong>: A-LexIA incluirá OCR automático
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

  if (porEtapas) {
    return (
      <div className="container max-w-2xl py-8">
        <AvanceEvaluacion id={id} title={title} creada={creada} />
        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Volver a la lista
            </Link>
          </Button>
          <EliminarEvaluacion id={id} titulo={title} alEliminar={backHref} variante="boton" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Processing />
    </div>
  );
}

/**
 * El avance de una evaluación por etapas, leído de la fila.
 *
 * Antes la barra era un reloj: llegaba al 95 % a los tres minutos y se
 * quedaba ahí, y al recargar volvía a cero aunque el trabajo siguiera
 * (César, 30/09/2026). Ahora dice lo que de verdad se está haciendo
 * —«transcribiendo el escaneo: 45 de 140 páginas»— y el tiempo se cuenta
 * desde que se creó la evaluación.
 */
function AvanceEvaluacion({ id, title, creada }: { id: string; title: string; creada?: string }) {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenProgreso | null>(null);
  const [ahora, setAhora] = useState<number | null>(null);
  const enCurso = useRef(false);
  const ultimoPedido = useRef(0);

  // Pedir una vuelta. Si otra está trabajando —la que se encadena sola,
  // u otra pestaña—, el servidor contesta «ocupada» y no pasa nada.
  const pedirVuelta = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    ultimoPedido.current = Date.now();
    try {
      const r = await fetch(`/api/evaluations/${id}/etapas`, { method: 'POST' });
      const j = (await r.json().catch(() => null)) as { estado?: string } | null;
      if (j?.estado === 'done' || j?.estado === 'failed') router.refresh();
    } catch {
      /* la siguiente consulta lo vuelve a intentar */
    } finally {
      enCurso.current = false;
    }
  }, [id, router]);

  useEffect(() => {
    void pedirVuelta();
    const consultar = async () => {
      try {
        const r = await fetch(`/api/evaluations/${id}`);
        const j = await r.json();
        const ev = j?.evaluation as { status?: string; resumen?: ResumenProgreso | null } | undefined;
        if (ev?.resumen) setResumen(ev.resumen);
        if (ev?.status === 'done' || ev?.status === 'failed') {
          router.refresh();
          return;
        }
        if (!enCurso.current && Date.now() - ultimoPedido.current > 20_000) void pedirVuelta();
      } catch {
        /* sigue consultando */
      }
    };
    void consultar();
    const t = setInterval(consultar, 4000);
    return () => clearInterval(t);
  }, [id, router, pedirVuelta]);

  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const transcurrido = creada && ahora ? Math.max(0, Math.floor((ahora - Date.parse(creada)) / 1000)) : null;
  const porcentaje = resumen?.porcentaje ?? 0;

  return (
    <Card className="p-8 sm:p-12">
      <div className="text-center">
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-950 dark:to-violet-950 text-brand-700 dark:text-brand-300 shadow-glow mb-5">
          <Loader2 className="h-7 w-7 animate-spin" />
        </span>
        <h2 className="font-semibold text-2xl tracking-tight">A-LexIA está evaluando…</h2>
        <p className="mt-1 text-sm font-medium text-foreground/80 truncate">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto text-balance">
          Las ofertas escaneadas se transcriben página por página: con varias de más de cien
          páginas puede tomar de 10 a 20 minutos. Puedes cerrar esta pestaña; la evaluación sigue
          y la encuentras en <span className="font-medium text-foreground">Evaluador</span>.
        </p>
      </div>

      <div className="mt-7 max-w-md mx-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span className="font-mono">{porcentaje}%</span>
          {transcurrido !== null && <span className="font-mono">{formatoTiempo(transcurrido)}</span>}
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${Math.max(3, porcentaje)}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center min-h-[1rem]">
          {resumen?.paso ?? 'Preparando los documentos…'}
        </p>
      </div>

      {resumen && resumen.lineas.length > 0 && (
        <ul className="mt-7 max-w-md mx-auto space-y-2 text-left">
          {resumen.lineas.map((l, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 text-sm ${
                l.estado === 'pendiente' ? 'text-muted-foreground/70' : 'text-foreground'
              } ${l.estado === 'en_curso' ? 'font-medium' : ''}`}
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  l.estado === 'hecho'
                    ? 'bg-emerald-500 text-white'
                    : l.estado === 'error'
                      ? 'bg-red-500 text-white'
                      : l.estado === 'en_curso'
                        ? 'bg-brand-100 dark:bg-brand-950'
                        : 'bg-secondary'
                }`}
              >
                {l.estado === 'hecho' ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : l.estado === 'error' ? (
                  <X className="h-3 w-3" strokeWidth={3} />
                ) : l.estado === 'en_curso' ? (
                  <Loader2 className="h-3 w-3 animate-spin text-brand-700 dark:text-brand-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span className="leading-snug">{l.texto}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatoTiempo(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${seg}` : `${m}:${seg}`;
}
