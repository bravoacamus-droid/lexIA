'use client';

import { BookOpen, ChevronDown, ChevronRight, Lightbulb, MapPin, Pencil, Quote, RotateCcw, Trash2, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Mejora } from '@/lib/evaluacion/mejora/tipos';
import type { HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import { NOMBRE_VEREDICTO, type ContrasteDeObservacion } from '@/lib/evaluacion/requerimiento/observaciones';
import { InsigniaVeredicto, MejoraDelHallazgo } from '../version-mejorada';
import { NOMBRE_CATEGORIA, NOMBRE_SOLICITUD, SEVERIDAD } from './bloques';

export type HallazgoEnPantalla = HallazgoDeAuditoria & {
  editado?: boolean;
  contraste?: ContrasteDeObservacion;
};

const ETIQUETA_UBICACION = { pagina: 'Página', capitulo: 'Capítulo', numeral: 'Numeral', literal: 'Literal' } as const;

export function TarjetaDeHallazgo({
  h,
  numero,
  seleccionado,
  onSeleccionar,
  abierto,
  onAlternar,
  mejora,
  evaluacionId,
  origenDoc,
  onCambioMejora,
  onEditar,
  onDeshacer,
}: {
  h: HallazgoEnPantalla;
  numero: number;
  seleccionado: boolean;
  onSeleccionar: (v: boolean) => void;
  abierto: boolean;
  onAlternar: () => void;
  mejora?: Mejora;
  evaluacionId: string;
  origenDoc: 'docx' | 'pdf';
  onCambioMejora: (m: Mejora) => void;
  onEditar: () => void;
  /** Borra la observación propia, o vuelve al texto original de la IA. */
  onDeshacer?: () => void;
}) {
  const meta = SEVERIDAD[h.severidad];
  const manual = h.origen === 'manual';
  const precedentes = (h.fundamento_normativo ?? []).filter((f) => f.articulo && f.articulo.length > 40);
  const normas = (h.fundamento_normativo ?? []).filter((f) => !f.articulo || f.articulo.length <= 40);

  return (
    <Card className={cn('overflow-hidden border-l-4', meta.borde, seleccionado && 'ring-1 ring-brand-400/60')}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <label className="mt-0.5 flex shrink-0 cursor-pointer flex-col items-center gap-1 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600"
            checked={seleccionado}
            onChange={(e) => onSeleccionar(e.target.checked)}
            aria-label={`Incluir en Word la observación N.° ${numero}`}
          />
          Word
        </label>
        <button type="button" onClick={onAlternar} className="min-w-0 flex-1 text-left" aria-expanded={abierto}>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', meta.pastilla)}>{meta.nombre}</span>
            <Badge variant="outline" className="text-[10px]">
              {NOMBRE_CATEGORIA[h.categoria] ?? h.categoria}
            </Badge>
            <span className="text-[11px] text-muted-foreground">N.° {numero}</span>
            {manual && (
              <Badge variant="secondary" className="text-[10px]">
                <UserRound className="h-2.5 w-2.5" /> Tuya
              </Badge>
            )}
            {h.editado && !manual && <Badge variant="secondary" className="text-[10px]">Editada</Badge>}
            {h.origen === 'tema' && <Badge className="text-[10px]">Contrastado con la biblioteca</Badge>}
            {h.contraste && (
              <Badge variant={h.contraste.veredicto === 'incompatible' ? 'danger' : h.contraste.veredicto === 'evidencia_insuficiente' ? 'warning' : 'success'} className="text-[10px]">
                {NOMBRE_VEREDICTO[h.contraste.veredicto]}
              </Badge>
            )}
            {h.solicitud && <Badge variant="secondary" className="text-[10px]">Solicitud: {NOMBRE_SOLICITUD[h.solicitud]}</Badge>}
            {mejora && <InsigniaVeredicto veredicto={mejora.veredicto} />}
          </div>
          <h3 className="text-[15px] font-semibold leading-snug">{h.titulo}</h3>
          <p className="mt-1 flex items-start gap-1 text-[11.5px] text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            {h.ubicacion}
          </p>
        </button>
        <button type="button" onClick={onAlternar} className="mt-1 shrink-0 text-muted-foreground" aria-label={abierto ? 'Cerrar detalle' : 'Ver detalle'}>
          {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {abierto && (
        <div className="space-y-4 border-t border-border bg-secondary/20 px-4 py-4 sm:px-5">
          {h.ubicacion_detalle && (
            <dl className="grid grid-cols-2 gap-2 rounded-lg border-l-2 border-brand-400 bg-background/60 px-3 py-2 sm:grid-cols-4">
              {(Object.keys(ETIQUETA_UBICACION) as Array<keyof typeof ETIQUETA_UBICACION>).map((k) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{ETIQUETA_UBICACION[k]}</dt>
                  <dd className="text-[12.5px] text-foreground/90">{h.ubicacion_detalle![k]}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {h.extracto_literal && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Quote className="h-3 w-3" /> Texto observado
                </p>
                <blockquote className="border-l-2 border-border pl-3 text-[13px] italic leading-relaxed text-foreground/85">{h.extracto_literal}</blockquote>
              </div>
            )}
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fundamento</p>
              <p className="text-[13px] leading-relaxed text-foreground/90">{h.descripcion}</p>
            </div>
          </div>

          {!mejora && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Lightbulb className="h-3 w-3" /> {h.solicitud ? `Se solicita ${NOMBRE_SOLICITUD[h.solicitud].toLowerCase()}` : 'Cómo corregirlo'}
              </p>
              <p className="text-[13px] leading-relaxed text-foreground/90">{h.recomendacion}</p>
            </div>
          )}

          {mejora && <MejoraDelHallazgo id={evaluacionId} mejora={mejora} origen={origenDoc} onCambio={onCambioMejora} />}

          {!mejora && (normas.length > 0 || precedentes.length > 0) && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-3 w-3" /> Marco normativo
              </p>
              {normas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {normas.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-[11px]">
                      {f.norma}
                    </Badge>
                  ))}
                </div>
              )}
              {precedentes.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {precedentes.map((f, i) => {
                    const doc = h.fuentes?.find((x) => x.numero === f.norma);
                    return (
                      <li key={i} className="text-[12.5px] leading-relaxed text-foreground/85">
                        {doc ? (
                          <a href={`/biblioteca/documento/${doc.documentId}`} target="_blank" rel="noreferrer" className="font-semibold underline-offset-2 hover:underline">
                            {f.norma}
                          </a>
                        ) : (
                          <span className="font-semibold">{f.norma}</span>
                        )}{' '}
                        — {f.articulo}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {h.contraste && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2.5 text-[12.5px] leading-relaxed dark:border-violet-900 dark:bg-violet-950/20">
              <span className="font-semibold">Contraste de A-LexIA: {NOMBRE_VEREDICTO[h.contraste.veredicto]}.</span> {h.contraste.explicacion}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEditar}>
              <Pencil className="h-3.5 w-3.5" /> {manual ? 'Editar' : 'Editar o precisar'}
            </Button>
            {onDeshacer && (
              <Button size="sm" variant="ghost" onClick={onDeshacer} className={manual ? 'text-red-700 hover:text-red-800' : ''}>
                {manual ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {manual ? 'Eliminar' : 'Volver al texto de A-LexIA'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
