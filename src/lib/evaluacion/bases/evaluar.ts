/**
 * Evaluación de bases.
 *
 * César, en «Estructura de A-LexIA»: «Revisa las bases del procedimiento
 * para detectar omisiones, modificaciones indebidas, exigencias no
 * previstas por la normativa, restricciones injustificadas u otras
 * inconsistencias. Los proveedores pueden utilizar esta evaluación para
 * identificar aspectos susceptibles de consulta u observación antes de
 * su presentación a través del SEACE. Asimismo, los evaluadores pueden
 * utilizarla como filtro previo a la publicación de las bases».
 *
 * Dos pasadas, porque las dos mitades de unas bases se revisan distinto:
 *
 *   1. Sección General: el estándar dice que «no debe ser modificada en
 *      ningún extremo, bajo sanción de nulidad». Se coteja texto a texto,
 *      sin modelo: lo que falte o esté cambiado es una modificación
 *      indebida. Con las cuatro bases integradas de César: cero avisos,
 *      como debe ser.
 *   2. Sección específica: la llena la Entidad. Se revisa cada capítulo
 *      contra el mismo capítulo del estándar, con sus límites y sus
 *      instrucciones (`revision.ts`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import estandaresJson from './estandar.generado.json';
import {
  cotejarBases,
  identificarEstandar,
  prepararBases,
  type BasesEstandar,
  type BasesPreparadas,
  type ResultadoTexto,
} from './cotejo';
import { partirEnCapitulos, type CapituloDeLasBases, type CapituloEstandar } from './capitulos';
import { revisarCapitulo } from './revision';
import { paginasDeLasBases, ubicarEnCapitulo, type PaginasDeLasBases } from './ubicacion';
import { fundamentarConLaBiblioteca, normaEnJerarquia, ordenar, type FuenteCitada } from './biblioteca';
import {
  ESTANDARES_DE_SERVICIOS,
  NORMA_OBRAS_COMO_SIMILARES,
  analisisObrasComoSimilares,
  obrasComoSimilares,
  precedentesEnLaBiblioteca,
} from './similares-obras';
import {
  analisisDeDisponibilidad,
  correccionDeDisponibilidad,
  disponibilidadDelBien,
  normaDeDisponibilidad,
  precedentesDeDisponibilidad,
  solicitudDeDisponibilidad,
  TEMA_DISPONIBILIDAD,
} from './disponibilidad-del-bien';
import type { BuscarSustento } from '@/lib/evaluacion/mejora/sustento';
import type { BuscarEnBiblioteca } from '@/lib/normativa/citas';
import type { HallazgoBases, ResultadoBases } from './tipos';
import { capituloDelRequerimiento, contrastarLasBases, objetoDelEstandar, sumarAlaRevision } from './contraste-de-las-bases';

const ESTANDARES = estandaresJson as unknown as BasesEstandar[];

export function listaDeEstandares(): Array<{ id: string; titulo: string }> {
  return ESTANDARES.map((e) => ({ id: e.id, titulo: e.titulo }));
}

export async function capitulosDe(id: string): Promise<CapituloEstandar[]> {
  const m = (await import(`./capitulos/${id}.json`)) as { default: CapituloEstandar[] };
  return m.default;
}

/** «2.2.1.1 Documentos para la admisión» → «2.2.1.1». */
function numeralDe(apartado: string): string {
  return apartado.match(/^\d{1,2}(?:\.\d{1,2}){0,4}/)?.[0] ?? '';
}

/**
 * Lo que falta o cambió en la Sección General, agrupado: textos seguidos
 * del mismo apartado son un solo hallazgo.
 */
