'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Loader2, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { Processing } from '@/components/app/evaluator/processing';
import { LineaDeConsumo } from '@/components/app/billing/consumo-estimado';
import { avisoDePlan, creditosCambiaron } from '@/lib/billing/aviso-de-plan';
import { cn } from '@/lib/utils';

/**
 * Contrato menor o procedimiento de selección. No es un detalle de
 * forma: el plan Consulta incluye la revisión de requerimientos de
 * contratos menores (≤ 8 UIT) pero no la de procedimientos de selección,
 * que va desde Profesional («PLANES DE A-LEXIA», 17/10/2026). El servidor
 * cobra una u otra herramienta según lo que se elija aquí y, desde el
 * 27/11/2026, el auditor revisa según el régimen y el objeto.
 */
type Regimen = 'menor_8uit' | 'seleccion';
const REGIMENES: Array<{ id: Regimen; titulo: string; detalle: string }> = [
  { id: 'menor_8uit', titulo: 'Contrato menor (≤ 8 UIT)', detalle: 'Contratación por monto igual o menor a 8 UIT.' },
  { id: 'seleccion', titulo: 'Procedimiento de selección', detalle: 'Licitación, concurso, comparación de precios u otro procedimiento.' },
];

type Objeto = 'bienes' | 'servicios' | 'consultoria_obras' | 'obras';
const OBJETOS: Array<{ id: Objeto; titulo: string }> = [
  { id: 'bienes', titulo: 'Bienes' },
  { id: 'servicios', titulo: 'Servicios' },
  { id: 'consultoria_obras', titulo: 'Consultoría de obras' },
  { id: 'obras', titulo: 'Ejecución de obras' },
];

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

/**
 * Reunión con César, 27/11/2026: primero se sube el documento y la
 * denominación se completa sola («me debería detectar ya de este
 * título»); después se eligen objeto y régimen, y se evalúa. Antes había
 * que escribir un nombre antes de subir nada.
 */
