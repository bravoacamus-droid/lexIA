'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Sparkles, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { Processing } from '@/components/app/evaluator/processing';

type Step = 1 | 2 | 'processing';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

export function TdrAuditWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [tdr, setTdr] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function startAudit() {
    if (!tdr || !title.trim()) return;
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
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j.error || 'No se pudo crear la auditoría');
      }
      const { evaluation } = await createRes.json();
      setStep('processing');
      // Fire-and-forget el process
      fetch(`/api/evaluations/${evaluation.id}/process`, { method: 'POST' }).catch(() => null);

      // Poll para detectar fin
      const pollId = setInterval(async () => {
        try {
          const r = await fetch(`/api/evaluations/${evaluation.id}`);
          const j = await r.json();
          const status = j?.evaluation?.status;
          if (status === 'done') {
            clearInterval(pollId);
            router.push(`/revisor-tdr/${evaluation.id}`);
          } else if (status === 'failed') {
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
      {step === 'processing' && (
        <motion.div
          key="processing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Processing />
        </motion.div>
      )}

      {step === 1 && (
        <motion.div
          key="step-1"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-8">
            <div className="mb-6">
              <h2 className="font-semibold text-2xl tracking-tight mb-1">
                Información de la auditoría
              </h2>
              <p className="text-sm text-muted-foreground">
                Dale un nombre interno para reconocerla después.
              </p>
            </div>

            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nombre del proceso
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mejoramiento Carretera Boca del Río — TDR borrador"
              maxLength={160}
              className="mt-1.5 h-11"
              autoFocus
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Solo para tu organización. Puedes editarlo después.
            </p>

            <div className="mt-7 flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={title.trim().length < 3}
                size="lg"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step-2"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-8">
            <div className="mb-6">
              <h2 className="font-semibold text-2xl tracking-tight mb-1">
                Sube el TDR / EETT a auditar
              </h2>
              <p className="text-sm text-muted-foreground">
                PDF con el documento ya redactado (hasta 100 MB). LexIA lo va a auditar
                completo, sección por sección, detectando vicios potenciales.
              </p>
            </div>

            <PdfDropzone
              folder="tdr-audit"
              value={tdr}
              onChange={setTdr}
              label="Arrastra el TDR/EETT o haz click para subir"
            />

            {tdr && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 flex items-start gap-3">
                <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
                <div className="text-xs text-foreground/80 leading-relaxed">
                  Vamos a buscar:{' '}
                  <strong>direccionamiento a marca</strong>,{' '}
                  <strong>personal desproporcionado</strong>,{' '}
                  <strong>especificaciones ambiguas</strong>,{' '}
                  <strong>plazos insustentables</strong>, equipamiento restrictivo,
                  experiencia restrictiva, debilidades en la finalidad pública y otros
                  vicios. Cada hallazgo viene con ubicación, cita literal del texto
                  problemático, sustento normativo y recomendación de corrección.
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </Button>
              <Button
                onClick={startAudit}
                disabled={!tdr || submitting}
                loading={submitting}
                size="lg"
                variant="glow"
              >
                <Sparkles className="h-4 w-4" />
                Iniciar auditoría
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