export function hallazgosDeLaSeccionGeneral(
  cotejo: ResultadoTexto[],
  ubicacion?: { b: BasesPreparadas; paginas?: PaginasDeLasBases },
): HallazgoBases[] {
  const fuera = cotejo.filter((r) => r.fijo.s === 'general' && r.estado !== 'esta');
  // Dónde cae cada texto del estándar en las bases. Lo omitido no tiene
  // posición: se ubica donde está el último texto anterior que sí se
  // encontró, que es donde debería estar.
  const caracterDe = (r: ResultadoTexto): number | null => {
    if (!ubicacion) return null;
    for (let i = cotejo.indexOf(r); i >= 0; i--) {
      const x = cotejo[i];
      if (x.posicion !== undefined && x.estado !== 'falta') return ubicacion.b.inicios[x.posicion] ?? null;
    }
    return null;
  };
  const grupos: ResultadoTexto[][] = [];
  for (const r of fuera) {
    const ultimo = grupos[grupos.length - 1];
    const previo = ultimo?.[ultimo.length - 1];
    if (previo && previo.fijo.a === r.fijo.a && r.fijo.p - previo.fijo.p <= 3) ultimo.push(r);
    else grupos.push([r]);
  }
  return grupos.map((g, i) => {
    const modificado = g.find((r) => r.estado === 'modificado');
    const apartado = g[0].fijo.a;
    const estandar = g.map((r) => r.fijo.t).join(' ');
    const caracter = caracterDe(modificado ?? g[0]);
    const u =
      ubicacion && caracter !== null
        ? ubicarEnCapitulo({
            hallazgo: { numeral: numeralDe(apartado), enLasBases: modificado?.enLasBases ?? '', titulo: '', analisis: '' },
            capitulo: ubicacion.b.texto,
            desde: 0,
            paginas: ubicacion.paginas,
            posicion: caracter,
          })
        : null;
    return {
      id: `general-${i + 1}`,
      ...(u?.literal ? { literal: u.literal } : {}),
      ...(u?.pagina ? { pagina: u.pagina } : {}),
      ...(u?.paginaArchivo ? { paginaArchivo: u.paginaArchivo } : {}),
      tipo: modificado ? 'modificacion_indebida' : 'omision',
      severidad: 'critico',
      titulo: modificado
        ? `Texto de la Sección General modificado${apartado ? ` (${apartado.slice(0, 80)})` : ''}`
        : `Texto de la Sección General omitido${apartado ? ` (${apartado.slice(0, 80)})` : ''}`,
      seccion: 'General',
      capitulo: `Sección General${apartado ? ` — ${apartado.slice(0, 80)}` : ''}`,
      numeral: numeralDe(apartado),
      enLasBases: modificado?.enLasBases ?? '',
      enElEstandar: estandar.length > 900 ? `${estandar.slice(0, 900)}…` : estandar,
      analisis: modificado
        ? 'Las bases estándar disponen que la Sección General «no debe ser modificada en ningún extremo, bajo sanción de nulidad». En las bases este texto figura con cambios respecto del estándar.'
        : 'Las bases estándar disponen que la Sección General «no debe ser modificada en ningún extremo, bajo sanción de nulidad». Este texto del estándar no figura en las bases.',
      norma: 'Bases estándar aprobadas por el OECE — Sección General',
      paraElProveedor: {
        tipo: 'observacion',
        solicitud: 'Se solicita que la Sección General de las bases recoja el texto de las bases estándar en su redacción original.',
      },
      paraLaEntidad: 'Restituir el texto de la Sección General tal como figura en las bases estándar.',
      origen: 'cotejo',
      avisos: [],
    };
  });
}

const ORDEN: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 };

export interface PeticionDeEvaluacion {
  texto: string;
  origen: 'docx' | 'pdf';
  /** El texto de cada página (`leer.ts`); `texto` es su unión con «\n». */
  textoPaginas?: string[];
  /** El número impreso de cada página. */
  folios?: Array<number | null>;
  /** Páginas escaneadas transcritas y las que no se pudieron leer. */
  transcritas?: number[];
  ilegibles?: number[];
  /** Para corregir la bases estándar elegida. */
  estandarId?: string;
  buscarSustento: BuscarSustento;
  buscarEnBiblioteca?: BuscarEnBiblioteca;
  /**
   * Para consultar la biblioteca (resoluciones, Sala Plena, opiniones,
   * pronunciamientos). Sin él, las observaciones solo citan lo que ya
   * traían.
   */
  cliente?: SupabaseClient;
  alUsar?: (uso: { entrada: number; salida: number }) => void;
}

/** El capítulo que contiene una posición del texto preparado. */
function capituloEn(capitulos: CapituloDeLasBases[], caracter: number): CapituloDeLasBases | null {
  return capitulos.find((c) => caracter >= c.desde && caracter < c.desde + c.bases.length) ?? null;
}

/** ¿Se solapan dos tramos? */
const solapan = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

/**
 * El control de obras como servicios similares (`similares-obras.ts`).
 */
