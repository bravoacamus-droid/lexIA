'use client';

import { useEffect, useState } from 'react';
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
import { useConfirmarConsumo } from '@/components/app/billing/consumo-estimado';
import { avisoDePlan, creditosCambiaron } from '@/lib/billing/aviso-de-plan';
import { enlaceWhatsApp, planDelCatalogo, type IdDePlan } from '@/lib/billing/catalogo';
import { MAX_OFERTAS_POR_ANALISIS, MB_POR_OFERTA, bytesPorOferta, mensajeDeTamano, ofertasPorAnalisis } from '@/lib/billing/limites';

type Step = 1 | 2 | 3 | 'processing';

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  partes?: string[];
}

const STEPS = [
  { id: 1, label: 'Información' },
  { id: 2, label: 'Bases' },
  { id: 3, label: 'Ofertas' },
];

type EvalMode = 'committee' | 'self_review';

interface EvaluatorWizardProps {
  mode?: EvalMode;
  /** Ruta de retorno tras crear (default /evaluador/[id]). */
  resultPathPrefix?: string;
  /**
   * Evaluar en las tres etapas —admisión, calificación y evaluación con
   * puntaje— en vez de la pasada única de requisitos de calificación.
   *
   * Va como opción y no reemplaza a la anterior porque son dos trabajos
   * distintos: el comité evalúa un procedimiento entero y el postor se
   * revisa a sí mismo antes de presentar.
   */
  porEtapas?: boolean;
}

