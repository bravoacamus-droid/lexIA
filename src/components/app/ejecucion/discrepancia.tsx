'use client';

import { ArrowRight, FileSearch, FileX2, Scale } from 'lucide-react';
import { ACTUACIONES, type Perfil } from '@/lib/ejecucion/catalogo';
import { documentoRecomendado, NOMBRE_ACTUACION } from '@/lib/ejecucion/matriz';
import type { AnalisisDeActuacion, NivelDeSalida } from '@/lib/ejecucion/tipos';
import type { Actuacion } from '@/lib/ejecucion/catalogo';

/**
 * Documento solicitado frente a documento recomendado.
 *
 * César (27/09/2026): si el documento que se pide y el que resulta del
 * análisis no coinciden, A-LexIA «no debe cambiar de figura
 * silenciosamente ni redactar un informe favorable con una premisa
 * errónea. Debe presentar un diagnóstico breve y acciones concretas», y
 * dejarle al especialista la posibilidad de documentar por qué desestima
 * la figura que se planteó. Son las tres salidas de su ejemplo.
 */
export function Discrepancia({
  a,
  perfil,
  ocupado,
  alAnalizar,
  alRedactar,
}: {
  a: AnalisisDeActuacion;
  perfil: Perfil;
  ocupado: boolean;
  alAnalizar: (como?: Actuacion) => Promise<void>;
  alRedactar: (nivel: NivelDeSalida, enfoque?: 'descarte') => Promise<void>;
}) {
  const pedida = a.actuacionPedida ?? a.actuacion;
  const ctx = { perfil, tipo: a.tipo, sistemaEntrega: null, supervisado: null, regimen: a.regimen.clave, respuestas: {} };
  const solicitado = documentoRecomendado(perfil, pedida, ctx).titulo;
  const alternativa = a.figura.alternativa ?? null;
  const recomendado = alternativa ? documentoRecomendado(perfil, alternativa, ctx).titulo : null;
  const indispensable = a.faltantes.filter((f) => f.nivel === 1).map((f) => f.texto.charAt(0).toLowerCase() + f.texto.slice(1));

  return (
    <div className="rounded-xl border-2 border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <dl className="space-y-2.5 text-[13px] leading-relaxed">
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Solicitaste</dt>
          <dd className="font-semibold">{solicitado}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Resultado del análisis</dt>
          <dd>
            {alternativa ? `Los hechos descritos podrían corresponder a ${ACTUACIONES[alternativa].nombre.toLowerCase()}. ` : ''}
            {a.figura.razon}
          </dd>
        </div>
        <div>
          <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Siguiente paso recomendado</dt>
          <dd>
            {alternativa
              ? `Verificar las condiciones de ${ACTUACIONES[alternativa].nombre.toLowerCase()}`
              : 'Precisar qué figura corresponde'}
            {indispensable.length ? ` y obtener: ${indispensable.slice(0, 3).join('; ')}.` : '.'}
          </dd>
        </div>
      </dl>

      <p className="mt-3.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Puedes generar ahora</p>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        {alternativa && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void alAnalizar(alternativa)}
            className="flex flex-col items-start gap-1 rounded-lg border border-generar-300 bg-card p-3 text-left hover:bg-generar-50 disabled:opacity-50 dark:border-generar-800 dark:hover:bg-generar-900/25"
          >
            <Scale className="h-4 w-4 text-generar-600" />
            <span className="text-[12.5px] font-semibold leading-snug">{recomendado}</span>
            <span className="text-[11.5px] leading-snug text-muted-foreground">Sobre la figura que corresponde, sujeto a los documentos pendientes.</span>
          </button>
        )}
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void alRedactar('borrador_condicionado', 'descarte')}
          className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary disabled:opacity-50"
        >
          <FileX2 className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          <span className="text-[12.5px] font-semibold leading-snug">
            {perfil === 'aga' || perfil === 'titular' ? 'Resolución que declara improcedente' : 'Informe que evalúa y descarta motivadamente'} {NOMBRE_ACTUACION[pedida]}
          </span>
          <span className="text-[11.5px] leading-snug text-muted-foreground">Documenta por qué se desestima la figura planteada.</span>
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void alRedactar('diagnostico')}
          className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary disabled:opacity-50"
        >
          <FileSearch className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          <span className="text-[12.5px] font-semibold leading-snug">Diagnóstico preliminar</span>
          <span className="text-[11.5px] leading-snug text-muted-foreground">Para completar el expediente antes de decidir.</span>
        </button>
      </div>
      {alternativa && (
        <p className="mt-2 flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <ArrowRight className="h-3 w-3" /> La primera opción vuelve a analizar el caso como {ACTUACIONES[alternativa].nombre.toLowerCase()} y luego te deja redactar ese documento.
        </p>
      )}
    </div>
  );
}
