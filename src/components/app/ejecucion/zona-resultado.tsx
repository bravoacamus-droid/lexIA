'use client';

/**
 * Zona 3 — Resultado: el diagnóstico, la pregunta que falta, los dos
 * semáforos, el documento que corresponde y lo que se puede hacer
 * después.
 */
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleDashed,
  CircleX,
  FileDown,
  FileSignature,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTUACIONES, PERFILES, type Actuacion, type Perfil } from '@/lib/ejecucion/catalogo';
import { TEXTO_NIVEL } from '@/lib/ejecucion/suficiencia';
import type { ActuacionDelExpediente } from '@/lib/ejecucion/estado';
import { TIPO_DE_HALLAZGO, type BorradorDeDocumento, type CondicionEvaluada, type NivelDeSalida, type PreguntaDecisiva } from '@/lib/ejecucion/tipos';
import { SemaforoDeInformacion, SemaforoDeProcedencia } from './semaforos';
import { FASES_DE_LA_REDACCION, FASES_DEL_ANALISIS, Progreso } from './progreso';
import { CajaDeDocumentos, type ArchivoSubido } from './subida';
import { Zona } from './zona';

export type Ocupacion = 'analizando' | 'redactando' | 'auditando' | 'respondiendo' | 'subiendo' | null;

const ICONO_COND: Record<CondicionEvaluada['estado'], { icono: typeof CheckCircle2; clase: string; texto: string }> = {
  cumple: { icono: CheckCircle2, clase: 'text-emerald-600', texto: 'Cumple' },
  no_cumple: { icono: CircleX, clase: 'text-red-600', texto: 'No cumple' },
  no_acreditado: { icono: CircleDashed, clase: 'text-orange-500', texto: 'No acreditado' },
  declarado: { icono: UserCheck, clase: 'text-amber-600', texto: 'Declarado' },
  no_aplica: { icono: CircleDashed, clase: 'text-muted-foreground', texto: 'No aplica' },
};

const NIVELES: NivelDeSalida[] = ['diagnostico', 'borrador_condicionado', 'revision_final'];
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ORDINAL = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena', 'décima'];

const EXPLICA_NIVEL: Record<NivelDeSalida, string> = {
  diagnostico: 'Con información incompleta, las limitaciones a la vista.',
  borrador_condicionado: 'El documento, con advertencias y campos pendientes. No es sustento definitivo.',
  revision_final: 'Cuando lo esencial está acreditado. Sujeto a validación humana.',
};