export async function controlDeObrasComoSimilares(
  b: BasesPreparadas,
  capitulos: CapituloDeLasBases[],
  paginas: PaginasDeLasBases | undefined,
  cliente: SupabaseClient | undefined,
): Promise<HallazgoBases[]> {
  const encontradas = obrasComoSimilares(b.texto);
  if (encontradas.length === 0) return [];
  const precedentes = cliente ? await precedentesEnLaBiblioteca(cliente).catch(() => [] as FuenteCitada[]) : [];
  // El numeral 6 de la Directiva N.° 0005-2025-EF/54.01 lo citan la 8067 y
  // la 7146: si ninguna está en la biblioteca, no se cita.
  const conDirectiva = precedentes.some((p) => /8067-2026|7146-2026/.test(p.numero));
  const norma = conDirectiva
    ? NORMA_OBRAS_COMO_SIMILARES
    : NORMA_OBRAS_COMO_SIMILARES.replace(/; numeral 6 de la Directiva[^;]*$/, '');
  return encontradas.map((o, i): HallazgoBases => {
    const cap = capituloEn(capitulos, o.inicio);
    const u = ubicarEnCapitulo({
      hallazgo: { numeral: '', enLasBases: o.frase, titulo: '', analisis: '' },
      capitulo: cap?.bases ?? b.texto,
      desde: cap?.desde ?? 0,
      paginas,
      posicion: o.inicio - (cap?.desde ?? 0),
    });
    return {
      id: `control-obras-${i + 1}`,
      tipo: 'modificacion_indebida',
      severidad: 'critico',
      titulo: 'Se admiten obras como servicios similares en una contratación de servicios',
      seccion: 'Específica',
      capitulo: cap ? `${cap.rotulo} — ${cap.titulo}` : 'Sección Específica',
      numeral: u.numeral,
      ...(u.literal ? { literal: u.literal } : {}),
      ...(u.pagina ? { pagina: u.pagina } : {}),
      ...(u.paginaArchivo ? { paginaArchivo: u.paginaArchivo } : {}),
      enLasBases: o.frase,
      enElEstandar:
        'El postor debe acreditar un monto facturado acumulado […] por la contratación de servicios iguales o similares al objeto de la convocatoria […]. Se consideran servicios similares a los siguientes [CONSIGNAR LOS SERVICIOS SIMILARES AL OBJETO CONVOCADO].',
      analisis: analisisObrasComoSimilares(o, precedentes),
      norma,
      fuentes: ordenar(precedentes),
      paraElProveedor: {
        tipo: 'observacion',
        solicitud:
          'Se solicita retirar de la definición de servicios similares la ejecución de obras y limitarla a servicios iguales o similares al objeto de la convocatoria, acreditables con contratos u órdenes de servicio y su conformidad o constancia de prestación, o con comprobantes de pago, conforme a las bases estándar.',
      },
      paraLaEntidad:
        'Retirar las obras de la definición de servicios similares y definirlos como servicios de la misma naturaleza que el objeto convocado, con los medios de acreditación de las bases estándar de servicios. Mantenerlas expone el procedimiento a la nulidad.',
      origen: 'control',
      avisos: [],
    };
  });
}

/**
 * Lo que la revisión del modelo dijo sobre un tramo que ya cubre un
 * control propio, y del mismo tema, se descarta: el control trae la norma
 * y los precedentes, y no mezcla lo que sí puede pedirse.
 */
export function sinLoQueCubrenLosControles(
  hallazgos: HallazgoBases[],
  controles: Array<{ tramo: [number, number]; tema: RegExp }>,
  texto: string,
): HallazgoBases[] {
  return hallazgos.filter((h) => {
    if (!h.enLasBases) return true;
    const o = texto.indexOf(h.enLasBases.slice(0, 80));
    if (o < 0) return true;
    return !controles.some(
      (c) => c.tema.test(`${h.enLasBases} ${h.titulo} ${h.analisis}`) && solapan(c.tramo, [o, o + h.enLasBases.length]),
    );
  });
}

/** Bases estándar de bienes: ahí el objeto del contrato es siempre un bien. */
const ESTANDARES_DE_BIENES = new Set(['be-1', 'be-2', 'be-3', 'be-4']);
/** Las que sirven para bienes o para servicios (SIE, comparación de precios, no competitivo). */
const ESTANDARES_MIXTOS = new Set(['be-17', 'be-18', 'be-19']);

