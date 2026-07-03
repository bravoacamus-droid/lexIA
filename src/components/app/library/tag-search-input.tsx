'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Tags activos (controlado). */
  tags: string[];
  /** Texto en curso del input (controlado). */
  input: string;
  onTagsChange: (next: string[]) => void;
  onInputChange: (next: string) => void;
  loading?: boolean;
  placeholder?: string;
  /** Máximo de tags. */
  maxTags?: number;
  /**
   * Si true, NO muestra el spinner interno a la derecha del input.
   * Útil cuando el consumidor renderiza su propio loader (ej: lottie
   * animado centrado debajo del buscador — feedback César 01/07/2026).
   */
  hideBuiltInLoader?: boolean;
  /** Color del chip — usamos los mismos colores del resaltado para coherencia. */
}

/**
 * Input de búsqueda que acepta múltiples términos como chips
 * concatenables. Inspirado en el feature de LEX Contrataciones pero
 * con identidad visual LexIA (azul brand, fondo claro).
 *
 * Interacción:
 *   - Enter (o coma) → convierte el input actual en chip
 *   - Backspace con input vacío → elimina último chip
 *   - X en cada chip → eliminar
 *   - Acepta queries en español: el chip preserva mayúsculas
 *
 * El componente NO ejecuta la búsqueda — solo gestiona el estado.
 * El consumidor llama a la API cuando `tags` o `input` debounceado
 * cambian.
 */
export function TagSearchInput({
  tags,
  input,
  onTagsChange,
  onInputChange,
  loading = false,
  placeholder = 'Busca por palabras clave… (Enter para agregar tag)',
  maxTags = 8,
  hideBuiltInLoader = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);

  function commitInput() {
    const v = input.trim().replace(/,$/, '').trim();
    if (!v) return;
    if (v.length < 2) return;
    if (tags.length >= maxTags) return;
    if (tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      // Si ya existe, solo limpiar input para evitar duplicados
      onInputChange('');
      return;
    }
    onTagsChange([...tags, v]);
    onInputChange('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput();
      return;
    }
    if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      commitInput();
      return;
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      // Eliminar último chip
      onTagsChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'relative flex flex-wrap items-center gap-1.5 min-h-[3rem] rounded-xl border border-input bg-background pl-11 pr-3 py-1.5 shadow-sm transition-colors cursor-text',
        focused && 'border-brand-500 ring-2 ring-brand-500/20',
      )}
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      {tags.map((tag, i) => (
        <TagChip
          key={`${tag}-${i}`}
          tag={tag}
          colorIndex={i}
          onRemove={() => onTagsChange(tags.filter((_, j) => j !== i))}
        />
      ))}

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setFocused(false);
          // Commit del input cuando pierde foco para no perder lo escrito
          if (input.trim()) commitInput();
        }}
        onFocus={() => setFocused(true)}
        placeholder={tags.length === 0 ? placeholder : 'Agregar otra…'}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
        aria-label="Buscar por palabras clave"
      />

      {loading && !hideBuiltInLoader && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

/**
 * Paleta rotativa para chips/highlights. Sigue paleta brand pero
 * usando combinaciones suaves que no choquen visualmente.
 * Cada index corresponde al mismo color en HighlightedText.
 */
export const TAG_COLORS = [
  'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300/60',
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300/60',
  'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200 border-sky-300/60',
  'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border-rose-300/60',
  'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200 border-violet-300/60',
  'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-300/60',
  'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border-teal-300/60',
  'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200 border-pink-300/60',
];

function TagChip({
  tag,
  colorIndex,
  onRemove,
}: {
  tag: string;
  colorIndex: number;
  onRemove: () => void;
}) {
  const color = TAG_COLORS[colorIndex % TAG_COLORS.length];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        color,
      )}
    >
      <span className="max-w-[180px] truncate">{tag}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors -mr-0.5"
        aria-label={`Quitar tag ${tag}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
