'use client';

/**
 * Carga de un proyecto de requerimiento ya escrito.
 *
 * Observación de César: "debe permitir agregar el requerimiento
 * proyecto, leer el proyecto y redistribuir según las cláusulas
 * correspondientes". El área usuaria llega con un borrador en Word y
 * hasta ahora tenía que copiarlo apartado por apartado.
 *
 * Lo que se reparte se propone, no se aplica. Los apartados que ya
 * tienen texto vienen desmarcados: pisarlos es decisión del usuario, no
 * del programa.
 */
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Upload,
  Loader2,
  FileText,
  ChevronDown,
  CircleAlert,
  Check,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Asignacion {
  apartado_id: string;
  texto: string;
  confianza: 'alta' | 'media' | 'baja';
  ocupado: boolean;
  condiciones: string[];
}

interface Apartado {
  id: string;
  etiqueta: string;
  seccion: string;
  destino: 'redacciones' | 'campos';
}

interface Reparto {
  asignaciones: Asignacion[];
  sin_ubicar: string[];
  condiciones: string[];
  apartados: Apartado[];
  fuente: string;
  paginas?: number;
  caracteres: number;
  recortado: boolean;
}

const CONFIANZA: Record<Asignacion['confianza'], { badge: 'success' | 'warning' | 'secondary'; texto: string }> = {
  alta: { badge: 'success', texto: 'Coincidencia clara' },
  media: { badge: 'secondary', texto: 'Deducido' },
  baja: { badge: 'warning', texto: 'Encaje dudoso' },
};