export function TdrAuditWizard() {
  const router = useRouter();
  const [procesando, setProcesando] = useState(false);
  const [title, setTitle] = useState('');
  const [tituloEditado, setTituloEditado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [detectada, setDetectada] = useState(false);
  const [tdr, setTdr] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [regimen, setRegimen] = useState<Regimen>('menor_8uit');
  const [objeto, setObjeto] = useState<Objeto | null>(null);
  const lectura = useRef(0);

  async function alSubir(f: UploadedFile | null) {
    setTdr(f);
    setDetectada(false);
    if (!f) return;
    const turno = ++lectura.current;
    setLeyendo(true);
    try {
      const r = await fetch('/api/evaluations/denominacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: f.path }),
      });
      const j = (await r.json().catch(() => ({}))) as { denominacion?: string | null };
      if (turno !== lectura.current) return;
      if (j.denominacion && !tituloEditado) {
        setTitle(j.denominacion.slice(0, 160));
        setDetectada(true);
      } else if (!title.trim()) {
        setTitle(f.name.replace(/\.(pdf|docx)$/i, '').slice(0, 160));
      }
    } finally {
      if (turno === lectura.current) setLeyendo(false);
    }
  }

  async function startAudit() {
    if (!tdr || title.trim().length < 3) return;
    setSubmitting(true);
    try {
      const createRes = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bases_file_path: tdr.path,
          // tdr_audit no usa offer_files; el endpoint ya permite array vacío
          offer_files: [],
          mode: 'tdr_audit',
          regimen,
          ...(objeto ? { objeto_contratacion: objeto } : {}),
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        if (avisoDePlan(j)) {
          setSubmitting(false);
          return;
        }
        throw new Error(j.message || j.error || 'No se pudo crear la evaluación');
      }
      const { evaluation } = await createRes.json();
      creditosCambiaron();
      setProcesando(true);
      // Fire-and-forget el process
      fetch(`/api/evaluations/${evaluation.id}/process`, { method: 'POST' }).catch(() => null);

      // Poll para detectar fin
      const pollId = setInterval(async () => {
        try {
          const r = await fetch(`/api/evaluations/${evaluation.id}`);
          const j = await r.json();
          const status = j?.evaluation?.status;
          if (status === 'done' || status === 'failed') {
            clearInterval(pollId);
            router.push(`/revisor-tdr/${evaluation.id}`);
          }
        } catch {
          /* keep polling */
        }
      }, 3500);
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {procesando ? (
        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Processing
            etapas={[
              { label: 'Leyendo el requerimiento página por página', duration: 8 },
              { label: 'Revisando alcance, plazos, conformidad, pago, penalidades y garantías', duration: 50 },
              { label: 'Contrastando cada hallazgo con la Biblioteca Normativa', duration: 45 },
              { label: 'Redactando el diagnóstico', duration: 8 },
            ]}
          />
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <Card className="p-8">
            <div className="mb-6">
              <h2 className="mb-1 text-2xl font-semibold tracking-tight">Evaluar requerimiento</h2>
              <p className="text-sm text-muted-foreground">
                Sube los términos de referencia o especificaciones técnicas, en Word o PDF (hasta 50 MB). Súbelo en{' '}
                <strong className="text-foreground">Word</strong> si quieres recibir la versión mejorada con control
                de cambios sobre tu propio documento.
              </p>
            </div>

            <PdfDropzone
              folder="tdr-audit"
              value={tdr}
              onChange={alSubir}
              tipos={{
                'application/pdf': ['.pdf'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              }}
              label="Arrastra el requerimiento o haz clic para subir"
            />

            <Label
              htmlFor="denominacion"
              className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Denominación de la contratación
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="denominacion"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTituloEditado(true);
                  setDetectada(false);
                }}
                placeholder={tdr ? '' : 'Se completa sola al subir el documento'}
                maxLength={160}
                className="h-11 pr-10"
                aria-describedby="denominacion-ayuda"
              />
              {leyendo && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <p id="denominacion-ayuda" className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
              {leyendo ? (
                'Leyendo la denominación del documento…'
              ) : detectada ? (
                <>
                  <Wand2 className="h-3 w-3" /> Detectada del documento. Puedes corregirla.
                </>
              ) : (
                'Puedes editarla.'
              )}
            </p>

            <Label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Objeto de la contratación
            </Label>
            <div role="radiogroup" aria-label="Objeto de la contratación" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OBJETOS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={objeto === o.id}
                  onClick={() => setObjeto(o.id)}
                  className={cn(
                    'min-h-11 rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-all',
                    objeto === o.id ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border hover:border-brand-400',
                  )}
                >
                  {o.titulo}
                </button>
              ))}
            </div>

            <Label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo de contratación
            </Label>
            <div role="radiogroup" aria-label="Tipo de contratación" className="mt-2 grid gap-3 sm:grid-cols-2">
              {REGIMENES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={regimen === r.id}
                  onClick={() => setRegimen(r.id)}
                  className={cn(
                    'rounded-xl border bg-card p-4 text-left transition-all',
                    regimen === r.id ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border hover:border-brand-400',
                  )}
                >
                  <span className="text-sm font-semibold">{r.titulo}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{r.detalle}</span>
                </button>
              ))}
            </div>

            {tdr && (
              <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <div className="text-xs leading-relaxed text-foreground/80">
                  A-LexIA revisa el alcance, los plazos, lo exigido al proveedor, la conformidad, la forma de pago, las
                  penalidades y las garantías, y contrasta cada hallazgo con la Biblioteca Normativa. Cada hallazgo
                  trae su ubicación (página, numeral, literal), el fundamento, lo que se solicita y el marco normativo.
                </div>
              </div>
            )}

            <LineaDeConsumo
              className="mt-4"
              estimacion={{
                herramienta:
                  regimen === 'menor_8uit' ? 'evaluacion_requerimiento_menor' : 'evaluacion_requerimiento_seleccion',
                que: 'Esta revisión',
              }}
            />

            <div className="mt-7 flex justify-end">
              <Button
                onClick={startAudit}
                disabled={!tdr || leyendo || submitting || title.trim().length < 3}
                loading={submitting}
                size="lg"
                variant="glow"
              >
                <Sparkles className="h-4 w-4" />
                Evaluar
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
