'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Highlighter, PanelLeftClose, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizar, type Encabezado } from '@/lib/normativa/estructura';
import type { UserAnnotation } from '@/lib/supabase/types';

/**
 * El índice de la norma (documento 11 de César, 30/09/2026): árbol
 * jerárquico desplegable, buscador por artículo o palabra clave, el
 * apartado que se está leyendo resaltado y la opción «Ocultar índice».
 * En la misma columna, en otra pestaña, los resaltados del usuario (antes
 * estaban en el panel de la derecha, que se retiró).
 */

const COLOR_DE_RESALTADO: Record<string, string> = {
  yellow: 'bg-yellow-300',
  green: 'bg-emerald-300',
  blue: 'bg-sky-300',
};

export function IndiceDeNorma({
  encabezados,
  activo,
  onIr,
  onOcultar,
  resaltados,
  onIrAResaltado,
  onBorrarResaltado,
  busqueda,
}: {
  encabezados: Encabezado[];
  activo: string | null;
  onIr: (id: string) => void;
  onOcultar?: () => void;
  resaltados: UserAnnotation[];
  onIrAResaltado: (a: UserAnnotation) => void;
  onBorrarResaltado: (id: string) => void;
  busqueda: {
    consulta: string;
    onConsulta: (q: string) => void;
    coincidencias: number;
    actual: number;
    onSiguiente: () => void;
    onAnterior: () => void;
  };
}) {
  const [pestana, setPestana] = useState<'indice' | 'resaltados'>('indice');
  const porId = useMemo(() => new Map(encabezados.map((e) => [e.id, e])), [encabezados]);
  const raices = useMemo(() => encabezados.filter((e) => !e.padre), [encabezados]);
  const grande = encabezados.length > 60;

  // Desplegados: en una norma grande, solo los dos primeros niveles; en una
  // directiva, todo. Los antepasados del apartado en lectura se abren solos.
  const [abiertos, setAbiertos] = useState<Set<string>>(
    () => new Set(encabezados.filter((e) => e.hijos.length > 0 && (!grande || profundidad(e, porId) < 1)).map((e) => e.id)),
  );
  useEffect(() => {
    if (!activo) return;
    const ruta: string[] = [];
    let e = porId.get(activo)?.padre ? porId.get(porId.get(activo)!.padre!) : null;
    while (e) {
      ruta.push(e.id);
      e = e.padre ? porId.get(e.padre) ?? null : null;
    }
    if (ruta.some((id) => !abiertos.has(id))) setAbiertos((prev) => new Set([...Array.from(prev), ...ruta]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  // El apartado en lectura queda a la vista dentro del índice (sin mover la página).
  const lista = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const cont = lista.current;
    if (!cont || !activo) return;
    const fila = cont.querySelector<HTMLElement>(`[data-indice-id="${activo}"]`);
    if (!fila) return;
    const arriba = fila.offsetTop - cont.offsetTop;
    if (arriba < cont.scrollTop + 8 || arriba > cont.scrollTop + cont.clientHeight - 40) {
      cont.scrollTop = arriba - cont.clientHeight / 3;
    }
  }, [activo, abiertos]);

  const q = busqueda.consulta.trim();
  const filtrados = useMemo(() => {
    if (q.length < 1) return null;
    const n = normalizar(q).replace(/^art(i|í)?(culo)?\.?\s*/, '');
    const esNumero = /^\d+[a-z]?$/.test(n) || /^[ivxlc]+$/.test(n);
    return encabezados
      .filter((e) => {
        if (esNumero && e.articulo) return normalizar(e.articulo).replace(/^articulo\s+/, '') === n;
        return normalizar(e.texto).includes(normalizar(q));
      })
      .slice(0, 80);
  }, [q, encabezados]);

  function alternar(id: string) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Una función que dibuja, no un componente: definido aquí dentro, React
  // lo trataría como un tipo nuevo en cada render y rearmaría las cientos
  // de filas cada vez que cambia el apartado en lectura (al desplazarse).
  function fila(e: Encabezado, nivel: number): React.ReactNode {
    const abierto = abiertos.has(e.id);
    const es = activo === e.id;
    return (
      <li key={e.id}>
        <div
          data-indice-id={e.id}
          className={cn(
            'group flex items-start gap-1 rounded-md pr-1 transition-colors',
            es ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/50 dark:text-brand-300' : 'hover:bg-secondary/60',
          )}
          style={{ paddingLeft: 4 + nivel * 12 }}
        >
          {e.hijos.length > 0 ? (
            <button
              type="button"
              onClick={() => alternar(e.id)}
              aria-label={abierto ? 'Contraer' : 'Desplegar'}
              className="mt-[5px] shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              {abierto ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => onIr(e.id)}
            className={cn(
              'min-w-0 flex-1 py-1 text-left text-[12.5px] leading-snug',
              e.esArticulo ? 'font-normal' : 'font-semibold',
              es && 'font-semibold',
              es && 'border-l-2 border-brand-500 -ml-px pl-1.5',
            )}
            title={e.texto}
          >
            {e.etiqueta}
          </button>
        </div>
        {abierto && e.hijos.length > 0 && (
          <ul>
            {e.hijos.map((h) => {
              const hijo = porId.get(h);
              return hijo ? fila(hijo, nivel + 1) : null;
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 pt-2">
        {(
          [
            ['indice', 'Índice de la norma'],
            ['resaltados', `Mis resaltados${resaltados.length ? ` (${resaltados.length})` : ''}`],
          ] as const
        ).map(([v, etiqueta]) => (
          <button
            key={v}
            type="button"
            onClick={() => setPestana(v)}
            className={cn(
              '-mb-px border-b-2 px-2 py-1.5 text-[12px] font-semibold transition-colors',
              pestana === v ? 'border-brand-600 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {etiqueta}
          </button>
        ))}
        {onOcultar && (
          <button
            type="button"
            onClick={onOcultar}
            className="ml-auto mb-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Ocultar índice para ampliar el área de lectura"
          >
            <PanelLeftClose className="h-3.5 w-3.5" /> Ocultar índice
          </button>
        )}
      </div>

      {pestana === 'indice' ? (
        <>
          <div className="space-y-1.5 border-b border-border p-2">
            <label className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-brand-400">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={busqueda.consulta}
                onChange={(ev) => busqueda.onConsulta(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') (ev.shiftKey ? busqueda.onAnterior : busqueda.onSiguiente)();
                }}
                placeholder="Buscar artículo o palabra clave…"
                className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
              />
              {busqueda.consulta && (
                <button type="button" onClick={() => busqueda.onConsulta('')} aria-label="Limpiar" className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            {q.length >= 2 && (
              <div className="flex items-center gap-1 px-0.5 text-[11.5px] text-muted-foreground">
                <span className="flex-1">
                  {busqueda.coincidencias === 0
                    ? 'Sin coincidencias en el texto'
                    : `${busqueda.actual + 1} de ${busqueda.coincidencias}${busqueda.coincidencias >= 500 ? '+' : ''} en el texto`}
                </span>
                <button type="button" onClick={busqueda.onAnterior} disabled={!busqueda.coincidencias} className="rounded p-0.5 hover:bg-secondary disabled:opacity-40" aria-label="Anterior">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={busqueda.onSiguiente} disabled={!busqueda.coincidencias} className="rounded p-0.5 hover:bg-secondary disabled:opacity-40" aria-label="Siguiente">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <div ref={lista} className="min-h-0 flex-1 overflow-y-auto p-1.5 scrollbar-thin">
            {encabezados.length === 0 ? (
              <p className="p-3 text-[12px] text-muted-foreground">Este documento no tiene apartados para mostrar en el índice.</p>
            ) : filtrados ? (
              filtrados.length === 0 ? (
                <p className="p-3 text-[12px] text-muted-foreground">Ningún apartado se llama así. Usa las flechas para recorrer el texto.</p>
              ) : (
                <ul>
                  {filtrados.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => onIr(e.id)}
                        className={cn(
                          'w-full rounded-md px-2 py-1.5 text-left text-[12.5px] leading-snug hover:bg-secondary/60',
                          activo === e.id && 'bg-brand-50 text-brand-800 dark:bg-brand-950/50',
                        )}
                      >
                        {e.etiqueta}
                        {e.padre && porId.get(e.padre) && (
                          <span className="block truncate text-[11px] text-muted-foreground">{porId.get(e.padre)!.etiqueta}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul>
                {raices.map((e) => fila(e, 0))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
          {resaltados.length === 0 ? (
            <p className="flex gap-2 p-2 text-[12px] leading-relaxed text-muted-foreground">
              <Highlighter className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Selecciona un texto del documento y elige un color para resaltarlo. Se guarda en tu cuenta.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {resaltados.map((a) => (
                <li key={a.id} className="group flex items-start gap-2 rounded-lg border border-border p-2 hover:border-brand-300">
                  <span className={cn('mt-1 h-3 w-1.5 shrink-0 rounded-full', COLOR_DE_RESALTADO[a.color] ?? COLOR_DE_RESALTADO.yellow)} />
                  <button type="button" onClick={() => onIrAResaltado(a)} className="min-w-0 flex-1 text-left text-[12px] italic leading-relaxed line-clamp-4">
                    “{a.highlighted_text}”
                  </button>
                  <button
                    type="button"
                    onClick={() => onBorrarResaltado(a.id)}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Eliminar resaltado"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function profundidad(e: Encabezado, porId: Map<string, Encabezado>): number {
  let p = 0;
  let x = e.padre ? porId.get(e.padre) : undefined;
  while (x) {
    p++;
    x = x.padre ? porId.get(x.padre) : undefined;
  }
  return p;
}
