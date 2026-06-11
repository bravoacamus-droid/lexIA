'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2,
  HardHat,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  MessageSquare,
  Library,
  FileSearch,
  FilePen,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoMark } from '@/components/brand';
import { cn } from '@/lib/utils';
import type { ProfileRole } from '@/lib/auth/session';
import { ROLE_DESCRIPTIONS } from '@/lib/navigation/menu-by-role';

interface Props {
  next: string;
  defaultFullName: string;
}

type Step = 1 | 2 | 3;

const ROLE_CARDS: Array<{
  id: ProfileRole;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: 'entity',
    title: 'Entidad pública',
    description: ROLE_DESCRIPTIONS.entity,
    icon: Building2,
  },
  {
    id: 'provider',
    title: 'Proveedor',
    description: ROLE_DESCRIPTIONS.provider,
    icon: HardHat,
  },
  {
    id: 'consultant',
    title: 'Consultor o capacitador',
    description: ROLE_DESCRIPTIONS.consultant,
    icon: Briefcase,
  },
];

const TOUR_CARDS: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    icon: MessageSquare,
    title: 'Chat con sustento normativo',
    body: 'Pregunta sobre la Ley 32069, el Reglamento, opiniones y resoluciones del Tribunal. Cada respuesta cita el artículo aplicable.',
  },
  {
    icon: Library,
    title: 'Biblioteca corporativa',
    body: 'Toda la normativa vigente al alcance. Marca, comenta y agrupa documentos en carpetas personalizadas.',
  },
  {
    icon: FileSearch,
    title: 'Evaluador de ofertas (entidad)',
    body: 'Sube las Bases Integradas y las ofertas de los postores. Te entrega el dictamen Cumple / Subsanable / No cumple por requisito con sustento.',
  },
  {
    icon: FilePen,
    title: 'Generadores de documentos',
    body: 'Redacta TDR, Estrategia de Contratación, Consultas y Observaciones, Pliego de Absolución y más, con la voz y forma correctas para cada perfil.',
  },
];

export function OnboardingWizard({ next, defaultFullName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [fullName, setFullName] = useState(defaultFullName);
  const [orgName, setOrgName] = useState('');
  const [ruc, setRuc] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function complete() {
    if (!role) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_role: role,
          full_name: fullName.trim(),
          organization_name: orgName.trim(),
          ruc: ruc.trim() || null,
          position_title: positionTitle.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = data as {
          error?: string;
          detail?: { fieldErrors?: Record<string, string[]> };
        };
        const errCode = err?.error || 'No se pudo guardar';
        const fieldIssues = err?.detail?.fieldErrors
          ? Object.entries(err.detail.fieldErrors)
              .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
              .join(' · ')
          : '';
        throw new Error(
          fieldIssues ? `${errCode} (${fieldIssues})` : errCode,
        );
      }
      toast.success('¡Listo! Bienvenido a LexIA.');
      router.push(next);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || 'Algo salió mal');
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-4xl py-8 sm:py-14">
      <header className="flex items-center justify-between mb-10">
        <LogoMark height={28} />
        <Stepper currentStep={step} />
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-8 sm:p-10 shadow-soft">
              <div className="mb-7">
                <p className="text-xs font-mono uppercase tracking-widest text-brand-600 mb-2">
                  Paso 1 de 3 · Perfil
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl tracking-tight mb-2">
                  ¿Cómo te describirías?
                </h1>
                <p className="text-muted-foreground">
                  La plataforma se adapta al perfil que elijas. Podrás cambiarlo
                  después desde tu cuenta.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {ROLE_CARDS.map((r) => (
                  <RoleCard
                    key={r.id}
                    icon={r.icon}
                    title={r.title}
                    description={r.description}
                    active={role === r.id}
                    onClick={() => setRole(r.id)}
                  />
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!role}
                  size="lg"
                  variant="glow"
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
            <Card className="p-8 sm:p-10 shadow-soft">
              <div className="mb-7">
                <p className="text-xs font-mono uppercase tracking-widest text-brand-600 mb-2">
                  Paso 2 de 3 · Datos
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl tracking-tight mb-2">
                  Cuéntanos un poco más
                </h1>
                <p className="text-muted-foreground">
                  Estos datos personalizan los documentos que generes y se
                  pueden modificar luego.
                </p>
              </div>

              <div className="grid gap-5">
                <Field
                  label="Tu nombre"
                  hint="Como aparecerá en los documentos que firmes."
                >
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. María Quispe Vargas"
                    maxLength={120}
                  />
                </Field>

                <Field
                  label={
                    role === 'entity'
                      ? 'Entidad / Institución'
                      : role === 'provider'
                        ? 'Razón social de la empresa'
                        : 'Empresa o organización'
                  }
                  hint="Nombre que se imprimirá en los oficios y declaraciones."
                >
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={
                      role === 'entity'
                        ? 'Municipalidad Distrital de…'
                        : 'Constructora del Sur S.A.C.'
                    }
                    maxLength={160}
                  />
                </Field>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field
                    label="RUC (opcional)"
                    hint="Lo usaremos solo en documentos donde corresponda."
                  >
                    <Input
                      value={ruc}
                      onChange={(e) =>
                        setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))
                      }
                      placeholder="20123456789"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field
                    label="Cargo (opcional)"
                    hint="Ej. Gerente, Residente, Especialista."
                  >
                    <Input
                      value={positionTitle}
                      onChange={(e) => setPositionTitle(e.target.value)}
                      placeholder="Subgerente de Logística"
                      maxLength={120}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!fullName.trim() || !orgName.trim()}
                  size="lg"
                  variant="glow"
                >
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
            <Card className="p-8 sm:p-10 shadow-soft">
              <div className="mb-7">
                <p className="text-xs font-mono uppercase tracking-widest text-brand-600 mb-2">
                  Paso 3 de 3 · Tour
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl tracking-tight mb-2">
                  Esto es lo que vas a tener
                </h1>
                <p className="text-muted-foreground">
                  Acceso completo durante 30 días sin pedir tarjeta. Después
                  eliges el plan que mejor te calce.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {TOUR_CARDS.map((t) => (
                  <TourTile key={t.title} icon={t.icon} title={t.title} body={t.body} />
                ))}
              </div>

              <div className="rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900 p-5 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">
                    Tu prueba gratuita ya está activa
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    30 días con acceso ilimitado. Sin cobros automáticos cuando
                    expire — tú decides si quieres seguir.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  onClick={complete}
                  loading={submitting}
                  size="lg"
                  variant="glow"
                >
                  Empezar a usar LexIA
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: Step }) {
  const steps = [1, 2, 3] as const;
  return (
    <div className="flex items-center gap-2">
      {steps.map((n, i) => {
        const isDone = n < currentStep;
        const isActive = n === currentStep;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                isDone && 'bg-brand-600 text-white',
                isActive && 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 ring-2 ring-brand-300 dark:ring-brand-700',
                !isDone && !isActive && 'bg-secondary text-muted-foreground',
              )}
            >
              {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  'h-px w-6 bg-border transition-colors',
                  isDone && 'bg-brand-300 dark:bg-brand-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative text-left rounded-xl border p-5 transition-all h-full',
        active
          ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-brand-950/30'
          : 'border-border hover:border-brand-300 dark:hover:border-brand-700 hover:-translate-y-0.5',
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
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {description}
      </p>
    </button>
  );
}

function TourTile({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 mb-3">
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
