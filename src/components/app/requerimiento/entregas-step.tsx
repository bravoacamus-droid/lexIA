'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Entrega } from '@/lib/requerimientos/catalog';

interface Props {
  entregas: Entrega[];
  onChange: (next: Entrega[]) => void;
}

function newEntrega(numero: number): Entrega {
  return {
    id: `ent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    numero,
    descripcion: '',
    plazo_dias: null,
    monto_pen: null,
    forma_pago: '',
  };
}

function renumber(list: Entrega[]): Entrega[] {
  return list.map((e, i) => ({ ...e, numero: i + 1 }));
}

function fmtMoney(n: number | null): string {
  if (n === null || isNaN(n)) return '—';
  return n.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SortableEntrega({
  entrega,
  onUpdate,
  onRemove,
}: {
  entrega: Entrega;
  onUpdate: (e: Entrega) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entrega.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : 'auto',
      }}
      className={cn(
        'rounded-lg border bg-card',
        isDragging
          ? 'shadow-xl ring-2 ring-brand-500/40'
          : 'border-border/60',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-secondary/30">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reordenar"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">Entrega N° {entrega.numero}</span>
        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="Eliminar entrega"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Descripción del entregable
          </Label>
          <Textarea
            value={entrega.descripcion}
            onChange={(e) =>
              onUpdate({ ...entrega, descripcion: e.target.value.slice(0, 600) })
            }
            rows={2}
            maxLength={600}
            placeholder="Ej. Informe mensual de avance del servicio con anexos fotográficos"
            className="mt-1 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Plazo (días calendario)
            </Label>
            <Input
              type="number"
              min={1}
              max={9999}
              value={entrega.plazo_dias ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onUpdate({
                  ...entrega,
                  plazo_dias: v !== null && !isNaN(v) ? v : null,
                });
              }}
              placeholder="30"
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Monto (S/)
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={entrega.monto_pen ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onUpdate({
                  ...entrega,
                  monto_pen: v !== null && !isNaN(v) ? v : null,
                });
              }}
              placeholder="0.00"
              className="mt-1 text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {fmtMoney(entrega.monto_pen)}
            </p>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Forma de pago
            </Label>
            <Input
              value={entrega.forma_pago}
              onChange={(e) =>
                onUpdate({ ...entrega, forma_pago: e.target.value.slice(0, 120) })
              }
              maxLength={120}
              placeholder="Ej. Mensual, contra conformidad"
              className="mt-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EntregasStep({ entregas, onChange }: Props) {
  const [list, setList] = useState<Entrega[]>(() => entregas);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function sync(next: Entrega[]) {
    const renum = renumber(next);
    setList(renum);
    onChange(renum);
  }

  function handleDragEnd(ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = list.findIndex((e) => e.id === active.id);
    const newIdx = list.findIndex((e) => e.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    sync(arrayMove(list, oldIdx, newIdx));
  }

  function add() {
    sync([...list, newEntrega(list.length + 1)]);
  }

  function update(e: Entrega) {
    sync(list.map((x) => (x.id === e.id ? e : x)));
  }

  function remove(id: string) {
    sync(list.filter((x) => x.id !== id));
  }

  const total = list.reduce((acc, e) => acc + (e.monto_pen ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-50 border border-brand-200/40 p-4 text-xs text-brand-900/80 leading-relaxed">
        <p className="font-semibold mb-1">¿Para qué sirve este paso?</p>
        Define el cronograma de entregas o hitos del contrato. Cada fila es
        una entrega con su plazo y monto a pagar. Para servicios continuos
        suele ser <strong>1 entrega por mes</strong>; para bienes únicos puede
        ser <strong>una sola entrega total</strong>; para obras suelen ser{' '}
        <strong>valorizaciones mensuales</strong> en base al avance físico.
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border/60 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has registrado ninguna entrega.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={add} className="mt-3">
            <Plus className="h-4 w-4" />
            Agregar primera entrega
          </Button>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={list.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {list.map((e) => (
                  <SortableEntrega
                    key={e.id}
                    entrega={e}
                    onUpdate={update}
                    onRemove={() => remove(e.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            className="w-full"
          >
            <Plus className="h-4 w-4" />
            Agregar otra entrega
          </Button>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {list.length} {list.length === 1 ? 'entrega' : 'entregas'} registrada{list.length === 1 ? '' : 's'}
            </span>
            <span className="font-semibold">
              Total: <span className="text-brand-700">{fmtMoney(total)}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