/** ¿El objeto de estas bases es un bien? */
export function contrataUnBien(estandarId: string, texto: string): boolean {
  if (ESTANDARES_DE_BIENES.has(estandarId)) return true;
  if (!ESTANDARES_MIXTOS.has(estandarId)) return false;
  const inicio = texto.slice(0, 20_000);
  return /\b(?:adquisici[oó]n|suministro)\s+de\b|contrataci[oó]n\s+de\s+bienes|\bbienes\s+comunes\b/i.test(inicio) &&
    !/contrataci[oó]n\s+del?\s+servicio|servicio\s+de\s+(?!transporte\s+de\s+bienes)/i.test(inicio.slice(0, 4000));
}

/** Lo que dice el estándar de la capacidad legal o de la admisión, sacado de sus capítulos. */
function estandarDeDisponibilidad(capitulos: CapituloDeLasBases[], donde: 'calificacion' | 'admision'): string {
  const todo = capitulos.map((c) => c.estandar).join('\n');
  if (donde === 'admision') {
    const m = todo.match(/En este literal no debe exigirse ningún documento vinculado a los requisitos de calificación[^⟧]*/);
    return m ? `Documentos para la admisión de la oferta — instrucción para la Entidad: «${m[0].trim()}»` : 'Documentos para la admisión de la oferta: solo los previstos en las bases estándar.';
  }
  const requisito = todo.match(/CAPACIDAD LEGAL\s+Requisitos:\s*(\[[^\]]+\])/);
  const instruccion = todo.match(/El requisito de capacidad legal únicamente es obligatorio[^⟧]*/);
  return (
    `CAPACIDAD LEGAL — Requisitos: ${requisito?.[1] ?? '[INCLUIR DE SER EL CASO, REQUISITOS RELACIONADOS A LA HABILITACIÓN PARA LLEVAR A CABO LA ACTIVIDAD ECONÓMICA MATERIA DE LA CONTRATACIÓN, CONFORME A LA NORMATIVA QUE REGULE EL OBJETO CONTRACTUAL]'}` +
    (instruccion ? ` Instrucción para la Entidad: «${instruccion[0].trim()}»` : '')
  );
}

/**
 * El control de la disponibilidad o stock del bien exigido para calificar
 * o admitir la oferta (`disponibilidad-del-bien.ts`, documento 15 de
 * César).
 */
export async function controlDeDisponibilidadDelBien(
  b: BasesPreparadas,
  capitulos: CapituloDeLasBases[],
  paginas: PaginasDeLasBases | undefined,
  cliente: SupabaseClient | undefined,
  procedimiento: string,
): Promise<Array<HallazgoBases & { tramo: [number, number] }>> {
  const encontradas = disponibilidadDelBien(b.texto);
  if (encontradas.length === 0) return [];
  const precedentes = cliente ? await precedentesDeDisponibilidad(cliente).catch(() => [] as FuenteCitada[]) : [];
  const sinEquipamiento = !capitulos.some((c) => /EQUIPAMIENTO ESTRAT[ÉE]GICO/.test(c.estandar));
  return encontradas.map((d, i) => {
    const cap = capituloEn(capitulos, d.inicio);
    const u = ubicarEnCapitulo({
      hallazgo: { numeral: d.numeral, literal: d.literal, enLasBases: d.frase, titulo: '', analisis: '' },
      capitulo: cap?.bases ?? b.texto,
      desde: cap?.desde ?? 0,
      paginas,
      posicion: d.inicio - (cap?.desde ?? 0),
    });
    const literal = d.literal || u.literal;
    return {
      id: `control-disponibilidad-${i + 1}`,
      tipo: 'exigencia_no_prevista',
      severidad: 'critico',
      titulo:
        d.donde === 'calificacion'
          ? `Se exige acreditar la disponibilidad del bien objeto de la contratación como requisito de calificación («${d.requisito}»)`
          : 'Se exige acreditar la disponibilidad o el stock del bien para la admisión de la oferta',
      seccion: 'Específica',
      capitulo: cap ? `${cap.rotulo} — ${cap.titulo}` : 'Sección Específica',
      numeral: d.numeral || u.numeral,
      ...(literal ? { literal } : {}),
      ...(u.pagina ? { pagina: u.pagina } : {}),
      ...(u.paginaArchivo ? { paginaArchivo: u.paginaArchivo } : {}),
      enLasBases: d.frase,
      enElEstandar: estandarDeDisponibilidad(capitulos, d.donde),
      analisis: analisisDeDisponibilidad({ ...d, literal }, precedentes, { sinEquipamiento }),
      norma: normaDeDisponibilidad(d, procedimiento),
      fuentes: ordenar(precedentes),
      paraElProveedor: { tipo: 'observacion', solicitud: solicitudDeDisponibilidad(d) },
      paraLaEntidad: correccionDeDisponibilidad(d),
      origen: 'control',
      avisos: [],
      tramo: [d.inicio, d.hasta],
    };
  });
}

