'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Zap,
  FileText,
  Package,
  Users,
  Hammer,
  Building2,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  getTemplatesForObjeto,
  type RequirementTemplate,
} from '@/lib/requerimientos/templates';
import {
  CATEGORIA_TREE,
  SUBTIPO_META,
  getBaseObjeto,
  type RegimenRequerimiento,
  type SubtipoRequerimiento,
} from '@/lib/requerimientos/subtipos';
import { cn } from '@/lib/utils';

/**
 * Wizard de 2 pasos:
 *   Paso 1 → Selección jerárquica de régimen + subtipo
 *   Paso 2 → Datos generales (año, área usuaria, denominación) + plantilla
 */
export function NuevoRequerimientoForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // ─── Paso 1: régimen y subtipo ────────────────────────────────
  const [regimen, setRegimen] = useState<RegimenRequerimiento | null>(null);
  const [subtipo, setSubtipo] = useState<SubtipoRequerimiento | null>(null);

  // ─── Paso 2: datos generales ──────────────────────────────────
  const [anio, setAnio] = useState<number>(new Date().getUTCFullYear());
  const [areaUsuaria, setAreaUsuaria] = useState('');
  const [denominacion, setDenominacion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [denomFromTpl, setDenomFromTpl] = useState(false);
  const [areaFromTpl, setAreaFromTpl] = useState(false);

  const baseObjeto = subtipo ? getBaseObjeto(subtipo) : null;

  const templates: RequirementTemplate[] = useMemo(() => {
    if (!baseObjeto) return [];
    return getTemplatesForObjeto(baseObjeto);
  }, [baseObjeto]);

  // Al cambiar de subtipo, limpiamos la plantilla elegida
  useEffect(() => {
    setTemplateId(null);
    if (denomFromTpl) {
      setDenominacion('');
      setDenomFromTpl(false);
    }
    if (areaFromTpl) {
      setAreaUsuaria('');
      setAreaFromTpl(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtipo]);

  function pickTemplate(tpl: RequirementTemplate | null) {
    if (tpl === null) {
      setTemplateId(null);
      return;
    }
    setTemplateId(tpl.id);
    if (!denominacion || denomFromTpl) {
      setDenominacion(tpl.denominacion);
      setDenomFromTpl(true);
    }
    if (!areaUsuaria || areaFromTpl) {
      if (tpl.area_usuaria_sugerida) {
        setAreaUsuaria(tpl.area_usuaria_sugerida);
        setAreaFromTpl(true);
      }
    }
  }

  function goToStep2() {
    if (!subtipo) {
      toast.error('Selecciona un tipo específico de contratación');
      return;
    }
    setStep(2);
  }

  async function submit() {
    if (!subtipo) {
      toast.error('Selecciona el tipo de contratación');
      return;
    }
    if (denominacion.trim().length < 5) {
      toast.error('La denominación debe ser más descriptiva');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/requerimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anio,
          regimen,
          subtipo,
          objeto: baseObjeto,
          area_usuaria: areaUsuaria.trim() || undefined,
          denominacion: denominacion.trim(),
          template_id: templateId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'No se pudo crear');
      }
      toast.success(
        templateId
          ? 'Requerimiento creado con plantilla aplicada'
          : 'Requerimiento creado',
      );
      router.push(`/generador/requerimiento/${json.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-4xl py-8 space-y-5">
      <header>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href="/generador/requerimiento">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="font-semibold text-3xl tracking-tight">
          Nuevo requerimiento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Empecemos por elegir qué tipo de contratación vas a realizar. LexIA
          adaptará las cláusulas y la redacción al régimen correspondiente.
        </p>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        <StepPill num={1} label="Tipo de contratación" active={step === 1} done={step > 1} />
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <StepPill num={2} label="Datos generales" active={step === 2} done={false} />
      </div>

      {step === 1 && (
        <Step1SelectorSubtipo
          regimen={regimen}
          subtipo={subtipo}
          onRegimen={setRegimen}
          onSubtipo={setSubtipo}
          onContinue={goToStep2}
        />
      )}

      {step === 2 && subtipo && (
        <Step2Datos
          subtipo={subtipo}
          anio={anio}
          setAnio={setAnio}
          areaUsuaria={areaUsuaria}
          setAreaUsuaria={(v) => {
            setAreaUsuaria(v);
            setAreaFromTpl(false);
          }}
          denominacion={denominacion}
          setDenominacion={(v) => {
            setDenominacion(v);
            setDenomFromTpl(false);
          }}
          templates={templates}
          templateId={templateId}
          onPickTemplate={pickTemplate}
          submitting={submitting}
          onBack={() => setStep(1)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function StepPill({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium',
        active
          ? 'bg-brand-600 text-white'
          : done
            ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-secondary/60 text-muted-foreground',
      )}
    >
      {done ? (
        <Check className="h-3 w-3" />
      ) : (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full text-[10px] font-bold',
            active
              ? 'bg-white/20 text-white h-4 w-4'
              : 'bg-muted text-muted-foreground h-4 w-4',
          )}
        >
          {num}
        </span>
      )}
      {label}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Paso 1 — Selector jerárquico: régimen → categoría → subtipo
// ══════════════════════════════════════════════════════════════════════
function Step1SelectorSubtipo({
  regimen,
  subtipo,
  onRegimen,
  onSubtipo,
  onContinue,
}: {
  regimen: RegimenRequerimiento | null;
  subtipo: SubtipoRequerimiento | null;
  onRegimen: (r: RegimenRequerimiento | null) => void;
  onSubtipo: (s: SubtipoRequerimiento | null) => void;
  onContinue: () => void;
}) {
  const regimenNode = CATEGORIA_TREE.find((r) => r.regimen === regimen);

  return (
    <Card className="p-7 space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 mb-2">
          Paso 1.1 · Régimen
        </p>
        <h2 className="font-semibold text-lg mb-1">
          ¿Qué tipo de contratación vas a realizar?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Los contratos menores a 8 UIT no requieren procedimiento formal ni
          RNP. Los procedimientos de selección sí, y tienen su propio ciclo.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {CATEGORIA_TREE.map((r) => (
            <button
              key={r.regimen}
              type="button"
              onClick={() => {
                onRegimen(r.regimen);
                onSubtipo(null);
              }}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                regimen === r.regimen
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-border/60 hover:border-border bg-card hover:bg-secondary/30',
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-semibold text-sm leading-tight">{r.label}</span>
                {regimen === r.regimen && (
                  <Check className="h-4 w-4 text-brand-600 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {r.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {regimenNode && (
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600 mb-2">
            Paso 1.2 · Tipo específico
          </p>
          <h3 className="font-semibold text-base mb-1">
            Elige el tipo puntual dentro de{' '}
            {regimenNode.label.replace(/^[IV]+\.\s*/, '')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            LexIA adaptará las cláusulas del anexo (RNP, ficha técnica de Perú
            Compras, Gestión de Instalaciones, Diseño y Construcción, etc.) al
            subtipo elegido.
          </p>

          <div className="space-y-5">
            {regimenNode.categorias.map((cat) => (
              <div key={cat.key}>
                {regimenNode.categorias.length > 1 && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    {iconForCategoria(cat.key)}
                    {cat.label}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {cat.children.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => onSubtipo(c.key)}
                      className={cn(
                        'rounded-lg border-2 p-3.5 text-left transition-all',
                        subtipo === c.key
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                          : 'border-border/60 hover:border-border bg-card hover:bg-secondary/30',
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm leading-tight">
                          {c.label}
                        </span>
                        {subtipo === c.key && (
                          <Check className="h-4 w-4 text-brand-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {c.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={onContinue}
          size="lg"
          variant="glow"
          disabled={!subtipo}
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function iconForCategoria(key: string) {
  if (key.includes('bien')) return <Package className="h-3.5 w-3.5 text-brand-600" />;
  if (key.includes('servicio')) return <Users className="h-3.5 w-3.5 text-brand-600" />;
  if (key.includes('cobra') || key.includes('consultoria'))
    return <Building2 className="h-3.5 w-3.5 text-brand-600" />;
  if (key.includes('obra')) return <Hammer className="h-3.5 w-3.5 text-brand-600" />;
  return <FileText className="h-3.5 w-3.5 text-brand-600" />;
}

// ══════════════════════════════════════════════════════════════════════
// Paso 2 — Datos generales + plantilla
// ══════════════════════════════════════════════════════════════════════
function Step2Datos({
  subtipo,
  anio,
  setAnio,
  areaUsuaria,
  setAreaUsuaria,
  denominacion,
  setDenominacion,
  templates,
  templateId,
  onPickTemplate,
  submitting,
  onBack,
  onSubmit,
}: {
  subtipo: SubtipoRequerimiento;
  anio: number;
  setAnio: (v: number) => void;
  areaUsuaria: string;
  setAreaUsuaria: (v: string) => void;
  denominacion: string;
  setDenominacion: (v: string) => void;
  templates: RequirementTemplate[];
  templateId: string | null;
  onPickTemplate: (t: RequirementTemplate | null) => void;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const meta = SUBTIPO_META[subtipo];

  return (
    <Card className="p-7 space-y-5">
      {/* Resumen del tipo elegido */}
      <div className="rounded-lg border border-brand-200 bg-brand-50/60 dark:bg-brand-950/30 dark:border-brand-800 p-3.5">
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span className="text-[10px] uppercase tracking-widest font-semibold text-brand-700 dark:text-brand-300">
            Tipo de contratación seleccionado
          </span>
        </div>
        <p className="font-semibold text-sm">{meta.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {meta.description}
        </p>
      </div>

      <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
        Paso 2 · Datos generales del requerimiento
      </p>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nro
          </Label>
          <Input value="(Autogenerado)" disabled className="mt-1.5 bg-secondary/50" />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Año <span className="text-rose-500">*</span>
          </Label>
          <Input
            type="number"
            min={2024}
            max={2100}
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value || '2026', 10))}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Objeto base
          </Label>
          <Input
            value={
              meta.baseObjeto === 'bien'
                ? 'Bien'
                : meta.baseObjeto === 'servicio'
                  ? 'Servicio'
                  : meta.baseObjeto === 'obra'
                    ? 'Obra'
                    : 'Consultoría de Obra'
            }
            disabled
            className="mt-1.5 bg-secondary/50"
          />
        </div>
      </div>

      {/* Selector de plantilla — solo si hay plantillas disponibles */}
      {templates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-brand-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              ¿Quieres partir de una plantilla? (opcional)
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Las plantillas marcan cláusulas, pre-rellenan contenido típico de
            ese tipo de contratación y sugieren entregas e ítems. Después
            puedes editar todo libremente.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onPickTemplate(null)}
              className={cn(
                'rounded-lg border-2 p-4 text-left transition-all',
                templateId === null
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-border/60 hover:border-border bg-card hover:bg-secondary/30',
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Empezar de cero</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Estructura del Anexo vacía. Marcas las cláusulas y rellenas tú
                o con ayuda de la IA.
              </p>
            </button>

            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onPickTemplate(tpl)}
                className={cn(
                  'rounded-lg border-2 p-4 text-left transition-all',
                  templateId === tpl.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-border/60 hover:border-border bg-card hover:bg-secondary/30',
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="h-4 w-4 text-brand-600" />
                  <span className="font-semibold text-sm">{tpl.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Área usuaria
        </Label>
        <Input
          value={areaUsuaria}
          onChange={(e) => setAreaUsuaria(e.target.value)}
          placeholder="Ej. Sub Dirección de Tecnologías de Información"
          maxLength={160}
          className="mt-1.5"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Denominación de la contratación{' '}
            <span className="text-rose-500">*</span>
          </Label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {denominacion.length}/500
          </span>
        </div>
        <Textarea
          value={denominacion}
          onChange={(e) => setDenominacion(e.target.value.slice(0, 500))}
          placeholder="Ej. ADQUISICIÓN DE COMPUTADORAS PERSONALES PARA LA DIRECCIÓN ADMINISTRATIVA"
          rows={4}
          maxLength={500}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button onClick={onBack} variant="ghost">
          <ArrowLeft className="h-4 w-4" />
          Cambiar tipo
        </Button>
        <Button onClick={onSubmit} size="lg" variant="glow" loading={submitting}>
          <Sparkles className="h-4 w-4" />
          {templateId ? 'Crear con plantilla' : 'Crear y continuar'}
        </Button>
      </div>
    </Card>
  );
}
