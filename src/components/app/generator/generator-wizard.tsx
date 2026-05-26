'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  HardHat,
  Building2,
  Sparkles,
  FileText,
  ClipboardX,
  UserCog,
  Package,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AmpliacionPlazoForm } from '@/components/app/generator/ampliacion-plazo-form';

type Role = 'contratista' | 'area_usuaria';
type DocType = 'ampliacion_plazo' | 'cambio_personal' | 'descargo_penalidad' | 'cambio_bienes';

interface FormSubmitData {
  title: string;
  input_data: Record<string, unknown>;
}

const ROLES: Array<{
  id: Role;
  icon: typeof HardHat;
  title: string;
  desc: string;
  soon?: boolean;
}> = [
  {
    id: 'contratista',
    icon: HardHat,
    title: 'Contratista',
    desc: 'Documentos que el contratista dirige a la entidad',
  },
  {
    id: 'area_usuaria',
    icon: Building2,
    title: 'Área Usuaria',
    desc: 'Documentos internos de la entidad contratante',
    soon: true,
  },
];

const DOC_TYPES: Record<Role, Array<{
  id: DocType;
  icon: typeof FileText;
  title: string;
  desc: string;
  soon?: boolean;
}>> = {
  contratista: [
    {
      id: 'ampliacion_plazo',
      icon: FileText,
      title: 'Solicitud de ampliación de plazo',
      desc: 'Solicitud formal de ampliación con sustento normativo (Art. 197 del Reglamento).',
    },
    {
      id: 'cambio_personal',
      icon: UserCog,
      title: 'Cambio de personal clave',
      desc: 'Sustento técnico-legal para sustituir personal acreditado.',
      soon: true,
    },
    {
      id: 'descargo_penalidad',
      icon: ClipboardX,
      title: 'Descargo por penalidades',
      desc: 'Argumentación contra la aplicación de penalidades por mora.',
      soon: true,
    },
    {
      id: 'cambio_bienes',
      icon: Package,
      title: 'Cambio de bienes ofertados',
      desc: 'Justificación para sustituir bienes por equivalencia técnica.',
      soon: true,
    },
  ],
  area_usuaria: [],
};

export function GeneratorWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [docType, setDocType] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onFormSubmit(data: FormSubmitData) {
    if (!docType) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/generated-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: docType,
          title: data.title,
          input_data: data.input_data,
        }),
      });
      if (!res.ok) throw new Error();
      const { document } = await res.json();
      router.push(`/generador/${document.id}?generate=1`);
    } catch {
      toast.error('No se pudo crear el documento');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} />

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
                  ¿Desde qué rol vas a redactar?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Esto cambia el lenguaje, los destinatarios y los sustentos normativos
                  aplicables.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <RoleCard
                    key={r.id}
                    icon={r.icon}
                    title={r.title}
                    desc={r.desc}
                    active={role === r.id}
                    soon={r.soon}
                    onClick={() => !r.soon && setRole(r.id)}
                  />
                ))}
              </div>

              <p className="mt-5 text-[11px] text-muted-foreground text-center">
                Próximamente: Logística · Legal · Titular · Tribunal
              </p>

              <div className="mt-7 flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!role} size="lg">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && role && (
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
                  Selecciona el tipo de documento
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cada plantilla está calibrada con las reglas del Reglamento, opiniones del
                  OSCE y resoluciones del Tribunal.
                </p>
              </div>

              <div className="grid gap-3">
                {DOC_TYPES[role].map((d) => (
                  <DocTypeCard
                    key={d.id}
                    icon={d.icon}
                    title={d.title}
                    desc={d.desc}
                    active={docType === d.id}
                    soon={d.soon}
                    onClick={() => !d.soon && setDocType(d.id)}
                  />
                ))}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button onClick={() => setStep(3)} disabled={!docType} size="lg">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && docType === 'ampliacion_plazo' && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-8">
              <div className="mb-6">
                <h2 className="font-serif text-2xl tracking-tight mb-1">
                  Solicitud de ampliación de plazo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Completa los datos. LexIA redactará el documento con sustento normativo y te
                  llevará a un editor donde podrás ajustarlo antes de exportar.
                </p>
              </div>

              <AmpliacionPlazoForm
                onSubmit={onFormSubmit}
                onBack={() => setStep(2)}
                submitting={submitting}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: 'Rol' },
    { id: 2, label: 'Tipo' },
    { id: 3, label: 'Datos' },
  ];
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => {
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
            {i < steps.length - 1 && <span className="h-px w-8 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  desc,
  active,
  soon,
  onClick,
}: {
  icon: typeof HardHat;
  title: string;
  desc: string;
  active: boolean;
  soon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className={cn(
        'relative text-left rounded-xl border p-5 transition-all',
        soon && 'opacity-60 cursor-not-allowed',
        active && 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/30 dark:bg-brand-950/30',
        !active && !soon && 'border-border hover:border-brand-400 hover:-translate-y-0.5',
      )}
    >
      <span
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-lg mb-3',
          active
            ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <h3 className="font-semibold text-base mb-0.5">{title}</h3>
      <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
      {soon && (
        <span className="absolute top-3 right-3 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Próximamente
        </span>
      )}
    </button>
  );
}

function DocTypeCard({
  icon: Icon,
  title,
  desc,
  active,
  soon,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
  active: boolean;
  soon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={soon}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
        soon && 'opacity-60 cursor-not-allowed',
        active && 'border-brand-500 ring-2 ring-brand-500/20',
        !active && !soon && 'border-border hover:border-brand-400 hover:bg-secondary/30',
      )}
    >
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md mt-0.5',
          active
            ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
            : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          {soon && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Próximamente
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
