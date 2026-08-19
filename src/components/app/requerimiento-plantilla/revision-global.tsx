'use client';

/**
 * Revisión global del requerimiento terminado.
 *
 * La ayuda apartado por apartado deja el documento revisado por partes y
 * sin revisar como conjunto: un plazo puede contradecir al cronograma, y
 * una penalidad escrita a mano puede vulnerar la norma sin que nadie lo
 * mire. Esto es lo que pidió César: un botón al final que revise la
 * coherencia entre secciones, valide contra la norma lo que se escribió
 * a mano y mejore la redacción del conjunto.
 *
 * Nada se aplica solo. Cada hallazgo se atiende o se descarta, uno por
 * uno, y el texto propuesto solo aparece donde reemplazarlo no supone
 * cambiar una decisión del área usuaria.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, CircleAlert, AlertTriangle, Info, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Hallazgo {
  apartado_id: string | null;
  tipo: 'norma' | 'coherencia' | 'redaccion';
  gravedad: 'alta' | 'media' | 'baja';
  detalle: string;
  fundamento?: string;
  texto_propuesto?: string;
}

interface Apartado {
  id: string;
  etiqueta: string;
  seccion: string;
  destino: 'redacciones' | 'campos';
}

interface Revision {
  resumen: string;
  hallazgos: Hallazgo[];
  apartados: Apartado[];
  apartados_revisados: number;
  con_sustento: boolean;
  vacio?: boolean;
}

const TIPO_TEXTO: Record<Hallazgo['tipo'], string> = {
  norma: 'Norma',
  coherencia: 'Coherencia',
  redaccion: 'Redacción',
};

const GRAVEDAD: Record<
  Hallazgo['gravedad'],
  { badge: 'danger' | 'warning' | 'secondary'; icono: typeof CircleAlert; texto: string }
> = {
  alta: { badge: 'danger', icono: CircleAlert, texto: 'Alta' },
  media: { badge: 'warning', icono: AlertTriangle, texto: 'Media' },
  baja: { badge: 'secondary', icono: Info, texto: 'Baja' },
};

export function RevisionGlobal({
  id,
  guardarPrimero,
  onAplicar,
}: {
  id: string;
  /** Vuelca lo pendiente antes de revisar: se revisa lo guardado. */
  guardarPrimero: () => Promise<void>;
  /** Escribe un texto propuesto en el apartado que corresponde. */
  onAplicar: (destino: Apartado['destino'], bloqueId: string, texto: string) => void;
}) {
  const [revisando, setRevisando] = useState(false);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [atendidos, setAtendidos] = useState<Set<number>>(new Set());

  async function revisar() {
    setRevisando(true);
    try {
      // El servidor revisa lo que hay en la base, no lo que hay en
      // pantalla: sin volcar antes, la revisión miraría una versión
      // vieja del documento.
      await guardarPrimero();
      const res = await fetch(`/api/generadores/requerimientos/${id}/revisar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error('No se pudo revisar el documento', {
          description: j?.detail ?? j?.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setAtendidos(new Set());
      setRevision(j as Revision);
      if (!j.con_sustento && !j.vacio) {
        toast.warning('Revisado sin sustento normativo', {
          description: 'No se encontró norma aplicable en la biblioteca; las observaciones van sin cita.',
        });
      }
    } catch (e) {
      toast.error('Fallo al revisar', { description: (e as Error).message });
    } finally {
      setRevisando(false);
    }
  }

  const apartadoDe = (hid: string | null) =>
    hid ? revision?.apartados.find((a) => a.id === hid) : undefined;

  const porGravedad = (g: Hallazgo['gravedad']) =>
    revision?.hallazgos.filter((h) => h.gravedad === g).length ?? 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Revisión global
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            Revisa el documento como conjunto: coherencia entre secciones, si lo que escribiste a
            mano se ajusta a la norma, y la redacción del todo. No cambia nada por su cuenta.
          </p>
        </div>
        <Button type="button" onClick={revisar} disabled={revisando}>
          {revisando ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-1.5 h-4 w-4" />
          )}
          {revisando ? 'Revisando…' : revision ? 'Revisar de nuevo' : 'Revisar el documento'}
        </Button>
      </div>

      {revision && (
        <div className="mt-4 border-t pt-4">
          {revision.resumen && (
            <p className="text-sm leading-relaxed">{revision.resumen}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{revision.apartados_revisados} apartados revisados</span>
            {(['alta', 'media', 'baja'] as const).map((g) =>
              porGravedad(g) > 0 ? (
                <Badge key={g} variant={GRAVEDAD[g].badge}>
                  {porGravedad(g)} de gravedad {GRAVEDAD[g].texto.toLowerCase()}
                </Badge>
              ) : null,
            )}
          </div>

          {revision.hallazgos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {revision.vacio
                ? 'Todavía no hay nada escrito que revisar.'
                : 'No se encontraron problemas de coherencia, de norma ni de redacción.'}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {revision.hallazgos.map((h, i) => {
                const ap = apartadoDe(h.apartado_id);
                const g = GRAVEDAD[h.gravedad];
                const Icono = g.icono;
                const hecho = atendidos.has(i);
                return (
                  <li
                    key={i}
                    className={cn(
                      'rounded-lg border p-3 transition',
                      hecho && 'opacity-50',
                      h.gravedad === 'alta' && !hecho && 'border-destructive/40',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Icono
                        className={cn(
                          'h-4 w-4 shrink-0',
                          h.gravedad === 'alta'
                            ? 'text-destructive'
                            : h.gravedad === 'media'
                              ? 'text-amber-600'
                              : 'text-muted-foreground',
                        )}
                      />
                      <Badge variant={g.badge}>{TIPO_TEXTO[h.tipo]}</Badge>
                      <span className="text-xs font-medium">
                        {ap ? ap.etiqueta : 'Documento completo'}
                      </span>
                      {ap && (
                        <span className="text-xs text-muted-foreground">· {ap.seccion}</span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-relaxed">{h.detalle}</p>
                    {h.fundamento && (
                      <p className="mt-1 text-xs text-muted-foreground">{h.fundamento}</p>
                    )}

                    {h.texto_propuesto && ap && (
                      <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2.5">
                        <p className="mb-1.5 text-xs font-medium text-primary">
                          Texto propuesto para {ap.etiqueta}
                        </p>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                          {h.texto_propuesto}
                        </pre>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {h.texto_propuesto && ap && !hecho && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onAplicar(ap.destino, ap.id, h.texto_propuesto as string);
                            setAtendidos((p) => new Set(p).add(i));
                            toast.success(`Aplicado en ${ap.etiqueta}`);
                          }}
                        >
                          Aplicar en el apartado
                        </Button>
                      )}
                      {!hecho ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAtendidos((p) => new Set(p).add(i))}
                        >
                          Marcar como visto
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="h-3 w-3" /> Atendido
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
