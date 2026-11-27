/**
 * Observaciones del requerimiento que el usuario edita o añade a mano, y el
 * contraste de una observación con la biblioteca.
 *
 * POR QUÉ (reunión con César del 27/11/2026)
 *
 * «Le faltó uno: lo añado de manera manual… lo contrasto con la IA: no
 * simplemente pongo lo que sea y lo mejoro; me debería decir una alerta,
 * no es correcto lo que tú estás diciendo, por esta razón; y si fuera
 * correcto, mejora la redacción y lo guardo» (César). Y: «quiero precisar
 * el fundamento o la solicitud con mis propias palabras… igual lo contrasto
 * y lo guardo». Después se seleccionan y se descarga el Word solo con las
 * seleccionadas.
 *
 * Este archivo es el CONTRATO entre la pantalla y el servidor. Se guarda
 * todo en `evaluations.result` (lo escribe el servidor con service role):
 *   · `ediciones[hallazgoId]`: lo que el usuario cambió de un hallazgo de
 *     la IA (el original queda intacto, para poder verlo y volver a él);
 *   · `manuales`: las observaciones que añadió él.
 */
import type { FuenteCitada } from '@/lib/evaluacion/bases/fuentes';
import type { HallazgoDeAuditoria, Solicitud, UbicacionDetallada } from '@/lib/evaluacion/auditoria-tdr';

/** El veredicto del contraste: nunca reemplaza el texto en silencio. */
export type Veredicto = 'compatible' | 'compatible_con_condiciones' | 'incompatible' | 'evidencia_insuficiente';

export const NOMBRE_VEREDICTO: Record<Veredicto, string> = {
  compatible: 'Procede',
  compatible_con_condiciones: 'Procede con precisiones',
  incompatible: 'No procede',
  evidencia_insuficiente: 'Sin sustento suficiente',
};

/** Lo que el usuario escribe o corrige de una observación. */
export interface CamposDeObservacion {
  titulo: string;
  severidad: HallazgoDeAuditoria['severidad'];
  categoria: string;
  ubicacion_detalle: UbicacionDetallada;
  /** Lo que dice el requerimiento (cita literal), o «(omisión) …». */
  extracto_literal: string;
  /** Fundamento. */
  descripcion: string;
  solicitud: Solicitud;
  /** Lo que se pide, con la redacción sugerida. */
  recomendacion: string;
  /** Marco normativo que el usuario indica (texto libre). */
  marco_normativo?: string;
}

export interface ContrasteDeObservacion {
  veredicto: Veredicto;
  /** Por qué, en 2 a 5 oraciones, apoyado en las fuentes. */
  explicacion: string;
  /** Solo documentos de la biblioteca, con su número real. */
  fuentes: FuenteCitada[];
  /** La redacción mejorada que propone (el usuario decide si la aplica). */
  propuesta: Pick<CamposDeObservacion, 'titulo' | 'descripcion' | 'recomendacion' | 'solicitud'>;
  en: string;
}

export interface VersionDeEdicion {
  version: number;
  en: string;
  campos: Partial<CamposDeObservacion>;
}

export interface EdicionDeHallazgo {
  /** Los campos tal como quedaron (sobre el hallazgo original). */
  campos: Partial<CamposDeObservacion>;
  version: number;
  editadoEn: string;
  /** El último contraste, si se pidió. */
  contraste?: ContrasteDeObservacion;
  historial: VersionDeEdicion[];
}

/** Una observación añadida a mano: un hallazgo con origen «manual». */
export type ObservacionManual = HallazgoDeAuditoria & {
  origen: 'manual';
  creadaEn: string;
  contraste?: ContrasteDeObservacion;
};

/** Lo que se agrega a `evaluations.result` del requerimiento. */
export interface ObservacionesDelUsuario {
  ediciones?: Record<string, EdicionDeHallazgo>;
  manuales?: ObservacionManual[];
}

/** Los datos de la carátula del Word (prototipo de César). */
export interface CaratulaDelWord {
  entidad?: string;
  dirigidoA?: string;
  elaboradoPor?: string;
  referencia?: string;
  /** YYYY-MM-DD */
  fecha?: string;
}

/** El hallazgo con la edición del usuario aplicada (lo que se ve y se descarga). */
export function conEdicion(h: HallazgoDeAuditoria, e?: EdicionDeHallazgo): HallazgoDeAuditoria & { editado?: boolean } {
  if (!e) return h;
  const c = e.campos;
  return {
    ...h,
    ...(c.titulo !== undefined ? { titulo: c.titulo } : {}),
    ...(c.severidad !== undefined ? { severidad: c.severidad } : {}),
    ...(c.categoria !== undefined ? { categoria: c.categoria } : {}),
    ...(c.ubicacion_detalle !== undefined ? { ubicacion_detalle: c.ubicacion_detalle } : {}),
    ...(c.extracto_literal !== undefined ? { extracto_literal: c.extracto_literal } : {}),
    ...(c.descripcion !== undefined ? { descripcion: c.descripcion } : {}),
    ...(c.solicitud !== undefined ? { solicitud: c.solicitud } : {}),
    ...(c.recomendacion !== undefined ? { recomendacion: c.recomendacion } : {}),
    ...(c.marco_normativo
      ? { fundamento_normativo: [{ norma: c.marco_normativo }, ...(h.fundamento_normativo ?? []).filter((f) => f.articulo)] }
      : {}),
    editado: true,
  };
}
