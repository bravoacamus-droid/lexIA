'use client';

/**
 * El resultado de la evaluación, etapa por etapa y postor por postor.
 *
 * POR QUÉ ASÍ
 *
 * César lo describió como un recorrido: "si pasaste la etapa de
 * admisión, la siguiente etapa será la calificación, y si pasas la
 * calificación será la etapa de evaluación, donde te otorgan puntaje".
 * La pantalla enseña ese recorrido, no una lista de hallazgos: primero
 * la comparación entre postores —que es lo que se lleva al acta— y
 * debajo, para quien quiera el detalle, cada requisito con su evidencia.
 *
 * Los colores son los del acta, no un semáforo de la aplicación:
 * admitida, sujeta a subsanación, no admitida. Y "revisión humana" no se
 * pinta como un error: es el sistema diciendo que ahí decide el comité.
 */
import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  ChevronDown,
  Download,
  FileText,
  Mail,
  Trophy,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  ETIQUETA_RESULTADO,
  NOMBRE_ETAPA,
  type Etapa,
  type FichaRequisito,
  type Resultado,
  type ResultadoPostor,
} from '@/lib/evaluacion/etapas';
import type { LecturaBases } from '@/lib/evaluacion/motor';
import type { EtapasFinales } from '@/lib/evaluacion/economica';
import { SegundaEvaluacion, type RondaGuardada } from '@/components/app/evaluator/segunda-evaluacion';
import { tieneQueSubsanar } from '@/lib/evaluacion/observados';

export interface ResultadoEtapas {
  bases: LecturaBases;
  postores: ResultadoPostor[];
  transcritas?: string[];
  ilegibles?: Array<{ nombre: string; motivo: string }>;
  /** Etapas 4 a 7, desde octubre de 2026 (`economica.ts`). */
  finales?: EtapasFinales;
  /** Archivos que eran otro tomo de una oferta y se evaluaron junto con ella. */
  tomos?: Array<{ archivo: string; postor: string }>;
  /** Segundas evaluaciones (subsanación, rechazo, negociación). */
  rondas?: RondaGuardada[];
}

const ETAPAS: Etapa[] = ['admision', 'calificacion', 'evaluacion'];

const ASPECTO: Record<Resultado, { icono: typeof CheckCircle2; clase: string; fondo: string }> = {
  cumple: { icono: CheckCircle2, clase: 'text-emerald-600', fondo: 'bg-emerald-50 border-emerald-200' },
  subsanable: { icono: AlertTriangle, clase: 'text-amber-600', fondo: 'bg-amber-50 border-amber-200' },
  no_cumple: { icono: XCircle, clase: 'text-red-600', fondo: 'bg-red-50 border-red-200' },
  revision_humana: { icono: UserCheck, clase: 'text-violet-600', fondo: 'bg-violet-50 border-violet-200' },
};

function Marca({ resultado, etapa }: { resultado: Resultado; etapa: Etapa }) {
  const { icono: Icono, clase } = ASPECTO[resultado];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', clase)}>
      <Icono className="h-4 w-4 shrink-0" />
      {ETIQUETA_RESULTADO[etapa][resultado]}
    </span>
  );
}

