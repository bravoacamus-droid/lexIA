'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClauseList, type Clause } from './clause-list';
import { EntregasStep } from './entregas-step';
import { ItemsStep } from './items-step';
import {
  OBJETO_LABELS,
  OBJETO_ANEXO_TITULOS,
  type ObjectoContractual,
  type Entrega,
  type Item,
} from '@/lib/requerimientos/catalog';
import { cn } from '@/lib/utils';

export interface RequirementInitial {
  id: string;
  nro: string | null;
  anio: number;
  objeto: ObjectoContractual;
  area_usuaria: string | null;
  denominacion: string;
  organo_unidad_organica: string | null;
  actividad_poi: string | null;
  clauses: Clause[];
  entregas: Entrega[];
  items: Item[];
  status: 'draft' | 'review' | 'final' | 'archived';
}

interface Props {
  initial: RequirementInitial;
}

type StepId = 'datos' | 'entregas' | 'items';
type AnexoTab = 'datos' | 'anexo';

const STEPS: Array<{ id: StepId; label: string; subtitle: string }> = [
  { id: 'datos', label: 'Datos generales', subtitle: 'Encabezado y cláusulas' },
  { id: 'entregas', label: 'Entregas y RTM', subtitle: 'Cronograma de pagos' },
  { id: 'items', label: 'Registro de ítems', subtitle: 'Detalle del contrato' },
];

