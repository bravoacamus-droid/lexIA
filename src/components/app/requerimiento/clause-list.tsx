'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Sparkles,
  PencilLine,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ClauseEditor } from './clause-editor';
import { getClauseCatalog } from '@/lib/requerimientos/catalog';
import type { ObjectoContractual } from '@/lib/requerimientos/catalog';
import { cn } from '@/lib/utils';

export interface Clause {
  id: string;
  label: string;
  order: number;
  included: boolean;
  mode: 'manual' | 'ai';
  content: string;
  ai_input: string;
  is_custom: boolean;
}

interface Props {
  requirementId: string;
  objeto: ObjectoContractual;
  initialClauses: Clause[];
  onSaveDraft: (clauses: Clause[]) => Promise<void>;
}

export function ClauseList({
  requirementId,
  objeto,
  initialClauses,
  onSaveDraft,
}: Props) {
  const catalog = getClauseCatalog(objeto);
  const placeholderMap = new Map(catalog.map((c) => [c.id, c.placeholder]));

  const [clauses, setClauses] = useState<Clause[]>(initialClauses);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setClauses((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex).map((c, i) => ({
        ...c,
        order: i,
      }));
      return reordered;
    });
  }

  function toggleIncluded(id: string) {
    setClauses((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, included: !c.included } : c,
      ),
    );
    // Auto-expandir cuando se incluye
    setExpandedId(id);
  }

  function updateClause(id: string, patch: Partial<Clause>) {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function addCustom() {
    const label = customLabel.trim().toUpperCase();
    if (label.length < 3) {
      toast.error('Nombra la cláusula');
      return;
    }
    const newId = `custom_${Date.now()}`;
    setClauses((prev) => [
      ...prev,
      {
        id: newId,
        label,
        order: prev.length,
        included: true,
        mode: 'manual' as const,
        content: '',
        ai_input: '',
        is_custom: true,
      },
    ]);
    setCustomLabel('');
    setShowAddCustom(false);
    setExpandedId(newId);
  }

  async function save() {
    setSaving(true);
    try {
      await onSaveDraft(clauses);
      toast.success('Cambios guardados');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={clauses.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {clauses.map((clause) => (
            <SortableClause
              key={clause.id}
              clause={clause}
              isExpanded={expandedId === clause.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === clause.id ? null : clause.id)
              }
              onToggleIncluded={() => toggleIncluded(clause.id)}
              onUpdate={(patch) => updateClause(clause.id, patch)}
              requirementId={requirementId}
              placeholder={placeholderMap.get(clause.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Agregar custom */}
      {showAddCustom ? (
        <Card className="p-4 flex items-center gap-2 border-dashed">
          <Input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Nombre de la nueva cláusula"
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCustom();
              if (e.key === 'Escape') {
                setShowAddCustom(false);
                setCustomLabel('');
              }
            }}
          />
          <Button onClick={addCustom} size="sm">
            Agregar
          </Button>
          <Button
            onClick={() => {
              setShowAddCustom(false);
              setCustomLabel('');
            }}
            variant="outline"
            size="sm"
          >
            Cancelar
          </Button>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddCustom(true)}
          className="w-full rounded-lg border border-dashed border-border bg-secondary/30 hover:bg-secondary/60 hover:border-brand-400 transition-all py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Cláusula personalizada
        </button>
      )}

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-3 bg-white border border-border rounded-xl px-4 py-3 shadow-lg">
        <p className="text-xs text-muted-foreground">
          {clauses.filter((c) => c.included).length} de {clauses.length} cláusulas
          incluidas
        </p>
        <Button onClick={save} loading={saving} variant="glow">
          <Check className="h-4 w-4" />
          Guardar
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// Item sortable individual
// ════════════════════════════════════════════════════════
interface ItemProps {
  clause: Clause;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleIncluded: () => void;
  onUpdate: (patch: Partial<Clause>) => void;
  requirementId: string;
  placeholder?: string;
}

function SortableClause({
  clause,
  isExpanded,
  onToggleExpand,
  onToggleIncluded,
  onUpdate,
  requirementId,
  placeholder,
}: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clause.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [enhancing, setEnhancing] = useState(false);

  async function enhanceWithAi() {
    if (!clause.ai_input.trim()) {
      toast.error('Escribe la información puntual primero');
      return;
    }
    setEnhancing(true);
    try {
      const res = await fetch(
        `/api/requerimientos/${requirementId}/enhance-clause`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clause_id: clause.id,
            user_input: clause.ai_input,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.message || json?.error || 'No se pudo profesionalizar',
        );
      }
      onUpdate({ content: json.content });
      toast.success(
        `Cláusula profesionalizada · ${json.tokens?.total ?? 0} tokens`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden transition-shadow',
        isDragging && 'shadow-2xl ring-2 ring-brand-300 z-10',
        clause.included && 'border-emerald-300 bg-emerald-50/30',
      )}
    >
      {/* Header con drag handle + checkbox + label */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors',
          clause.included && 'bg-emerald-100/50 hover:bg-emerald-100/70',
        )}
        onClick={onToggleExpand}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reordenar"
          className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <label
          className="flex items-center cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={clause.included}
            onChange={onToggleIncluded}
            className="h-4 w-4 rounded border-border accent-emerald-600"
          />
        </label>

        <p className="flex-1 text-sm font-semibold tracking-wide text-foreground">
          {clause.label}
          {clause.is_custom && (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              custom
            </span>
          )}
        </p>

        {clause.included && (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">
            {clause.mode === 'ai' ? 'IA' : 'Manual'}
          </span>
        )}

        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Cuerpo expandible */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border bg-white">
          {!clause.included && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2">
              <p className="text-xs text-amber-900">
                Esta cláusula está <strong>desmarcada</strong> — no se incluirá
                en el PDF. Activa el checkbox para incluirla.
              </p>
            </div>
          )}

          {/* Selector de modo */}
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/30">
            <button
              type="button"
              onClick={() => onUpdate({ mode: 'manual' })}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5',
                clause.mode === 'manual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <PencilLine className="h-3 w-3" />
              Pegar tal cual
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ mode: 'ai' })}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5',
                clause.mode === 'ai'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Sparkles className="h-3 w-3" />
              Mejorar con IA
            </button>
          </div>

          {clause.mode === 'ai' && (
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-brand-700">
                Información puntual (LexIA la profesionalizará)
              </label>
              <Textarea
                value={clause.ai_input}
                onChange={(e) => onUpdate({ ai_input: e.target.value })}
                placeholder="Escribe en formato libre: datos, fechas, montos, exigencias. LexIA usará la Ley 32069 y la base normativa para redactarlo formalmente."
                rows={4}
                className="text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  La salida reemplaza el contenido del editor de abajo.
                </p>
                <Button
                  type="button"
                  onClick={enhanceWithAi}
                  loading={enhancing}
                  size="sm"
                  variant="glow"
                  disabled={!clause.ai_input.trim()}
                >
                  {enhancing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Profesionalizar con IA
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Contenido de la cláusula
            </label>
            <div className="mt-1.5">
              <ClauseEditor
                value={clause.content}
                onChange={(html) => onUpdate({ content: html })}
                placeholder={placeholder?.replace(/<[^>]+>/g, '') || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
