'use client';

/**
 * Índice del requerimiento, en la columna derecha.
 *
 * Tres cosas que pidió César (18/08/2026): una X roja en lo que falta y
 * una palomita verde en lo completado, que al pulsar lleve al apartado,
 * y que se pueda subir y bajar por su cuenta sin arrastrar la página.
 *
 * Antes solo listaba lo que faltaba, así que no había forma de saber si
 * un apartado estaba hecho o simplemente no era obligatorio.
 */
import { useState } from 'react';
import { Check, X, Minus, ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EstadoEntrada, GrupoIndice } from '@/lib/generadores/indice';

const ICONO: Record<EstadoEntrada, { Icono: typeof Check; clase: string; titulo: string }> = {
  completo: { Icono: Check, clase: 'text-emerald-600', titulo: 'Completado' },
  pendiente: { Icono: X, clase: 'text-destructive', titulo: 'Sin completar' },
  opcional: { Icono: Minus, clase: 'text-muted-foreground/60', titulo: 'Opcional, sin completar' },
};

/**
 * Lleva al apartado y lo señala un momento.
 *
 * El resalte importa: en una pantalla llena de campos iguales, saltar
 * sin más deja al usuario sin saber dónde ha caído. Y se espera un
 * fotograma porque el apartado puede acabar de desplegarse: si se mide
 * antes, se salta a donde estaba el elemento, no a donde está.
 */
function irA(ancla: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(ancla);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
    }, 1600);
    const campo = el.querySelector<HTMLElement>('input, textarea, button');
    campo?.focus({ preventScroll: true });
  });
}

export function IndiceDocumento({
  grupos,
  resumen,
  onDesplegar,
}: {
  grupos: GrupoIndice[];
  resumen: { total: number; completas: number; pendientes: number };
  /** Despliega el apartado antes de saltar, por si estaba plegado. */
  onDesplegar: (idApartado: string) => void;
}) {
  const [soloPendientes, setSoloPendientes] = useState(false);

  const visibles = soloPendientes
    ? grupos
        .map((g) => ({ ...g, entradas: g.entradas.filter((e) => e.estado !== 'completo') }))
        .filter((g) => g.entradas.length > 0)
    : grupos;

  return (
    <Card className="flex max-h-[calc(100vh-7rem)] flex-col p-4">
      <div className="shrink-0">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ListChecks className="h-4 w-4" />
          Índice del documento
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="success">{resumen.completas} completos</Badge>
          <Badge variant={resumen.pendientes ? 'danger' : 'secondary'}>
            {resumen.pendientes} sin completar
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => setSoloPendientes((v) => !v)}
          className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {soloPendientes ? 'Ver el índice completo' : 'Ver solo lo que falta'}
        </button>
      </div>

      {/* Desplazamiento propio: el índice es largo y arrastrar la página
          entera para consultarlo es justo lo que no se quería. */}
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto border-t pt-3 pr-1">
        {visibles.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No queda ningún apartado obligatorio sin completar.
          </p>
        ) : (
          visibles.map((g) => (
            <div key={`${g.id}-${g.numero}`} style={{ paddingLeft: `${(g.nivel - 1) * 10}px` }}>
              <button
                type="button"
                onClick={() => {
                  onDesplegar(g.raiz);
                  irA(g.ancla);
                }}
                className={cn(
                  'flex w-full items-start gap-1.5 text-left text-xs hover:text-primary',
                  g.nivel === 1 ? 'font-semibold' : 'font-medium text-muted-foreground',
                )}
              >
                {g.entradas.length === 0 ? (
                  // Sección de solo texto invariable: no hay nada que
                  // completar, así que ni palomita ni aspa.
                  <Minus
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                    aria-label="Sin datos que completar"
                  />
                ) : g.pendientes === 0 ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
                <span>
                  {g.numero}. {g.titulo}
                </span>
              </button>

              {g.entradas.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-5">
                  {g.entradas.map((e) => {
                    const { Icono, clase, titulo } = ICONO[e.estado];
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onDesplegar(g.raiz);
                            irA(e.ancla);
                          }}
                          className="flex w-full items-start gap-1.5 text-left text-xs leading-relaxed text-muted-foreground hover:text-foreground"
                        >
                          <Icono
                            className={cn('mt-0.5 h-3 w-3 shrink-0', clase)}
                            aria-label={titulo}
                          />
                          <span>{e.etiqueta}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      <p className="mt-2 shrink-0 border-t pt-2 text-xs text-muted-foreground">
        <Minus className="mr-1 inline h-3 w-3" />
        gris: opcional, el formato no lo exige.
      </p>
    </Card>
  );
}
