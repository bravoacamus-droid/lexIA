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

/** La forma de un hallazgo de la auditoría (`process/route.ts`). */
export interface HallazgoDeAuditoria {
  id: string;
  categoria: string;
  severidad: 'critico' | 'alto' | 'medio' | 'bajo';
  titulo: string;
  ubicacion: string;
  extracto_literal: string;
  descripcion: string;
  recomendacion: string;
  fundamento_normativo?: Array<{ norma: string; articulo?: string }>;
}

export interface AuditoriaDeRequerimiento {
  tipo_documento: 'TDR' | 'EETT' | 'MIXTO';
  objeto_inferido: string;
  stats: { criticos: number; altos: number; medios: number; bajos: number };
  hallazgos: HallazgoDeAuditoria[];
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
      .filter((h) => !h.id.startsWith('obras_como_servicios_similares'))
      .map((h) => ({
        id: h.id,
        titulo: h.titulo,
        texto: h.extracto_literal,
        analisis: h.descripcion,
        norma: (h.fundamento_normativo ?? []).map((f) => f.norma).join('; '),
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
