'use client';

import { cn, DOC_TYPE_META } from '@/lib/utils';
import type { NormativeDocType } from '@/lib/supabase/types';

interface Props {
  value: NormativeDocType | null;
  onChange: (v: NormativeDocType | null) => void;
  counts: Record<string, number>;
}

const ORDER: NormativeDocType[] = [
  'ley',
  'reglamento',
  'directiva',
  'opinion',
  'pronunciamiento',
  'resolucion_tce',
];

export function TypeFilter({ value, onChange, counts }: Props) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FilterChip
        active={value === null}
        onClick={() => onChange(null)}
      >
        Todos
        <span className="ml-1 opacity-60 font-mono text-[10px]">{total}</span>
      </FilterChip>

      {ORDER.map((type) => {
        const meta = DOC_TYPE_META[type];
        const count = counts[type] || 0;
        if (count === 0) return null;
        return (
          <FilterChip
            key={type}
            active={value === type}
            onClick={() => onChange(value === type ? null : type)}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: meta.tagColor }}
            />
            {meta.label}
            <span className="ml-1 opacity-60 font-mono text-[10px]">{count}</span>
          </FilterChip>
        );
      })}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all',
        active
          ? 'bg-brand-700 border-brand-700 text-white dark:bg-brand-600 dark:border-brand-600 shadow-sm'
          : 'border-border bg-card text-muted-foreground hover:border-brand-400 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