export function ZonaResultado({
  expedienteId,
  act,
  ocupado,
  permitidos,
  pendienteOficial,
  alResponder,
  alAnalizar,
  alRedactar,
  alAuditar,
  alContinuar,
  alSubirOficial,
}: {
  expedienteId: string;
  act: ActuacionDelExpediente;
  ocupado: Ocupacion;
  permitidos: Perfil[];
  pendienteOficial: { documentoId: string; nombre: string; perfil: Perfil } | null;
  alResponder: (p: PreguntaDecisiva, respuesta: string) => Promise<void>;
  alAnalizar: (como?: Actuacion) => Promise<void>;
  alRedactar: (nivel: NivelDeSalida) => Promise<void>;
  alAuditar: () => Promise<void>;
  alContinuar: (perfil: Perfil) => Promise<void>;
  alSubirOficial: (subidos: ArchivoSubido[], versionDe: string) => Promise<void>;
}) {
  const a = act.analisis;
  const ocupadoAlgo = ocupado !== null;

  if (ocupado === 'analizando' || ocupado === 'respondiendo' || (act.estado === 'analizando' && !a)) {
    return (
      <Zona numero="3" titulo="Resultado">
        <Progreso titulo={ocupado === 'respondiendo' ? 'Rehaciendo el diagnóstico con tu respuesta…' : 'A-LexIA está analizando el caso…'} fases={FASES_DEL_ANALISIS} />
      </Zona>
    );
  }
  if (!a) {
    return (
      <Zona numero="3" titulo="Resultado">
        {act.estado === 'error' && act.error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            No se pudo analizar: {act.error}
          </p>
        )}
        <button type="button" onClick={() => void alAnalizar()} className="inline-flex items-center gap-2 rounded-lg bg-generar-500 px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-generar-600">
          <Sparkles className="h-4 w-4" /> Analizar el caso
        </button>
      </Zona>
    );
  }

  const b = act.borrador;
  const siguiente = a.cadena.filter((p) => !p.hecho && p.perfil !== act.perfil && permitidos.includes(p.perfil as Perfil));
  const continuar = [...new Map(siguiente.map((p) => [p.perfil, p])).values()];
  const bloqueado = !!b && b.nivel === 'revision_final' && !!act.auditoria?.bloquea;
  const base = `/api/expedientes/${expedienteId}/actuaciones/${act.id}/word`;

  return (
    <Zona
      numero="3"
      titulo="Resultado"
      bajada={`Diagnóstico del ${new Date(a.generadoEn).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}`}
      accion={
        <button
          type="button"
          disabled={ocupadoAlgo}
          onClick={() => void alAnalizar()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          title="Volver a analizar con lo que hay ahora en el expediente"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Volver a analizar
        </button>
      }
    >
      {act.estado === 'error' && act.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          El último intento falló: {act.error}. Se muestra el diagnóstico anterior.
        </p>
      )}

      {pendienteOficial && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
          <p className="text-[13px] font-semibold text-sky-900 dark:text-sky-200">
            Para utilizar el informe del perfil {PERFILES[pendienteOficial.perfil].nombre} como antecedente formal, adjunta la versión oficialmente emitida, con número, fecha y contenido presentado.
          </p>
          <p className="mt-1 text-[12px] text-sky-900/80 dark:text-sky-200/80">El borrador generado por A-LexIA («{pendienteOficial.nombre}») permanecerá como referencia de trabajo.</p>
          <div className="mt-2.5">
            <CajaDeDocumentos compacta deshabilitada={ocupadoAlgo} texto="Adjuntar la versión oficial firmada (PDF o Word)" alSubir={(s) => alSubirOficial(s, pendienteOficial.documentoId)} />
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <SemaforoDeProcedencia color={a.procedencia.semaforo} razon={a.procedencia.razon} />
        <SemaforoDeInformacion color={a.semaforoInformacion} suficiencia={a.suficiencia} mensaje={a.mensajeSuficiencia} />
      </div>

      {a.pregunta && <PreguntaDecisivaView key={a.pregunta.id} p={a.pregunta} ocupado={ocupadoAlgo} alResponder={alResponder} />}

      {!a.figura.corresponde && (
        <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-[13px] font-semibold">La figura solicitada no corresponde</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/85">{a.figura.razon}</p>
          {a.figura.alternativa && (
            <button
              type="button"
              disabled={ocupadoAlgo}
              onClick={() => void alAnalizar(a.figura.alternativa!)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[12.5px] font-semibold text-background hover:opacity-90"
            >
              Analizar como {ACTUACIONES[a.figura.alternativa].nombre.toLowerCase()} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Diagnóstico */}
      <div className="space-y-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Diagnóstico preliminar</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Dato titulo="Figura" texto={a.figura.nombre} detalle={a.figura.corresponde ? a.figura.razon : undefined} />
          <Dato titulo="Competencia por verificar" texto={a.competencia.organo} detalle={`${a.competencia.base}. ${a.competencia.verificar}`} />
        </div>

        {(a.datosDeLosDocumentos?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[12px] font-semibold">Datos tomados de los documentos (no se te preguntan)</p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed">
              {a.datosDeLosDocumentos!.map((d) => (
                <li key={d.id}>
                  <span className="text-muted-foreground">{d.pregunta.replace(/^¿|\?$/g, '')}:</span>{' '}
                  <span className="font-semibold">{/^\d{4}-\d{2}-\d{2}$/.test(d.valor) ? d.valor.split('-').reverse().join('/') : d.valor}</span>
                  <span className="block border-l-2 border-border pl-2 text-[11.5px] italic text-muted-foreground">
                    «{d.cita}» — {d.documento}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.condiciones.length > 0 && (
          <Plegable titulo={`Condiciones de procedencia (${a.condiciones.filter((c) => c.estado === 'cumple').length} de ${a.condiciones.length} cumplidas)`} abierto>
            <ul className="space-y-2">
              {a.condiciones.map((c) => {
                const I = ICONO_COND[c.estado];
                return (
                  <li key={c.id} className="flex gap-2">
                    <I.icono className={cn('mt-0.5 h-4 w-4 shrink-0', I.clase)} aria-label={I.texto} />
                    <div className="min-w-0 text-[12.5px] leading-relaxed">
                      <p className="font-medium">
                        {c.texto} <span className={cn('text-[11px] font-semibold', I.clase)}>· {I.texto}</span>
                        {c.calculada && <span className="ml-1 rounded bg-secondary px-1 py-px text-[10px] text-muted-foreground">calculado</span>}
                      </p>
                      {c.sustento && <p className="text-muted-foreground">{c.sustento}</p>}
                      {c.evidencia.map((e, i) => (
                        <p key={i} className="mt-0.5 border-l-2 border-border pl-2 text-[11.5px] italic text-foreground/75">
                          «{e.cita}» — {e.documento}
                        </p>
                      ))}
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <BookOpen className="h-3 w-3" /> {c.base}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Plegable>
        )}

        {a.hechos.length > 0 && (
          <Plegable titulo="Hechos: acreditados y declarados">
            <ul className="space-y-1.5 text-[12.5px] leading-relaxed">
              {a.hechos.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded px-1.5 py-px text-[10.5px] font-semibold',
                      h.estado === 'acreditado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : h.estado === 'declarado'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {h.estado === 'acreditado' ? 'Acreditado' : h.estado === 'declarado' ? 'Declarado' : 'No acreditado'}
                  </span>
                  <span>
                    {h.fecha && <span className="text-muted-foreground">{h.fecha.split('-').reverse().join('/')} · </span>}
                    {h.hecho}
                    {h.documento && <span className="text-muted-foreground"> ({h.documento})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Plegable>
        )}

        {a.calculos.length > 0 && (
          <Plegable titulo="Cálculos" icono={Calculator} abierto>
            <ul className="space-y-2 text-[12.5px] leading-relaxed">
              {a.calculos.map((c, i) => (
                <li key={i} className={cn('rounded-md p-2', c.impide ? 'bg-red-50 dark:bg-red-950/30' : 'bg-secondary/40')}>
                  <p className="font-semibold">
                    {c.concepto}: <span className={c.impide ? 'text-red-700 dark:text-red-300' : ''}>{c.resultado}</span>
                  </p>
                  <p className="text-muted-foreground">{c.detalle}</p>
                  <p className="text-[11px] text-muted-foreground">{c.base}</p>
                </li>
              ))}
            </ul>
          </Plegable>
        )}

        {(a.riesgos.length > 0 || a.contradicciones.length > 0) && (
          <Plegable titulo={`Riesgos y contradicciones (${a.riesgos.length + a.contradicciones.length})`} icono={AlertTriangle}>
            <ul className="space-y-1.5 text-[12.5px] leading-relaxed">
              {a.riesgos.map((r, i) => (
                <li key={`r${i}`} className="flex gap-2">
                  <span className={cn('mt-0.5 shrink-0 rounded px-1.5 py-px text-[10.5px] font-semibold', r.gravedad === 'alta' ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' : r.gravedad === 'media' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300' : 'bg-secondary text-muted-foreground')}>
                    Riesgo {r.gravedad}
                  </span>
                  <span>{r.descripcion}</span>
                </li>
              ))}
              {a.contradicciones.map((c, i) => (
                <li key={`c${i}`} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-px text-[10.5px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Contradicción</span>
                  <span>{c.descripcion}</span>
                </li>
              ))}
            </ul>
          </Plegable>
        )}

        {a.advertencias.length > 0 && (
          <Plegable titulo={`Advertencias para la revisión humana (${a.advertencias.length})`} icono={ShieldAlert}>
            <ul className="list-disc space-y-1 pl-5 text-[12.5px] leading-relaxed">
              {a.advertencias.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Plegable>
        )}
      </div>

      {/* Cadena documental */}
      {a.cadena.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Cadena documental</h3>
          <ol className="mt-2 space-y-1.5">
            {a.cadena.map((p, i) => {
              const aqui = p.perfil === act.perfil || (act.perfil === 'titular' && p.perfil === 'aga');
              return (
                <li key={i} className={cn('flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px]', aqui ? 'bg-generar-50 ring-1 ring-generar-300 dark:bg-generar-900/25 dark:ring-generar-800' : '')}>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold',
                      p.hecho ? 'bg-emerald-500 text-white' : aqui ? 'bg-generar-500 text-white' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {p.hecho ? '✓' : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold">{PERFILES[p.perfil as Perfil]?.nombre ?? p.perfil}</span> — {p.documento}
                      {aqui && <span className="ml-1.5 rounded bg-generar-500 px-1.5 py-px text-[10px] font-bold text-white">tu documento</span>}
                    </p>
                    {(p.condicion || p.base) && (
                      <p className="text-[11.5px] text-muted-foreground">
                        {p.condicion}
                        {p.condicion && p.base ? ' · ' : ''}
                        {p.base}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-pretty text-[12px] leading-relaxed text-muted-foreground">{a.explicacionCadena}</p>
        </div>
      )}

      {/* Documento recomendado */}
      <div className="rounded-xl border border-generar-200 p-4 dark:border-generar-900/60">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Documento recomendado</p>
        <p className="mt-1 flex items-center gap-2 text-[15px] font-bold">
          <FileSignature className="h-4 w-4 text-generar-600" />
          {a.documento.titulo}
        </p>
        {a.documento.advertencia && <p className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-300">{a.documento.advertencia}</p>}
        {ocupado === 'redactando' ? (
          <div className="mt-3">
            <Progreso titulo="Redactando y auditando el documento…" fases={FASES_DE_LA_REDACCION} />
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {NIVELES.map((n) => {
              const puede = a.nivelesPermitidos.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  disabled={!puede || ocupadoAlgo}
                  onClick={() => void alRedactar(n)}
                  title={puede ? EXPLICA_NIVEL[n] : n === 'revision_final' ? 'Requiere acreditar lo esencial (suficiencia de 90 % o más) y que la figura proceda.' : 'Requiere una suficiencia de 40 % o más.'}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    puede ? 'border-generar-300 bg-card hover:bg-generar-50 dark:border-generar-800 dark:hover:bg-generar-900/25' : 'cursor-not-allowed border-border bg-secondary/40 opacity-60',
                  )}
                >
                  <span className="block text-[12.5px] font-semibold">{TEXTO_NIVEL[n]}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">{puede ? EXPLICA_NIVEL[n] : n === 'revision_final' ? 'Aún no: falta acreditar lo esencial.' : 'Aún no: falta información indispensable.'}</span>
                </button>
              );
            })}
          </div>
        )}
        {a.nivelesPermitidos.includes('borrador_condicionado') && !a.nivelesPermitidos.includes('revision_final') && (
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Puede generar un borrador condicionado, pero no se recomienda utilizarlo como sustento definitivo hasta incorporar los documentos faltantes.
          </p>
        )}
      </div>

      {b && ocupado !== 'redactando' && (
        <DocumentoGenerado
          b={b}
          auditoria={act.auditoria}
          bloqueado={bloqueado}
          base={base}
          auditando={ocupado === 'auditando'}
          ocupado={ocupadoAlgo}
          alAuditar={alAuditar}
        />
      )}

      {/* ¿Qué deseas hacer ahora? */}
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">¿Qué deseas hacer ahora?</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {continuar.map((p) => (
            <button
              key={p.perfil}
              type="button"
              disabled={ocupadoAlgo}
              onClick={() => void alContinuar(p.perfil as Perfil)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-generar-300 bg-generar-50/60 px-3 py-2 text-[12.5px] font-semibold text-generar-800 hover:bg-generar-100 disabled:opacity-50 dark:border-generar-800 dark:bg-generar-900/25 dark:text-generar-200"
            >
              Continuar expediente en perfil {PERFILES[p.perfil as Perfil].nombre} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ))}
          <OtroPerfil actual={act.perfil} permitidos={permitidos} excluir={continuar.map((p) => p.perfil as Perfil)} ocupado={ocupadoAlgo} alElegir={alContinuar} />
          <a href={`${base}?que=ficha`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-medium hover:bg-secondary">
            <ShieldCheck className="h-3.5 w-3.5" /> Ficha de control (Word)
          </a>
        </div>
      </div>
    </Zona>
  );
}

function Dato({ titulo, texto, detalle }: { titulo: string; texto: string; detalle?: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className="mt-0.5 text-[13px] font-semibold leading-snug">{texto}</p>
      {detalle && <p className="mt-1 line-clamp-4 text-[11.5px] leading-snug text-muted-foreground">{detalle}</p>}
    </div>
  );
}

function Plegable({ titulo, children, abierto = false, icono: Icono }: { titulo: string; children: React.ReactNode; abierto?: boolean; icono?: typeof AlertTriangle }) {
  return (
    <details open={abierto} className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[12.5px] font-semibold [&::-webkit-details-marker]:hidden">
        {Icono && <Icono className="h-3.5 w-3.5 text-muted-foreground" />}
        {titulo}
        <span className="ml-auto text-[11px] font-normal text-muted-foreground group-open:hidden">ver</span>
        <span className="ml-auto hidden text-[11px] font-normal text-muted-foreground group-open:inline">ocultar</span>
      </summary>
      <div className="border-t border-border px-3 py-2.5">{children}</div>
    </details>
  );
}

function PreguntaDecisivaView({ p, ocupado, alResponder }: { p: PreguntaDecisiva; ocupado: boolean; alResponder: (p: PreguntaDecisiva, r: string) => Promise<void> }) {
  const [texto, setTexto] = useState('');
  const esFecha = p.campo?.startsWith('fecha') || /fecha/i.test(p.id);
  return (
    <div className="rounded-xl border-2 border-generar-300 bg-generar-50/40 p-4 dark:border-generar-800 dark:bg-generar-900/15">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-generar-700 dark:text-generar-400">
        <HelpCircle className="h-3.5 w-3.5" /> Una pregunta decisiva
      </p>
      <p className="mt-1 text-[15px] font-semibold leading-snug">{p.texto}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        {p.porQue}
        {p.cambia.length > 0 && <span> Puede cambiar: {p.cambia.join(', ')}.</span>}
      </p>
      {p.opciones?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {p.opciones.map((o) => (
            <button
              key={o}
              type="button"
              disabled={ocupado}
              onClick={() => void alResponder(p, o)}
              className="rounded-lg border border-generar-300 bg-card px-3.5 py-2 text-[13px] font-medium hover:bg-generar-100 disabled:opacity-50 dark:border-generar-800 dark:hover:bg-generar-900/30"
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) void alResponder(p, texto.trim());
          }}
        >
          <input
            type={esFecha ? 'date' : 'text'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={esFecha ? undefined : 'Tu respuesta'}
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-generar-400"
            aria-label={p.texto}
          />
          <button type="submit" disabled={ocupado || !texto.trim()} className="rounded-lg bg-generar-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-generar-600 disabled:opacity-50">
            Responder
          </button>
        </form>
      )}
      {p.siEsSi && <p className="mt-2 text-[11.5px] text-muted-foreground">Si la respuesta es sí: {p.siEsSi} Puedes añadirlo en «Fuentes».</p>}
    </div>
  );
}

function OtroPerfil({ actual, permitidos, excluir, ocupado, alElegir }: { actual: Perfil; permitidos: Perfil[]; excluir: Perfil[]; ocupado: boolean; alElegir: (p: Perfil) => Promise<void> }) {
  const otros = permitidos.filter((p) => p !== actual && !excluir.includes(p));
  if (!otros.length) return null;
  return (
    <select
      disabled={ocupado}
      value=""
      onChange={(e) => e.target.value && void alElegir(e.target.value as Perfil)}
      className="rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-medium hover:bg-secondary"
      aria-label="Continuar con otro perfil"
    >
      <option value="">Continuar con otro perfil…</option>
      {otros.map((p) => (
        <option key={p} value={p}>
          {PERFILES[p].nombre}
        </option>
      ))}
    </select>
  );
}

/** Un texto del documento, con **negritas** y los huecos en rojo. */
function Texto({ t }: { t: string }) {
  const trozos = t.split(/(\*\*[^*]+\*\*|\[[^\]\n]{1,80}\])/g);
  return (
    <>
      {trozos.map((x, i) =>
        x.startsWith('**') ? (
          <strong key={i}>{x.slice(2, -2)}</strong>
        ) : x.startsWith('[') && x.endsWith(']') ? (
          <span key={i} className="rounded bg-red-50 px-0.5 font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {x}
          </span>
        ) : (
          <span key={i}>{x}</span>
        ),
      )}
    </>
  );
}

function DocumentoGenerado({
  b,
  auditoria,
  bloqueado,
  base,
  auditando,
  ocupado,
  alAuditar,
}: {
  b: BorradorDeDocumento;
  auditoria: ActuacionDelExpediente['auditoria'];
  bloqueado: boolean;
  base: string;
  auditando: boolean;
  ocupado: boolean;
  alAuditar: () => Promise<void>;
}) {
  const errores = auditoria?.hallazgos.filter((h) => h.gravedad === 'error') ?? [];
  const avisos = auditoria?.hallazgos.filter((h) => h.gravedad === 'advertencia') ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Documento generado</h3>
        <span className="rounded bg-secondary px-1.5 py-px text-[11px] font-medium">
          {TEXTO_NIVEL[b.nivel]} · versión {b.version}
        </span>
      </div>

      {/* Auditoría */}
      <div className={cn('rounded-xl border p-3.5', errores.length ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30' : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/25')}>
        <div className="flex items-start gap-2">
          {errores.length ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">
              {errores.length ? 'Se detectó una inconsistencia que debe ser revisada antes de emitir el documento.' : 'Auditoría automática sin inconsistencias'}
            </p>
            {[...errores, ...avisos].length > 0 && (
              <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed">
                {[...errores, ...avisos].map((h, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className={cn('shrink-0 font-semibold', h.gravedad === 'error' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300')}>
                      {h.gravedad === 'error' ? 'Error' : 'Aviso'} · {TIPO_DE_HALLAZGO[h.tipo]}:
                    </span>
                    <span>{h.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" disabled={ocupado} onClick={() => void alAuditar()} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted-foreground hover:bg-background/60 hover:text-foreground">
            {auditando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Auditar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {bloqueado ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-[12.5px] font-semibold text-muted-foreground">
              <FileDown className="h-4 w-4" /> Documento definitivo bloqueado
            </span>
            <a href={`${base}?que=documento&como=borrador`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12.5px] font-semibold hover:bg-secondary">
              <FileDown className="h-4 w-4" /> Descargar como borrador condicionado
            </a>
          </>
        ) : (
          <a href={`${base}?que=documento`} className="inline-flex items-center gap-1.5 rounded-lg bg-generar-500 px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-generar-600">
            <FileDown className="h-4 w-4" /> Descargar Word
          </a>
        )}
      </div>

      {/* Vista previa */}
      <article className="max-h-[560px] overflow-y-auto rounded-xl border border-border bg-background p-5 text-[13px] leading-relaxed shadow-inner">
        <p className="text-center text-[13.5px] font-bold uppercase">{b.titulo}</p>
        <p className="mt-3">
          <strong>ASUNTO:</strong> {b.asunto}
        </p>
        {b.referencias.length > 0 && (
          <div className="mt-1">
            <strong>REFERENCIA:</strong>
            <ol className="ml-5 list-[lower-alpha]">
              {b.referencias.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </div>
        )}
        {b.tipo === 'resolucion' ? (
          <>
            <p className="mt-3">
              <strong>VISTOS:</strong> <Texto t={(b.vistos ?? []).join('; ')} />
            </p>
            <p className="mt-3 font-bold">CONSIDERANDO:</p>
            {(b.considerandos ?? []).map((t, i) => (
              <p key={i} className="mt-2 text-justify">
                <Texto t={t} />
              </p>
            ))}
            <p className="mt-3 font-bold">SE RESUELVE:</p>
            {(b.resuelve ?? []).map((t, i) => (
              <p key={i} className="mt-2 text-justify">
                <strong>Artículo {i + 1}.-</strong> <Texto t={t} />
              </p>
            ))}
          </>
        ) : (
          b.secciones.map((s, i) => (
            <section key={i} className="mt-4">
              <p className="font-bold uppercase">
                {b.tipo === 'carta' ? `${i + 1}.` : b.tipo === 'adenda' ? `Cláusula ${ORDINAL[i] ?? i + 1}:` : `${ROMANOS[i] ?? i + 1}.`} {s.titulo}
              </p>
              {s.parrafos.map((p, j) => (
                <p key={j} className="mt-2 whitespace-pre-line text-justify">
                  <Texto t={p} />
                </p>
              ))}
            </section>
          ))
        )}
      </article>
    </div>
  );
}
