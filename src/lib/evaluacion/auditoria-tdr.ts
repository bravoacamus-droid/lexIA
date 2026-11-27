/**
 * La evaluación del requerimiento (auditoría de TDR / EETT), reforzada
 * con la biblioteca y con el control de obras como servicios similares.
 *
 * Documento 14 de César (16/10/2026) pide lo mismo para las dos
 * evaluaciones —la de bases y la del requerimiento—:
 *
 *   · que analicen la biblioteca de A-LexIA a fondo y citen, cuando
 *     corresponda, resoluciones del Tribunal, acuerdos de Sala Plena,
 *     opiniones y pronunciamientos del OECE, en el orden Ley →
 *     Reglamento → bases estándar → Tribunal → Sala Plena → OECE;
 *   · que, si un requerimiento de SERVICIOS admite la ejecución de OBRAS
 *     como servicio similar, lo detecten y pidan corregirlo.
 *
 * El auditor del requerimiento es un solo prompt que no ve la biblioteca
 * y que tiene prohibido citar resoluciones (para que no las invente). Lo
 * que se añade aquí sale de la biblioteca, con el número de su fila.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { fundamentarConLaBiblioteca } from './bases/biblioteca';
import { NOMBRE_DE_FUENTE, type FuenteCitada } from './bases/fuentes';
import {
  NORMA_OBRAS_COMO_SIMILARES,
  analisisObrasComoSimilares,
  obrasComoSimilares,
  precedentesEnLaBiblioteca,
} from './bases/similares-obras';
import { aplanarBases } from './bases/cotejo';
import {
  analisisDeDisponibilidad,
  correccionDeDisponibilidad,
  disponibilidadDelBien,
  normaDeDisponibilidad,
  precedentesDeDisponibilidad,
  TEMA_DISPONIBILIDAD,
} from './bases/disponibilidad-del-bien';

/** Página, capítulo, numeral y literal; «No corresponde» cuando el documento no tiene ese nivel. */
export interface UbicacionDetallada {
  pagina: string;
  capitulo: string;
  numeral: string;
  literal: string;
}

export type Solicitud = 'modificar' | 'suprimir' | 'ampliar' | 'precisar' | 'incorporar';

/** La forma de un hallazgo de la auditoría (`process/route.ts`). */
export interface HallazgoDeAuditoria {
  id: string;
  categoria: string;
  severidad: 'critico' | 'alto' | 'medio' | 'bajo';
  titulo: string;
  /** La ubicación en una línea (la usan la vista, la mejora y el Word). */
  ubicacion: string;
  /** Desde el 27/11/2026: la ubicación por partes (reunión con César). */
  ubicacion_detalle?: UbicacionDetallada;
  extracto_literal: string;
  descripcion: string;
  recomendacion: string;
  solicitud?: Solicitud;
  /** Expresiones literales del tema, para buscar en la biblioteca. */
  terminos_clave?: string[];
  fundamento_normativo?: Array<{ norma: string; articulo?: string }>;
  /**
   * De dónde sale: el auditor general, el contraste por tema con la
   * biblioteca (Fase 1, `requerimiento/contrastar.ts`, ya trae sus
   * precedentes) o un control propio (obras como similares,
   * disponibilidad del bien).
   */
  origen?: 'auditor' | 'tema' | 'control';
  /** Los precedentes del contraste por tema, con el documento para abrirlo (las bases los usan así). */
  fuentes?: FuenteCitada[];
}

/** Lo que el contraste por tema revisó: cuántas cláusulas y cuántos documentos de la biblioteca. */
export interface CoberturaDeLaRevision {
  tema: string;
  nombre: string;
  clausulas: number;
  documentosEnLaBiblioteca: number;
  leidos: number;
  hallazgos: number;
  error?: string;
}

