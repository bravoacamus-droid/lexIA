'use client';

/**
 * Subir unas bases para evaluarlas. Un solo paso: el archivo y su
 * denominación, que se lee del documento (reunión con César, 27/11/2026:
 * «la denominación ya se completa sola»). El usuario la puede corregir.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { Processing } from '@/components/app/evaluator/processing';
import { useConfirmarConsumo } from '@/components/app/billing/consumo-estimado';
import { avisoDePlan, creditosCambiaron } from '@/lib/billing/aviso-de-plan';

interface Subido {
  name: string;
  path: string;
  size: number;
}

const ETAPAS = [
  { label: 'Leyendo las bases', duration: 5 },
  { label: 'Identificando la bases estándar que corresponde', duration: 3 },
  { label: 'Cotejando la Sección General texto por texto', duration: 4 },
  { label: 'Revisando la sección específica, capítulo por capítulo', duration: 40 },
  { label: 'Armando el informe', duration: 4 },
];

export function BasesWizard() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [archivo, setArchivo] = useState<Subido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const { confirmar, dialogo } = useConfirmarConsumo();
  const [leyendo, setLeyendo] = useState(false);
  const [detectada, setDetectada] = useState(false);
  const [editado, setEditado] = useState(false);
  const lectura = useRef(0);

  async function alSubir(f: Subido | null) {
    setArchivo(f);
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
      if (j.denominacion && !editado) {
        setTitulo(j.denominacion.slice(0, 160));
        setDetectada(true);
      } else if (!titulo.trim()) {
        setTitulo(f.name.replace(/\.(pdf|docx)$/i, '').slice(0, 160));
      }
    } finally {
      if (turno === lectura.current) setLeyendo(false);
    }
  }

  async function empezar() {
    if (!archivo || titulo.trim().length < 3) return;
    if (!(await confirmar({ herramienta: 'evaluacion_bases', que: 'Esta evaluación de bases' }))) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo.trim(), bases_file_path: archivo.path, offer_files: [], mode: 'bases_audit' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (avisoDePlan(j)) {
          setEnviando(false);
          return;
        }
        throw new Error(j.message || j.error || 'No se pudo crear la evaluación');
      }
      creditosCambiaron();
      const id = j.evaluation.id as string;
      setProcesando(true);
      fetch(`/api/evaluations/${id}/process`, { method: 'POST' }).catch(() => null);
      const reloj = setInterval(async () => {
        try {
          const r = await fetch(`/api/evaluations/${id}`);
          const estado = (await r.json())?.evaluation?.status;
          if (estado === 'done' || estado === 'failed') {
            clearInterval(reloj);
            router.push(`/evaluar/bases/${id}`);
          }
        } catch {
          /* se sigue esperando */
        }
      }, 3500);
    } catch (e) {
      toast.error((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <>
    {dialogo}
    <AnimatePresence mode="wait">
      {procesando ? (
        <motion.div key="procesando" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Processing etapas={ETAPAS} />
        </motion.div>
      ) : (
        <motion.div key="formulario" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-semibold text-2xl tracking-tight mb-1">Evaluar unas bases</h2>
              <p className="text-sm text-muted-foreground">
                Las bases administrativas o integradas del procedimiento, en PDF —como se descargan
                del SEACE— o en Word.
              </p>
            </div>

            <PdfDropzone
              folder="bases-audit"
              value={archivo}
              onChange={alSubir}
              tipos={{
                'application/pdf': ['.pdf'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              }}
              label="Arrastra las bases o haz clic para subirlas"
            />

            <div>
              <Label htmlFor="denominacion-bases" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Denominación de la contratación
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="denominacion-bases"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    setEditado(true);
                    setDetectada(false);
                  }}
                  placeholder={archivo ? '' : 'Se completa sola al subir las bases'}
                  maxLength={160}
                  className="h-11 pr-10"
                />
                {leyendo && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground" aria-live="polite">
                {leyendo ? 'Leyendo la denominación de las bases…' : detectada ? (<><Wand2 className="h-3 w-3" /> Detectada de las bases. Puedes corregirla.</>) : 'Puedes editarla.'}
              </p>
            </div>


            {archivo && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-start gap-3">
                <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  A-LexIA identifica la bases estándar que corresponde, coteja la{' '}
                  <strong>Sección General</strong> texto por texto —no puede modificarse, bajo sanción
                  de nulidad— y revisa cada capítulo de la <strong>Sección Específica</strong> contra el
                  estándar y sus instrucciones: omisiones, modificaciones indebidas, exigencias no
                  previstas, restricciones injustificadas e inconsistencias.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={empezar}
                disabled={!archivo || leyendo || titulo.trim().length < 3 || enviando}
                loading={enviando}
                size="lg"
                variant="glow"
              >
                <Sparkles className="h-4 w-4" />
                Evaluar las bases
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
