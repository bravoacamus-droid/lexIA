'use client';

import { Scale } from 'lucide-react';

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
