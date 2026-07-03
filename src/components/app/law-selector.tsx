'use client';

import { Scale, CheckCircle2 } from 'lucide-react';

/**
 * Selector de Ley aplicable (32069 / 30225 / Ambas).
 *
 * Petición de César en Observaciones.docx: las opiniones, pronunciamientos
 * y resoluciones del Tribunal se refieren a la Ley 30225 (régimen anterior,
 * vigente hasta 24-abr-2025) o la Ley 32069 (vigente desde esa fecha).
 * El usuario debe poder acotar la búsqueda a una de las dos.
 *
 * Valores:
 *   null         → ambas (sin filtro)
 *   ['ley_32069'] → solo Ley 32069
 *   ['ley_30225'] → solo Ley 30225
 *
 * NO usamos el caso `['ley_32069', 'ley_30225']` como opción de UI
 * porque equivale a `null` para el RAG. Para mantener una sola
 * representación canónica de "ambas", siempre devolvemos null cuando
 * el usuario elige "Ambas".
 */
export type LawValue = 'ley_32069' | 'ley_30225';
export type LawFilter = LawValue[] | null;

export const LAW_LABELS: Record<LawValue, string> = {
  ley_32069: 'Ley 32069',
  ley_30225: 'Ley 30225',
};

export const LAW_DESCRIPTIONS: Record<LawValue, string> = {
  ley_32069: 'Vigente desde abr-2025 (LCEP + Reglamento DS 009-2025-EF)',
  ley_30225: 'Régimen anterior (LCE + Reglamento DS 344-2018-EF)',
};

interface Props {
  value: LawFilter;
  onChange: (v: LawFilter) => void;
  /** Densidad: 'sm' para selector inline, 'md' para vista principal. */
  size?: 'sm' | 'md';
  /** Etiqueta ARIA. */
  ariaLabel?: string;
}

export function LawSelector({ value, onChange, size = 'sm', ariaLabel }: Props) {
  const current: 'ambas' | LawValue = !value || value.length === 0 || value.length === 2
    ? 'ambas'
    : value[0];

  function set(next: 'ambas' | LawValue) {
    if (next === 'ambas') onChange(null);
    else onChange([next]);
  }

  const baseBtn =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs font-medium'
      : 'px-3 py-1.5 text-sm font-medium';

  const options: Array<{ key: 'ambas' | LawValue; label: string; title: string }> = [
    {
      key: 'ambas',
      label: 'Ambas',
      title: 'Buscar en jurisprudencia de Ley 30225 y Ley 32069',
    },
    {
      key: 'ley_32069',
      label: 'Ley 32069',
      title: LAW_DESCRIPTIONS.ley_32069,
    },
    {
      key: 'ley_30225',
      label: 'Ley 30225',
      title: LAW_DESCRIPTIONS.ley_30225,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel || 'Ley aplicable'}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 p-0.5"
    >
      <Scale className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
      {options.map((opt) => {
        const active = current === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => set(opt.key)}
            title={opt.title}
            className={`${baseBtn} rounded-md transition-colors ${
              active
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Variante prominente del selector de Ley — feedback César 01/07/2026:
 * "debe tener un apartado independiente, ser más visible y más grande".
 *
 * A diferencia del LawSelector inline (que va junto a filtros pequeños),
 * este componente se pensó como un banner destacado que se coloca ARRIBA
 * del contenido para que el usuario elija régimen normativo ANTES de
 * empezar a explorar. Muestra:
 *   - Título "Régimen normativo" con ícono
 *   - Descripción corta del filtro
 *   - 3 botones grandes con label y hint del régimen
 *
 * Se usa en Biblioteca y Buscador inteligente para reemplazar al selector
 * pequeño integrado con otros filtros.
 */
export function LawSelectorCard({ value, onChange }: Omit<Props, 'size' | 'ariaLabel'>) {
  const current: 'ambas' | LawValue =
    !value || value.length === 0 || value.length === 2 ? 'ambas' : value[0];

  function set(next: 'ambas' | LawValue) {
    if (next === 'ambas') onChange(null);
    else onChange([next]);
  }

  const options: Array<{
    key: 'ambas' | LawValue;
    label: string;
    hint: string;
    accent: string;
  }> = [
    {
      key: 'ambas',
      label: 'Ambas',
      hint: 'Ley 32069 + Ley 30225',
      accent: 'from-brand-500 to-brand-700',
    },
    {
      key: 'ley_32069',
      label: 'Ley 32069',
      hint: 'Vigente desde abr-2025',
      accent: 'from-emerald-500 to-emerald-700',
    },
    {
      key: 'ley_30225',
      label: 'Ley 30225',
      hint: 'Régimen anterior',
      accent: 'from-amber-500 to-amber-700',
    },
  ];

  return (
    <section
      role="radiogroup"
      aria-label="Régimen normativo"
      className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-50/40 via-card to-card dark:from-brand-950/30 dark:via-card dark:to-card p-5 sm:p-6"
    >
      <header className="flex items-center gap-3 mb-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md ring-1 ring-inset ring-white/20">
          <Scale className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-base sm:text-lg tracking-tight leading-tight">
            Régimen normativo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Elige la ley aplicable antes de buscar. Las opiniones, pronunciamientos y
            resoluciones responden a un régimen específico.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const active = current === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set(opt.key)}
              className={`group relative flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                active
                  ? 'border-brand-500 bg-white dark:bg-brand-950/40 shadow-md'
                  : 'border-border bg-background/60 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-background'
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-base font-semibold tracking-tight">
                  {opt.label}
                </span>
                {active && (
                  <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400 ml-auto" />
                )}
              </div>
              <span
                className={`text-[11px] font-medium leading-tight ${
                  active
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-muted-foreground'
                }`}
              >
                {opt.hint}
              </span>
              {/* Barra decorativa inferior con el acento del régimen. */}
              <div
                className={`absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-gradient-to-r ${opt.accent} transition-opacity ${
                  active ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