export async function evaluarBases(p: PeticionDeEvaluacion): Promise<ResultadoBases> {
  const b = prepararBases(p.texto);
  const ranking = identificarEstandar(b, ESTANDARES);
  const elegida = (p.estandarId && ranking.find((r) => r.estandar.id === p.estandarId)) || ranking[0];
  const estandar = elegida.estandar;
  // Las páginas solo valen si el texto es exactamente su unión: así lo
  // arma `leer.ts`, y así una posición del texto dice su página.
  const paginas =
    p.textoPaginas && p.textoPaginas.join('\n') === p.texto
      ? paginasDeLasBases(p.textoPaginas, p.folios)
      : undefined;

  const cotejo = cotejarBases(b, estandar);
  const general = cotejo.filter((r) => r.fijo.s === 'general');
  const deLaGeneral = hallazgosDeLaSeccionGeneral(cotejo, { b, paginas });

  const capitulos = partirEnCapitulos(b, cotejo, await capitulosDe(estandar.id));
  // El Capítulo I son los datos del procedimiento: se revisa, pero no
  // hace falta un modelo para cada uno si viene vacío.
  const aRevisar = capitulos.filter((c) => c.bases.length > 400);
  // En paralelo con la revisión: el Capítulo III (el requerimiento) contra
  // la biblioteca, tema por tema (Fase 1, reunión con César del 27/11/2026).
  const capReq = capituloDelRequerimiento(capitulos);
  const contraste =
    p.cliente && capReq && capReq.bases.length > 400
      ? contrastarLasBases({
          cliente: p.cliente,
          capitulo: capReq,
          objeto: objetoDelEstandar(estandar.id, contrataUnBien(estandar.id, b.texto)),
          paginas,
          alUsar: p.alUsar,
        }).catch((e) => {
          console.error('[bases] contraste por tema falló:', (e as Error).message);
          return { hallazgos: [] as HallazgoBases[], temas: 0 };
        })
      : Promise.resolve({ hallazgos: [] as HallazgoBases[], temas: 0 });
  const revisiones = await Promise.allSettled(
    aRevisar.map((c) =>
      revisarCapitulo({
        capitulo: c,
        procedimiento: estandar.titulo,
        desdePdf: p.origen === 'pdf',
        buscarSustento: p.buscarSustento,
        buscarEnBiblioteca: p.buscarEnBiblioteca,
        alUsar: p.alUsar,
        paginas,
      }),
    ),
  );
  const porCapitulo = revisiones.map((r) => (r.status === 'fulfilled' ? r.value : []));
  const sinRevisar = aRevisar.filter((_, i) => revisiones[i].status === 'rejected').map((c) => c.rotulo);
  // Si no se pudo revisar ningún capítulo, no hay evaluación que dar.
  if (aRevisar.length > 0 && sinRevisar.length === aRevisar.length) {
    throw new Error('No se pudo revisar la sección específica con el modelo. Vuelve a intentarlo en unos minutos.');
  }

  // Obras como servicios similares: un control propio, no el criterio del
  // modelo. Lo que la revisión haya dicho sobre esa misma frase se
  // reemplaza por el control, que trae los precedentes.
  const deObras = ESTANDARES_DE_SERVICIOS.has(estandar.id)
    ? await controlDeObrasComoSimilares(b, capitulos, paginas, p.cliente)
    : [];
  // La disponibilidad o el stock del bien exigido para calificar o admitir
  // (documento 15 de César): mismo trato. La revisión del modelo lo veía a
  // veces, mezclado con la habilitación, que sí puede pedirse.
  const deDisponibilidad = contrataUnBien(estandar.id, b.texto)
    ? await controlDeDisponibilidadDelBien(b, capitulos, paginas, p.cliente, estandar.titulo)
    : [];
  const controles: Array<{ tramo: [number, number]; tema: RegExp }> = [
    ...deObras
      .map((h) => {
        const o = b.texto.indexOf(h.enLasBases.slice(0, 80));
        return { tramo: [o, o + h.enLasBases.length] as [number, number], tema: /\bobras?\b/i };
      })
      .filter((c) => c.tramo[0] >= 0),
    ...deDisponibilidad.map((h) => ({ tramo: h.tramo, tema: TEMA_DISPONIBILIDAD })),
  ];
  const delContraste = await contraste;
  const deLaRevision = sinLoQueCubrenLosControles(sumarAlaRevision(porCapitulo.flat(), delContraste.hallazgos), controles, b.texto);
  const deControl: HallazgoBases[] = [...deObras, ...deDisponibilidad.map(({ tramo: _tramo, ...h }) => h)];

  const hallazgos = [...deLaGeneral, ...deControl, ...deLaRevision].sort(
    (x, y) => (ORDEN[x.severidad] ?? 9) - (ORDEN[y.severidad] ?? 9),
  );

  if (p.cliente) await conLaBiblioteca(p.cliente, hallazgos, estandar.titulo, p.alUsar);
  const criticos = hallazgos.filter((h) => h.severidad === 'critico').length;
  const resumen =
    `Se cotejaron ${general.length} textos de la Sección General con las bases estándar de ${estandar.titulo}: ` +
    (deLaGeneral.length
      ? `${deLaGeneral.length} ${deLaGeneral.length === 1 ? 'tramo difiere' : 'tramos difieren'} del estándar. `
      : 'coinciden todos. ') +
    `En la sección específica se revisaron ${aRevisar.length - sinRevisar.length} capítulos` +
    (hallazgos.length
      ? `, con ${hallazgos.length} ${hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'} en total${criticos ? ` (${criticos} ${criticos === 1 ? 'crítico' : 'críticos'})` : ''}.`
      : ' sin hallazgos.') +
    (sinRevisar.length
      ? ` No se pudo revisar con el modelo: ${sinRevisar.join(', ')}. Vuelve a evaluar para completarlo.`
      : '');

  return {
    generadoEn: new Date().toISOString(),
    origen: p.origen,
    estandar: { id: estandar.id, titulo: estandar.titulo, parecido: elegida.parecido },
    alternativas: ranking
      .filter((r) => r.estandar.id !== estandar.id)
      .slice(0, 3)
      .map((r) => ({ id: r.estandar.id, titulo: r.estandar.titulo, parecido: r.parecido })),
    seccionGeneral: {
      textos: general.length,
      modificados: general.filter((r) => r.estado === 'modificado').length,
      faltan: general.filter((r) => r.estado === 'falta').length,
    },
    capitulosRevisados: aRevisar.filter((c) => !sinRevisar.includes(c.rotulo)).map((c) => `${c.rotulo} — ${c.titulo}`),
    hallazgos,
    resumen:
      resumen +
      (p.transcritas?.length
        ? ` ${p.transcritas.length} ${p.transcritas.length === 1 ? 'página venía escaneada y se leyó' : 'páginas venían escaneadas y se leyeron'} transcribiendo la imagen.`
        : '') +
      (p.ilegibles?.length
        ? ` No se pudieron leer ${p.ilegibles.length === 1 ? 'la página' : 'las páginas'} ${p.ilegibles.join(', ')}: lo que digan no se revisó.`
        : ''),
    paginacion: !paginas ? 'sin_paginas' : paginas.folios.some((f) => f !== null) ? 'impresa' : 'archivo',
    ...(p.transcritas?.length ? { transcritas: p.transcritas } : {}),
    ...(p.ilegibles?.length ? { ilegibles: p.ilegibles } : {}),
  };
}

