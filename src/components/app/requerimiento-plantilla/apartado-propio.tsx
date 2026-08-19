'use client';

/**
 * Apartado que añade la entidad por su cuenta.
 *
 * Observación de César: "debe permitir agregar otros campos según la
 * necesidad de cada entidad". El formato oficial no lo prevé todo —hay
 * entidades con particularidades que no encajan en ningún numeral— y
 * hasta ahora no había dónde ponerlas.
 *
 * Se distingue en pantalla de los apartados del formato: los del
 * formato traen su instrucción y no se pueden borrar; este es del
 * usuario, título incluido, y desaparece si lo borra.
 */
import { Trash2, PenLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { ApartadoExtra } from '@/lib/generadores/ensamblador';

export function ApartadoPropio({
  extra,
  numero,
  onChange,
  onBorrar,
}: {
  extra: ApartadoExtra;
  /** Numeración que le toca en el documento, ya calculada. */
  numero: string;
  onChange: (cambio: Partial<ApartadoExtra>) => void;
  onBorrar: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <PenLine className="h-3.5 w-3.5" />
          Apartado añadido por la entidad
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onBorrar}
          className="h-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Quitar
        </Button>
      </div>

      <div className="mt-2">
        <Label htmlFor={`${extra.id}-titulo`} className="text-sm font-medium">
          Título del apartado {numero}
        </Label>
        <Input
          id={`${extra.id}-titulo`}
          value={extra.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
          placeholder="Cómo se llamará en el documento"
          className="mt-1.5"
        />
      </div>

      <div className="mt-3">
        <Label htmlFor={`${extra.id}-texto`} className="text-sm font-medium">
          Contenido
        </Label>
        <Textarea
          id={`${extra.id}-texto`}
          value={extra.texto}
          onChange={(e) => onChange({ texto: e.target.value })}
          rows={5}
          className="mt-1.5"
          placeholder="Lo que esta entidad necesita añadir y el formato oficial no contempla…"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          La revisión global también lo mira: al no venir del formato oficial, es de lo que más
          conviene contrastar contra la norma.
        </p>
      </div>
    </div>
  );
}