/** Una ficha desplegable: el requisito, lo hallado y de dónde sale. */
function Ficha({ ficha, etapa }: { ficha: FichaRequisito; etapa: Etapa }) {
  const [abierta, setAbierta] = useState(false);
  const { fondo } = ASPECTO[ficha.resultado];

  return (
    <div className={cn('rounded-lg border', fondo)}>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{ficha.requisito}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{ficha.hallazgo}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {etapa === 'evaluacion' && (
            <span className="rounded bg-white/70 px-2 py-0.5 text-sm font-semibold tabular-nums text-slate-900">
              {ficha.puntaje ?? 0}
              <span className="text-slate-400">/{ficha.puntajeMaximo ?? '—'}</span>
            </span>
          )}
          <Marca resultado={ficha.resultado} etapa={etapa} />
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform', abierta && 'rotate-180')}
          />
        </div>
      </button>

      {abierta && (
        <div className="space-y-3 border-t border-white/60 p-3 pt-3 text-sm">
          {ficha.reglaBases && (
            <p>
              <span className="font-medium text-slate-700">Lo que exigen las Bases: </span>
              <span className="text-slate-600">{ficha.reglaBases}</span>
            </p>
          )}
          {ficha.documentoPresentado && (
            <p>
              <span className="font-medium text-slate-700">Lo que presentó: </span>
              <span className="text-slate-600">{ficha.documentoPresentado}</span>
            </p>
          )}
          {ficha.evidencia.length > 0 && (
            <div>
              <p className="font-medium text-slate-700">Dónde consta</p>
              <ul className="mt-1 space-y-1">
                {ficha.evidencia.map((e, i) => (
                  <li key={i} className="text-slate-600">
                    <span className="font-medium">{e.documento}</span>
                    {e.ubicacion ? ` · ${e.ubicacion}` : ''}
                    {e.cita ? <span className="italic"> — «{e.cita}»</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ficha.jurisprudencia.length > 0 && (
            <div>
              <p className="font-medium text-slate-700">Criterios del Tribunal aplicados</p>
              <ul className="mt-1 space-y-1.5">
                {ficha.jurisprudencia.map((j, i) => (
                  <li key={i} className="text-slate-600">
                    <span className="font-medium">{j.resolucion}</span> — {j.criterio}
                    {j.aplicable ? <span className="block text-xs italic">{j.aplicable}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ficha.conflicto && (
            <p className="rounded bg-white/70 p-2 text-slate-700">
              <span className="font-medium">Criterios divergentes: </span>
              {ficha.conflicto}
            </p>
          )}
          <p className="text-xs text-slate-500">
            {ficha.naturalezaDefecto && ficha.naturalezaDefecto !== 'ninguno'
              ? `Defecto ${ficha.naturalezaDefecto}${ficha.subsanable ? ', subsanable' : ', no subsanable'} · `
              : ''}
            Confianza {ficha.confianza}
          </p>
        </div>
      )}
    </div>
  );
}

/** El recorrido de un postor por las tres etapas. */
function Postor({ postor }: { postor: ResultadoPostor }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        {postor.prelacion === 1 && <Trophy className="h-5 w-5 shrink-0 text-amber-500" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{postor.postor}</p>
          <Integrantes postor={postor} />
          <p className="text-xs text-slate-500">{postor.resultadoFinal}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {ETAPAS.map((etapa) => {
            const e = postor.etapas.find((x) => x.etapa === etapa);
            if (!e) return null;
            return (
              <div key={etapa} className="hidden text-center sm:block">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {NOMBRE_ETAPA[etapa].split(' ')[0]}
                </p>
                {e.omitida ? (
                  <span className="text-xs text-slate-400">No evaluada</span>
                ) : (
                  <Marca resultado={e.resultado} etapa={etapa} />
                )}
              </div>
            );
          })}
          {typeof postor.puntajeTecnico === 'number' && (
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Puntaje</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {postor.puntajeTecnico}
              </p>
            </div>
          )}
          <ChevronDown
            className={cn('h-5 w-5 text-slate-400 transition-transform', abierto && 'rotate-180')}
          />
        </div>
      </button>

      {abierto && (
        <div className="space-y-5 border-t bg-slate-50/50 p-4">
          {postor.etapas.map((e) => (
            <section key={e.etapa}>
              <header className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-800">{NOMBRE_ETAPA[e.etapa]}</h4>
                {!e.omitida && <Marca resultado={e.resultado} etapa={e.etapa} />}
              </header>

              {e.omitida ? (
                <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
                  {e.motivoOmision ?? 'No evaluada.'}
                </p>
              ) : (
                <>
                  {e.fundamento && <p className="mb-2 text-sm text-slate-600">{e.fundamento}</p>}
                  <div className="space-y-2">
                    {e.fichas.map((f) => (
                      <Ficha key={f.id} ficha={f} etapa={e.etapa} />
                    ))}
                  </div>
                  {e.subsanaciones.length > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-medium text-amber-900">Qué habría que requerirle</p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
                        {e.subsanaciones.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ResultadoEtapasView({
  id,
  resultado,
}: {
  id: string;
  resultado: ResultadoEtapas;
}) {
  const { bases, postores } = resultado;
  const ganadores = postores.filter((p) => p.prelacion === 1);
  // A quién hay que notificarle una subsanación. La carta existía en el
  // servidor desde setiembre, pero ningún botón llevaba a ella: la
  // petición de César —«debe haber una opción que genere una carta»—
  // estaba hecha y era inalcanzable.
  const observados = postores.filter(tieneQueSubsanar);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">
              {bases.procedimiento.denominacion ?? 'Evaluación de ofertas'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {[bases.procedimiento.entidad, bases.procedimiento.numero].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <a href={`/api/evaluations/${id}/acta`} download>
                <Download className="mr-2 h-4 w-4" />
                Descargar acta en Word
              </a>
            </Button>
            {/*
              La carta, solo a quien tiene algo que subsanar y sigue en el
              procedimiento. Con uno, el botón; con varios, se elige a cuál;
              con ninguno, no hay carta que generar (documento 13 de César).
            */}
            {observados.length === 0 ? (
              <Button
                variant="outline"
                disabled
                title="Ningún postor que siga en el procedimiento tiene observaciones subsanables: no corresponde carta de subsanación."
              >
                <Mail className="mr-2 h-4 w-4" />
                Sin carta de subsanación
              </Button>
            ) : observados.length === 1 ? (
              <Button asChild variant="outline">
                <a
                  href={`/api/evaluations/${id}/carta?postor=${encodeURIComponent(observados[0].postor)}`}
                  download
                  title={`Carta que notifica a ${observados[0].postor} lo que debe subsanar`}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Carta de subsanación
                </a>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Carta de subsanación
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-w-sm">
                  <DropdownMenuLabel>¿A qué postor?</DropdownMenuLabel>
                  {observados.map((p) => (
                    <DropdownMenuItem key={p.postor} asChild>
                      <a href={`/api/evaluations/${id}/carta?postor=${encodeURIComponent(p.postor)}`} download>
                        {p.postor}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          El acta y las cartas se arman con el resultado ya guardado: descargarlas no vuelve a evaluar ni consume
          consultas.
        </p>

        {resultado.transcritas && resultado.transcritas.length > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {resultado.transcritas.length === 1
                ? `La oferta de ${resultado.transcritas[0]} venía escaneada y se transcribió para poder leerla.`
                : `${resultado.transcritas.length} ofertas venían escaneadas y se transcribieron para poder leerlas.`}{' '}
              Conviene contrastar contra el original lo que dependa de un dato exacto.
            </span>
          </p>
        )}

        {resultado.tomos && resultado.tomos.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {resultado.tomos.map((t) => `«${t.archivo}» es otro tomo de la oferta de ${t.postor}`).join('; ')}: se
              evaluaron juntos, como una sola oferta.
            </span>
          </p>
        )}

        {resultado.ilegibles && resultado.ilegibles.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-medium">No se pudieron leer estas ofertas</p>
            <ul className="mt-1 list-disc pl-5">
              {resultado.ilegibles.map((x) => (
                <li key={x.nombre}>
                  <span className="font-medium">{x.nombre}</span> — {x.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* La comparación: lo primero que se mira y lo que va al acta. */}
      <Card className="overflow-hidden">
        <div className="border-b bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Resultado consolidado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-medium">Postor</th>
                <th className="px-4 py-2 font-medium">Admisión</th>
                <th className="px-4 py-2 font-medium">Calificación</th>
                <th className="px-4 py-2 text-right font-medium">Puntaje técnico</th>
                {resultado.finales && (
                  <>
                    <th className="px-4 py-2 text-right font-medium">Oferta económica</th>
                    <th className="px-4 py-2 text-right font-medium">Puntaje económico</th>
                    <th className="px-4 py-2 text-right font-medium">Puntaje total</th>
                  </>
                )}
                <th className="px-4 py-2 text-right font-medium">Prelación</th>
              </tr>
            </thead>
            <tbody>
              {postores.map((p) => {
                const et = (e: Etapa) => p.etapas.find((x) => x.etapa === e);
                return (
                  <tr key={p.postor} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.postor}
                      <Integrantes postor={p} />
                    </td>
                    {(['admision', 'calificacion'] as Etapa[]).map((e) => {
                      const etapa = et(e);
                      return (
                        <td key={e} className="px-4 py-3">
                          {!etapa || etapa.omitida ? (
                            <span className="text-slate-400">No evaluada</span>
                          ) : (
                            <Marca resultado={etapa.resultado} etapa={e} />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {et('evaluacion')?.omitida ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="font-semibold text-slate-900">{p.puntajeTecnico ?? 0}</span>
                      )}
                    </td>
                    {resultado.finales && (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {p.ofertaEconomica && p.accedeEconomica !== false
                            ? `S/ ${p.ofertaEconomica.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{p.puntajeEconomico ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                          {p.puntajeTotal ?? '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right">
                      {p.prelacion ? (
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                            p.prelacion === 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {p.prelacion}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t bg-slate-50 px-4 py-3 text-sm">
          {ganadores.length === 0 ? (
            <p className="text-slate-600">
              Ningún postor alcanzó la evaluación técnica con puntaje, por lo que no corresponde
              otorgar la buena pro en este acto.
            </p>
          ) : ganadores.length > 1 ? (
            <p className="text-slate-700">
              <span className="font-medium">Empate en el primer lugar</span> entre{' '}
              {ganadores.map((g) => g.postor).join(' y ')}, con {ganadores[0].puntajeTecnico} puntos.
              El desempate se resuelve conforme a las Bases y al Reglamento.
            </p>
          ) : resultado.finales ? (
            <p className="text-slate-700">
              <span className="font-medium">Propuesta de buena pro:</span>{' '}
              {resultado.finales.buenaPro.postor ? (
                <span className="font-medium text-slate-900">{resultado.finales.buenaPro.postor}. </span>
              ) : null}
              {resultado.finales.buenaPro.fundamento}
            </p>
          ) : (
            <p className="text-slate-700">
              Primer lugar del orden de prelación:{' '}
              <span className="font-medium text-slate-900">{ganadores[0].postor}</span>, con{' '}
              {ganadores[0].puntajeTecnico} puntos técnicos.
              {bases.evaluacionEconomica
                ? ' Falta la evaluación económica, que asigna el comité.'
                : ''}
            </p>
          )}
        </div>
      </Card>

      {resultado.finales && <EtapasSiguientes finales={resultado.finales} />}

      <SegundaEvaluacion id={id} postores={postores} finales={resultado.finales} rondas={resultado.rondas} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Detalle por postor</h3>
        {postores.map((p) => (
          <Postor key={p.postor} postor={p} />
        ))}
      </div>

      {bases.advertencias.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Advertencias sobre las Bases</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
            {bases.advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-slate-500">
        {resultado.finales
          ? 'La evaluación económica, el orden de prelación y la propuesta de buena pro se calculan con las reglas de las Bases y del Reglamento; el comité las revisa y decide. '
          : 'La evaluación económica y el desempate no se asignan automáticamente: los consigna el comité conforme a las Bases. '}
        Los puntos marcados como <Badge variant="secondary">revisión humana</Badge> son aquellos en que el análisis no
        alcanzó una conclusión suficientemente segura: los decide el comité.
      </p>
    </div>
  );
}

/** Los integrantes de un consorcio y su participación, debajo de su nombre. */
function Integrantes({ postor }: { postor: ResultadoPostor }) {
  if (!postor.consorcio || postor.consorcio.length === 0) return null;
  return (
    <p className="mt-0.5 text-xs font-normal text-slate-500">
      {postor.consorcio.map((c) => `${c.nombre}${c.participacion ? ` (${c.participacion})` : ''}`).join(' · ')}
    </p>
  );
}

/**
 * Las etapas 4 a 7 que pidió César: cómo se calculó la económica y lo
 * que corresponde —o no— en rechazo, negociación y buena pro.
 */
function EtapasSiguientes({ finales }: { finales: EtapasFinales }) {
  const filas: Array<{ etapa: string; texto: string; aviso?: boolean }> = [
    { etapa: '4. Evaluación económica', texto: finales.metodo },
    {
      etapa: '5. Rechazo de oferta',
      texto:
        finales.rechazo.length === 0
          ? 'No corresponde: ninguna oferta quedó sustancialmente por debajo de la cuantía.'
          : finales.rechazo.map((r) => `${r.postor}: ${r.fundamento}`).join(' '),
      aviso: finales.rechazo.length > 0,
    },
    {
      etapa: '6. Negociación',
      texto: finales.negociacion
        ? `${finales.negociacion.postor}: ${finales.negociacion.fundamento}`
        : 'No corresponde: la oferta del mejor puntaje total no supera la cuantía.',
      aviso: !!finales.negociacion,
    },
    {
      etapa: '7. Otorgamiento de la buena pro',
      texto: `${finales.buenaPro.postor ? `${finales.buenaPro.postor}. ` : ''}${finales.buenaPro.fundamento}`,
    },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Evaluación económica, rechazo, negociación y buena pro</h3>
      </div>
      <dl className="divide-y text-sm">
        {filas.map((f) => (
          <div key={f.etapa} className="grid gap-1 px-4 py-3 sm:grid-cols-[220px_1fr]">
            <dt className="font-medium text-slate-800">{f.etapa}</dt>
            <dd className={cn('text-slate-700', f.aviso && 'text-amber-900')}>{f.texto}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
