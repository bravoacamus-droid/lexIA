'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Highlighter,
  Link2,
  ListTree,
  MessageSquare,
  PanelLeftOpen,
  Printer,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn, getDocTypeMeta, formatDate } from '@/lib/utils';
import { formatForDisplay } from '@/lib/normativa/format-raw';
import { dividirEnSecciones, rutaDe, type Encabezado, type Seccion } from '@/lib/normativa/estructura';
import { separarCabeceraDeOpinion, sinConstanciaDeFirma, type CabeceraDeOpinion } from '@/lib/normativa/cabecera-opinion';
import { IndiceDeTexto, hayResaltadoNativo, pintar } from '@/lib/normativa/indice-de-texto';
import { tituloDeActo, type ActoInfo } from '@/lib/normativa/actos';
import { SaveToFolderDialog } from '@/components/app/library/save-to-folder';
import { HighlightToolbar } from '@/components/app/library/highlight-toolbar';
import { IndiceDeNorma } from '@/components/app/library/indice-de-norma';
import { Vigencia } from '@/components/app/library/tarjeta-de-acto';
import type { NormativeDocType, UserAnnotation } from '@/lib/supabase/types';
import type { FolderItem } from '@/components/app/library/library-view';

/**
 * El visor de un documento de la biblioteca.
 *
 * Rehecho con el documento 11 de César (30/09/2026):
 *   · sin el panel de la derecha (resumen IA, contenido, citas, historial):
 *     «eliminar los resúmenes de la parte derecha»;
 *   · índice jerárquico desplegable con buscador y el apartado en lectura
 *     resaltado, con «Ocultar índice» (ver indice-de-norma.tsx);
 *   · el texto con su estructura: justificado, títulos y capítulos
 *     diferenciados, artículos en banda, numerales y literales sangrados,
 *     tablas como tablas. Si el documento tiene texto estructurado desde
 *     su PDF oficial, se usa ese; si no, el texto plano con formato;
 *   · «Fuente oficial» siempre que exista (la del documento, la de su
 *     pieza dentro del acto o la del acto);
 *   · los resaltados marcan exactamente lo seleccionado (indice-de-texto.ts).
 */

interface DocumentFull {
  id: string;
  type: NormativeDocType;
  number: string | null;
  title: string;
  summary: string | null;
  date: string | null;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
  /** Markdown estructurado (PDF oficial) o texto plano. */
  texto: string | null;
  estructurado: boolean;
}

export interface ParteDelActo {
  id: string;
  etiqueta: string;
  fecha: string | null;
}

interface Props {
  document: DocumentFull;
  acto: ActoInfo | null;
  partes: ParteDelActo[];
  initialAnnotations: UserAnnotation[];
  isSaved: boolean;
  folders: FolderItem[];
}

