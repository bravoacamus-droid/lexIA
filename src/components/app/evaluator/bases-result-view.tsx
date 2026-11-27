'use client';

/**
 * El resultado de la evaluación de bases.
 *
 * Se lee de dos maneras, según quién mira: el proveedor busca qué
 * consultar u observar —y puede llevarlo a su pliego de consultas—; la
 * Entidad, qué corregir antes de publicar. El perfil elige la lectura
 * por defecto y se puede cambiar.
 *
 * Rediseño del 27/11/2026 sobre el prototipo de César (el mismo de la
 * revisión del requerimiento): todo a lo ancho, las secciones y capítulos
 * en una fila con su contador, tarjetas de prioridad y de tipo que
 * filtran, buscador, selección de lo visible y una barra fija para llevar
 * lo seleccionado al pliego.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Layers,
  Loader2,
  MapPin,
  MessagesSquare,
  Quote,
  RefreshCw,
  Scale,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import { TEXTO_TIPO, type HallazgoBases, type ResultadoBases } from '@/lib/evaluacion/bases/tipos';
import { NOMBRE_DE_FUENTE } from '@/lib/evaluacion/bases/fuentes';
import { SEVERIDAD, SEVERIDADES, plegar, type Severidad } from './revision/bloques';

type Lectura = 'proveedor' | 'entidad';
type FiltroDePrioridad = Severidad | 'alta' | null;

interface Props {
  id: string;
  titulo: string;
  documento: string;
  resultado: ResultadoBases;
  completada: string | null;
  lecturaInicial: Lectura;
  /** El proveedor puede llevar hallazgos a su pliego de consultas. */
  puedeFormular: boolean;
  estandares: Array<{ id: string; titulo: string }>;
}

function Cita({ rotulo, texto, icono: Icono = Quote }: { rotulo: string; texto: string; icono?: typeof Quote }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icono className="h-3 w-3" />
        {rotulo}
      </p>
      <blockquote className="whitespace-pre-line border-l-2 border-border pl-3 text-[13px] leading-relaxed text-foreground/85">{texto}</blockquote>
    </div>
  );
}

/** La sección donde cae el hallazgo: la General, o el capítulo de la Específica. */
const seccionDe = (h: HallazgoBases) => (h.seccion === 'General' ? 'Sección General' : h.capitulo || 'Sección Específica');

