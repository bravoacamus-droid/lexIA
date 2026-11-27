/**
 * El contraste por tema con la biblioteca (Fase 1), aplicado a las bases.
 *
 * POR QUÉ (reunión con César del 27/11/2026)
 *
 * La revisión de las bases es por capítulo, contra el estándar y su lista
 * de comprobación, y la biblioteca solo llegaba después, a sustentar lo que
 * la revisión ya había observado. El Capítulo III de las bases es el
 * requerimiento: el mismo contraste tema por tema del evaluador de
 * requerimientos (`requerimiento/contrastar.ts`) corre sobre él, en
 * paralelo con la revisión, y:
 *   · si observa lo mismo que la revisión, a la observación de la revisión
 *     se le suman sus precedentes (y la severidad mayor de las dos);
 *   · si observa algo que la revisión no vio, entra como hallazgo nuevo.
 * Numeral, literal y página salen del texto de las bases, como en la
 * revisión (`ubicarEnCapitulo`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { contrastarPorTema } from '@/lib/evaluacion/requerimiento/contrastar';
import type { ObjetoDeContratacion } from '@/lib/evaluacion/requerimiento/comprobaciones';
import type { HallazgoDeAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import type { CapituloDeLasBases } from './capitulos';
import type { HallazgoBases, TipoHallazgoBases } from './tipos';
import { ubicarEnCapitulo, type PaginasDeLasBases } from './ubicacion';
import { mismoHallazgo } from './revision';

const ESTANDARES_DE_BIENES = new Set(['be-1', 'be-2', 'be-3', 'be-4']);
const DE_OBRAS = new Set(['be-5', 'be-6']);
const DE_CONSULTORIA_DE_OBRAS = new Set(['be-7', 'be-12', 'be-13']);
const DE_SERVICIOS = new Set(['be-8', 'be-9', 'be-10', 'be-11', 'be-14', 'be-15', 'be-16']);

export function objetoDelEstandar(estandarId: string, contrataUnBien: boolean): ObjetoDeContratacion {
  if (ESTANDARES_DE_BIENES.has(estandarId)) return 'bienes';
  if (DE_OBRAS.has(estandarId)) return 'obras';
  if (DE_CONSULTORIA_DE_OBRAS.has(estandarId)) return 'consultoria_obras';
  if (DE_SERVICIOS.has(estandarId)) return 'servicios';
  return contrataUnBien ? 'bienes' : 'servicios';
}

const TIPO_POR_TEMA: Record<string, TipoHallazgoBases> = {
  direccionamiento_marca: 'restriccion_injustificada',
  experiencia_restrictiva: 'restriccion_injustificada',
  personal_desproporcionado: 'restriccion_injustificada',
  equipamiento_restrictivo: 'restriccion_injustificada',
};

function comoHallazgoDeBases(h: HallazgoDeAuditoria, c: CapituloDeLasBases, paginas?: PaginasDeLasBases): HallazgoBases {
  const omision = h.extracto_literal.startsWith('(omisión)');
  const enLasBases = omision ? '' : h.extracto_literal.replace(/…$/, '').trim();
  const base: HallazgoBases = {
    id: `tema-${h.id.replace(/^tema_/, '').replace(/_/g, '-')}`,
    terminosClave: h.terminos_clave,
    tipo: omision ? 'omision' : TIPO_POR_TEMA[h.categoria] ?? (h.categoria === 'otro' ? 'exigencia_no_prevista' : 'inconsistencia'),
    severidad: h.severidad,
    titulo: h.titulo,
    seccion: 'Específica',
    capitulo: `${c.rotulo} — ${c.titulo}`,
    numeral: '',
    enLasBases,
    analisis: h.descripcion,
    norma: (h.fundamento_normativo ?? [])
      .filter((f) => !f.articulo)
      .map((f) => f.norma)
      .join('; '),
    fuentes: h.fuentes ?? [],
    paraElProveedor: { tipo: 'observacion', solicitud: h.recomendacion },
    paraLaEntidad: h.recomendacion,
    origen: 'revision',
    avisos: [],
  };
  if (enLasBases) {
    const u = ubicarEnCapitulo({ hallazgo: { ...base, literal: '' }, capitulo: c.bases, desde: c.desde, paginas });
    base.numeral = u.numeral;
    base.literal = u.literal;
    if (u.pagina) base.pagina = u.pagina;
    if (u.paginaArchivo) base.paginaArchivo = u.paginaArchivo;
  }
  return base;
}

/** El capítulo del requerimiento: «Capítulo III — Requerimiento», o el que lo diga. */
export function capituloDelRequerimiento(capitulos: CapituloDeLasBases[]): CapituloDeLasBases | undefined {
  return capitulos.find((c) => /requerimiento/i.test(c.titulo)) ?? capitulos.find((c) => c.numero === 3);
}

export async function contrastarLasBases(args: {
  cliente: SupabaseClient;
  capitulo: CapituloDeLasBases;
  objeto: ObjetoDeContratacion;
  paginas?: PaginasDeLasBases;
  alUsar?: (u: { entrada: number; salida: number }) => void;
}): Promise<{ hallazgos: HallazgoBases[]; temas: number }> {
  const r = await contrastarPorTema(
    args.cliente,
    args.capitulo.bases,
    { regimen: 'seleccion', objeto: args.objeto, conPaginas: false },
    { alUsar: args.alUsar },
  );
  return {
    hallazgos: r.hallazgos.map((h) => comoHallazgoDeBases(h, args.capitulo, args.paginas)),
    temas: r.cobertura.filter((c) => !c.error).length,
  };
}

/**
 * Lo del contraste se suma a la revisión: si es el mismo punto, la
 * observación de la revisión (que trae el cotejo con el estándar) se queda
 * y recibe los precedentes; si no, entra como hallazgo propio.
 */
export function sumarAlaRevision(revision: HallazgoBases[], delContraste: HallazgoBases[]): HallazgoBases[] {
  const PESO = { critico: 0, alto: 1, medio: 2, bajo: 3 } as const;
  const deLaRevision = revision.map((h) => ({ ...h }));
  const nuevos: HallazgoBases[] = [];
  for (const t of delContraste) {
    // Solo contra la revisión: dos temas del contraste nunca son el mismo
    // punto. Una omisión no tiene cita: se junta solo con otra omisión del
    // mismo tema (la prueba juntaba «conformidad» con «forma de pago» por
    // el parecido de sus títulos).
    const igual = deLaRevision.find((h) =>
      t.enLasBases
        ? mismoHallazgo(h, t)
        : h.tipo === 'omision' && !!h.terminosClave?.some((k) => t.terminosClave?.includes(k)),
    );
    if (!igual) {
      nuevos.push(t);
      continue;
    }
    if (t.fuentes?.length) {
      const ya = new Set((igual.fuentes ?? []).map((f) => f.numero));
      igual.fuentes = [...(igual.fuentes ?? []), ...t.fuentes.filter((f) => !ya.has(f.numero))];
    }
    if (PESO[t.severidad] < PESO[igual.severidad]) igual.severidad = t.severidad;
  }
  return [...deLaRevision, ...nuevos];
}
