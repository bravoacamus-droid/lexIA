/**
 * Guardar lo que el usuario edita o añade en la evaluación del
 * requerimiento (`evaluations.result.ediciones` y `.manuales`, contrato en
 * `observaciones.ts`).
 *
 * Las funciones `aplicar…` son puras (se prueban sin base). `guardar`
 * vuelve a leer el resultado justo antes de escribir, cambia solo la llave
 * tocada y escribe con un sello (`result.observaciones_rev`): si otro
 * guardado se cruzó, no pisa nada y reintenta una vez sobre lo nuevo. Así
 * dos pestañas, o la versión mejorada guardándose a la vez, no se borran
 * lo suyo.
 */
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ubicacionEnUnaLinea, type HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import type { FuenteCitada } from '@/lib/evaluacion/bases/fuentes';
import { NOMBRE_DE_FUENTE } from '@/lib/evaluacion/bases/fuentes';
import type {
  CamposDeObservacion,
  ContrasteDeObservacion,
  EdicionDeHallazgo,
  ObservacionManual,
  ObservacionesDelUsuario,
} from './observaciones';

export type ResultadoConObservaciones = ObservacionesDelUsuario & {
  hallazgos?: HallazgoDeAuditoria[];
  observaciones_rev?: number;
  [k: string]: unknown;
};

const TOPE_HISTORIAL = 20;

/** El fundamento normativo de una observación: lo que escribió el usuario y los precedentes del contraste. */
function fundamentoDe(campos: Partial<CamposDeObservacion>, fuentes: FuenteCitada[] = []): Array<{ norma: string; articulo?: string }> {
  return [
    ...(campos.marco_normativo?.trim() ? [{ norma: campos.marco_normativo.trim() }] : []),
    ...fuentes.map((f) => ({ norma: f.numero, articulo: `${NOMBRE_DE_FUENTE[f.tipo] ?? f.tipo}: ${f.criterio}` })),
  ];
}

export function crearManual(campos: CamposDeObservacion, contraste?: ContrasteDeObservacion, ahora = new Date()): ObservacionManual {
  return {
    id: `manual_${randomUUID().slice(0, 12)}`,
    categoria: campos.categoria || 'otro',
    severidad: campos.severidad,
    titulo: campos.titulo.trim(),
    ubicacion: ubicacionEnUnaLinea(campos.ubicacion_detalle),
    ubicacion_detalle: campos.ubicacion_detalle,
    extracto_literal: campos.extracto_literal,
    descripcion: campos.descripcion,
    recomendacion: campos.recomendacion,
    solicitud: campos.solicitud,
    fundamento_normativo: fundamentoDe(campos, contraste?.fuentes),
    ...(contraste?.fuentes?.length ? { fuentes: contraste.fuentes } : {}),
    origen: 'manual',
    creadaEn: ahora.toISOString(),
    ...(contraste ? { contraste } : {}),
  };
}

export function aplicarManualNueva(r: ResultadoConObservaciones, m: ObservacionManual): ResultadoConObservaciones {
  return { ...r, manuales: [...(r.manuales ?? []), m] };
}

/**
 * Cambia un hallazgo: si es de la IA, su edición (el original queda); si es
 * manual, la observación misma. `null` si el id no existe.
 */
