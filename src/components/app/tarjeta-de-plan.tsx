'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVENTO_CREDITOS, type ResumenDePlan } from '@/lib/billing/resumen-de-tarjeta';

/**
 * La tarjeta del plan, al pie de la barra lateral.
 *
 * Una sola bolsa de créditos (documento «PLANES DE A-LEXIA», 17/10/2026):
 * la barra mide los créditos del mes usados; las recargas van aparte
 * porque no vencen con el mes, y abajo, lo que de verdad importa al
 * usuario: cuántos créditos le quedan y cuándo se renuevan.
 *
 * El layout no se vuelve a pintar al navegar entre páginas, así que la
 * tarjeta relee el saldo cuando una pantalla avisa que gastó créditos
 * (evento `alexia:creditos`) y, como mucho cada 20 s, al cambiar de
 * página. Sin eso, César preguntaba en el chat y la tarjeta seguía
 * marcando lo mismo hasta recargar.
 */
export function TarjetaDePlan({ plan: inicial }: { plan: ResumenDePlan }) {
  const [plan, setPlan] = useState(inicial);
  const ruta = usePathname();
  const ultima = useRef(Date.now());

  const releer = useCallback(async () => {
    ultima.current = Date.now();
    try {
      const r = await fetch('/api/cuenta/plan?breve=1', { cache: 'no-store' });
      if (r.ok) setPlan((await r.json()) as ResumenDePlan);
    } catch {
      /* se queda con el último saldo leído */
    }
  }, []);

  useEffect(() => setPlan(inicial), [inicial]);

  useEffect(() => {
    // Las respuestas del chat se guardan al terminar el stream: se lee
    // un momento después para alcanzar el descuento.
    const alAvisar = () => setTimeout(() => void releer(), 800);
    window.addEventListener(EVENTO_CREDITOS, alAvisar);
    return () => window.removeEventListener(EVENTO_CREDITOS, alAvisar);
  }, [releer]);

  useEffect(() => {
    if (Date.now() - ultima.current > 20_000) void releer();
  }, [ruta, releer]);

  const esPrueba = plan.plan === 'prueba';
  const unidad = esPrueba ? 'preguntas' : 'créditos';
  const porcentaje = plan.creditosMes > 0 ? Math.min(100, Math.round((plan.usadosDelMes / plan.creditosMes) * 100)) : 0;
  const apretado = porcentaje >= 80 || plan.vencido;
  const n = (x: number) => x.toLocaleString('es-PE');

  return (
    <Link
      href="/cuenta/suscripcion"
      className="block rounded-xl border border-white/10 bg-white/[0.06] p-3 transition-colors hover:border-white/20 hover:bg-white/[0.1]"
    >
      <div className="flex items-center gap-1.5">
        <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span className="truncate text-[12.5px] font-semibold text-white">{plan.etiqueta}</span>
        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/40" />
      </div>
      {plan.subtitulo && <p className="mt-0.5 pl-5 text-[10.5px] text-white/50">{plan.subtitulo}</p>}

      <div className="mt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Consumo del mes</p>
          <span
            className={cn('shrink-0 text-[11px] tabular-nums', apretado ? 'font-semibold text-amber-300' : 'text-white/65')}
          >
            {n(plan.usadosDelMes)} / {n(plan.creditosMes)}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={plan.usadosDelMes}
          aria-valuemax={plan.creditosMes}
          aria-label={`${unidad} del mes usados`}
        >
          <div
            className={cn('h-full rounded-full transition-[width] duration-500', apretado ? 'bg-amber-400' : 'bg-consultar-400')}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        {plan.recargas > 0 && (
          <p className="mt-1 text-[10.5px] text-white/55">+ {n(plan.recargas)} de recargas</p>
        )}
        <p className={cn('mt-1.5 text-[11.5px] font-medium', apretado ? 'text-amber-300' : 'text-white/85')}>
          {n(plan.disponibles)} {plan.disponibles === 1 ? unidad.slice(0, -1) : unidad} disponibles
        </p>
      </div>

      {plan.renovacion && (
        <p className={cn('mt-1 text-[10px]', plan.vencido ? 'text-amber-300/90' : 'text-white/40')}>{plan.renovacion}</p>
      )}
    </Link>
  );
}