/**
 * Numeral, literal y página para los hallazgos de una evaluación hecha
 * antes de que existieran esas columnas (antes del 16/10/2026).
 *
 * Sin modelo: se vuelven a preparar las mismas bases, a cotejar con el
 * mismo estándar y a partir en los mismos capítulos —todo determinista—,
 * y cada cita se busca en su capítulo. Así el pliego que César arme
 * desde la evaluación de la LP de reactivos que ya tenía sale con
 * «Literal» y «Página» sin tener que evaluar de nuevo.
 */
export async function ubicarHallazgosGuardados(
  resultado: ResultadoBases,
  lectura: Pick<PeticionDeEvaluacion, 'texto' | 'textoPaginas' | 'folios'>,
): Promise<HallazgoBases[]> {
  const estandar = ESTANDARES.find((e) => e.id === resultado.estandar.id);
  if (!estandar) return resultado.hallazgos;
  const b = prepararBases(lectura.texto);
  const paginas =
    lectura.textoPaginas && lectura.textoPaginas.join('\n') === lectura.texto
      ? paginasDeLasBases(lectura.textoPaginas, lectura.folios)
      : undefined;
  const cotejo = cotejarBases(b, estandar);
  const generales = new Map(hallazgosDeLaSeccionGeneral(cotejo, { b, paginas }).map((h) => [h.id, h]));
  const capitulos = partirEnCapitulos(b, cotejo, await capitulosDe(estandar.id));
  return resultado.hallazgos.map((h) => {
    if (h.pagina || h.literal) return h;
    if (h.origen === 'cotejo') {
      const g = generales.get(h.id);
      return g ? { ...h, literal: g.literal ?? '', pagina: g.pagina, paginaArchivo: g.paginaArchivo } : h;
    }
    // Por el rótulo exacto: «CAPÍTULO II —» también empieza por «CAPÍTULO I».
    const rotulo = h.capitulo.split(' — ')[0].trim();
    const cap = capitulos.find((c) => c.rotulo === rotulo) ?? capituloConLaCita(capitulos, h.enLasBases);
    if (!cap) return h;
    const u = ubicarEnCapitulo({ hallazgo: h, capitulo: cap.bases, desde: cap.desde, paginas });
    return {
      ...h,
      numeral: u.numeral,
      literal: u.literal,
      ...(u.pagina ? { pagina: u.pagina } : {}),
      ...(u.paginaArchivo ? { paginaArchivo: u.paginaArchivo } : {}),
    };
  });
}

