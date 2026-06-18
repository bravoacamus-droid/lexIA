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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  UNIDADES_MEDIDA,
  type Item,
  type ObjectoContractual,
} from '@/lib/requerimientos/catalog';

interface Props {
  items: Item[];
  objeto: ObjectoContractual;
  onChange: (next: Item[]) => void;
}

function newItem(numero: number, unidadDefault: string): Item {
  return {
    id: `itm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    numero,
    codigo: null,
    descripcion: '',
    unidad_medida: unidadDefault,
    cantidad: 1,
    precio_unitario_pen: null,
    marca_modelo: null,
  };
}

function renumber(list: Item[]): Item[] {
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

function defaultUnidad(objeto: ObjectoContractual): string {
  switch (objeto) {
    case 'bien':
      return 'UND';
    case 'servicio':
      return 'MES';
    case 'obra':
      return 'GLB';
    case 'consultoria_obra':
      return 'GLB';
  }
}

function SortableItem({
  item,
  isBien,
  onUpdate,
  onRemove,
}: {
  item: Item;
  isBien: boolean;
  onUpdate: (e: Item) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const subtotal = (item.precio_unitario_pen ?? 0) * (item.cantidad ?? 0);

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
        <span className="font-semibold text-sm">Ítem N° {item.numero}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Subtotal:{' '}
          <span className="font-semibold text-foreground">{fmtMoney(subtotal)}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-muted-foreground hover:text-destructive ml-1"
          aria-label="Eliminar ítem"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Código de catálogo (opcional)
            </Label>
            <Input
              value={item.codigo ?? ''}
              onChange={(e) =>
                onUpdate({
                  ...item,
                  codigo: e.target.value.trim() ? e.target.value.slice(0, 40) : null,
                })
              }
              maxLength={40}
              placeholder="43211503"
              className="mt-1 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Catálogo único (CUBSO) o referencia interna
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Descripción del ítem
            </Label>
            <Textarea
              value={item.descripcion}
              onChange={(e) =>
                onUpdate({ ...item, descripcion: e.target.value.slice(0, 500) })
              }
              rows={2}
              maxLength={500}
              placeholder={
                isBien
                  ? 'Ej. Computadora personal de escritorio'
                  : 'Ej. Servicio de mantenimiento preventivo mensual'
              }
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Unidad de medida
            </Label>
            <Select
              value={item.unidad_medida}
              onValueChange={(v) => onUpdate({ ...item, unidad_medida: v })}
            >
              <SelectTrigger className="mt-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES_MEDIDA.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Cantidad
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.cantidad}
              onChange={(e) => {
                const v = Number(e.target.value);
                onUpdate({
                  ...item,
                  cantidad: !isNaN(v) && v >= 0 ? v : 0,
                });
              }}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Precio unitario (S/)
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={item.precio_unitario_pen ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onUpdate({
                  ...item,
                  precio_unitario_pen: v !== null && !isNaN(v) ? v : null,
                });
              }}
              placeholder="0.00"
              className="mt-1 text-sm"
            />
          </div>

          {isBien && (
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Marca / Modelo (referencial)
              </Label>
              <Input
                value={item.marca_modelo ?? ''}
                onChange={(e) =>
                  onUpdate({
                    ...item,
                    marca_modelo: e.target.value.trim()
                      ? e.target.value.slice(0, 120)
                      : null,
                  })
                }
                maxLength={120}
                placeholder="O equivalente técnico"
                className="mt-1 text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ItemsStep({ items, objeto, onChange }: Props) {
  const [list, setList] = useState<Item[]>(() => items);
  const unidadDefault = defaultUnidad(objeto);
  const isBien = objeto === 'bien';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function sync(next: Item[]) {
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
    sync([...list, newItem(list.length + 1, unidadDefault)]);
  }

  function update(item: Item) {
    sync(list.map((x) => (x.id === item.id ? item : x)));
  }

  function remove(id: string) {
    sync(list.filter((x) => x.id !== id));
  }

  const valorReferencial = list.reduce(
    (acc, i) => acc + (i.precio_unitario_pen ?? 0) * (i.cantidad ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-brand-50 border border-brand-200/40 p-4 text-xs text-brand-900/80 leading-relaxed">
        <p className="font-semibold mb-1">¿Para qué sirve este paso?</p>
        Lista los <strong>ítems individuales</strong> que se contratarán.
        {isBien ? (
          <>
            {' '}Para bienes: cada modelo o producto distinto es un ítem. Para
            marca/modelo, recuerda agregar siempre "o equivalente técnico"
            para evitar direccionamiento.
          </>
        ) : objeto === 'servicio' ? (
          <>
            {' '}Para servicios: un ítem suele ser el servicio completo (unidad
            MES, GLB) o cada actividad mayor identificable.
          </>
        ) : (
          <>
            {' '}Para obras y consultorías de obra: las partidas principales
            del expediente técnico o las etapas del estudio.
          </>
        )}{' '}
        El total de precios × cantidades es el <strong>valor referencial</strong>{' '}
        de la contratación.
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border/60 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has registrado ningún ítem.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={add} className="mt-3">
            <Plus className="h-4 w-4" />
            Agregar primer ítem
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
                {list.map((i) => (
                  <SortableItem
                    key={i.id}
                    item={i}
                    isBien={isBien}
                    onUpdate={update}
                    onRemove={() => remove(i.id)}
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
            Agregar otro ítem
          </Button>

          <div className="flex items-center justify-between rounded-lg border border-brand-200/40 bg-brand-50/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {list.length} {list.length === 1 ? 'ítem' : 'ítems'} registrado{list.length === 1 ? '' : 's'}
            </span>
            <span className="font-semibold">
              Valor referencial:{' '}
              <span className="text-brand-700">{fmtMoney(valorReferencial)}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
