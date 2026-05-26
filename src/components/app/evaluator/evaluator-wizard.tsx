'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  FileSearch,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PdfDropzone } from '@/components/app/evaluator/pdf-dropzone';
import { Processing } from '@/components/app/evaluator/processing';

type Step = 1 | 2 | 3 | 'processing';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
}

const STEPS = [
  { id: 1, label: 'Información' },
  { id: 2, label: 'Bases' },
  { id: 3, label: 'Ofertas' },
];

export function EvaluatorWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [bases, setBases] = useState<UploadedFile | null>(null);
  const [offers, setOffers] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function startProcessing() {
    if (!bases || offers.length === 0 || !title.trim()) return;
    setSubmitting(true);
    try {
      const createRes = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bases_file_path: bases.path,
          offer_files: offers.map((o) => ({ name: o.name, path: o.path })),
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j.error || 'No se pudo crear la evaluación');
      }
      const { evaluation } = await createRes.json();
      setStep('processing');
      // Fire-and-forget el process; el componente Processing poll-ea estado
      fetch(`/api/evaluations/${evaluation.id}/process`, { method: 'POST' }).catch(() => null);

      // Polling para detectar fin
      const pollId = setInterval(async () => {
        try {
          const r = await fetch(`/api/evaluations/${evaluation.id}`);
          const j = await r.json();
          const s = j?.evaluation?.status;
          if (s === 'done') {
            clearInterval(pollId);
            router.push(`/evaluador/${evaluation.id}`);
          } else if (s === 'failed') {
            clearInterval(pollId);
            toast.error('La evaluación falló. Revisa los PDFs e intenta de nuevo.');
            router.push(`/evaluador/${evaluation.id}`);
          }
        } catch {
          /* keep polling */
        }
      }, 3500);
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  }

  if (step === 'processing') {
    return <Processing />;
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Stepper currentStep={step as 1 | 2 | 3} />

      <AnimatePresence mode="wait">
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
                <h2 className="font-serif text-2xl tracking-tight mb-1">
                  Nueva evaluación
                </h2>
                <p className="text-sm text-muted-foreground">
                  Identifica el proceso y el tipo de evaluación que deseas realizar.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nombre del proceso
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Licitación Pública Carretera Sur 2025"
                    maxLength={160}
                    className="mt-1.5 h-11"
                    autoFocus
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Solo para tu organización interna. Puedes editarlo después.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    ¿Qué quieres evaluar?
                  </Label>
                  <RadioGroup
                    defaultValue="ofertas_vs_bases"
                    className="mt-2 grid sm:grid-cols-3 gap-3"
                  >
                    <RadioCard
                      value="ofertas_vs_bases"
                      title="Ofertas vs Bases"
                      desc="Compara ofertas contra los requisitos de las Bases Integradas."
                      active
                    />
                    <RadioCard
                      value="eett_tdr"
                      title="Revisor EETT / TDR"
                      desc="Identifica vicios en los términos de referencia."
                      soon
                    />
                    <RadioCard
                      value="consultas"
                      title="Consultas y observaciones"
                      desc="Formula consultas en lenguaje legal a partir de un texto."
                      soon
                    />
                  </RadioGroup>
                </div>
              </div>

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
                <h2 className="font-serif text-2xl tracking-tight mb-1">
                  Sube las Bases Integradas
                </h2>
                <p className="text-sm text-muted-foreground">
                  PDF con los requisitos del proceso (hasta 25 MB). LexIA extraerá los
                  requisitos de calificación automáticamente.
                </p>
              </div>

              <PdfDropzone
                folder="evaluations/bases"
                value={bases}
                onChange={setBases}
                accept="application/pdf"
                label="Arrastra las Bases o haz click"
              />

              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button onClick={() => setStep(3)} disabled={!bases} size="lg">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-8">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl tracking-tight mb-1">
                    Sube las ofertas
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sube hasta 5 ofertas en PDF. Cada una será evaluada contra los requisitos
                    extraídos.
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary text-xs font-mono">
                  {offers.length} / 5
                </span>
              </div>

              <div className="space-y-3">
                {offers.map((o, idx) => (
                  <div
                    key={o.path}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          Postor {idx + 1} · {o.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {(o.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOffers((prev) => prev.filter((p) => p.path !== o.path))}
                    >
                      Quitar
                    </Button>
                  </div>
                ))}

                {offers.length < 5 && (
                  <PdfDropzone
                    folder="evaluations/offers"
                    onChange={(f) => {
                      if (f) setOffers((prev) => [...prev, f]);
                    }}
                    label={`Agregar oferta ${offers.length + 1}`}
                    accept="application/pdf"
                    compact
                  />
                )}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  size="lg"
                  variant="glow"
                  onClick={startProcessing}
                  disabled={offers.length === 0}
                  loading={submitting}
                >
                  <Sparkles className="h-4 w-4" />
                  Evaluar con LexIA
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => {
        const isActive = s.id === currentStep;
        const isDone = s.id < currentStep;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                isActive && 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300',
                isDone && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
                !isActive && !isDone && 'border-border text-muted-foreground',
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background border border-current text-[10px] font-mono">
                {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="h-px w-8 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RadioCard({
  value,
  title,
  desc,
  active,
  soon,
}: {
  value: string;
  title: string;
  desc: string;
  active?: boolean;
  soon?: boolean;
}) {
  return (
    <label
      className={cn(
        'relative flex flex-col gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all',
        active && 'border-brand-500 ring-2 ring-brand-500/20',
        soon && 'opacity-60 cursor-not-allowed',
        !active && !soon && 'hover:border-brand-400',
      )}
    >
      <div className="flex items-center justify-between">
        <RadioGroupItem value={value} disabled={soon} className={cn(soon && 'opacity-50')} />
        {soon && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Próximamente
          </span>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-sm">{title}</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
      </div>
    </label>
  );
}