function capituloConLaCita(capitulos: CapituloDeLasBases[], cita: string): CapituloDeLasBases | null {
  if (!cita) return null;
  const inicio = cita.replace(/\s+/g, ' ').slice(0, 60);
  return capitulos.find((c) => c.bases.includes(inicio)) ?? null;
}

/**
 * La biblioteca para cada observación (`biblioteca.ts`), y la columna de
 * la norma reordenada con lo que traiga.
 *
 * Los textos de la Sección General que difieren del estándar son todos el
 * mismo problema —la Sección General no se puede modificar—: se busca una
 * sola vez para todos.
 */
async function conLaBiblioteca(
  cliente: SupabaseClient,
  hallazgos: HallazgoBases[],
  procedimiento: string,
  alUsar?: (uso: { entrada: number; salida: number }) => void,
): Promise<void> {
  const observaciones = hallazgos.filter((h) => h.paraElProveedor.tipo === 'observacion');
  const generales = observaciones.filter((h) => h.origen === 'cotejo');
  const problemas = observaciones
    // Lo que trajo el contraste por tema ya viene con sus precedentes.
    .filter((h) => h.origen !== 'cotejo' && !(h.id.startsWith('tema-') && h.fuentes?.length))
    .map((h) => ({
      id: h.id,
      titulo: h.titulo,
      texto: h.enLasBases,
      analisis: h.analisis,
      norma: [h.norma, ...(h.fuentes ?? []).map((f) => f.numero)].join('; '),
      claves: h.terminosClave,
    }));
  if (generales.length > 0) {
    problemas.push({
      id: 'seccion-general',
      titulo: 'Modificación u omisión de textos de la Sección General de las bases estándar',
      texto: generales
        .map((h) => h.enLasBases)
        .filter(Boolean)
        .join(' … ')
        .slice(0, 600),
      claves: ['sección general', 'bases estándar'],
      analisis:
        'Las bases estándar disponen que la Sección General no debe ser modificada en ningún extremo, bajo sanción de nulidad. Las bases del procedimiento cambian u omiten textos de esa sección. Uso obligatorio de las bases estándar.',
      norma: generales[0].norma,
    });
  }
  const fuentes = await fundamentarConLaBiblioteca(cliente, problemas, { contexto: procedimiento, alUsar });
  for (const h of observaciones) {
    const nuevas = fuentes.get(h.origen === 'cotejo' ? 'seccion-general' : h.id) ?? [];
    const ya = new Set((h.fuentes ?? []).map((f) => f.numero));
    const todas = ordenar([...(h.fuentes ?? []), ...nuevas.filter((f) => !ya.has(f.numero))]);
    if (todas.length === 0) continue;
    h.fuentes = todas;
    h.norma = normaEnJerarquia(h.norma, todas);
  }
}