export interface AuditoriaDeRequerimiento {
  tipo_documento: 'TDR' | 'EETT' | 'MIXTO';
  objeto_inferido: string;
  /** La denominación de la contratación, copiada del documento. */
  denominacion?: string;
  regimen?: 'menor_8uit' | 'seleccion' | null;
  objeto_contratacion?: 'bienes' | 'servicios' | 'consultoria_obras' | 'obras' | null;
  stats: { criticos: number; altos: number; medios: number; bajos: number };
  hallazgos: HallazgoDeAuditoria[];
  cobertura?: CoberturaDeLaRevision[];
}

const NO_CORRESPONDE = 'No corresponde';

const plano = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^\(omision\)\s*/, '')
    .trim();

/** ¿Hablan de lo mismo? Misma categoría y misma cita, o mismo numeral y literal. */
function mismoPunto(a: HallazgoDeAuditoria, b: HallazgoDeAuditoria): boolean {
  if (a.categoria !== b.categoria) return false;
  const omisionA = a.extracto_literal.startsWith('(omisión)');
  const omisionB = b.extracto_literal.startsWith('(omisión)');
  if (omisionA && omisionB) return true;
  const ca = plano(a.extracto_literal).slice(0, 60);
  const cb = plano(b.extracto_literal).slice(0, 60);
  if (ca.length >= 25 && cb.length >= 25 && (plano(b.extracto_literal).includes(ca) || plano(a.extracto_literal).includes(cb))) return true;
  const ua = a.ubicacion_detalle;
  const ub = b.ubicacion_detalle;
  if (!ua || !ub || ua.numeral === NO_CORRESPONDE) return false;
  // «f.» y «f)», «3.3» y «3.3.»: el mismo literal escrito distinto (lo
  // vio la prueba con el CPA 008-2026: «otras penalidades» salía dos veces).
  const marca = (t: string) => t.toLowerCase().replace(/[^a-z0-9ñ]/g, '');
  return marca(ua.numeral) === marca(ub.numeral) && marca(ua.literal) === marca(ub.literal);
}

/**
 * Junta lo del auditor general con lo del contraste por tema. Si los dos
 * observan el mismo punto, se queda el del contraste (trae precedentes de
 * la biblioteca) con la severidad más alta de los dos.
 */
export function fusionarConElContraste(
  auditoria: AuditoriaDeRequerimiento,
  contraste: { hallazgos: HallazgoDeAuditoria[]; cobertura: CoberturaDeLaRevision[] },
): AuditoriaDeRequerimiento {
  const delTema = contraste.hallazgos.map((h) => ({ ...h }));
  const delAuditor: HallazgoDeAuditoria[] = [];
  for (const h of auditoria.hallazgos) {
    const igual = delTema.find((t) => mismoPunto(t, h));
    if (igual) {
      if (ORDEN[h.severidad] < ORDEN[igual.severidad]) igual.severidad = h.severidad;
      continue;
    }
    delAuditor.push({ ...h, origen: h.origen ?? 'auditor' });
  }
  const hallazgos = [...delTema, ...delAuditor].sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
  return { ...auditoria, hallazgos, stats: contar(hallazgos), cobertura: contraste.cobertura };
}
const SOLICITUDES: Solicitud[] = ['modificar', 'suprimir', 'ampliar', 'precisar', 'incorporar'];
const SEVERIDADES = ['critico', 'alto', 'medio', 'bajo'] as const;

function parteDeUbicacion(v: unknown): string {
  const t = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : typeof v === 'number' ? String(v) : '';
  return t && !/^(n\/?a|ninguno|-+|—)$/i.test(t) ? t.slice(0, 120) : NO_CORRESPONDE;
}

/** «Pág. 7 · Cap. III. Alcance · Numeral 3.2.1 · Literal b)». */
export function ubicacionEnUnaLinea(u: UbicacionDetallada): string {
  return [`Pág. ${u.pagina}`, `Cap. ${u.capitulo}`, `Numeral ${u.numeral}`, `Literal ${u.literal}`].join(' · ');
}

/**
 * Deja la salida del modelo en la forma que esperan la vista, la mejora y
 * el Word: ubicación completa (nunca en blanco), solicitud y severidad
 * válidas, términos clave cortos y conteos recalculados (el modelo ya no
 * los da: se equivocaba al sumar).
 */
