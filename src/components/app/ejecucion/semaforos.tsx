'use client';

/**
 * Los dos semáforos de la sección 12, separados a propósito: uno dice si
 * la figura procede; el otro, si ya hay con qué probarlo. «La figura
 * podría ser procedente» no es «ya existe evidencia para aprobarla».
 */
import { cn } from '@/lib/utils';
import { TEXTO_INFORMACION, TEXTO_PROCEDENCIA } from '@/lib/ejecucion/suficiencia';
import type { SemaforoInformacion, SemaforoProcedencia } from '@/lib/ejecucion/tipos';

const LUZ: Record<SemaforoProcedencia, string> = {
  verde: 'bg-emerald-500',
  amarillo: 'bg-amber-400',
  naranja: 'bg-orange-500',
  rojo: 'bg-red-600',
  negro: 'bg-zinc-900 ring-1 ring-zinc-400 dark:bg-zinc-950 dark:ring-zinc-500',
};

const FONDO: Record<SemaforoProcedencia, string> = {
  verde: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30',
  amarillo: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30',
  naranja: 'border-orange-200 bg-orange-50/70 dark:border-orange-900/60 dark:bg-orange-950/30',
  rojo: 'border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30',
  negro: 'border-zinc-300 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-900/60',
};

export function Luz({ color, className }: { color: SemaforoProcedencia; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-3 w-3 shrink-0 rounded-full', LUZ[color], className)} />;
}

export function SemaforoDeProcedencia({ color, razon }: { color: SemaforoProcedencia; razon: string }) {
  return (
    <div className={cn('rounded-xl border p-4', FONDO[color])}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Procedencia</p>
      <p className="mt-1 flex items-center gap-2 text-[15px] font-bold">
        <Luz color={color} />
        {TEXTO_PROCEDENCIA[color]}
      </p>
      {razon && <p className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-foreground/85">{razon}</p>}
    </div>
  );
}

export function SemaforoDeInformacion({
  color,
  suficiencia,
  mensaje,
}: {
  color: SemaforoInformacion;
  suficiencia: number;
  mensaje: string;
}) {
  const tramo =
    suficiencia < 40
      ? 'Insuficiente para análisis'
      : suficiencia < 70
        ? 'Permite diagnóstico preliminar'
        : suficiencia < 90
          ? 'Permite análisis técnico o administrativo'
          : 'Permite documento para revisión final';
  return (
    <div className={cn('rounded-xl border p-4', FONDO[color])}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Información</p>
      <p className="mt-1 flex items-center gap-2 text-[15px] font-bold">
        <Luz color={color} />
        {TEXTO_INFORMACION[color]}
      </p>
      <div className="mt-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11.5px]">
          <span className="font-semibold">Suficiencia del expediente: {suficiencia} %</span>
          <span className="text-muted-foreground">{tramo}</span>
        </div>
        <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-secondary" role="meter" aria-valuenow={suficiencia} aria-valuemin={0} aria-valuemax={100} aria-label="Suficiencia del expediente">
          <div
            className={cn('h-full rounded-full transition-all', suficiencia < 40 ? 'bg-red-500' : suficiencia < 70 ? 'bg-orange-500' : suficiencia < 90 ? 'bg-amber-400' : 'bg-emerald-500')}
            style={{ width: `${Math.max(3, suficiencia)}%` }}
          />
          {[40, 70, 90].map((m) => (
            <span key={m} className="absolute top-0 h-full w-px bg-background/80" style={{ left: `${m}%` }} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-pretty text-[12.5px] leading-relaxed text-foreground/85">{mensaje}</p>
    </div>
  );
}
