'use client';

/**
 * Editar una observación de la IA o añadir una a mano, contrastándola con
 * A-LexIA antes de guardarla.
 *
 * Reunión con César, 27/11/2026: «lo que debí hacer es contrastar primero:
 * no simplemente pongo lo que sea y lo mejoro; me debería decir una
 * alerta, no es correcto lo que tú estás diciendo, por esta razón; y si
 * fuera correcto, mejora la redacción y lo guardo». Por eso:
 *   · una observación nueva se guarda después de contrastarla (si no
 *     procede, se puede guardar igual, pero diciéndolo);
 *   · la propuesta de A-LexIA nunca reemplaza el texto sola: se aplica con
 *     un botón y se puede seguir editando.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, CheckCircle2, Loader2, Sparkles, Wand2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { avisoDePlan, creditosCambiaron } from '@/lib/billing/aviso-de-plan';
import {
  NOMBRE_VEREDICTO,
  type CamposDeObservacion,
  type ContrasteDeObservacion,
} from '@/lib/evaluacion/requerimiento/observaciones';
import { NOMBRE_CATEGORIA, NOMBRE_SOLICITUD, SEVERIDAD, SEVERIDADES } from './bloques';

const SELECT =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const OBSERVACION_VACIA: CamposDeObservacion = {
  titulo: '',
  severidad: 'medio',
  categoria: 'otro',
  ubicacion_detalle: { pagina: 'No corresponde', capitulo: 'No corresponde', numeral: 'No corresponde', literal: 'No corresponde' },
  extracto_literal: '',
  descripcion: '',
  solicitud: 'modificar',
  recomendacion: '',
  marco_normativo: '',
};

const ESTILO_VEREDICTO: Record<ContrasteDeObservacion['veredicto'], { clase: string; icono: typeof CheckCircle2 }> = {
  compatible: { clase: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200', icono: CheckCircle2 },
  compatible_con_condiciones: { clase: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200', icono: CheckCircle2 },
  incompatible: { clase: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200', icono: XCircle },
  evidencia_insuficiente: { clase: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200', icono: AlertTriangle },
};

export function EditorDeObservacion({
  abierto,
  evaluacionId,
  hallazgoId,
  inicial,
  esManual,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean;
  evaluacionId: string;
  /** Sin id: observación nueva. */
  hallazgoId?: string;
  inicial: CamposDeObservacion;
  /** Una observación propia (no de la IA). */
  esManual: boolean;
  onCerrar: () => void;
  onGuardado: (r: { hallazgoId: string; campos: CamposDeObservacion; contraste?: ContrasteDeObservacion; respuesta: Record<string, unknown> }) => void;
}) {
  const nueva = !hallazgoId;
  const [c, setC] = useState<CamposDeObservacion>(inicial);
  const [contraste, setContraste] = useState<ContrasteDeObservacion | null>(null);
  const [contrastando, setContrastando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aunAsi, setAunAsi] = useState(false);
  const [cambioTrasContraste, setCambioTrasContraste] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setC(inicial);
    setContraste(null);
    setAunAsi(false);
    setCambioTrasContraste(false);
  }, [abierto, inicial]);

  const poner = <K extends keyof CamposDeObservacion>(k: K, v: CamposDeObservacion[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
    if (contraste) setCambioTrasContraste(true);
  };
  const ponerUbicacion = (k: keyof CamposDeObservacion['ubicacion_detalle'], v: string) =>
    poner('ubicacion_detalle', { ...c.ubicacion_detalle, [k]: v });

  const completa = c.titulo.trim().length >= 5 && c.descripcion.trim().length >= 20 && c.recomendacion.trim().length >= 10;
  const noProcede = contraste && (contraste.veredicto === 'incompatible' || contraste.veredicto === 'evidencia_insuficiente');
  // Una observación nueva se contrasta antes de guardarla (César).
  const puedeGuardar = completa && !guardando && (!nueva || (!!contraste && (!noProcede || aunAsi)));

  async function contrastar() {
    setContrastando(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluacionId}/hallazgos/contrastar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacion: c, ...(hallazgoId ? { hallazgoId } : {}) }),
      });
      const j = (await res.json().catch(() => ({}))) as { contraste?: ContrasteDeObservacion; message?: string; error?: string };
      if (!res.ok || !j.contraste) {
        if (avisoDePlan(j)) return;
        throw new Error(j.message || j.error || 'No se pudo contrastar la observación');
      }
      creditosCambiaron();
      setContraste(j.contraste);
      setCambioTrasContraste(false);
      setAunAsi(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setContrastando(false);
    }
  }

  function aplicarPropuesta() {
    if (!contraste) return;
    const p = contraste.propuesta;
    setC((prev) => ({
      ...prev,
      ...(p.titulo ? { titulo: p.titulo } : {}),
      ...(p.descripcion ? { descripcion: p.descripcion } : {}),
      ...(p.recomendacion ? { recomendacion: p.recomendacion } : {}),
      ...(p.solicitud ? { solicitud: p.solicitud } : {}),
      ...(contraste.fuentes.length && !prev.marco_normativo?.trim()
        ? { marco_normativo: contraste.fuentes.map((f) => f.numero).join('; ') }
        : {}),
    }));
    toast.success('Propuesta aplicada. Revísala antes de guardar.');
  }

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch(
        nueva ? `/api/evaluations/${evaluacionId}/hallazgos` : `/api/evaluations/${evaluacionId}/hallazgos/${hallazgoId}`,
        {
          method: nueva ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nueva ? { observacion: c, ...(contraste ? { contraste } : {}) } : { campos: c, ...(contraste ? { contraste } : {}) }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & { message?: string; error?: string; hallazgo?: { id: string } };
      if (!res.ok) throw new Error(j.message || j.error || 'No se pudo guardar');
      onGuardado({ hallazgoId: hallazgoId ?? j.hallazgo?.id ?? '', campos: c, contraste: contraste ?? undefined, respuesta: j });
      toast.success(nueva ? 'Observación añadida' : 'Cambios guardados');
      onCerrar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  const estilo = contraste ? ESTILO_VEREDICTO[contraste.veredicto] : null;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nueva ? 'Añadir observación' : esManual ? 'Editar tu observación' : 'Editar observación'}</DialogTitle>
          <DialogDescription>
            {nueva
              ? 'Escríbela con tus palabras. A-LexIA la contrasta con el requerimiento, la normativa y los precedentes antes de guardarla.'
              : 'Precisa lo que quieras. Puedes contrastar el cambio con A-LexIA antes de guardarlo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ob-titulo">Título *</Label>
            <Input id="ob-titulo" value={c.titulo} maxLength={200} onChange={(e) => poner('titulo', e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ob-sev">Prioridad</Label>
              <select id="ob-sev" className={SELECT} value={c.severidad} onChange={(e) => poner('severidad', e.target.value as CamposDeObservacion['severidad'])}>
                {SEVERIDADES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERIDAD[s].nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-cat">Tema</Label>
              <select id="ob-cat" className={SELECT} value={c.categoria} onChange={(e) => poner('categoria', e.target.value)}>
                {Object.entries(NOMBRE_CATEGORIA).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Ubicación en el requerimiento</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(['pagina', 'capitulo', 'numeral', 'literal'] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`ob-${k}`} className="text-[11px] text-muted-foreground">
                    {k === 'pagina' ? 'Página' : k === 'capitulo' ? 'Capítulo' : k === 'numeral' ? 'Numeral' : 'Literal'}
                  </Label>
                  <Input
                    id={`ob-${k}`}
                    value={c.ubicacion_detalle[k]}
                    maxLength={120}
                    onChange={(e) => ponerUbicacion(k, e.target.value)}
                    onBlur={(e) => !e.target.value.trim() && ponerUbicacion(k, 'No corresponde')}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Si no aplica, deja «No corresponde»: nunca en blanco.</p>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="ob-texto">Texto observado (cita literal del requerimiento)</Label>
            <Textarea
              id="ob-texto"
              rows={3}
              maxLength={4000}
              value={c.extracto_literal}
              onChange={(e) => poner('extracto_literal', e.target.value)}
              placeholder="Copia el texto tal como está. Si es una omisión, escribe: (omisión) y qué falta."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-fund">Fundamento *</Label>
            <Textarea id="ob-fund" rows={4} maxLength={4000} value={c.descripcion} onChange={(e) => poner('descripcion', e.target.value)} placeholder="Por qué se observa: qué norma o criterio no se cumple y qué riesgo genera." />
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="ob-sol">Solicitud</Label>
              <select id="ob-sol" className={SELECT} value={c.solicitud} onChange={(e) => poner('solicitud', e.target.value as CamposDeObservacion['solicitud'])}>
                {Object.entries(NOMBRE_SOLICITUD).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-rec">Lo que se pide *</Label>
              <Textarea id="ob-rec" rows={3} maxLength={4000} value={c.recomendacion} onChange={(e) => poner('recomendacion', e.target.value)} placeholder="Qué debe cambiar el área usuaria, con la redacción sugerida si ayuda." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-marco">Marco normativo</Label>
            <Input id="ob-marco" maxLength={1000} value={c.marco_normativo ?? ''} onChange={(e) => poner('marco_normativo', e.target.value)} placeholder="Artículos de la Ley o del Reglamento, pronunciamientos…" />
          </div>

          {/* ── Contraste ── */}
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-violet-600" /> Contrastar con A-LexIA
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  Revisa la observación contra el requerimiento, la normativa y los precedentes de la biblioteca · 2 créditos
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={contrastar} disabled={!completa || contrastando} aria-busy={contrastando}>
                {contrastando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {contraste ? 'Volver a contrastar' : 'Contrastar'}
              </Button>
            </div>
            {!completa && <p className="mt-2 text-[11px] text-muted-foreground">Completa título, fundamento y lo que se pide para contrastar.</p>}

            {contraste && estilo && (
              <div className={cn('mt-3 rounded-lg border p-3', estilo.clase)} role="status" aria-live="polite">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <estilo.icono className="h-4 w-4" /> {NOMBRE_VEREDICTO[contraste.veredicto]}
                  {cambioTrasContraste && <Badge variant="outline" className="ml-2 text-[10px]">Cambiaste el texto después del contraste</Badge>}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed">{contraste.explicacion}</p>
                {contraste.fuentes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {contraste.fuentes.map((f) => (
                      <li key={f.documentId + f.numero} className="text-[12px] leading-relaxed">
                        <BookOpen className="mr-1 inline h-3 w-3" />
                        <a href={`/biblioteca/documento/${f.documentId}`} target="_blank" rel="noreferrer" className="font-semibold underline-offset-2 hover:underline">
                          {f.numero}
                        </a>{' '}
                        — {f.criterio}
                      </li>
                    ))}
                  </ul>
                )}
                {(contraste.propuesta.descripcion || contraste.propuesta.recomendacion) && (
                  <div className="mt-3 rounded-md bg-background/70 p-2.5 text-foreground">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Redacción que propone</p>
                    {contraste.propuesta.titulo && <p className="mt-1 text-[13px] font-medium">{contraste.propuesta.titulo}</p>}
                    {contraste.propuesta.descripcion && <p className="mt-1 text-[12.5px] leading-relaxed">{contraste.propuesta.descripcion}</p>}
                    {contraste.propuesta.recomendacion && (
                      <p className="mt-1 text-[12.5px] leading-relaxed">
                        <span className="font-medium">Se solicita:</span> {contraste.propuesta.recomendacion}
                      </p>
                    )}
                    <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={aplicarPropuesta}>
                      Aplicar esta redacción
                    </Button>
                  </div>
                )}
                {nueva && noProcede && (
                  <label className="mt-3 flex items-start gap-2 text-[12.5px]">
                    <input type="checkbox" checked={aunAsi} onChange={(e) => setAunAsi(e.target.checked)} className="mt-0.5" />
                    Guardarla de todos modos (quedará marcada como «{NOMBRE_VEREDICTO[contraste.veredicto]}»).
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 mt-2 items-center border-t border-border bg-background px-6 py-3">
          {nueva && !contraste && completa && (
            <span className="mr-auto text-[11.5px] text-muted-foreground">Contrástala antes de guardarla.</span>
          )}
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={!puedeGuardar} aria-busy={guardando}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {nueva ? 'Guardar observación' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