export function EvaluatorWizard({
  mode = 'committee',
  resultPathPrefix = '/evaluador',
  porEtapas = false,
}: EvaluatorWizardProps = {}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [bases, setBases] = useState<UploadedFile | null>(null);
  const [offers, setOffers] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { confirmar, dialogo } = useConfirmarConsumo();
  // El plan dice cuántas ofertas y de qué tamaño (César, 18/10/2026:
  // Profesional 3 ofertas de hasta 60 MB; Especialista hasta 120 MB). Si
  // no se puede leer, se deja subir y el servidor decide.
  const [plan, setPlan] = useState<IdDePlan | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/cuenta/plan?breve=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { plan?: IdDePlan } | null) => {
        if (vivo && j?.plan) setPlan(j.plan);
      })
      .catch(() => null);
    return () => {
      vivo = false;
    };
  }, []);
  const maxOfertas = plan ? ofertasPorAnalisis(plan) : MAX_OFERTAS_POR_ANALISIS;
  const maxBytesOferta = plan ? bytesPorOferta(plan) : null;

  function ofertaDemasiadoGrande(archivo: File) {
    if (!plan) return;
    const sugerido = plan === 'profesional' ? planDelCatalogo('especialista').nombre : null;
    avisoDePlan({
      error: 'limite_del_plan',
      message: mensajeDeTamano(plan, archivo.name, archivo.size),
      whatsapp_url: enlaceWhatsApp(
        sugerido
          ? `Hola, uso A-LexIA (plan ${planDelCatalogo(plan).nombre}) y quisiera pasar al plan ${sugerido} para evaluar ofertas de más de ${MB_POR_OFERTA[plan]} MB.`
          : `Hola, uso A-LexIA (plan ${planDelCatalogo(plan).nombre}) y necesito evaluar una oferta de más de ${MB_POR_OFERTA[plan]} MB.`,
      ),
    });
  }

  async function startProcessing() {
    if (!bases || offers.length === 0 || !title.trim()) return;
    // 30 créditos por oferta: con cinco ofertas son 150, y el usuario
    // tiene que verlo antes de pulsar (regla de César, 17/10/2026).
    const seguir = await confirmar({
      herramienta: 'evaluacion_ofertas',
      unidades: offers.length,
      que: 'Esta evaluación',
      porUnidad: 'por oferta',
    });
    if (!seguir) return;
    setSubmitting(true);
    try {
      const createRes = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          bases_file_path: bases.path,
          bases_partes: bases.partes,
          offer_files: offers.map((o) => ({ name: o.name, path: o.path, partes: o.partes, size: o.size })),
          mode,
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

      // La evaluación por etapas se sigue en su propia página: la pantalla
      // de allí la pone en marcha, muestra el avance real que se guarda en
      // la fila y la retoma si se recarga. Antes se quedaba aquí, y al
      // recargar /evaluador/nuevo se volvía al paso 1 (César, 30/09/2026).
      if (porEtapas) {
        router.replace(`${resultPathPrefix}/${evaluation.id}`);
        return;
      }

      setStep('processing');
      // Fire-and-forget; el componente Processing consulta el estado.
      // La evaluación por etapas tarda minutos —una oferta escaneada son
      // noventa segundos solo de transcripción—, así que no se espera.
      fetch(`/api/evaluations/${evaluation.id}/process`, { method: 'POST' }).catch(() => null);

      // Polling para detectar fin
      const pollId = setInterval(async () => {
        try {
          const r = await fetch(`/api/evaluations/${evaluation.id}`);
          const j = await r.json();
          const s = j?.evaluation?.status;
          if (s === 'done') {
            clearInterval(pollId);
            router.push(`${resultPathPrefix}/${evaluation.id}`);
          } else if (s === 'failed') {
            clearInterval(pollId);
            toast.error('La evaluación falló. Revisa los PDFs e intenta de nuevo.');
            router.push(`${resultPathPrefix}/${evaluation.id}`);
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
      {dialogo}
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
                <h2 className="font-semibold text-2xl tracking-tight mb-1">
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
                <h2 className="font-semibold text-2xl tracking-tight mb-1">
                  Sube las Bases Integradas
                </h2>
                <p className="text-sm text-muted-foreground">
                  PDF con los requisitos del proceso. A-LexIA extraerá los requisitos
                  de calificación automáticamente. Si pasa de 45 MB, se divide solo antes
                  de subirlo.
                </p>
              </div>

              <PdfDropzone
                folder="evaluations/bases"
                value={bases}
                onChange={setBases}
                accept="application/pdf"
                label="Arrastra las Bases o haz click"
                dividir
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
                  <h2 className="font-semibold text-2xl tracking-tight mb-1">
                    Sube las ofertas
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sube hasta {maxOfertas} ofertas en PDF, escaneadas o no. Cada una será evaluada
                    contra los requisitos extraídos.
                  </p>
                </div>
                <span
                  className="shrink-0 inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary text-xs font-mono"
                  aria-label={`${offers.length} de ${maxOfertas} ofertas`}
                >
                  {offers.length} / {maxOfertas}
                </span>
              </div>

              <div
                className="mb-4 rounded-lg border border-brand-200/60 bg-brand-50/50 px-4 py-3 text-xs leading-relaxed text-foreground/80 dark:border-brand-900 dark:bg-brand-950/30"
                data-regla-un-tomo
              >
                <p>
                  <strong>Una oferta = un solo PDF.</strong> Cada archivo que subas cuenta como una oferta
                  (y se cobra como una). Si una oferta viene en varios tomos, únelos en un solo PDF antes
                  de subirla.
                </p>
                {plan && maxBytesOferta && (
                  <p className="mt-1 text-muted-foreground">
                    Tu plan {planDelCatalogo(plan).nombre}: hasta {maxOfertas} ofertas por análisis, de hasta{' '}
                    {MB_POR_OFERTA[plan]} MB cada una.
                  </p>
                )}
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
                          {o.partes && o.partes.length > 1 ? ` · subida en ${o.partes.length} partes` : ''}
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

                {offers.length < maxOfertas && (
                  <PdfDropzone
                    folder="evaluations/offers"
                    onChange={(f) => {
                      if (f) setOffers((prev) => [...prev, f]);
                    }}
                    label={`Agregar oferta ${offers.length + 1} (un solo PDF)`}
                    accept="application/pdf"
                    compact
                    dividir
                    {...(maxBytesOferta ? { maxSize: maxBytesOferta, alExceder: ofertaDemasiadoGrande } : {})}
                  />
                )}
                {offers.length > maxOfertas && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Tu plan admite {maxOfertas} ofertas por análisis: quita {offers.length - maxOfertas}.
                  </p>
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
                  disabled={offers.length === 0 || offers.length > maxOfertas}
                  loading={submitting}
                >
                  <Sparkles className="h-4 w-4" />
                  Evaluar con A-LexIA
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
  href,
}: {
  value: string;
  title: string;
  desc: string;
  active?: boolean;
  soon?: boolean;
  /**
   * Si está presente, al hacer click navega a esa ruta en lugar de
   * seleccionar el radio. Usado para opciones que viven en otro módulo
   * (Consultas y observaciones → /generador/consultas-observaciones).
   */
  href?: string;
}) {
  const router = useRouter();
  const isLink = !!href;
  return (
    <label
      onClick={isLink ? () => router.push(href) : undefined}
      className={cn(
        'relative flex flex-col gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all',
        active && 'border-brand-500 ring-2 ring-brand-500/20',
        soon && 'opacity-60 cursor-not-allowed',
        !active && !soon && 'hover:border-brand-400',
      )}
    >
      <div className="flex items-center justify-between">
        <RadioGroupItem value={value} disabled={soon || isLink} className={cn((soon || isLink) && 'opacity-0 hidden')} />
        {soon && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Próximamente
          </span>
        )}
        {isLink && !soon && (
          <span className="rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            Abrir módulo →
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
