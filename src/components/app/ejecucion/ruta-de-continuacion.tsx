'use client';

import { ArrowRight, Gavel, MessageSquareText, Route } from 'lucide-react';
import { PERFILES, type Perfil } from '@/lib/ejecucion/catalogo';
import { MENSAJE_SIN_FIGURA, plazoDelSiguientePaso, siguientePaso } from '@/lib/ejecucion/continuacion';
import type { AnalisisDeActuacion } from '@/lib/ejecucion/tipos';

/**
 * «Cada documento debe terminar con una ruta de continuación» (César,
 * 27/09/2026): qué ocurre después y quién interviene. No es una cadena
 * fija: se arma con la cadena de la actuación, lo que ya está en el
 * expediente y los plazos que el sistema pudo calcular. Si falta la fecha
 * que inicia el cómputo, lo dice en vez de inventar un vencimiento.
 */
export function RutaDeContinuacion({
  a,
  perfil,
  permitidos,
  ocupado,
  alContinuar,
}: {
  a: AnalisisDeActuacion;
  perfil: Perfil;
  permitidos: Perfil[];
  ocupado: boolean;
  alContinuar: (p: Perfil) => Promise<void>;
}) {
  if (!a.figura.corresponde)
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Route className="h-4 w-4" /> Ruta de continuación
        </h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{MENSAJE_SIN_FIGURA}</p>
      </div>
    );
  const { siguiente, despues } = siguientePaso(a, perfil);
  const plazo = plazoDelSiguientePaso(a);
  const puede = (p: string | undefined): p is Perfil => !!p && permitidos.includes(p as Perfil) && p !== perfil;
  const juridica = a.cadena.find((p) => p.perfil === 'asesoria_juridica' && !p.hecho);
  const decision = a.cadena.find((p) => (p.perfil === 'aga' || p.perfil === 'titular') && !p.hecho);

  return (
    <div className="rounded-xl border border-generar-200 bg-generar-50/30 p-4 dark:border-generar-900/60 dark:bg-generar-900/10">
      <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-generar-700 dark:text-generar-400">
        <Route className="h-4 w-4" /> Ruta de continuación
      </h3>
      {siguiente ? (
        <dl className="mt-2.5 grid gap-x-4 gap-y-2 text-[12.5px] leading-relaxed sm:grid-cols-[150px_minmax(0,1fr)]">
          <dt className="font-semibold text-muted-foreground">Siguiente actuación</dt>
          <dd>
            <span className="font-semibold">{PERFILES[siguiente.perfil as Perfil]?.nombre ?? siguiente.perfil}</span> — {siguiente.documento}
            {siguiente.condicion && <span className="text-muted-foreground"> ({siguiente.condicion})</span>}
          </dd>
          <dt className="font-semibold text-muted-foreground">Insumo que debe recibir</dt>
          <dd>Tu documento formalmente emitido (con número, fecha y firma) y sus anexos; el borrador de A-LexIA no lo reemplaza.</dd>
          {despues.length > 0 && (
            <>
              <dt className="font-semibold text-muted-foreground">Después</dt>
              <dd>
                {despues.map((p, i) => (
                  <span key={i}>
                    {i > 0 && ' → '}
                    {PERFILES[p.perfil as Perfil]?.nombre ?? p.perfil}: {p.documento.charAt(0).toLowerCase() + p.documento.slice(1)}
                    {p.condicion ? ` (${p.condicion.charAt(0).toLowerCase() + p.condicion.slice(1)})` : ''}
                  </span>
                ))}
                <span className="text-muted-foreground">, únicamente si corresponde al caso.</span>
              </dd>
            </>
          )}
          <dt className="font-semibold text-muted-foreground">Plazo</dt>
          <dd>
            {plazo ? (
              <>
                <span className="font-semibold">{plazo.resultado}.</span> <span className="text-muted-foreground">{plazo.detalle}</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                El que resulte de la norma aplicable, el tipo de contrato y el hito comprobado en el expediente. A-LexIA no fija un vencimiento sin la regla y la fecha que inicia su cómputo: cuando esa fecha esté en el expediente, lo calcula.
              </span>
            )}
          </dd>
        </dl>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          Este documento cierra la cadena de la actuación. Lo que sigue es notificarlo, formalizarlo o registrarlo según corresponda.
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap gap-2">
        {puede(siguiente?.perfil) && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void alContinuar(siguiente!.perfil as Perfil)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-generar-500 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-generar-600 disabled:opacity-50"
          >
            Continuar expediente como {PERFILES[siguiente!.perfil as Perfil].nombre} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {juridica && puede(juridica.perfil) && juridica !== siguiente && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void alContinuar('asesoria_juridica')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-generar-300 bg-card px-3 py-2 text-[12.5px] font-semibold text-generar-800 hover:bg-generar-50 disabled:opacity-50 dark:border-generar-800 dark:text-generar-200"
          >
            <MessageSquareText className="h-3.5 w-3.5" /> Preparar solicitud de opinión
          </button>
        )}
        {decision && puede(decision.perfil) && decision !== siguiente && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void alContinuar(decision.perfil as Perfil)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-generar-300 bg-card px-3 py-2 text-[12.5px] font-semibold text-generar-800 hover:bg-generar-50 disabled:opacity-50 dark:border-generar-800 dark:text-generar-200"
          >
            <Gavel className="h-3.5 w-3.5" /> Proyectar decisión
          </button>
        )}
      </div>
    </div>
  );
}