export function normalizarAuditoria(crudo: Record<string, unknown>): AuditoriaDeRequerimiento {
  const lista = Array.isArray(crudo.hallazgos) ? (crudo.hallazgos as Array<Record<string, unknown>>) : [];
  const hallazgos: HallazgoDeAuditoria[] = lista
    .filter((h) => h && typeof h.titulo === 'string' && h.titulo.trim())
    .map((h, i) => {
      const d = (h.ubicacion_detalle ?? {}) as Record<string, unknown>;
      const detalle: UbicacionDetallada = {
        pagina: parteDeUbicacion(d.pagina),
        capitulo: parteDeUbicacion(d.capitulo),
        numeral: parteDeUbicacion(d.numeral),
        literal: parteDeUbicacion(d.literal),
      };
      const conDetalle = Object.values(detalle).some((v) => v !== NO_CORRESPONDE);
      const severidad = (SEVERIDADES as readonly string[]).includes(String(h.severidad))
        ? (h.severidad as HallazgoDeAuditoria['severidad'])
        : 'medio';
      const solicitud = SOLICITUDES.includes(h.solicitud as Solicitud) ? (h.solicitud as Solicitud) : undefined;
      return {
        id: String(h.id || `hallazgo_${i + 1}`).slice(0, 80),
        categoria: String(h.categoria || 'otro'),
        severidad,
        titulo: String(h.titulo).trim(),
        ubicacion: conDetalle ? ubicacionEnUnaLinea(detalle) : String(h.ubicacion ?? '').trim() || ubicacionEnUnaLinea(detalle),
        ubicacion_detalle: detalle,
        extracto_literal: String(h.extracto_literal ?? ''),
        descripcion: String(h.descripcion ?? ''),
        recomendacion: String(h.recomendacion ?? ''),
        ...(solicitud ? { solicitud } : {}),
        terminos_clave: (Array.isArray(h.terminos_clave) ? h.terminos_clave : [])
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.replace(/["«»']/g, '').trim())
          .filter((t) => t.length >= 3 && t.split(/\s+/).length <= 5)
          .slice(0, 4),
        fundamento_normativo: Array.isArray(h.fundamento_normativo)
          ? (h.fundamento_normativo as Array<{ norma: string; articulo?: string }>).filter((f) => f && typeof f.norma === 'string')
          : [],
      };
    });
  const tipo = crudo.tipo_documento;
  return {
    tipo_documento: tipo === 'EETT' || tipo === 'MIXTO' ? tipo : 'TDR',
    objeto_inferido: String(crudo.objeto_inferido ?? ''),
    denominacion: typeof crudo.denominacion === 'string' ? crudo.denominacion.replace(/\s+/g, ' ').trim().slice(0, 400) : '',
    stats: contar(hallazgos),
    hallazgos,
  };
}

/**
 * ¿Es un servicio? Un TDR lo es; una consultoría de obra o una obra no
 * (ahí las obras similares son lo correcto), ni unas especificaciones
 * técnicas de bienes.
 */
function esServicio(a: AuditoriaDeRequerimiento, texto: string): boolean {
  const objeto = `${a.objeto_inferido} ${texto.slice(0, 4000)}`.toLowerCase();
  if (/consultor[ií]a\s+de\s+obras?|supervisi[óo]n\s+de\s+(?:la\s+)?obra|expediente\s+t[ée]cnico\s+de\s+obra|ejecuci[óo]n\s+de\s+(?:la\s+)?obra\b(?![^.]{0,60}similar)/.test(objeto.slice(0, 600))) {
    return false;
  }
  if (a.tipo_documento === 'EETT') return /\bservicio/.test(objeto.slice(0, 600));
  return true;
}

/**
 * ¿Se contrata un bien? Unas especificaciones técnicas, o un documento
 * cuyo objeto es una adquisición o un suministro, y no un servicio ni una
 * obra.
 */
export function esBien(a: Pick<AuditoriaDeRequerimiento, 'tipo_documento' | 'objeto_inferido'>, texto: string): boolean {
  if (a.tipo_documento === 'TDR') return false;
  const objeto = `${a.objeto_inferido ?? ''} ${texto.slice(0, 3000)}`.toLowerCase();
  if (/consultor[ií]a|ejecuci[óo]n\s+de\s+(?:la\s+)?obra|\bservicio\s+de\b|contrataci[óo]n\s+del\s+servicio/.test((a.objeto_inferido ?? '').toLowerCase())) return false;
  return a.tipo_documento === 'EETT' || /adquisici[óo]n|suministro|\bbienes\b|especificaciones\s+t[ée]cnicas/.test(objeto);
}

const contar = (hs: HallazgoDeAuditoria[]) => ({
  criticos: hs.filter((h) => h.severidad === 'critico').length,
  altos: hs.filter((h) => h.severidad === 'alto').length,
  medios: hs.filter((h) => h.severidad === 'medio').length,
  bajos: hs.filter((h) => h.severidad === 'bajo').length,
});

const ORDEN = { critico: 0, alto: 1, medio: 2, bajo: 3 } as const;

/** «literal i) … ; numeral 55.3 … ; bases estándar …» → filas de fundamento. */
function filasDeNorma(norma: string): Array<{ norma: string; articulo?: string }> {
  return norma
    .split(/\s*;\s*/)
    .filter(Boolean)
    .map((t) => ({ norma: t }));
}

export async function reforzarAuditoria(
  cliente: SupabaseClient,
  texto: string,
  auditoria: AuditoriaDeRequerimiento,
  alUsar?: (uso: { entrada: number; salida: number }) => void,
): Promise<AuditoriaDeRequerimiento> {
  let hallazgos = [...(auditoria.hallazgos ?? [])];

  // 1. Obras como servicios similares: control propio.
  if (esServicio(auditoria, texto)) {
    const encontradas = obrasComoSimilares(texto);
    if (encontradas.length > 0) {
      const precedentes = await precedentesEnLaBiblioteca(cliente).catch(() => []);
      const conDirectiva = precedentes.some((p) => /8067-2026|7146-2026/.test(p.numero));
      const norma = conDirectiva
        ? NORMA_OBRAS_COMO_SIMILARES
        : NORMA_OBRAS_COMO_SIMILARES.replace(/; numeral 6 de la Directiva[^;]*$/, '');
      const nuevos: HallazgoDeAuditoria[] = encontradas.map((o, i) => ({
        id: `obras_como_servicios_similares_${i + 1}`,
        origen: 'control',
        categoria: 'experiencia_restrictiva',
        severidad: 'critico',
        titulo: 'Se admiten obras como servicios similares en una contratación de servicios',
        ubicacion: 'Definición de servicios similares (experiencia del postor en la especialidad)',
        extracto_literal: o.frase.length > 600 ? `${o.frase.slice(0, 600)}…` : o.frase,
        descripcion: analisisObrasComoSimilares(o, precedentes),
        recomendacion:
          'Retirar la ejecución de obras de la definición de servicios similares y definirlos como servicios de la misma naturaleza que el objeto, acreditables con contratos u órdenes de servicio y su conformidad o constancia de prestación, o con comprobantes de pago, conforme a las bases estándar de servicios.',
        // En el orden de César: Ley, Reglamento, bases estándar, Tribunal,
        // OECE; la directiva, con «lo demás», al final.
        fundamento_normativo: [
          ...filasDeNorma(norma).filter((f) => !/directiva/i.test(f.norma)),
          ...precedentes.map((p) => ({ norma: p.numero, articulo: `${NOMBRE_DE_FUENTE[p.tipo]}: ${p.criterio}` })),
          ...filasDeNorma(norma).filter((f) => /directiva/i.test(f.norma)),
        ],
      }));
      // Lo que el auditor dijera sobre esa misma frase lo reemplaza el control.
      hallazgos = hallazgos.filter(
        (h) =>
          !(/\bobras?\b/i.test(`${h.titulo} ${h.extracto_literal}`) &&
            encontradas.some((o) => o.frase.includes(h.extracto_literal.slice(0, 50)) || h.extracto_literal.includes(o.expresion))),
      );
      hallazgos = [...nuevos, ...hallazgos];
    }
  }

  // 1b. Disponibilidad o stock del bien exigido para calificar o admitir
  // (documento 15 de César): control propio, como el de obras.
  if (esBien(auditoria, texto)) {
    const plano = aplanarBases(texto);
    const encontradas = disponibilidadDelBien(plano);
    if (encontradas.length > 0) {
      const precedentes = await precedentesDeDisponibilidad(cliente).catch(() => []);
      const nuevos: HallazgoDeAuditoria[] = encontradas.map((d, i) => ({
        id: `disponibilidad_del_bien_${i + 1}`,
        origen: 'control',
        categoria: 'requisito_no_previsto',
        severidad: 'critico',
        titulo:
          d.donde === 'calificacion'
            ? `Se exige acreditar la disponibilidad del bien como requisito de calificación («${d.requisito}»)`
            : 'Se exige acreditar la disponibilidad o el stock del bien para admitir la oferta',
        ubicacion: [
          d.numeral ? `Numeral ${d.numeral}` : '',
          d.literal ? `literal ${d.literal}` : '',
          d.donde === 'calificacion' ? `requisito de calificación «${d.requisito}»` : 'documentos para la admisión de la oferta',
        ]
          .filter(Boolean)
          .join(', '),
        extracto_literal: d.frase.length > 600 ? `${d.frase.slice(0, 600)}…` : d.frase,
        descripcion: analisisDeDisponibilidad(d, precedentes),
        recomendacion: correccionDeDisponibilidad(d),
        fundamento_normativo: [
          ...filasDeNorma(normaDeDisponibilidad(d)),
          ...precedentes.map((p) => ({ norma: p.numero, articulo: `${NOMBRE_DE_FUENTE[p.tipo]}: ${p.criterio}` })),
        ],
      }));
      // Lo que el auditor dijera sobre ese mismo requisito lo reemplaza el control.
      const tramos = encontradas.map((d) => plano.slice(d.inicio, d.hasta));
      hallazgos = hallazgos.filter(
        (h) =>
          !(TEMA_DISPONIBILIDAD.test(`${h.titulo} ${h.extracto_literal} ${h.descripcion}`) &&
            tramos.some((t) => {
              const cita = h.extracto_literal.replace(/\s+/g, ' ').replace(/…$/, '').trim().slice(0, 60);
              return cita.length >= 20 && t.includes(cita);
            })),
      );
      hallazgos = [...nuevos, ...hallazgos];
    }
  }

  // 2. La biblioteca para cada hallazgo.
  const fuentes = await fundamentarConLaBiblioteca(
    cliente,
    hallazgos
      // Lo del contraste por tema ya viene con sus precedentes.
      .filter((h) => !h.id.startsWith('obras_como_servicios_similares') && h.origen !== 'tema')
      .map((h) => ({
        id: h.id,
        titulo: h.titulo,
        texto: h.extracto_literal,
        analisis: h.descripcion,
        norma: (h.fundamento_normativo ?? []).map((f) => f.norma).join('; '),
        claves: h.terminos_clave,
      })),
    { contexto: auditoria.objeto_inferido, alUsar },
  ).catch(() => new Map<string, FuenteCitada[]>());
  for (const h of hallazgos) {
    const fs = fuentes.get(h.id) ?? [];
    if (fs.length === 0) continue;
    const ya = new Set((h.fundamento_normativo ?? []).map((f) => f.norma.toLowerCase()));
    const nuevas = fs
      .filter((f) => !ya.has(f.numero.toLowerCase()))
      .map((f) => ({
        norma: f.numero,
        articulo: `${NOMBRE_DE_FUENTE[f.tipo]}: ${f.criterio}`,
      }));
    h.fundamento_normativo = [...(h.fundamento_normativo ?? []), ...nuevas];
  }

  hallazgos.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
  return { ...auditoria, hallazgos, stats: contar(hallazgos) };
}
