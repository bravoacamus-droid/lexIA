'use client';

import { CheckCircle2, CircleAlert, CircleDashed, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalisisDeActuacion, RequisitoEvaluado } from '@/lib/ejecucion/tipos';

/**
 * La ruta de habilitación de la decisión (AGA y Titular).
 *
 * César, 27/09/2026: cuando el emisor es la autoridad, «no basta con
 * generar una resolución bien redactada: tiene que comprobar si el
 * expediente permite decidir». Este cuadro es su propuesta: qué se
 * verifica, cómo está en el expediente y qué hace A-LexIA si falta. Se
 * arma con los requisitos que ya evaluó el diagnóstico; no pregunta nada
 * nuevo.
 */

interface Fila {
  verificacion: string;
  requisito?: RequisitoEvaluado;
  /** Cuando no hay requisito que lo mida (p. ej. la opinión jurídica). */
  sinRequisito?: string;
  accion: string;
}

const HECHO = new Set(['acreditado', 'no_aplica']);

export function RutaDeHabilitacion({ analisis }: { analisis: AnalisisDeActuacion }) {
  const req = (...ids: string[]) => analisis.requisitos.find((r) => ids.includes(r.id));
  const usados = new Set(['informe_area_usuaria', 'informe_dec', 'informe_legal', 'legal', 'delegacion', 'contrato']);
  const otros = analisis.requisitos.filter((r) => !usados.has(r.id) && r.nivel <= 2 && !HECHO.has(r.estado));

  const filas: Fila[] = [
    {
      verificacion: 'Sustento técnico del Área Usuaria',
      requisito: req('informe_area_usuaria'),
      sinRequisito: 'No se exige para esta actuación',
      accion: 'Identificar el informe necesario y preparar el pedido de sustento.',
    },
    {
      verificacion: 'Evaluación contractual de la DEC',
      requisito: req('informe_dec'),
      sinRequisito: 'Verifica si la DEC debe evaluar esta actuación',
      accion: 'Proponer el informe de la DEC y los extremos que debe resolver.',
    },
    {
      verificacion: 'Opinión jurídica',
      requisito: req('informe_legal', 'legal'),
      sinRequisito: 'Solo si es exigible para el caso o la pide una regla interna',
      accion: 'Indicar su ausencia y preparar la solicitud; no se exige en toda decisión.',
    },
    ...otros.map((r) => ({
      verificacion: r.texto,
      requisito: r,
      accion: 'Precisar el responsable y el efecto de la omisión.',
    })),
    {
      verificacion: `Competencia: ${analisis.competencia.organo}`,
      requisito: req('delegacion'),
      sinRequisito: analisis.competencia.base,
      accion: 'Mantener el proyecto condicionado hasta verificar quién puede decidir.',
    },
  ];

  const listo = analisis.nivelesPermitidos.includes('revision_final');
  const pendientes = filas.filter((f) => f.requisito && !HECHO.has(f.requisito.estado)).length;

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
        <ShieldAlert className="h-4 w-4 text-generar-600" />
        Ruta de habilitación de la decisión
      </h3>
      <p
        className={cn(
          'mt-2 rounded-lg px-3 py-2 text-[13px] leading-relaxed',
          listo
            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
            : 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
        )}
      >
        {listo
          ? 'El expediente permite proyectar la decisión para revisión final, sujeta a la validación de quien firma.'
          : `Puedo preparar el proyecto de acto, pero el expediente aún no permite recomendar su emisión${pendientes ? `: ${pendientes} ${pendientes === 1 ? 'verificación pendiente' : 'verificaciones pendientes'}` : ''}. El proyecto saldrá marcado como no apto para firma.`}
      </p>
      <ul className="mt-3 divide-y divide-border">
        {filas.map((f) => {
          const estado = f.requisito?.estado;
          const ok = estado ? HECHO.has(estado) : null;
          return (
            <li key={f.verificacion} className="grid gap-1 py-2.5 text-[12.5px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <span className="flex items-start gap-2 font-medium">
                {ok === true ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : ok === false ? (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {f.verificacion}
              </span>
              <span className="pl-6 text-muted-foreground sm:pl-0">
                {ok === true
                  ? `Acreditado${f.requisito?.documento ? `: ${f.requisito.documento}` : ''}.`
                  : ok === false
                    ? `${estado === 'declarado' ? 'Solo declarado, sin documento.' : 'Falta en el expediente.'} ${f.accion}`
                    : f.sinRequisito}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
