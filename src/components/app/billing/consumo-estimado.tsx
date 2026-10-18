'use client';

/**
 * Consumo estimado antes de ejecutar una tarea cara (regla de César en
 * «PLANES DE A-LEXIA»: «antes de ejecutar, el sistema debe mostrar el
 * consumo estimado»). Una evaluación de cinco ofertas son 150 créditos:
 * el usuario tiene que saberlo antes de pulsar, no al ver el saldo
 * después.
 *
 * Dos formas:
 *   · `useConfirmarConsumo()` → un diálogo de confirmación (evaluador de
 *     ofertas, evaluación de bases), que se abre con `await confirmar()`.
 *   · `<LineaDeConsumo>` → una línea dentro de un formulario que ya tiene
 *     su propio botón de confirmar (crear un requerimiento).
 *
 * El saldo y el costo salen de GET /api/cuenta/plan, que lee la misma
 * tabla de costos que cobra el servidor (creditos.ts), así que lo que se
 * anuncia es lo que se descuenta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Coins, MessageCircle } from 'lucide-react';
import type { Herramienta } from '@/lib/billing/creditos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { enlaceWhatsApp } from '@/lib/billing/catalogo';

interface ResumenDePlanApi {
  plan: { id: string; nombre: string };
  creditos: { disponibles: number; vencido: boolean };
  herramientas: Array<{ id: Herramienta; nombre: string; costo: number; incluida: boolean }>;
  limite: { texto: string; usados: number; maximo: number } | null;
}

export interface Estimacion {
  herramienta: Herramienta;
  /** Ofertas de una evaluación; 1 en lo demás. */
  unidades?: number;
  /** «Esta evaluación», «Este requerimiento». */
  que: string;
  /** «por oferta» cuando el costo se multiplica. */
  porUnidad?: string;
}

interface Calculo {
  creditos: number;
  costo: number;
  disponibles: number;
  plan: string;
  planId: string;
  /** Lo que impide ejecutar, si algo lo impide. */
  impedimento: string | null;
  aviso: string | null;
}

function calcular(r: ResumenDePlanApi, e: Estimacion): Calculo {
  const h = r.herramientas.find((x) => x.id === e.herramienta);
  const unidades = Math.max(1, e.unidades ?? 1);
  const costo = h?.costo ?? 0;
  const creditos = costo * unidades;
  let impedimento: string | null = null;
  let aviso: string | null = null;
  if (r.creditos.vencido) impedimento = `Tu plan ${r.plan.nombre} no está vigente.`;
  else if (h && !h.incluida) impedimento = `${h.nombre} no está incluida en tu plan ${r.plan.nombre}.`;
  else if (r.plan.id === 'profesional' && e.herramienta === 'evaluacion_ofertas' && unidades > 2)
    impedimento = `En el plan Profesional cada análisis admite hasta 2 ofertas y aquí hay ${unidades}. Quita ${unidades - 2} o pasa al plan Especialista.`;
  else if (r.limite && r.limite.usados >= r.limite.maximo && limitada(r.plan.id, e.herramienta))
    impedimento = `Ya usaste las ${r.limite.maximo} operaciones del mes que incluye tu plan (${r.limite.texto.toLowerCase()}).`;
  else if (r.creditos.disponibles < creditos)
    impedimento = `Te faltan ${creditos - r.creditos.disponibles} créditos. Puedes recargar por WhatsApp.`;
  if (!impedimento && r.limite && limitada(r.plan.id, e.herramienta))
    aviso = `${r.limite.texto}: llevas ${r.limite.usados} de ${r.limite.maximo} este mes.`;
  return { creditos, costo, disponibles: r.creditos.disponibles, plan: r.plan.nombre, planId: r.plan.id, impedimento, aviso };
}

function limitada(plan: string, h: Herramienta) {
  return (
    (plan === 'consulta' && (h === 'requerimiento_menor' || h === 'evaluacion_requerimiento_menor')) ||
    (plan === 'profesional' && h === 'evaluacion_ofertas')
  );
}

