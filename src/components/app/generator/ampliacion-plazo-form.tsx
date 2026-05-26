'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { addDays, format, parseISO } from 'date-fns';

const schema = z.object({
  title: z.string().min(2, 'Da un nombre interno al documento').max(160),
  numero_contrato: z.string().min(1, 'Requerido').max(80),
  objeto_contrato: z.string().min(3, 'Requerido').max(200),
  entidad: z.string().min(3, 'Requerido').max(160),
  fecha_inicio: z.string().min(1, 'Requerido'),
  plazo_dias: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Número válido > 0'),
  dias_ampliacion: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Número válido > 0'),
  causal: z.string().min(1, 'Selecciona una causal'),
  descripcion: z.string().min(20, 'Describe el hecho con al menos 20 caracteres').max(3000),
});

type Values = z.infer<typeof schema>;

const CAUSALES = [
  { value: 'lluvias_caso_fortuito', label: 'Lluvias torrenciales y huaicos no previsibles (caso fortuito)' },
  { value: 'fuerza_mayor', label: 'Eventos de fuerza mayor' },
  { value: 'paralizacion_tercero', label: 'Paralización por causa de un tercero' },
  { value: 'atraso_entidad', label: 'Atraso de la entidad en el cumplimiento de sus obligaciones' },
  { value: 'modificacion_proyecto', label: 'Modificación del proyecto por la entidad' },
  { value: 'adicional_obra', label: 'Ejecución de prestaciones adicionales aprobadas' },
  { value: 'demora_valorizaciones', label: 'Demora en el pago de valorizaciones (afecta ruta crítica)' },
];

interface Props {
  onSubmit: (data: { title: string; input_data: Record<string, unknown> }) => void;
  onBack: () => void;
  submitting?: boolean;
}

export function AmpliacionPlazoForm({ onSubmit, onBack, submitting }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      numero_contrato: '',
      objeto_contrato: '',
      entidad: '',
      fecha_inicio: '',
      plazo_dias: '',
      dias_ampliacion: '',
      causal: '',
      descripcion: '',
    },
  });

  const fechaInicio = form.watch('fecha_inicio');
  const plazoDias = form.watch('plazo_dias');

  const fechaFinCalculada = useMemo(() => {
    if (!fechaInicio || !plazoDias) return null;
    const n = parseInt(plazoDias, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      const d = parseISO(fechaInicio);
      const end = addDays(d, n);
      return format(end, 'yyyy-MM-dd');
    } catch {
      return null;
    }
  }, [fechaInicio, plazoDias]);

  function submit(values: Values) {
    const causalLabel =
      CAUSALES.find((c) => c.value === values.causal)?.label || values.causal;
    onSubmit({
      title: values.title.trim(),
      input_data: {
        numero_contrato: values.numero_contrato,
        objeto_contrato: values.objeto_contrato,
        entidad: values.entidad,
        fecha_inicio: values.fecha_inicio,
        plazo_dias: values.plazo_dias,
        fecha_fin: fechaFinCalculada || '',
        dias_ampliacion: values.dias_ampliacion,
        causal: causalLabel,
        descripcion: values.descripcion,
      },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
      <Field
        label="Título interno"
        error={form.formState.errors.title?.message}
        hint="Solo para tu organización. No aparecerá en el documento."
      >
        <Input
          placeholder="Ampliación Carretera Tramo Sur — Huaicos abril 2025"
          maxLength={160}
          {...form.register('title')}
        />
      </Field>

      <Section title="Datos del contrato">
        <Field
          label="Número de contrato"
          error={form.formState.errors.numero_contrato?.message}
        >
          <Input placeholder="N° 042-2025-MTC" {...form.register('numero_contrato')} />
        </Field>
        <Field
          label="Objeto del contrato"
          error={form.formState.errors.objeto_contrato?.message}
        >
          <Input
            placeholder="Construcción carretera tramo sur, km 0+000 al km 18+500"
            {...form.register('objeto_contrato')}
          />
        </Field>
        <Field label="Entidad contratante" error={form.formState.errors.entidad?.message}>
          <Input
            placeholder="Ministerio de Transportes y Comunicaciones"
            {...form.register('entidad')}
          />
        </Field>
      </Section>

      <Section title="Plazos">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field
            label="Fecha de inicio"
            error={form.formState.errors.fecha_inicio?.message}
          >
            <Input type="date" {...form.register('fecha_inicio')} />
          </Field>
          <Field
            label="Plazo contractual (días)"
            error={form.formState.errors.plazo_dias?.message}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="90"
              {...form.register('plazo_dias')}
            />
          </Field>
          <Field label="Fecha fin programada (auto)">
            <Input
              type="date"
              value={fechaFinCalculada || ''}
              disabled
              className="bg-secondary/40"
            />
          </Field>
        </div>
        <Field
          label="Días de ampliación solicitados"
          error={form.formState.errors.dias_ampliacion?.message}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="15"
            className="max-w-[160px]"
            {...form.register('dias_ampliacion')}
          />
        </Field>
      </Section>

      <Section title="Causal de la ampliación">
        <Field label="Causal invocada" error={form.formState.errors.causal?.message}>
          <Select
            value={form.watch('causal') || undefined}
            onValueChange={(v) => form.setValue('causal', v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la causal" />
            </SelectTrigger>
            <SelectContent>
              {CAUSALES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Descripción detallada del hecho"
          error={form.formState.errors.descripcion?.message}
          hint="Sé específico: fechas, magnitud, impacto en la ruta crítica. LexIA lo redactará en lenguaje formal."
        >
          <Textarea
            placeholder="Entre los días 15 y 22 de abril de 2025 se presentaron lluvias torrenciales en la zona del proyecto, con precipitaciones que excedieron el 380% del promedio histórico según reporte SENAMHI N° 2025-04-22. Esto generó huaicos que afectaron el acceso al km 12+500, paralizando los trabajos de movimiento de tierras durante 8 días calendario consecutivos…"
            rows={6}
            {...form.register('descripcion')}
          />
        </Field>
      </Section>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
        <Button type="submit" size="lg" variant="glow" loading={submitting}>
          <Sparkles className="h-4 w-4" />
          Generar documento
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400 mb-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-border max-w-4" />
        {title}
        <span className="h-px flex-1 bg-border" />
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