export function RequirementView({ initial }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<StepId>('datos');
  const [anexoTab, setAnexoTab] = useState<AnexoTab>('datos');

  const [areaUsuaria, setAreaUsuaria] = useState(initial.area_usuaria || '');
  const [denominacion, setDenominacion] = useState(initial.denominacion);
  const [organoUnidad, setOrganoUnidad] = useState(
    initial.organo_unidad_organica || '',
  );
  const [actividadPoi, setActividadPoi] = useState(initial.actividad_poi || '');
  const [clauses, setClauses] = useState<Clause[]>(initial.clauses);
  const [entregas, setEntregas] = useState<Entrega[]>(initial.entregas);
  const [items, setItems] = useState<Item[]>(initial.items);

  const [savingHeader, setSavingHeader] = useState(false);
  const [savingEntregas, setSavingEntregas] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function patchRequirement(body: Record<string, unknown>) {
    const res = await fetch(`/api/requerimientos/${initial.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || `HTTP ${res.status}`);
    }
  }

  async function saveHeader() {
    setSavingHeader(true);
    try {
      await patchRequirement({
        area_usuaria: areaUsuaria.trim() || null,
        denominacion: denominacion.trim(),
        organo_unidad_organica: organoUnidad.trim() || null,
        actividad_poi: actividadPoi.trim() || null,
      });
      toast.success('Datos guardados');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingHeader(false);
    }
  }

  async function saveClauses(next: Clause[]) {
    setClauses(next);
    await patchRequirement({ clauses: next });
  }

  async function saveEntregas() {
    setSavingEntregas(true);
    try {
      await patchRequirement({ entregas });
      toast.success('Entregas guardadas');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingEntregas(false);
    }
  }

  async function saveItems() {
    setSavingItems(true);
    try {
      await patchRequirement({ items });
      toast.success('Ítems guardados');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingItems(false);
    }
  }

  async function exportToWord() {
    setExporting(true);
    try {
      const orderedIncluded = clauses.filter((c) => c.included);
      if (orderedIncluded.length === 0) {
        toast.error('Marca al menos una cláusula antes de generar el Word');
        setExporting(false);
        return;
      }
      // Pre-guardar TODO antes de exportar
      await patchRequirement({
        area_usuaria: areaUsuaria.trim() || null,
        denominacion: denominacion.trim(),
        organo_unidad_organica: organoUnidad.trim() || null,
        actividad_poi: actividadPoi.trim() || null,
        clauses,
        entregas,
        items,
      });

      const res = await fetch(
        `/api/requerimientos/${initial.id}/export?format=docx`,
        { method: 'GET' },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download =
        match?.[1] ||
        `requerimiento-${initial.objeto}-${initial.anio}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Documento Word descargado');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  function goToStep(idx: number) {
    if (idx < 0 || idx >= STEPS.length) return;
    setStep(STEPS[idx].id);
    // scroll suave hacia arriba
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const currentStepIdx = STEPS.findIndex((s) => s.id === step);
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === STEPS.length - 1;

  return (
    <div className="container max-w-5xl py-6 space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/generador/requerimiento">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              {OBJETO_LABELS[initial.objeto]}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              Año {initial.anio}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {initial.status === 'final'
                ? 'Final'
                : initial.status === 'review'
                  ? 'Revisión'
                  : 'Borrador'}
            </Badge>
          </div>
          <h1 className="font-semibold text-2xl tracking-tight truncate">
            {denominacion || 'Nuevo requerimiento'}
          </h1>
        </div>
        <Button onClick={exportToWord} loading={exporting} variant="glow">
          <FileDown className="h-4 w-4" />
          Generar Word
        </Button>
      </header>

      {/* Stepper */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <ol className="flex items-center gap-2 sm:gap-4">
          {STEPS.map((s, idx) => {
            const isActive = s.id === step;
            const isDone = idx < currentStepIdx;
            return (
              <li key={s.id} className="flex items-center gap-2 sm:gap-4 flex-1">
                <button
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={cn(
                    'flex items-center gap-2 sm:gap-3 text-left group flex-1 min-w-0',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                        : isDone
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-secondary text-muted-foreground group-hover:bg-secondary/80',
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                  </span>
                  <span className="min-w-0 hidden sm:block">
                    <span
                      className={cn(
                        'block text-xs font-semibold uppercase tracking-wider',
                        isActive
                          ? 'text-brand-700'
                          : isDone
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {s.subtitle}
                    </span>
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <span
                    className={cn(
                      'h-px flex-1 hidden sm:block',
                      isDone ? 'bg-brand-300' : 'bg-border',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* STEP 1 — Datos generales + Anexo */}
      {step === 'datos' && (
        <>
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setAnexoTab('datos')}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                anexoTab === 'datos'
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Datos del requerimiento
            </button>
            <button
              type="button"
              onClick={() => setAnexoTab('anexo')}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                anexoTab === 'anexo'
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Anexo N° 01-{initial.objeto === 'bien' ? 'B' : 'A'}
            </button>
          </div>

          {anexoTab === 'datos' && (
            <Card className="p-7 space-y-5">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
                1.1 Datos generales
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Objeto
                  </Label>
                  <Input
                    value={OBJETO_LABELS[initial.objeto]}
                    disabled
                    className="mt-1.5 bg-secondary/50"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Año
                  </Label>
                  <Input
                    value={initial.anio}
                    disabled
                    className="mt-1.5 bg-secondary/50"
                  />
                </div>
              </div>

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
                    Denominación de la contratación
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {denominacion.length}/500
                  </span>
                </div>
                <Textarea
                  value={denominacion}
                  onChange={(e) =>
                    setDenominacion(e.target.value.slice(0, 500))
                  }
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveHeader} loading={savingHeader}>
                  Guardar datos generales
                </Button>
              </div>
            </Card>
          )}

          {anexoTab === 'anexo' && (
            <div className="space-y-5">
              <Card className="p-7 space-y-5">
                <div className="text-center mb-3">
                  <h2 className="font-semibold text-xl tracking-wide">
                    {OBJETO_ANEXO_TITULOS[initial.objeto]}
                  </h2>
                </div>

                <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
                  1. Datos generales
                </p>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Órgano y/o Unidad orgánica
                  </Label>
                  <Textarea
                    value={organoUnidad}
                    onChange={(e) =>
                      setOrganoUnidad(e.target.value.slice(0, 100))
                    }
                    rows={2}
                    maxLength={100}
                    className="mt-1.5"
                    placeholder="Ej. ABASTECIMIENTO"
                  />
                  <p className="text-[10px] text-right text-muted-foreground mt-0.5">
                    {organoUnidad.length}/100
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actividad del POI / Acción Estratégica PEI
                  </Label>
                  <Textarea
                    value={actividadPoi}
                    onChange={(e) =>
                      setActividadPoi(e.target.value.slice(0, 500))
                    }
                    rows={3}
                    maxLength={500}
                    className="mt-1.5"
                    placeholder="Indica la actividad del POI o la acción estratégica del PEI a la que se vincula la contratación"
                  />
                  <p className="text-[10px] text-right text-muted-foreground mt-0.5">
                    {actividadPoi.length}/500
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Denominación de la contratación
                  </Label>
                  <Textarea
                    value={denominacion}
                    disabled
                    rows={2}
                    className="mt-1.5 bg-secondary/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Se hereda del tab "Datos del requerimiento"
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={saveHeader}
                    loading={savingHeader}
                    size="sm"
                  >
                    Guardar datos generales
                  </Button>
                </div>
              </Card>

              <Card className="p-7">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
                    2. Cláusulas del anexo
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Marca las que aplican · arrastra para reordenar · expande
                    para editar
                  </p>
                </div>

                <ClauseList
                  requirementId={initial.id}
                  objeto={initial.objeto}
                  initialClauses={clauses}
                  onSaveDraft={saveClauses}
                />
              </Card>
            </div>
          )}
        </>
      )}

      {/* STEP 2 — Entregas y RTM */}
      {step === 'entregas' && (
        <Card className="p-7 space-y-5">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
            2. Registro de entregas y RTM
          </p>

          <EntregasStep entregas={entregas} onChange={setEntregas} />

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              onClick={saveEntregas}
              loading={savingEntregas}
              size="sm"
            >
              Guardar entregas
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3 — Ítems */}
      {step === 'items' && (
        <Card className="p-7 space-y-5">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
            3. Registro de ítems
          </p>

          <ItemsStep
            items={items}
            objeto={initial.objeto}
            onChange={setItems}
          />

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button onClick={saveItems} loading={savingItems} size="sm">
              Guardar ítems
            </Button>
          </div>
        </Card>
      )}

      {/* Navegación entre pasos */}
      <div className="sticky bottom-3 z-40 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => goToStep(currentStepIdx - 1)}
          disabled={isFirstStep}
        >
          <ChevronLeft className="h-4 w-4" />
          Atrás
        </Button>

        <span className="text-xs text-muted-foreground hidden sm:block">
          Paso {currentStepIdx + 1} de {STEPS.length} ·{' '}
          <span className="font-semibold text-foreground">
            {STEPS[currentStepIdx].label}
          </span>
        </span>

        {isLastStep ? (
          <Button onClick={exportToWord} loading={exporting} size="sm" variant="glow">
            <FileDown className="h-4 w-4" />
            Generar Word
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => goToStep(currentStepIdx + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
