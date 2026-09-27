import Link from 'next/link';
import { Crown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedidorDeAccion, ResumenDePlan } from '@/components/app/app-shell';

/**
 * La tarjeta del plan, al pie de la barra lateral.
 *
 * No hay un saldo único de créditos: cada acción tiene su cuota mensual.
 * La tarjeta muestra las tres acciones de A-LexIA —Consultar, Generar,
 * Evaluar— con lo usado en el mes. Cuando hay tope, con su barra; cuando
 * el plan no tiene límite, solo el conteo, que es lo que permite ver que
 * el consumo avanza (César, 27/09/2026: «no avanza el nivel de consumo…
 * ahí solo dice llamadas»).
 */
export function TarjetaDePlan({ plan }: { plan: ResumenDePlan }) {
  const { etiqueta, medidores, renovacion } = plan;

  return (
    <Link
      href="/cuenta/suscripcion"
      className="block rounded-xl border border-white/10 bg-white/[0.06] p-3 transition-colors hover:border-white/20 hover:bg-white/[0.1]"
    >
      <div className="flex items-center gap-1.5">
        <Crown className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[12.5px] font-semibold text-white">{etiqueta}</span>
        <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/40" />
      </div>

      {medidores && (
        <div className="mt-2.5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Consumo del mes
          </p>
          {medidores.map((m) => (
            <Medidor key={m.accion} medidor={m} />
          ))}
        </div>
      )}

      {renovacion && (
        <p className="mt-2 text-[10px] text-white/40">Renovación: {renovacion}</p>
      )}
    </Link>
  );
}

const COLOR: Record<MedidorDeAccion['accion'], string> = {
  Consultar: 'bg-consultar-400',
  Generar: 'bg-generar-400',
  Evaluar: 'bg-evaluar-400',
};

function Medidor({ medidor }: { medidor: MedidorDeAccion }) {
  const { accion, usado, tope, unidad, detalle } = medidor;
  const incluido = tope !== 0;
  const porcentaje = tope ? Math.min(100, Math.round((usado / Math.max(1, tope)) * 100)) : null;
  const apretado = porcentaje !== null && porcentaje >= 80;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/85">
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', COLOR[accion])} />
          {accion}
        </span>
        <span
          className={cn(
            'shrink-0 text-[11px] tabular-nums',
            apretado ? 'font-semibold text-amber-300' : 'text-white/65',
          )}
        >
          {!incluido
            ? 'No incluido'
            : tope
              ? `${usado.toLocaleString('es-PE')} / ${tope.toLocaleString('es-PE')}`
              : `${usado.toLocaleString('es-PE')} ${unidad}`}
        </span>
      </div>
      {incluido && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              apretado ? 'bg-amber-400' : COLOR[accion],
            )}
            // Sin tope no hay proporción que dibujar: la barra se llena
            // apenas hay uso, para que se note que el contador se mueve.
            style={{ width: `${porcentaje ?? (usado > 0 ? 100 : 0)}%`, opacity: porcentaje === null ? 0.5 : 1 }}
          />
        </div>
      )}
      {detalle && <p className="mt-0.5 text-[10px] text-white/45">{detalle}</p>}
      {incluido && !tope && <span className="sr-only">Sin límite en tu plan</span>}
    </div>
  );
}
