'use client';

/**
 * Subir unas bases para evaluarlas. Un solo paso: el nombre y el archivo.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { Processing } from '@/components/app/evaluator/processing';

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

  async function empezar() {
    if (!archivo || titulo.trim().length < 3) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo.trim(), bases_file_path: archivo.path, offer_files: [], mode: 'bases_audit' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'No se pudo crear la evaluación');
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

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre del procedimiento
              </Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="CP-SM-3-2026 — Servicio de mantenimiento de vehículos"
                maxLength={160}
                className="mt-1.5 h-11"
                autoFocus
              />
            </div>

            <PdfDropzone
              folder="bases-audit"
              value={archivo}
              onChange={setArchivo}
              tipos={{
                'application/pdf': ['.pdf'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              }}
              label="Arrastra las bases o haz clic para subirlas"
            />

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
                disabled={!archivo || titulo.trim().length < 3 || enviando}
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
  );
}
