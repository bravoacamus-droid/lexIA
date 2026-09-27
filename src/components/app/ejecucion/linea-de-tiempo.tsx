'use client';

import { cn } from '@/lib/utils';
import type { HechoIdentificado } from '@/lib/ejecucion/tipos';

/**
 * El caso reconstruido en orden.
 *
 * César (27/09/2026): «Reconstruir el caso. Mostrar una línea de tiempo y
 * separar hechos acreditados, hechos declarados y datos contradictorios».
 * Los hechos ya venían con fecha y estado; aquí se ordenan, lo que no
 * tiene fecha va al final, y las contradicciones se ven en el mismo
 * lugar para no tener que buscarlas.
 */
const ESTILO: Record<HechoIdentificado['estado'], { texto: string; punto: string; chip: string }> = {
  acreditado: {
    texto: 'Acreditado',
    punto: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  declarado: {
    texto: 'Declarado',
    punto: 'bg-amber-400',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  },
  no_acreditado: {
    texto: 'No acreditado',
    punto: 'bg-zinc-400',
    chip: 'bg-secondary text-muted-foreground',
  },
};

export function LineaDeTiempo({ hechos, contradicciones }: { hechos: HechoIdentificado[]; contradicciones: string[] }) {
  const conFecha = hechos.filter((h) => h.fecha).sort((a, b) => (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : 0));
  const sinFecha = hechos.filter((h) => !h.fecha);
  const cuenta = (e: HechoIdentificado['estado']) => hechos.filter((h) => h.estado === e).length;

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
        {(['acreditado', 'declarado', 'no_acreditado'] as const).map((e) => (
          <span key={e} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', ESTILO[e].punto)} /> {ESTILO[e].texto}: {cuenta(e)}
          </span>
        ))}
        {contradicciones.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Contradicciones: {contradicciones.length}
          </span>
        )}
      </p>

      {conFecha.length > 0 && (
        <ol className="relative ml-1.5 space-y-2.5 border-l border-border pl-4">
          {conFecha.map((h, i) => (
            <Hecho key={`f${i}`} h={h} />
          ))}
        </ol>
      )}

      {sinFecha.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sin fecha en los documentos</p>
          <ul className="mt-1.5 space-y-1.5 pl-1">
            {sinFecha.map((h, i) => (
              <Hecho key={`s${i}`} h={h} />
            ))}
          </ul>
        </div>
      )}

      {contradicciones.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-2.5 dark:border-red-900/60 dark:bg-red-950/20">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">Datos contradictorios</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed">
            {contradicciones.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Hecho({ h }: { h: HechoIdentificado }) {
  const e = ESTILO[h.estado];
  return (
    <li className="relative text-[12.5px] leading-relaxed">
      {h.fecha && <span className={cn('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background', e.punto)} />}
      <span className="flex flex-wrap items-baseline gap-x-2">
        {h.fecha && <span className="font-mono text-[11.5px] font-semibold">{h.fecha.split('-').reverse().join('/')}</span>}
        <span className={cn('rounded px-1.5 py-px text-[10.5px] font-semibold', e.chip)}>{e.texto}</span>
      </span>
      <span className="block">{h.hecho}</span>
      {h.documento && <span className="block text-[11.5px] text-muted-foreground">Fuente: {h.documento}</span>}
    </li>
  );
}