export function BasesResultView({ id, titulo, documento, resultado: inicial, completada, lecturaInicial, puedeFormular, estandares }: Props) {
  const router = useRouter();
  const [resultado, setResultado] = useState(inicial);
  const [lectura, setLectura] = useState<Lectura>(lecturaInicial);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [bajando, setBajando] = useState(false);
  const [formulando, setFormulando] = useState(false);
  const [reevaluando, setReevaluando] = useState(false);
  const [otroEstandar, setOtroEstandar] = useState(resultado.estandar.id);
  const [prioridad, setPrioridad] = useState<FiltroDePrioridad>(null);
  const [clase, setClase] = useState<'consulta' | 'observacion' | null>(null);
  const [seccion, setSeccion] = useState<string>('todas');
  const [buscar, setBuscar] = useState('');

  const numero = useMemo(() => new Map(resultado.hallazgos.map((h, i) => [h.id, i + 1])), [resultado]);
  const conSeleccion = puedeFormular && lectura === 'proveedor';

  // Las secciones en el orden de las bases: la General y luego cada capítulo.
  const secciones = useMemo(() => {
    const orden: string[] = ['Sección General'];
    for (const h of resultado.hallazgos) if (h.seccion !== 'General' && !orden.includes(seccionDe(h))) orden.push(seccionDe(h));
    for (const c of resultado.capitulosRevisados) if (!orden.includes(c)) orden.push(c);
    return orden;
  }, [resultado]);

  const cuenta = (s: Severidad) => resultado.hallazgos.filter((h) => h.severidad === s).length;
  const stats = { critico: cuenta('critico'), alto: cuenta('alto'), medio: cuenta('medio'), bajo: cuenta('bajo') };
  const consultas = resultado.hallazgos.filter((h) => h.paraElProveedor.tipo === 'consulta').length;
  const observaciones = resultado.hallazgos.length - consultas;

  const pasaPrioridad = (h: HallazgoBases) =>
    !prioridad || (prioridad === 'alta' ? h.severidad === 'critico' || h.severidad === 'alto' : h.severidad === prioridad);
  const pasaClase = (h: HallazgoBases) => !clase || h.paraElProveedor.tipo === clase;
  const q = plegar(buscar.trim());
  const pasaBusqueda = (h: HallazgoBases) =>
    !q || plegar(`${h.titulo} ${h.analisis} ${h.enLasBases} ${h.norma} ${h.capitulo} ${h.numeral}`).includes(q);
  const visibles = resultado.hallazgos
    .filter((h) => (seccion === 'todas' || seccionDe(h) === seccion) && pasaPrioridad(h) && pasaClase(h) && pasaBusqueda(h))
    .sort((a, b) => SEVERIDADES.indexOf(a.severidad) - SEVERIDADES.indexOf(b.severidad) || (numero.get(a.id) ?? 0) - (numero.get(b.id) ?? 0));
  const enSeccion = (s: string) => resultado.hallazgos.filter((h) => seccionDe(h) === s && pasaPrioridad(h) && pasaClase(h)).length;

  const visiblesSeleccionados = visibles.filter((h) => seleccion.has(h.id)).length;
  const todasVisibles = visibles.length > 0 && visiblesSeleccionados === visibles.length;
  const casilla = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (casilla.current) casilla.current.indeterminate = visiblesSeleccionados > 0 && !todasVisibles;
  }, [visiblesSeleccionados, todasVisibles]);
  const seleccionar = (ids: string[], v: boolean) =>
    setSeleccion((prev) => {
      const s = new Set(prev);
      for (const i of ids) (v ? s.add(i) : s.delete(i));
      return s;
    });

  async function descargar() {
    setBajando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/bases/informe?para=${lectura}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const nombre =
        decodeURIComponent((res.headers.get('Content-Disposition') ?? '').match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? '') || 'Evaluación de bases.docx';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      toast.error(`No se pudo descargar: ${(e as Error).message}`);
    } finally {
      setBajando(false);
    }
  }

  async function formular() {
    const ids = resultado.hallazgos.filter((h) => seleccion.has(h.id)).map((h) => h.id);
    if (ids.length === 0) return;
    setFormulando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/bases/consultas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hallazgos: ids }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || j.error || `Error ${res.status}`);
      toast.success(`${j.entradas} ${j.entradas === 1 ? 'entrada lista' : 'entradas listas'} en tu pliego de consultas`);
      router.push(`/evaluar/consultas/${j.pliegoId}`);
    } catch (e) {
      toast.error(`No se pudo crear el pliego: ${(e as Error).message}`);
      setFormulando(false);
    }
  }

  async function reevaluar() {
    if (otroEstandar === resultado.estandar.id) return;
    setReevaluando(true);
    try {
      const res = await fetch(`/api/evaluations/${id}/bases/reevaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estandarId: otroEstandar }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.detail || j.error || `Error ${res.status}`);
      setResultado(j.resultado as ResultadoBases);
      setSeleccion(new Set());
      setSeccion('todas');
      toast.success('Evaluada otra vez con la bases estándar elegida');
    } catch (e) {
      toast.error(`No se pudo reevaluar: ${(e as Error).message}`);
    } finally {
      setReevaluando(false);
    }
  }

  const tarjetaDeFiltro = (activa: boolean, onClick: () => void, n: number, etiqueta: string, claseBase: string, claseActiva: string) => (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={cn('rounded-xl px-3 py-2.5 text-left transition-shadow hover:shadow-sm', claseBase, activa && claseActiva)}
    >
      <span className="block font-mono text-2xl font-semibold tabular-nums">{n}</span>
      <span className="block text-[10.5px] font-semibold uppercase tracking-wider opacity-80">{etiqueta}</span>
    </button>
  );

  const tarjeta = (h: HallazgoBases) => {
    const s = SEVERIDAD[h.severidad];
    const abierto = abiertos[h.id] ?? false;
    const precedentes = (h.fuentes ?? []).filter((f) => f.tipo !== 'ley' && f.tipo !== 'reglamento');
    return (
      <Card key={h.id} className={cn('overflow-hidden border-l-4', s.borde, seleccion.has(h.id) && 'ring-1 ring-brand-400/60')}>
        <div className="flex items-start gap-3 p-4 sm:p-5">
          {conSeleccion && (
            <label className="mt-0.5 flex shrink-0 cursor-pointer flex-col items-center gap-1 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={seleccion.has(h.id)}
                onChange={(e) => seleccionar([h.id], e.target.checked)}
                aria-label={`Llevar el hallazgo N.° ${numero.get(h.id)} al pliego`}
              />
              Pliego
            </label>
          )}
          <button
            type="button"
            onClick={() => setAbiertos((a) => ({ ...a, [h.id]: !abierto }))}
            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
            aria-expanded={abierto}
          >
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', s.pastilla)}>{s.nombre}</span>
                <Badge variant="outline" className="text-[10px]">
                  {lectura === 'proveedor' ? (h.paraElProveedor.tipo === 'consulta' ? 'Consulta' : 'Observación') : TEXTO_TIPO[h.tipo]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">N.° {numero.get(h.id)}</span>
                {h.id.startsWith('tema-') && <Badge className="text-[10px]">Contrastado con la biblioteca</Badge>}
                {precedentes.length > 0 && !h.id.startsWith('tema-') && (
                  <Badge variant="secondary" className="text-[10px]">
                    {precedentes.length} precedente{precedentes.length === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>
              <h3 className="text-[15px] font-semibold leading-snug">{h.titulo}</h3>
              <p className="mt-1 flex items-start gap-1 text-[11.5px] text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                {[
                  h.seccion === 'General' ? 'Sección General' : h.capitulo,
                  `Numeral ${h.numeral || 'No corresponde'}`,
                  `Literal ${h.literal || 'No corresponde'}`,
                  h.pagina ? `Pág. ${h.pagina}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {abierto ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
          </button>
        </div>
        {abierto && (
          <div className="space-y-4 border-t border-border bg-secondary/20 px-4 py-4 sm:px-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <Cita rotulo="Dicen las bases" texto={h.enLasBases || '(no figura en las bases)'} />
              {h.enElEstandar ? (
                <Cita rotulo="Dice la bases estándar" texto={h.enElEstandar} icono={Scale} />
              ) : (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Por qué importa</p>
                  <p className="text-[13px] leading-relaxed text-foreground/90">{h.analisis}</p>
                </div>
              )}
            </div>
            {h.enElEstandar && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Por qué importa</p>
                <p className="text-[13px] leading-relaxed text-foreground/90">{h.analisis}</p>
              </div>
            )}
            {h.norma && (
              <p className="flex items-start gap-1 text-[12px] text-muted-foreground">
                <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  <span className="font-medium text-foreground/80">Norma y artículo: </span>
                  {h.norma}
                </span>
              </p>
            )}
            {precedentes.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sustento en la biblioteca</p>
                <ul className="space-y-1.5">
                  {precedentes.map((f) => (
                    <li key={f.documentId + f.numero} className="text-[12.5px] leading-relaxed text-foreground/85">
                      <a
                        href={`/biblioteca/documento/${f.documentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
                      >
                        {f.numero}
                      </a>{' '}
                      <span className="text-muted-foreground">· {NOMBRE_DE_FUENTE[f.tipo]}</span>
                      <span className="block">{f.criterio}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {h.avisos.length > 0 && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Cita por verificar: {h.avisos.map((a) => a.cita).join('; ')}. No venía en el sustento consultado.
              </p>
            )}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                {lectura === 'proveedor' ? (h.paraElProveedor.tipo === 'consulta' ? 'Para consultar' : 'Para observar · solicitud') : 'Qué corregir antes de publicar'}
              </p>
              <p className="text-[13px] leading-relaxed">{lectura === 'proveedor' ? h.paraElProveedor.solicitud : h.paraLaEntidad}</p>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const filtros = prioridad || clase || seccion !== 'todas' || q;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-400">Evaluación de bases</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {documento}
          {completada && (
            <>
              {' '}
              · Completada <RelativeTime date={completada} />
            </>
          )}
        </p>
      </header>

      {/* Referencia + prioridades. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_2fr]">
        <Card className="space-y-3 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bases estándar de referencia</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug">{resultado.estandar.titulo}</p>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="otro-estandar">
              ¿No es esta? Elige la que corresponde (se vuelve a cotejar todo):
            </label>
            <div className="mt-1 flex gap-2">
              <select
                id="otro-estandar"
                value={otroEstandar}
                onChange={(e) => setOtroEstandar(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[12px]"
              >
                {estandares.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={reevaluar} disabled={reevaluando || otroEstandar === resultado.estandar.id} aria-label="Evaluar otra vez con esta bases estándar">
                {reevaluando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="group" aria-label="Filtrar por prioridad y tipo">
          {tarjetaDeFiltro(
            prioridad === 'alta',
            () => setPrioridad((p) => (p === 'alta' ? null : 'alta')),
            stats.critico + stats.alto,
            'Crítica y alta',
            prioridad === 'alta' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'border border-border bg-card',
            'ring-2 ring-brand-500',
          )}
          {SEVERIDADES.map((s) =>
            tarjetaDeFiltro(prioridad === s, () => setPrioridad((p) => (p === s ? null : s)), stats[s], SEVERIDAD[s].nombre, SEVERIDAD[s].pastilla, SEVERIDAD[s].activa),
          )}
          {tarjetaDeFiltro(clase === 'consulta', () => setClase((c) => (c === 'consulta' ? null : 'consulta')), consultas, 'Consultas', 'bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200', 'ring-2 ring-brand-500')}
          {tarjetaDeFiltro(clase === 'observacion', () => setClase((c) => (c === 'observacion' ? null : 'observacion')), observaciones, 'Observaciones', 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200', 'ring-2 ring-violet-500')}
        </div>
      </div>

      <Card className="p-5">
        <p className="text-[14px] leading-relaxed text-foreground/90">{resultado.resumen}</p>
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-[12px]" role="group" aria-label="Leer como">
            {(['proveedor', 'entidad'] as Lectura[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lectura === l}
                onClick={() => setLectura(l)}
                className={cn(
                  'rounded-md px-3 py-1.5 font-medium transition-colors',
                  lectura === l ? 'bg-brand-600 text-white dark:bg-brand-500' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l === 'proveedor' ? 'Qué consultar u observar' : 'Qué corregir antes de publicar'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={descargar} disabled={bajando}>
            {bajando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Informe en Word
          </Button>
        </div>
      </Card>

      {/* Secciones y capítulos en fila (César: nunca una columna lateral). */}
      <nav aria-label="Secciones de las bases" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {[{ id: 'todas', nombre: 'Todos', n: resultado.hallazgos.filter((h) => pasaPrioridad(h) && pasaClase(h)).length }, ...secciones.map((s) => ({ id: s, nombre: s, n: enSeccion(s) }))].map(
          (s) => {
            const activo = seccion === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setSeccion(s.id)}
                className={cn(
                  'flex min-h-[56px] items-start gap-2.5 rounded-xl border bg-card p-3 text-left transition-all hover:border-brand-400',
                  activo ? 'border-brand-500 bg-brand-50 shadow-[inset_0_0_0_1px] shadow-brand-500 dark:bg-brand-950/30' : 'border-border',
                )}
              >
                <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', activo ? 'bg-brand-600 text-white' : 'bg-secondary text-muted-foreground')}>
                  {s.id === 'todas' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 text-[12.5px] font-semibold leading-tight">
                  <span className="line-clamp-2">{s.nombre}</span>
                  <span className="font-normal text-muted-foreground"> · {s.n}</span>
                </span>
              </button>
            );
          },
        )}
      </nav>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar en los hallazgos" className="pl-9" aria-label="Buscar en los hallazgos" />
        </div>
        {conSeleccion && (
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px]">
            <input
              ref={casilla}
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={todasVisibles}
              disabled={visibles.length === 0}
              onChange={(e) => seleccionar(visibles.map((h) => h.id), e.target.checked)}
            />
            Seleccionar visibles ({visibles.length})
          </label>
        )}
        {seleccion.size > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSeleccion(new Set())}>
            <X className="h-3.5 w-3.5" /> Limpiar selección
          </Button>
        )}
      </div>

      <p className="text-[12px] text-muted-foreground" aria-live="polite">
        {visibles.length} de {resultado.hallazgos.length} hallazgos visibles
        {filtros && (
          <button
            type="button"
            className="ml-2 font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
            onClick={() => {
              setPrioridad(null);
              setClase(null);
              setSeccion('todas');
              setBuscar('');
            }}
          >
            Quitar filtros
          </button>
        )}
      </p>

      <section className="space-y-3">
        {visibles.map(tarjeta)}
        {visibles.length === 0 && (
          <Card className="flex items-start gap-3 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[13px] leading-relaxed text-foreground/85">
              {seccion === 'Sección General' && !prioridad && !clase && !q
                ? `Los ${resultado.seccionGeneral.textos} textos de la Sección General coinciden con la bases estándar. Esta sección no puede modificarse en ningún extremo, bajo sanción de nulidad.`
                : resultado.hallazgos.length === 0
                  ? 'No se encontraron hallazgos en los capítulos revisados.'
                  : 'Nada con estos filtros. Prueba otra sección o quita los filtros; la selección se conserva.'}
            </p>
          </Card>
        )}
      </section>

      {resultado.capitulosRevisados.length > 0 && (
        <p className="text-[12px] text-muted-foreground">Capítulos revisados: {resultado.capitulosRevisados.join(' · ')}.</p>
      )}
      <p className="text-[12px] text-muted-foreground">A-LexIA puede equivocarse. Revisa cada hallazgo contra las bases antes de formularlo o de corregirlas.</p>

      {conSeleccion && (
        <div className="sticky bottom-3 z-20 rounded-xl border border-slate-800 bg-slate-900/95 text-white shadow-lg backdrop-blur-sm">
          <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" aria-live="polite">
              <span className="font-semibold">{seleccion.size}</span> seleccionado{seleccion.size === 1 ? '' : 's'}
              <span className="ml-2 text-[12px] text-slate-400">Se llevan al pliego con su escrito en borrador; ahí puedes añadir los tuyos.</span>
            </p>
            <Button onClick={formular} disabled={seleccion.size === 0 || formulando} variant="secondary">
              {formulando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
              Llevar a Consultas y observaciones
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
