'use client';

/**
 * Lo que A-LexIA está haciendo mientras se espera: las fases del
 * documento de César, en su orden. No es una barra que se inventa el
 * avance —el servidor no lo informa—, sino las fases que se recorren,
 * con el tiempo que suelen tomar.
 */
import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FASES_DEL_ANALISIS = [
  { label: 'Leyendo los documentos del expediente', duracion: 20 },
  { label: 'Reconstruyendo la ficha del contrato', duracion: 6 },
  { label: 'Clasificando la actuación, el tipo de contrato y el régimen', duracion: 6 },
  { label: 'Comparando los requisitos con lo que hay', duracion: 20 },
  { label: 'Buscando la única pregunta decisiva', duracion: 6 },
  { label: 'Preparando el diagnóstico', duracion: 20 },
];

export const FASES_DE_LA_REDACCION = [
  { label: 'Redactando el documento para el perfil', duracion: 45 },
  { label: 'Auditando identificación, fechas y montos', duracion: 5 },
  { label: 'Auditando normativa y competencia', duracion: 5 },
  { label: 'Revisando la coherencia del documento', duracion: 20 },
];

export const FASES_DE_LA_LECTURA = [
  { label: 'Subiendo y leyendo los documentos nuevos', duracion: 25 },
  { label: 'Identificando qué es cada documento y su carpeta', duracion: 8 },
];

export function Progreso({ titulo, fases }: { titulo: string; fases: Array<{ label: string; duracion: number }> }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 500);
    return () => clearInterval(id);
  }, []);
  let acumulado = 0;
  const limites = fases.map((f) => (acumulado += f.duracion));
  // La fase en curso; la última se queda en curso hasta que el servidor responda.
  const actual = Math.min(fases.length - 1, limites.findIndex((l) => segundos < l) === -1 ? fases.length - 1 : limites.findIndex((l) => segundos < l));
  return (
    <div className="rounded-xl border border-generar-200 bg-generar-50/50 p-4 dark:border-generar-900/60 dark:bg-generar-900/15" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold">
        <Loader2 className="h-4 w-4 animate-spin text-generar-600" />
        {titulo}
        <span className="ml-auto font-mono text-[11px] font-normal text-muted-foreground">{segundos} s</span>
      </p>
      <ul className="mt-3 space-y-1.5">
        {fases.map((f, i) => {
          const hecho = i < actual;
          const ahora = i === actual;
          return (
            <li key={f.label} className={cn('flex items-center gap-2 text-[12.5px]', hecho ? 'text-foreground' : ahora ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {hecho ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : ahora ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-generar-600" />
              ) : (
                <span className="inline-block h-3.5 w-3.5 rounded-full border border-border" />
              )}
              {f.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