export function DocumentViewer({ document: doc, acto, partes, initialAnnotations, isSaved: initialSaved, folders: initialFolders }: Props) {
  const meta = getDocTypeMeta(doc.type);
  const [saved, setSaved] = useState(initialSaved);
  const [folders, setFolders] = useState<FolderItem[]>(initialFolders);
  const [savingDialog, setSavingDialog] = useState(false);
  const [annotations, setAnnotations] = useState<UserAnnotation[]>(initialAnnotations);
  const [toolbar, setToolbar] = useState<{ x: number; y: number; inicio: number; fin: number; texto: string } | null>(null);
  const [indiceVisible, setIndiceVisible] = useState(true);
  const [indiceMovil, setIndiceMovil] = useState(false);
  const [activo, setActivo] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const indiceTexto = useRef<IndiceDeTexto | null>(null);
  // Se pregunta al navegador después de montar: en el servidor no hay CSS
  // y la diferencia rompía la hidratación.
  const [resaltadoNativo, setResaltadoNativo] = useState(true);
  useEffect(() => setResaltadoNativo(hayResaltadoNativo()), []);

  const searchParams = useSearchParams();
  const volverParam = searchParams.get('volver');
  // Solo rutas internas — nunca URLs absolutas (evita open redirect).
  const volverHref = volverParam && volverParam.startsWith('/') && !volverParam.startsWith('//') ? volverParam : '/biblioteca';
  const resaltar = searchParams.get('resaltar');

  // ── El texto ─────────────────────────────────────────────────────────
  const { markdown, cabecera } = useMemo((): { markdown: string; cabecera: CabeceraDeOpinion | null } => {
    const crudo = doc.texto || '';
    if (doc.estructurado) return { markdown: crudo, cabecera: null };
    if (doc.type === 'opinion') {
      const { cabecera, resto } = separarCabeceraDeOpinion(crudo);
      // «1. ANTECEDENTES Mediante…»: el primer apartado va pegado al texto.
      const m = /^((?:1\.?|I\.)\s+ANTECEDENTES?)\s+/i.exec(resto);
      const md = m ? `## ${m[1].toUpperCase()}\n\n${formatForDisplay(resto.slice(m[0].length))}` : formatForDisplay(resto);
      return { markdown: md, cabecera };
    }
    return { markdown: formatForDisplay(sinConstanciaDeFirma(crudo)), cabecera: null };
  }, [doc.texto, doc.estructurado, doc.type]);

  const { secciones, encabezados } = useMemo(() => dividirEnSecciones(markdown), [markdown]);
  const porId = useMemo(() => new Map(encabezados.map((e) => [e.id, e])), [encabezados]);
  const articulos = useMemo(() => encabezados.filter((e) => e.esArticulo), [encabezados]);
  const hayIndice = encabezados.length > 0;

  // ── Apartado en lectura ──────────────────────────────────────────────
  // El apartado en lectura es la última sección que ya empezó por encima
  // de la línea de lectura (bajo las barras fijas). Las secciones están en
  // orden, así que basta una búsqueda binaria: unas pocas mediciones por
  // cuadro aunque el documento tenga seiscientas.
  useEffect(() => {
    const cont = contentRef.current;
    if (!cont || encabezados.length === 0) return;
    const lista = Array.from(cont.querySelectorAll<HTMLElement>('[data-seccion]'));
    let pendiente = false;
    const medir = () => {
      pendiente = false;
      const linea = 175;
      let lo = 0;
      let hi = lista.length - 1;
      let k = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lista[mid].getBoundingClientRect().top <= linea) {
          k = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      for (let i = k; i >= 0; i--) {
        const id = lista[i].dataset.seccion!;
        if (porId.has(id)) {
          setActivo(id);
          return;
        }
      }
      setActivo(null);
    };
    const alDesplazar = () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(medir);
      }
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    medir();
    return () => window.removeEventListener('scroll', alDesplazar);
  }, [secciones, encabezados.length, porId]);

  const irA = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    setActivo(id);
    setIndiceMovil(false);
    // content-visibility estima la altura de lo no pintado: un segundo
    // ajuste, ya pintado el destino, lo deja exacto.
    window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 120);
  }, []);

  const ruta = activo ? rutaDe(activo, porId) : [];
  const articuloActual = useMemo(() => {
    if (!activo) return null;
    const e = porId.get(activo);
    if (e?.esArticulo) return e;
    // Si se está en un título o capítulo, el artículo más cercano antes.
    const k = encabezados.findIndex((x) => x.id === activo);
    for (let i = k; i >= 0; i--) if (encabezados[i].esArticulo) return encabezados[i];
    return null;
  }, [activo, porId, encabezados]);
  const navArticulos = useMemo(() => {
    if (!articuloActual) return null;
    const mismos = articulos.filter((a) => a.parte === articuloActual.parte);
    const k = mismos.findIndex((a) => a.id === articuloActual.id);
    return { anterior: mismos[k - 1] ?? null, siguiente: mismos[k + 1] ?? null, posicion: k + 1, total: mismos.length };
  }, [articuloActual, articulos]);

  // ── Índice del texto pintado (resaltados y búsqueda) ─────────────────
  const [versionIndice, setVersionIndice] = useState(0);
  useEffect(() => {
    // Una vez pintado el documento (y cada vez que cambia el texto).
    const t = window.setTimeout(() => {
      if (!contentRef.current) return;
      indiceTexto.current = new IndiceDeTexto(contentRef.current);
      setVersionIndice((v) => v + 1);
    }, 50);
    return () => window.clearTimeout(t);
  }, [markdown]);

  // Pintar los resaltados guardados.
  const rangosDeResaltados = useRef(new Map<string, Range>());
  useEffect(() => {
    const ind = indiceTexto.current;
    if (!ind) return;
    const porColor: Record<string, Range[]> = { yellow: [], green: [], blue: [] };
    rangosDeResaltados.current.clear();
    for (const a of annotations) {
      const pos = ind.ubicar(a.highlighted_text, a.position?.start_offset, a.position?.end_offset);
      const r = pos ? ind.rango(pos.inicio, pos.fin) : null;
      if (!r) continue;
      rangosDeResaltados.current.set(a.id, r);
      (porColor[a.color] ?? porColor.yellow).push(r);
    }
    for (const [color, rangos] of Object.entries(porColor)) pintar(`resaltado-${color}`, rangos);
  }, [annotations, versionIndice]);

  // Selección → barra de colores
  useEffect(() => {
    function alSoltar() {
      const sel = window.getSelection();
      const cont = contentRef.current;
      if (!sel || sel.isCollapsed || !cont || !indiceTexto.current) {
        setToolbar(null);
        return;
      }
      const r = sel.getRangeAt(0);
      if (!cont.contains(r.commonAncestorContainer)) {
        setToolbar(null);
        return;
      }
      const texto = sel.toString().trim();
      const pos = texto.length >= 3 ? indiceTexto.current.desdeRango(r) : null;
      if (!pos) {
        setToolbar(null);
        return;
      }
      const caja = r.getBoundingClientRect();
      setToolbar({ x: caja.left + caja.width / 2, y: caja.top - 8, inicio: pos.inicio, fin: pos.fin, texto: texto.slice(0, 7900) });
    }
    window.addEventListener('mouseup', alSoltar);
    window.addEventListener('keyup', alSoltar);
    return () => {
      window.removeEventListener('mouseup', alSoltar);
      window.removeEventListener('keyup', alSoltar);
    };
  }, []);

  async function crearResaltado(color: 'yellow' | 'green' | 'blue') {
    if (!toolbar) return;
    const provisional: UserAnnotation = {
      id: `provisional-${Date.now()}`,
      user_id: '',
      document_id: doc.id,
      highlighted_text: toolbar.texto,
      position: { start_offset: toolbar.inicio, end_offset: toolbar.fin },
      color,
      created_at: new Date().toISOString(),
    };
    setAnnotations((prev) => [...prev, provisional]);
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: doc.id,
          highlighted_text: provisional.highlighted_text,
          position: provisional.position,
          color,
        }),
      });
      if (!res.ok) throw new Error();
      const { annotation } = await res.json();
      setAnnotations((prev) => prev.map((a) => (a.id === provisional.id ? annotation : a)));
    } catch {
      setAnnotations((prev) => prev.filter((a) => a.id !== provisional.id));
      toast.error('No se pudo guardar el resaltado.');
    }
  }

  async function borrarResaltado(id: string) {
    if (id.startsWith('provisional-')) return;
    const antes = annotations;
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    const res = await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setAnnotations(antes);
      toast.error('No se pudo eliminar el resaltado.');
    }
  }

  function irAResaltado(a: UserAnnotation) {
    const r = rangosDeResaltados.current.get(a.id);
    const el = r?.startContainer.parentElement;
    if (!el) {
      toast.info('No encontramos ese pasaje en esta versión del texto.');
      return;
    }
    el.scrollIntoView({ block: 'center' });
    setIndiceMovil(false);
  }

  // ── Búsqueda dentro del documento ────────────────────────────────────
  const [consulta, setConsulta] = useState('');
  const [coincidencias, setCoincidencias] = useState<Array<{ inicio: number; fin: number }>>([]);
  const [actual, setActual] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const ind = indiceTexto.current;
      const lista = ind && consulta.trim().length >= 2 ? ind.buscar(consulta) : [];
      setCoincidencias(lista);
      setActual(0);
    }, 250);
    return () => window.clearTimeout(t);
  }, [consulta, versionIndice]);
  useEffect(() => {
    const ind = indiceTexto.current;
    if (!ind) return;
    const rangos = coincidencias.map((c) => ind.rango(c.inicio, c.fin)).filter((r): r is Range => !!r);
    pintar('busqueda', rangos);
    pintar('busqueda-actual', rangos[actual] ? [rangos[actual]] : []);
  }, [coincidencias, actual]);
  const irACoincidencia = useCallback(
    (k: number) => {
      const ind = indiceTexto.current;
      if (!ind || coincidencias.length === 0) return;
      const n = ((k % coincidencias.length) + coincidencias.length) % coincidencias.length;
      setActual(n);
      const r = ind.rango(coincidencias[n].inicio, coincidencias[n].fin);
      r?.startContainer.parentElement?.scrollIntoView({ block: 'center' });
    },
    [coincidencias],
  );

  // ── Llegada desde una cita del chat (?resaltar=…) ────────────────────
  useEffect(() => {
    const ind = indiceTexto.current;
    if (!resaltar || !ind) return;
    const trozo = resaltar.replace(/\s+/g, ' ').trim().slice(0, 80);
    const pos = ind.buscar(trozo, 1)[0] ?? ind.buscar(trozo.slice(0, 40), 1)[0];
    const r = pos ? ind.rango(pos.inicio, pos.fin) : null;
    if (!r) return;
    pintar('cita', [r]);
    r.startContainer.parentElement?.scrollIntoView({ block: 'center' });
    const t = window.setTimeout(() => pintar('cita', []), 6000);
    return () => window.clearTimeout(t);
  }, [resaltar, versionIndice]);

  // ── Acciones ─────────────────────────────────────────────────────────
  const fuente = doc.source_url || (doc.metadata?.parte_url as string | undefined) || acto?.url || null;
  const parteEtiqueta = (doc.metadata?.parte_etiqueta as string | undefined) ?? null;

  async function toggleSave() {
    if (saved) {
      setSaved(false);
      const res = await fetch(`/api/saved-documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setSaved(true);
        toast.error('No se pudo quitar de la biblioteca.');
      } else toast.success('Quitado de tus guardados.');
    } else setSavingDialog(true);
  }

  async function copiarEnlace() {
    const url = `${window.location.origin}/biblioteca/documento/${doc.id}${activo ? `#${activo}` : ''}`;
    await navigator.clipboard.writeText(url);
    toast.success('Enlace copiado.');
  }

  function preguntar() {
    const sobre = articuloActual ? `el ${articuloActual.articulo} de ` : '';
    const nombre = acto ? tituloDeActo(acto) : doc.number || doc.title;
    window.location.href = `/chat?new=1&q=${encodeURIComponent(`Sobre ${sobre}«${nombre}», quiero preguntar: `)}`;
  }

  const aprobacion = acto?.documentos.find((d) => d.rol === 'aprueba');
  const modificaciones = acto?.documentos.filter((d) => d.rol === 'modificacion' || d.rol === 'rectificacion') ?? [];

  return (
    <div className="lector-norma">
      {/* Barra superior: volver, dónde estoy y acciones */}
      <div className="no-imprimir sticky top-14 z-20 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="flex w-full items-center gap-2 px-4 py-2 sm:px-6 lg:px-10">
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href={volverHref}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {volverHref.startsWith('/chat') ? 'Volver a la conversación' : volverHref.includes('?') ? 'Volver a la búsqueda' : 'Volver a la biblioteca'}
              </span>
            </Link>
          </Button>
          {hayIndice && (
            <Button variant="ghost" size="sm" className="shrink-0 lg:hidden" onClick={() => setIndiceMovil(true)}>
              <ListTree className="h-4 w-4" /> Índice
            </Button>
          )}
          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-hidden text-[12px] text-muted-foreground md:flex" aria-label="Ubicación en la norma">
            {ruta.map((e, i) => (
              <span key={e.id} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />}
                <button
                  type="button"
                  onClick={() => irA(e.id)}
                  className={cn('truncate hover:text-foreground', i === ruta.length - 1 && 'font-semibold text-foreground')}
                  title={e.texto}
                >
                  {e.esArticulo ? e.articulo : e.nivel === 1 ? nombreCorto(e).replace(/^(el|la) /, '').replace(/^\w/, (c) => c.toUpperCase()) : e.texto.replace(/ — .*/, '').slice(0, 28)}
                </button>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={preguntar} className="text-brand-700 dark:text-brand-400">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden xl:inline">Preguntar a A-LexIA</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info('Selecciona el texto que quieras resaltar y elige un color.')}
              title="Resaltar: selecciona un texto del documento"
            >
              <Highlighter className="h-4 w-4" />
              <span className="hidden xl:inline">Resaltar</span>
            </Button>
            {fuente && (
              <Button asChild variant="ghost" size="sm">
                <a href={fuente} target="_blank" rel="noreferrer" title="Abrir la fuente oficial">
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Fuente oficial</span>
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => window.print()} title="Imprimir" className="hidden sm:inline-flex">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={copiarEnlace} title="Copiar enlace" aria-label="Copiar enlace">
              <Link2 className="h-4 w-4" />
            </Button>
            <Button variant={saved ? 'default' : 'outline'} size="sm" onClick={toggleSave}>
              <Star className={cn('h-4 w-4', saved && 'fill-current')} />
              <span className="hidden sm:inline">{saved ? 'Guardado' : 'Guardar'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        {/* Cabecera del documento */}
        <header className="mb-6 max-w-5xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn('border-transparent', meta.bg, meta.color)}>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.tagColor }} />
              {meta.label}
            </Badge>
            {(acto?.entidad || (doc.metadata?.entidad as string | undefined)) && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {acto?.entidad || (doc.metadata?.entidad as string)}
              </span>
            )}
            {acto ? (
              <Vigencia desde={acto.vigente_desde} hasta={acto.vigente_hasta} derogada={acto.derogada} />
            ) : (
              doc.date && <span className="text-xs text-muted-foreground">{formatDate(doc.date)}</span>
            )}
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            {acto ? acto.numero : doc.title}
            {acto?.titulo && <span className="block text-lg font-medium text-foreground/80 sm:text-xl">{acto.titulo}</span>}
          </h1>
          {acto && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
              {aprobacion && (
                <span>
                  Aprobada mediante <span className="font-medium text-foreground/80">{aprobacion.nombre}</span>
                  {aprobacion.fecha && ` (${formatDate(aprobacion.fecha)})`}
                </span>
              )}
              {modificaciones.length > 0 && (
                <span>
                  {modificaciones.length === 1 ? 'Modificada por ' : 'Modificaciones: '}
                  {modificaciones.map((m, i) => (
                    <span key={m.nombre}>
                      {i > 0 && '; '}
                      <span className="font-medium text-foreground/80">{m.nombre.replace(/^Resoluci[óo]n /, 'Res. ')}</span>
                      {m.fecha && ` (${formatDate(m.fecha)})`}
                    </span>
                  ))}
                </span>
              )}
            </p>
          )}
          {acto?.nota && <p className="mt-1.5 text-[12.5px] text-amber-800 dark:text-amber-300">{acto.nota}</p>}
          {/* Las piezas del acto: el texto original, el actualizado, las resoluciones… */}
          {partes.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {partes.map((p) => (
                <Link
                  key={p.id}
                  href={`/biblioteca/documento/${p.id}${volverParam ? `?volver=${encodeURIComponent(volverParam)}` : ''}`}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                    p.id === doc.id
                      ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'border-border text-muted-foreground hover:border-brand-300 hover:text-foreground',
                  )}
                >
                  {p.etiqueta}
                  {p.fecha && <span className="ml-1 opacity-70">· {formatDate(p.fecha)}</span>}
                </Link>
              ))}
            </div>
          )}
          {!partes.length && parteEtiqueta && <p className="mt-2 text-[12.5px] text-muted-foreground">{parteEtiqueta}</p>}
        </header>

        <div className="flex gap-6">
          {hayIndice && indiceVisible && (
            <aside className="no-imprimir hidden w-[310px] shrink-0 lg:block">
              <div className="sticky top-[7.75rem] h-[calc(100vh-9rem)]">
                <IndiceDeNorma
                  encabezados={encabezados}
                  activo={activo}
                  onIr={irA}
                  onOcultar={() => setIndiceVisible(false)}
                  resaltados={annotations}
                  onIrAResaltado={irAResaltado}
                  onBorrarResaltado={borrarResaltado}
                  busqueda={{
                    consulta,
                    onConsulta: setConsulta,
                    coincidencias: coincidencias.length,
                    actual,
                    onSiguiente: () => irACoincidencia(actual + 1),
                    onAnterior: () => irACoincidencia(actual - 1),
                  }}
                />
              </div>
            </aside>
          )}

          <main className="min-w-0 flex-1">
            {hayIndice && !indiceVisible && (
              <Button variant="outline" size="sm" className="no-imprimir mb-3 hidden lg:inline-flex" onClick={() => setIndiceVisible(true)}>
                <PanelLeftOpen className="h-4 w-4" /> Mostrar índice
              </Button>
            )}

            {navArticulos && navArticulos.total > 1 && (
              <div className="no-imprimir sticky top-[7.25rem] z-10 mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-card/95 px-2 py-1.5 text-[12px] backdrop-blur-sm">
                <button
                  type="button"
                  disabled={!navArticulos.anterior}
                  onClick={() => navArticulos.anterior && irA(navArticulos.anterior.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> {navArticulos.anterior?.articulo ?? 'Anterior'}
                </button>
                <span className="truncate font-semibold text-foreground">
                  {articuloActual?.articulo}
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {navArticulos.posicion} de {navArticulos.total}
                    {articuloActual?.parte && porId.get(articuloActual.parte) && porId.get(articuloActual.parte)!.id !== articuloActual.id
                      ? ` en ${nombreCorto(porId.get(articuloActual.parte)!)}`
                      : ''}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={!navArticulos.siguiente}
                  onClick={() => navArticulos.siguiente && irA(navArticulos.siguiente.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-secondary disabled:opacity-40"
                >
                  {navArticulos.siguiente?.articulo ?? 'Siguiente'} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {cabecera && <FichaDeOpinion cabecera={cabecera} numero={doc.number || doc.title} />}

            {!resaltadoNativo && annotations.length > 0 && (
              <p className="no-imprimir mb-3 text-[12px] text-muted-foreground">
                Tu navegador no puede pintar los resaltados dentro del texto; los ves en la pestaña «Mis resaltados» del índice.
              </p>
            )}

            <article ref={contentRef} className="lexia-norma select-text">
              {secciones.map((s) => (
                <SeccionDeNorma key={s.id} seccion={s} />
              ))}
            </article>
          </main>
        </div>
      </div>

      {/* Índice en el teléfono */}
      <Sheet open={indiceMovil} onOpenChange={setIndiceMovil}>
        <SheetContent side="left" className="w-[88vw] max-w-sm p-3">
          <SheetHeader>
            <SheetTitle className="text-sm">Índice</SheetTitle>
          </SheetHeader>
          <div className="mt-2 h-[calc(100vh-5rem)]">
            <IndiceDeNorma
              encabezados={encabezados}
              activo={activo}
              onIr={irA}
              resaltados={annotations}
              onIrAResaltado={irAResaltado}
              onBorrarResaltado={borrarResaltado}
              busqueda={{
                consulta,
                onConsulta: setConsulta,
                coincidencias: coincidencias.length,
                actual,
                onSiguiente: () => irACoincidencia(actual + 1),
                onAnterior: () => irACoincidencia(actual - 1),
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {toolbar && <HighlightToolbar x={toolbar.x} y={toolbar.y} onPick={crearResaltado} onClose={() => setToolbar(null)} />}

      <SaveToFolderDialog
        documentId={savingDialog ? doc.id : null}
        folders={folders}
        onClose={() => setSavingDialog(false)}
        onSaved={() => {
          setSaved(true);
          setSavingDialog(false);
        }}
        onFolderCreated={(f) => setFolders((prev) => [...prev, f])}
      />
    </div>
  );
}

function nombreCorto(e: Encabezado): string {
  if (/^REGLAMENTO/i.test(e.texto)) return 'el Reglamento';
  if (/^DECRETO SUPREMO/i.test(e.texto)) return 'el decreto supremo';
  if (/^LEY/i.test(e.texto)) return 'la Ley';
  return e.etiqueta.slice(0, 30);
}

/** La cabecera de una opinión, como en el documento original. */
function FichaDeOpinion({ cabecera, numero }: { cabecera: CabeceraDeOpinion; numero: string }) {
  const filas: Array<[string, string | null]> = [
    ['Solicitante', cabecera.solicitante],
    ['Asunto', cabecera.asunto],
    ['Referencia', cabecera.referencia],
  ];
  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-5 text-[14px] leading-relaxed">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          {cabecera.lugarFecha && <p className="text-[13px] text-muted-foreground">{cabecera.lugarFecha}</p>}
          <p className="font-semibold uppercase tracking-wide">{numero}</p>
        </div>
        {(cabecera.expediente || cabecera.td) && (
          <div className="text-right text-[12.5px] font-semibold">
            {cabecera.expediente && <p>Expediente N° {cabecera.expediente}</p>}
            {cabecera.td && <p>T.D. N° {cabecera.td}</p>}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {filas
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold uppercase tracking-wide text-[12.5px] text-foreground/80">{k}</dt>
              <dd className="text-justify">: {v}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

/**
 * Una sección: su encabezado y su texto. Se pinta por separado y no se
 * vuelve a pintar si no cambia (memo): los resaltados y la búsqueda se
 * dibujan encima sin tocarla.
 */
const SeccionDeNorma = memo(function SeccionDeNorma({ seccion }: { seccion: Seccion }) {
  const e = seccion.encabezado;
  return (
    <section id={seccion.id} data-seccion={seccion.id} className={cn('seccion-norma', e && `nivel-${Math.min(e.nivel, 5)}`)}>
      {e && <EncabezadoDeNorma e={e} />}
      {seccion.cuerpo && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>
          {seccion.cuerpo}
        </ReactMarkdown>
      )}
    </section>
  );
});

function EncabezadoDeNorma({ e }: { e: Encabezado }) {
  const Etiqueta = (`h${Math.min(e.nivel + 1, 6)}` as unknown) as 'h2';
  // «TÍTULO II — ACTORES INVOLUCRADOS…»: el número arriba, el nombre abajo.
  const partes = e.texto.split(' — ');
  if (e.esArticulo) {
    const m = /^(Art[íi]culo\s+(?:\d+[A-Za-z°º]*|[IVXLC]+))[.\-–:\s]*(.*)$/i.exec(e.texto);
    return (
      <Etiqueta className="encabezado-norma articulo group/heading">
        <span className="articulo-numero">{m ? m[1] : e.texto}</span>
        {m && m[2] && <span className="articulo-titulo">{m[2]}</span>}
        <AccionesDeArticulo id={e.id} texto={e.texto} />
      </Etiqueta>
    );
  }
  return (
    <Etiqueta className="encabezado-norma">
      {partes.length > 1 ? (
        <>
          <span className="block">{partes[0]}</span>
          <span className="block encabezado-nombre">{partes.slice(1).join(' — ')}</span>
        </>
      ) : (
        e.texto
      )}
    </Etiqueta>
  );
}

function AccionesDeArticulo({ id, texto }: { id: string; texto: string }) {
  return (
    <span data-no-indexar className="no-imprimir ml-2 inline-flex gap-1 align-middle opacity-0 transition-opacity group-hover/heading:opacity-90">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(`${window.location.href.split('#')[0]}#${id}`);
          toast.success('Enlace al artículo copiado.');
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-brand-50 hover:text-brand-700"
        aria-label="Copiar enlace al artículo"
        title="Copiar enlace al artículo"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.href = `/chat?new=1&q=${encodeURIComponent(`Explícame en detalle: ${texto}`)}`;
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-brand-50 hover:text-brand-700"
        aria-label="Preguntar a A-LexIA sobre este artículo"
        title="Preguntar a A-LexIA sobre este artículo"
      >
        <MessageSquare className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
