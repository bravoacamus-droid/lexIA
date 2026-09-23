import Link from 'next/link';
import { Crown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResumenDePlan } from '@/components/app/app-shell';

/**
 * La tarjeta del plan, al pie de la barra lateral.
 *
 * El mockup dibuja un único contador —"860 / 1.000 créditos"—, pero aquí
 * no hay un saldo único: cada función tiene su propia cuota mensual
 * (mensajes de chat, generaciones, evaluaciones, minutos de voz). Pintar
 * un número inventado sería peor que no pintarlo, así que la barra
 * muestra **la cuota que está más cerca de agotarse**, con su nombre.
 * Es el dato que de verdad le sirve a quien mira: es lo primero que se
 * le va a acabar.
 */
export function TarjetaDePlan({ plan }: { plan: ResumenDePlan }) {
  const { etiqueta, medidor, renovacion } = plan;
  const porcentaje = medidor
    ? Math.min(100, Math.round((medidor.usado / Math.max(1, medidor.tope)) * 100))
    : null;
  const apretado = porcentaje !== null && porcentaje >= 80;

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

      {medidor && porcentaje !== null && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                apretado ? 'bg-amber-400' : 'bg-gradient-to-r from-brand-400 to-brand-500',
              )}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="truncate text-[11px] text-white/65">
              {medidor.usado.toLocaleString('es-PE')} / {medidor.tope.toLocaleString('es-PE')}{' '}
              {medidor.unidad}
            </span>
            <span
              className={cn(
                'shrink-0 text-[11px] font-semibold tabular-nums',
                apretado ? 'text-amber-300' : 'text-white/65',
              )}
            >
              {porcentaje} %
            </span>
          </div>
        </>
      )}

      {renovacion && (
        <p className="mt-1.5 text-[10px] text-white/40">Renovación: {renovacion}</p>
      )}
      {!medidor && (
        <p className="mt-1.5 text-[11px] text-white/55">Sin límite de uso este mes.</p>
      )}
    </Link>
  );
}