export function CargarProyecto({
  id,
  onAplicar,
}: {
  id: string;
  /** Escribe el reparto aceptado en el formulario, de una sola vez. */
  onAplicar: (
    cambios: Array<{ destino: Apartado['destino']; bloqueId: string; texto: string }>,
    condiciones: string[],
  ) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [pegado, setPegado] = useState('');
  const [reparto, setReparto] = useState<Reparto | null>(null);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [aplicado, setAplicado] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function analizar(cuerpo: BodyInit, headers?: HeadersInit) {
    setCargando(true);
    try {
      const res = await fetch(`/api/generadores/requerimientos/${id}/cargar-proyecto`, {
        method: 'POST',
        body: cuerpo,
        ...(headers ? { headers } : {}),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('No se pudo leer el proyecto', {
          description: j?.sugerencia ?? j?.detail ?? j?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const r = j as Reparto;
      setReparto(r);
      setAplicado(false);
      // Lo que iría a un apartado vacío se marca solo; lo que pisaría
      // trabajo previo, no.
      setElegidos(new Set(r.asignaciones.filter((a) => !a.ocupado).map((a) => a.apartado_id)));
      if (r.asignaciones.length === 0) {
        toast.warning('No se encontró contenido que encaje en los apartados del formato');
      }
    } catch (e) {
      toast.error('Fallo al leer el proyecto', { description: (e as Error).message });
    } finally {
      setCargando(false);
    }
  }

  function subir(f: File) {
    const form = new FormData();
    form.append('file', f);
    void analizar(form);
  }

  const apartadoDe = (aid: string) => reparto?.apartados.find((a) => a.id === aid);

  function aplicar() {
    if (!reparto) return;
    const cambios = reparto.asignaciones
      .filter((a) => elegidos.has(a.apartado_id))
      .map((a) => {
        const ap = apartadoDe(a.apartado_id);
        return ap ? { destino: ap.destino, bloqueId: ap.id, texto: a.texto } : null;
      })
      .filter((x): x is { destino: Apartado['destino']; bloqueId: string; texto: string } => !!x);

    if (cambios.length === 0) {
      toast.warning('No hay nada seleccionado');
      return;
    }
    // Solo se encienden las condiciones de lo que de verdad se aplica:
    // encender una sección que se queda vacía añade un apartado en
    // blanco al documento.
    const condiciones = [
      ...new Set(
        reparto.asignaciones
          .filter((a) => elegidos.has(a.apartado_id))
          .flatMap((a) => a.condiciones),
      ),
    ];
    onAplicar(cambios, condiciones);
    setAplicado(true);
    toast.success(`${cambios.length} apartados completados con el proyecto`);
  }

  const alternar = (aid: string) =>
    setElegidos((p) => {
      const n = new Set(p);
      if (n.has(aid)) n.delete(aid);
      else n.add(aid);
      return n;
    });

  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <Upload className="h-4 w-4" />
            Cargar un proyecto de requerimiento
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Si el área usuaria ya tiene un borrador en Word o PDF, súbelo y LexIA reparte su
            contenido en los apartados del formato oficial. No inventa nada: solo coloca lo que el
            proyecto dice donde corresponde.
          </p>
        </div>
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <div className="mt-4 border-t pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={input}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) subir(f);
                e.target.value = '';
              }}
            />
            <Button type="button" onClick={() => input.current?.click()} disabled={cargando}>
              {cargando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Subir Word o PDF
            </Button>
            <span className="text-xs text-muted-foreground">o pega el texto abajo</span>
          </div>

          <Textarea
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            rows={4}
            className="mt-3"
            placeholder="Pega aquí el proyecto de requerimiento…"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={cargando || pegado.trim().length < 200}
            onClick={() =>
              analizar(JSON.stringify({ texto: pegado }), { 'Content-Type': 'application/json' })
            }
          >
            {cargando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Repartir el texto pegado
          </Button>

          {reparto && (
            <div className="mt-5 border-t pt-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{reparto.fuente}</span>
                <span>
                  {reparto.caracteres.toLocaleString('es-PE')} caracteres
                  {reparto.paginas ? ` · ${reparto.paginas} páginas` : ''}
                </span>
                <Badge variant="default">{reparto.asignaciones.length} apartados</Badge>
              </div>

              {reparto.recortado && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  El documento es muy largo y se leyó solo su primera parte. Revisa que no falte
                  contenido del final.
                </p>
              )}

              {reparto.asignaciones.length > 0 && (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" onClick={aplicar} disabled={aplicado}>
                      {aplicado ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" /> Aplicado
                        </>
                      ) : (
                        `Aplicar ${elegidos.size} apartados`
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setElegidos(
                          elegidos.size === reparto.asignaciones.length
                            ? new Set()
                            : new Set(reparto.asignaciones.map((a) => a.apartado_id)),
                        )
                      }
                    >
                      {elegidos.size === reparto.asignaciones.length
                        ? 'Quitar todo'
                        : 'Seleccionar todo'}
                    </Button>
                  </div>

                  <ul className="mt-3 space-y-2">
                    {reparto.asignaciones.map((a) => {
                      const ap = apartadoDe(a.apartado_id);
                      const marcado = elegidos.has(a.apartado_id);
                      return (
                        <li
                          key={a.apartado_id}
                          className={cn(
                            'rounded-lg border p-3 transition',
                            marcado ? 'border-primary/40 bg-primary/5' : 'opacity-70',
                          )}
                        >
                          <label className="flex cursor-pointer items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => alternar(a.apartado_id)}
                              className="mt-1 h-4 w-4 shrink-0 accent-primary"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">
                                  {ap?.etiqueta ?? a.apartado_id}
                                </span>
                                {ap && (
                                  <span className="text-xs text-muted-foreground">
                                    · {ap.seccion}
                                  </span>
                                )}
                                <Badge variant={CONFIANZA[a.confianza].badge}>
                                  {CONFIANZA[a.confianza].texto}
                                </Badge>
                                {a.ocupado && <Badge variant="danger">Reemplaza lo escrito</Badge>}
                              </span>
                              <span className="mt-1.5 block whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                {a.texto}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {reparto.sin_ubicar.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-400/40 p-3">
                  <h3 className="text-xs font-semibold text-amber-600">
                    Del proyecto, esto no encaja en ningún apartado del formato
                  </h3>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                    {reparto.sin_ubicar.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Revísalo: o va en una tabla del formulario, o el formato oficial no lo
                    contempla.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