export function aplicarCambio(
  r: ResultadoConObservaciones,
  hid: string,
  campos: Partial<CamposDeObservacion>,
  contraste: ContrasteDeObservacion | undefined,
  ahora = new Date(),
): { resultado: ResultadoConObservaciones; edicion?: EdicionDeHallazgo; hallazgo?: ObservacionManual } | null {
  const en = ahora.toISOString();
  const manual = (r.manuales ?? []).find((m) => m.id === hid);
  if (manual) {
    const actualizado: ObservacionManual = {
      ...manual,
      ...(campos.titulo !== undefined ? { titulo: campos.titulo.trim() } : {}),
      ...(campos.severidad !== undefined ? { severidad: campos.severidad } : {}),
      ...(campos.categoria !== undefined ? { categoria: campos.categoria } : {}),
      ...(campos.ubicacion_detalle !== undefined
        ? { ubicacion_detalle: campos.ubicacion_detalle, ubicacion: ubicacionEnUnaLinea(campos.ubicacion_detalle) }
        : {}),
      ...(campos.extracto_literal !== undefined ? { extracto_literal: campos.extracto_literal } : {}),
      ...(campos.descripcion !== undefined ? { descripcion: campos.descripcion } : {}),
      ...(campos.solicitud !== undefined ? { solicitud: campos.solicitud } : {}),
      ...(campos.recomendacion !== undefined ? { recomendacion: campos.recomendacion } : {}),
      ...(contraste ? { contraste, fuentes: contraste.fuentes } : {}),
    };
    if (campos.marco_normativo !== undefined || contraste) {
      actualizado.fundamento_normativo = fundamentoDe(
        { marco_normativo: campos.marco_normativo ?? manual.fundamento_normativo?.find((f) => !f.articulo)?.norma },
        contraste?.fuentes ?? manual.fuentes,
      );
    }
    return {
      resultado: { ...r, manuales: (r.manuales ?? []).map((m) => (m.id === hid ? actualizado : m)) },
      hallazgo: actualizado,
    };
  }
  if (!(r.hallazgos ?? []).some((h) => h.id === hid)) return null;
  const previa = r.ediciones?.[hid];
  const edicion: EdicionDeHallazgo = {
    campos: { ...(previa?.campos ?? {}), ...campos },
    version: (previa?.version ?? 0) + 1,
    editadoEn: en,
    ...(contraste ? { contraste } : previa?.contraste ? { contraste: previa.contraste } : {}),
    historial: previa
      ? [{ version: previa.version, en: previa.editadoEn, campos: previa.campos }, ...previa.historial].slice(0, TOPE_HISTORIAL)
      : [],
  };
  return { resultado: { ...r, ediciones: { ...(r.ediciones ?? {}), [hid]: edicion } }, edicion };
}

/** Borra una observación manual, o la edición de un hallazgo de la IA (vuelve al original). */
export function aplicarBorrado(r: ResultadoConObservaciones, hid: string): ResultadoConObservaciones | null {
  if ((r.manuales ?? []).some((m) => m.id === hid)) {
    return { ...r, manuales: (r.manuales ?? []).filter((m) => m.id !== hid) };
  }
  if (r.ediciones?.[hid]) {
    const { [hid]: _quitada, ...resto } = r.ediciones;
    return { ...r, ediciones: resto };
  }
  return null;
}

/**
 * Lee, aplica y escribe con sello. `cambiar` recibe el resultado recién
 * leído y devuelve el nuevo (o `null` si no aplica). Reintenta una vez si
 * otro guardado se cruzó.
 */
export async function guardar<T>(
  admin: SupabaseClient,
  evaluacionId: string,
  cambiar: (r: ResultadoConObservaciones) => { resultado: ResultadoConObservaciones; salida: T } | null,
): Promise<{ ok: true; salida: T } | { ok: false; motivo: 'no_existe' | 'conflicto' | 'no_aplica'; detalle?: string }> {
  for (let intento = 1; intento <= 2; intento++) {
    const { data, error } = await admin.from('evaluations').select('result').eq('id', evaluacionId).maybeSingle();
    if (error || !data) return { ok: false, motivo: 'no_existe', detalle: error?.message };
    const actual = ((data as { result?: ResultadoConObservaciones }).result ?? {}) as ResultadoConObservaciones;
    const r = cambiar(actual);
    if (!r) return { ok: false, motivo: 'no_aplica' };
    const rev = typeof actual.observaciones_rev === 'number' ? actual.observaciones_rev : null;
    let q = admin
      .from('evaluations')
      .update({ result: { ...r.resultado, observaciones_rev: (rev ?? 0) + 1 } } as never)
      .eq('id', evaluacionId);
    q = rev === null ? q.is('result->observaciones_rev', null) : q.eq('result->>observaciones_rev', String(rev));
    const { data: escritas, error: e2 } = await q.select('id');
    if (e2) return { ok: false, motivo: 'conflicto', detalle: e2.message };
    if (escritas && escritas.length > 0) return { ok: true, salida: r.salida };
  }
  return { ok: false, motivo: 'conflicto' };
}

/** Solo las fuentes cuyo documento existe en la biblioteca (un contraste puede venir del navegador). */
export async function fuentesReales(db: SupabaseClient, fuentes: FuenteCitada[] | undefined): Promise<FuenteCitada[]> {
  const lista = (fuentes ?? []).filter((f) => f && typeof f.documentId === 'string' && /^[0-9a-f-]{36}$/i.test(f.documentId));
  if (lista.length === 0) return [];
  const { data } = await db.from('normative_documents').select('id, number').in('id', Array.from(new Set(lista.map((f) => f.documentId))));
  const numero = new Map(((data ?? []) as Array<{ id: string; number: string | null }>).map((d) => [d.id, d.number]));
  // El número sale de la fila, no del navegador.
  return lista.filter((f) => numero.has(f.documentId)).map((f) => ({ ...f, numero: numero.get(f.documentId) || f.numero }));
}