async function leerPlan(): Promise<ResumenDePlanApi | null> {
  try {
    const r = await fetch('/api/cuenta/plan', { cache: 'no-store' });
    return r.ok ? ((await r.json()) as ResumenDePlanApi) : null;
  } catch {
    return null;
  }
}

const n = (x: number) => x.toLocaleString('es-PE');

function textoDeConsumo(e: Estimacion, c: Calculo) {
  const detalle = e.porUnidad ? ` (${c.costo} ${e.porUnidad})` : '';
  return `${e.que} usará ${n(c.creditos)} crédito${c.creditos === 1 ? '' : 's'}${detalle}. Te quedan ${n(c.disponibles)}.`;
}

function botonWhatsApp(c: Calculo) {
  const texto =
    c.impedimento && c.impedimento.startsWith('Te faltan')
      ? `Hola, uso A-LexIA (plan ${c.plan}) y quisiera una recarga de créditos.`
      : `Hola, uso A-LexIA (plan ${c.plan}) y quisiera cambiar de plan.`;
  return enlaceWhatsApp(texto);
}

/** Diálogo de confirmación con el consumo estimado. */
export function useConfirmarConsumo() {
  const [abierto, setAbierto] = useState(false);
  const [estimacion, setEstimacion] = useState<Estimacion | null>(null);
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const cerrar = useCallback((ok: boolean) => {
    setAbierto(false);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  const confirmar = useCallback(async (e: Estimacion): Promise<boolean> => {
    const r = await leerPlan();
    // Si el saldo no se puede leer, no se bloquea: el servidor igual
    // comprueba y, si falta algo, responde con el aviso de plan.
    if (!r) return true;
    setEstimacion(e);
    setCalculo(calcular(r, e));
    setAbierto(true);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const dialogo = (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            Consumo estimado
          </DialogTitle>
          <DialogDescription>
            {estimacion && calculo ? textoDeConsumo(estimacion, calculo) : ''}
          </DialogDescription>
        </DialogHeader>
        {calculo && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Usará</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums">{n(calculo.creditos)}</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Te quedarán</p>
                <p
                  className={cn(
                    'mt-0.5 text-xl font-semibold tabular-nums',
                    calculo.disponibles - calculo.creditos < 0 && 'text-red-600 dark:text-red-400',
                  )}
                >
                  {n(Math.max(0, calculo.disponibles - calculo.creditos))}
                </p>
              </div>
            </div>
            {calculo.aviso && <p className="text-xs text-muted-foreground">{calculo.aviso}</p>}
            {calculo.impedimento && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {calculo.impedimento}
              </p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {calculo?.impedimento ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/cuenta/suscripcion">Ver mi plan</Link>
              </Button>
              <Button asChild>
                <a href={botonWhatsApp(calculo)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {calculo.impedimento.startsWith('Te faltan') ? 'Recargar por WhatsApp' : 'Mejorar plan'}
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => cerrar(false)}>
                Cancelar
              </Button>
              <Button onClick={() => cerrar(true)} autoFocus>
                Continuar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirmar, dialogo };
}

/** Una línea con el consumo, para formularios que ya tienen su botón. */
export function LineaDeConsumo({ estimacion, className }: { estimacion: Estimacion; className?: string }) {
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const { herramienta, unidades, que, porUnidad } = estimacion;
  useEffect(() => {
    let vivo = true;
    void leerPlan().then((r) => {
      if (vivo && r) setCalculo(calcular(r, { herramienta, unidades, que, porUnidad }));
    });
    return () => {
      vivo = false;
    };
  }, [herramienta, unidades, que, porUnidad]);
  if (!calculo) return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        calculo.impedimento
          ? 'border-amber-300/60 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
          : 'border-border bg-secondary/40 text-muted-foreground',
        className,
      )}
    >
      {calculo.impedimento ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      )}
      <span>
        {textoDeConsumo(estimacion, calculo)}
        {calculo.impedimento && <> {calculo.impedimento}</>}
        {!calculo.impedimento && calculo.aviso && <> {calculo.aviso}</>}
      </span>
    </div>
  );
}
