'use client';

/**
 * El resultado de la evaluación de un requerimiento.
 *
 * Rediseño del 27/11/2026 sobre el prototipo de César: todo a lo ancho,
 * con los controles en la cabecera y no en una columna que achica los
 * resultados («para que se visualice más amplio la evaluación y no esté
 * estorbando»). Se mantiene lo que el prototipo no tenía y ya funcionaba:
 * las fuentes reales de la biblioteca, la versión mejorada con control de
 * cambios y el veredicto que descarta lo que no procede.
 *
 *   · tarjetas de prioridad que filtran;
 *   · los cinco bloques del requerimiento en una fila, con su contador;
 *   · buscador, selección de lo visible y una barra fija para el Word;
 *   · editar o precisar cualquier hallazgo y añadir observaciones propias,
 *     contrastándolas con A-LexIA (`revision/editor-de-observacion.tsx`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, CheckCircle2, Download, Plus, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RelativeTime } from '@/components/ui/relative-time';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { numerarHallazgos } from '@/lib/evaluacion/mejora/orden';
import type { Mejora, MejoraDelRequerimiento } from '@/lib/evaluacion/mejora/tipos';
import type { CoberturaDeLaRevision, HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import {
  conEdicion,
  type CamposDeObservacion,
  type ContrasteDeObservacion,
  type EdicionDeHallazgo,
  type ObservacionManual,
} from '@/lib/evaluacion/requerimiento/observaciones';
import { PanelVersionMejorada } from './version-mejorada';
import { BLOQUES, SEVERIDAD, SEVERIDADES, bloqueDe, plegar, type IdDeBloque, type Severidad } from './revision/bloques';
import { TarjetaDeHallazgo, type HallazgoEnPantalla } from './revision/tarjeta-de-hallazgo';
import { EditorDeObservacion, OBSERVACION_VACIA } from './revision/editor-de-observacion';
import { DialogoWord } from './revision/dialogo-word';

interface TdrAuditResult {
  tipo_documento: 'TDR' | 'EETT' | 'MIXTO';
  objeto_inferido: string;
  denominacion?: string;
  regimen?: 'menor_8uit' | 'seleccion' | null;
  objeto_contratacion?: 'bienes' | 'servicios' | 'consultoria_obras' | 'obras' | null;
  stats: { criticos: number; altos: number; medios: number; bajos: number };
  hallazgos: HallazgoDeAuditoria[];
  resumen_ejecutivo: string;
  cobertura?: CoberturaDeLaRevision[];
  mejora?: MejoraDelRequerimiento;
  ediciones?: Record<string, EdicionDeHallazgo>;
  manuales?: ObservacionManual[];
}

interface Props {
  id: string;
  title: string;
  result: TdrAuditResult;
  completedAt: string | null;
  origen: 'docx' | 'pdf';
}

const OBJETO = { bienes: 'Bienes', servicios: 'Servicios', consultoria_obras: 'Consultoría de obras', obras: 'Ejecución de obras' } as const;
type FiltroDePrioridad = Severidad | 'alta' | null;

function camposDe(h: HallazgoEnPantalla): CamposDeObservacion {
  return {
    titulo: h.titulo,
    severidad: h.severidad,
    categoria: h.categoria,
    ubicacion_detalle: h.ubicacion_detalle ?? OBSERVACION_VACIA.ubicacion_detalle,
    extracto_literal: h.extracto_literal,
    descripcion: h.descripcion,
    solicitud: h.solicitud ?? 'modificar',
    recomendacion: h.recomendacion,
    marco_normativo: (h.fundamento_normativo ?? [])
      .filter((f) => !f.articulo)
      .map((f) => f.norma)
      .join('; '),
  };
}

export function TdrAuditResultView({ id, title, result, completedAt, origen }: Props) {
  const [mejora, setMejora] = useState<MejoraDelRequerimiento | null>(result.mejora ?? null);
  const [ediciones, setEdiciones] = useState<Record<string, EdicionDeHallazgo>>(result.ediciones ?? {});
  const [manuales, setManuales] = useState<ObservacionManual[]>(result.manuales ?? []);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [prioridad, setPrioridad] = useState<FiltroDePrioridad>(null);
  const [bloque, setBloque] = useState<IdDeBloque | 'todos'>('todos');
  const [buscar, setBuscar] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{ hallazgoId?: string; inicial: CamposDeObservacion; esManual: boolean } | null>(null);
  const [wordAbierto, setWordAbierto] = useState(false);

  // La selección se conserva al cambiar de bloque y al recargar la página.
  const claveSeleccion = `seleccion-requerimiento-${id}`;
  useEffect(() => {
    try {
      const guardada = JSON.parse(sessionStorage.getItem(claveSeleccion) ?? '[]') as string[];
      if (guardada.length) setSeleccion(new Set(guardada));
    } catch {
      /* sin selección guardada */
    }
  }, [claveSeleccion]);
  useEffect(() => {
    sessionStorage.setItem(claveSeleccion, JSON.stringify([...seleccion]));
  }, [claveSeleccion, seleccion]);

  const mejoraDe = (hid: string) => mejora?.mejoras.find((m) => m.hallazgoId === hid);
  const cambiarMejora = (m: Mejora) =>
    setMejora((prev) => (prev ? { ...prev, mejoras: prev.mejoras.map((x) => (x.hallazgoId === m.hallazgoId ? m : x)) } : prev));

  // Un número por observación, el mismo del cuadro de cambios y del Word;
  // las propias siguen la numeración.
  const numeroDe = useMemo(() => {
    const m = new Map(numerarHallazgos(result.hallazgos).map((x) => [x.hallazgo.id, x.numero]));
    let n = m.size;
    for (const o of manuales) m.set(o.id, ++n);
    return m;
  }, [result.hallazgos, manuales]);

  const todos: HallazgoEnPantalla[] = useMemo(
    () => [
      ...result.hallazgos.map((h) => ({ ...conEdicion(h, ediciones[h.id]), contraste: ediciones[h.id]?.contraste })),
      ...manuales,
    ],
    [result.hallazgos, ediciones, manuales],
  );

  // Lo que la versión mejorada concluyó que no procede deja de contar.
  const descartados = new Set((mejora?.mejoras ?? []).filter((m) => m.veredicto === 'descartar').map((m) => m.hallazgoId));
  const vigentes = todos.filter((h) => !descartados.has(h.id));
  const cuenta = (s: Severidad) => vigentes.filter((h) => h.severidad === s).length;
  const stats = { critico: cuenta('critico'), alto: cuenta('alto'), medio: cuenta('medio'), bajo: cuenta('bajo') };
  const total = vigentes.length;
  const veredicto =
    stats.critico > 0
      ? { texto: 'Corregir antes de llevar al mercado', tono: 'text-red-700 dark:text-red-400' }
      : stats.alto > 0
        ? { texto: 'Revisar y corregir', tono: 'text-orange-700 dark:text-orange-400' }
        : stats.medio > 0
          ? { texto: 'Ajustes menores', tono: 'text-amber-700 dark:text-amber-400' }
          : { texto: 'Listo para continuar', tono: 'text-emerald-700 dark:text-emerald-400' };

  const pasaPrioridad = (h: HallazgoEnPantalla) =>
    !prioridad || (prioridad === 'alta' ? h.severidad === 'critico' || h.severidad === 'alto' : h.severidad === prioridad);
  const q = plegar(buscar.trim());
  const pasaBusqueda = (h: HallazgoEnPantalla) =>
    !q || plegar(`${h.titulo} ${h.descripcion} ${h.extracto_literal} ${h.recomendacion} ${h.ubicacion}`).includes(q);
  const visibles = todos
    .filter((h) => (bloque === 'todos' || bloqueDe(h.categoria) === bloque) && pasaPrioridad(h) && pasaBusqueda(h))
    .sort((a, b) => SEVERIDADES.indexOf(a.severidad) - SEVERIDADES.indexOf(b.severidad) || (numeroDe.get(a.id) ?? 0) - (numeroDe.get(b.id) ?? 0));
  const porBloque = Object.fromEntries(
    BLOQUES.map((b) => [b.id, todos.filter((h) => bloqueDe(h.categoria) === b.id && pasaPrioridad(h)).length]),
  ) as Record<IdDeBloque, number>;
  const seleccionadosPorBloque = Object.fromEntries(
    BLOQUES.map((b) => [b.id, todos.filter((h) => seleccion.has(h.id) && bloqueDe(h.categoria) === b.id).length]),
  ) as Record<IdDeBloque, number>;

  const visiblesSeleccionados = visibles.filter((h) => seleccion.has(h.id)).length;
  const todasVisiblesSeleccionadas = visibles.length > 0 && visiblesSeleccionados === visibles.length;
  const casillaTodas = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (casillaTodas.current) casillaTodas.current.indeterminate = visiblesSeleccionados > 0 && !todasVisiblesSeleccionadas;
  }, [visiblesSeleccionados, todasVisiblesSeleccionadas]);

  function seleccionar(ids: string[], v: boolean) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      for (const i of ids) (v ? s.add(i) : s.delete(i));
      return s;
    });
  }

  function alGuardar(r: { hallazgoId: string; campos: CamposDeObservacion; contraste?: ContrasteDeObservacion; respuesta: Record<string, unknown> }) {
    const hallazgo = r.respuesta.hallazgo as ObservacionManual | undefined;
    const edicion = r.respuesta.edicion as EdicionDeHallazgo | undefined;
    if (hallazgo) {
      setManuales((prev) => (prev.some((m) => m.id === hallazgo.id) ? prev.map((m) => (m.id === hallazgo.id ? hallazgo : m)) : [...prev, hallazgo]));
      setAbiertos((p) => ({ ...p, [hallazgo.id]: true }));
      return;
    }
    setEdiciones((prev) => ({
      ...prev,
      [r.hallazgoId]: edicion ?? {
        campos: r.campos,
        version: (prev[r.hallazgoId]?.version ?? 0) + 1,
        editadoEn: new Date().toISOString(),
        ...(r.contraste ? { contraste: r.contraste } : {}),
        historial: prev[r.hallazgoId]?.historial ?? [],
      },
    }));
  }

  async function deshacer(h: HallazgoEnPantalla) {
    const manual = h.origen === 'manual';
    if (manual && !window.confirm('¿Eliminar esta observación?')) return;
    const res = await fetch(`/api/evaluations/${id}/hallazgos/${h.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('No se pudo completar. Vuelve a intentarlo.');
      return;
    }
    if (manual) {
      setManuales((prev) => prev.filter((m) => m.id !== h.id));
      seleccionar([h.id], false);
      toast.success('Observación eliminada');
    } else {
      setEdiciones((prev) => {
        const { [h.id]: _quitada, ...resto } = prev;
        return resto;
      });
      toast.success('Volvió al texto de A-LexIA');
    }
  }

  const tarjetaDePrioridad = (clave: FiltroDePrioridad, etiqueta: string, n: number, clase: string, activa: string) => (
    <button
      key={String(clave)}
      type="button"
      aria-pressed={prioridad === clave}
      onClick={() => setPrioridad((p) => (p === clave ? null : clave))}
      className={cn('rounded-xl px-3 py-2.5 text-left transition-shadow hover:shadow-sm', clase, prioridad === clave && activa)}
    >
      <span className="block font-mono text-2xl font-semibold tabular-nums">{n}</span>
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider opacity-80">{etiqueta}</span>
    </button>
  );

  return (
    <>
      <div className="sticky top-14 z-10 border-b border-border bg-card/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/revisor-tdr">
              <ArrowLeft className="h-4 w-4" /> Mis evaluaciones
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <p className="truncate text-sm font-semibold">{title}</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] space-y-6 px-4 pb-8 pt-6 sm:px-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">Revisión del requerimiento</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {[
              result.tipo_documento,
              result.objeto_contratacion ? OBJETO[result.objeto_contratacion] : null,
              result.regimen === 'menor_8uit' ? 'Contrato menor (≤ 8 UIT)' : result.regimen === 'seleccion' ? 'Procedimiento de selección' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            {completedAt && (
              <>
                {' '}
                · Completada <RelativeTime date={completedAt} />
              </>
            )}
          </p>
        </header>

        {/* Veredicto y prioridades: las tarjetas filtran. */}
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_2fr]">
          <Card className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Veredicto general</p>
            <p className={cn('mt-1 text-xl font-semibold tracking-tight', veredicto.tono)}>{veredicto.texto}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {total} observación{total === 1 ? '' : 'es'}
              {manuales.length > 0 && ` (${manuales.length} tuya${manuales.length === 1 ? '' : 's'})`}
              {descartados.size > 0 && ` · ${descartados.size} no procede${descartados.size === 1 ? '' : 'n'} tras comprobarla${descartados.size === 1 ? '' : 's'}`}
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Filtrar por prioridad">
            {tarjetaDePrioridad('alta', 'Crítica y alta', stats.critico + stats.alto, prioridad === 'alta' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-border bg-card text-foreground', 'ring-2 ring-brand-500')}
            {SEVERIDADES.map((s) => tarjetaDePrioridad(s, SEVERIDAD[s].nombre, stats[s], SEVERIDAD[s].pastilla, SEVERIDAD[s].activa))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <details className="group rounded-xl border border-brand-200/60 bg-gradient-to-br from-brand-50/50 to-violet-50/30 p-5 dark:border-brand-900/50 dark:from-brand-950/30 dark:to-violet-950/20" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" /> Diagnóstico
            </summary>
            <p className="mt-3 text-[14px] leading-relaxed text-foreground/95">{result.resumen_ejecutivo}</p>
          </details>
          {result.cobertura && result.cobertura.length > 0 && (
            <details className="rounded-xl border border-border bg-card p-5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Contraste con la Biblioteca Normativa ·{' '}
                {result.cobertura.reduce((t, c) => t + c.leidos, 0)} precedentes leídos
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {result.cobertura.map((c) => (
                  <div key={c.tema} className="rounded-lg bg-secondary/40 px-3 py-2">
                    <p className="text-[12.5px] font-medium leading-snug">{c.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.clausulas === 0 ? 'Sin cláusulas' : `${c.clausulas} cláusula${c.clausulas === 1 ? '' : 's'}`} · {c.leidos} precedente
                      {c.leidos === 1 ? '' : 's'} · {c.error ? 'no se pudo contrastar' : c.hallazgos === 0 ? 'conforme' : `${c.hallazgos} observación${c.hallazgos === 1 ? '' : 'es'}`}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <PanelVersionMejorada
          id={id}
          origen={origen}
          hallazgos={result.hallazgos.length}
          mejora={mejora}
          onMejora={(m) => {
            setMejora(m);
            setAbiertos(Object.fromEntries(result.hallazgos.map((h) => [h.id, true])));
          }}
        />

        {/* Bloques, en fila: nunca una columna lateral (César). */}
        <nav aria-label="Bloques del requerimiento" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {[{ id: 'todos' as const, nombre: 'Todos', pregunta: 'Todas las observaciones', icono: CheckCircle2 }, ...BLOQUES].map((b) => {
            const n = b.id === 'todos' ? todos.filter(pasaPrioridad).length : porBloque[b.id];
            const activo = bloque === b.id;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setBloque(b.id)}
                className={cn(
                  'flex min-h-[64px] items-start gap-2.5 rounded-xl border bg-card p-3 text-left transition-all hover:border-brand-400',
                  activo ? 'border-brand-500 bg-brand-50 shadow-[inset_0_0_0_1px] shadow-brand-500 dark:bg-brand-950/30' : 'border-border',
                )}
              >
                <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', activo ? 'bg-brand-600 text-white' : 'bg-secondary text-muted-foreground')}>
                  <b.icono className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-tight">
                    {b.nombre} <span className="font-normal text-muted-foreground">· {n}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{b.pregunta}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Buscar, añadir, seleccionar. */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar en las observaciones" className="pl-9" aria-label="Buscar en las observaciones" />
          </div>
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
            <input
              ref={casillaTodas}
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={todasVisiblesSeleccionadas}
              disabled={visibles.length === 0}
              onChange={(e) => seleccionar(visibles.map((h) => h.id), e.target.checked)}
            />
            Seleccionar visibles ({visibles.length})
          </label>
          {seleccion.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>
              <X className="h-3.5 w-3.5" /> Limpiar selección
            </Button>
          )}
          <Button size="sm" onClick={() => setEditor({ inicial: OBSERVACION_VACIA, esManual: true })}>
            <Plus className="h-4 w-4" /> Añadir observación
          </Button>
        </div>

        <p className="text-[12px] text-muted-foreground" aria-live="polite">
          {visibles.length} de {todos.length} observación{todos.length === 1 ? '' : 'es'} visibles
          {(prioridad || bloque !== 'todos' || q) && (
            <button
              type="button"
              className="ml-2 font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
              onClick={() => {
                setPrioridad(null);
                setBloque('todos');
                setBuscar('');
              }}
            >
              Quitar filtros
            </button>
          )}
        </p>

        <section className="space-y-3">
          {visibles.map((h) => (
            <TarjetaDeHallazgo
              key={h.id}
              h={h}
              numero={numeroDe.get(h.id) ?? 0}
              seleccionado={seleccion.has(h.id)}
              onSeleccionar={(v) => seleccionar([h.id], v)}
              abierto={abiertos[h.id] ?? false}
              onAlternar={() => setAbiertos((p) => ({ ...p, [h.id]: !(p[h.id] ?? false) }))}
              mejora={mejoraDe(h.id)}
              evaluacionId={id}
              origenDoc={origen}
              onCambioMejora={cambiarMejora}
              onEditar={() => setEditor({ hallazgoId: h.id, inicial: camposDe(h), esManual: h.origen === 'manual' })}
              onDeshacer={h.origen === 'manual' || h.editado ? () => deshacer(h) : undefined}
            />
          ))}
          {visibles.length === 0 && (
            <Card className="p-10 text-center">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <h3 className="mb-1 text-lg font-semibold">{todos.length === 0 ? 'Sin observaciones' : 'Nada con estos filtros'}</h3>
              <p className="text-sm text-muted-foreground">
                {todos.length === 0
                  ? 'A-LexIA no detectó vicios significativos. Si ves algo, añádelo con «Añadir observación».'
                  : 'Prueba con otro bloque o quita los filtros. La selección de otros bloques se conserva.'}
              </p>
            </Card>
          )}
        </section>

      {/* Barra fija para el Word de lo seleccionado. */}
        <div className="sticky bottom-3 z-20 rounded-xl border border-slate-800 bg-slate-900/95 text-white shadow-lg backdrop-blur-sm">
          <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" aria-live="polite">
              <span className="font-semibold">{seleccion.size}</span> seleccionada{seleccion.size === 1 ? '' : 's'}
              <span className="ml-2 text-[12px] text-slate-400">La selección se conserva al cambiar de bloque.</span>
            </p>
            <Button onClick={() => setWordAbierto(true)} disabled={seleccion.size === 0} variant="secondary">
              <Download className="h-4 w-4" /> Descargar Word
            </Button>
          </div>
        </div>
      </div>

      {editor && (
        <EditorDeObservacion
          abierto={!!editor}
          evaluacionId={id}
          hallazgoId={editor.hallazgoId}
          inicial={editor.inicial}
          esManual={editor.esManual}
          onCerrar={() => setEditor(null)}
          onGuardado={alGuardar}
        />
      )}
      <DialogoWord
        abierto={wordAbierto}
        evaluacionId={id}
        ids={todos.filter((h) => seleccion.has(h.id)).map((h) => h.id)}
        porBloque={seleccionadosPorBloque}
        onCerrar={() => setWordAbierto(false)}
      />
    </>
  );
}
