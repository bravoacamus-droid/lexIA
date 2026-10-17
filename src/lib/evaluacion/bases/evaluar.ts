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
import type { BuscarSustento } from '@/lib/evaluacion/mejora/sustento';
import type { BuscarEnBiblioteca } from '@/lib/normativa/citas';
import type { HallazgoBases, ResultadoBases } from './tipos';

const ESTANDARES = estandaresJson as unknown as BasesEstandar[];

export function listaDeEstandares(): Array<{ id: string; titulo: string }> {
  return ESTANDARES.map((e) => ({ id: e.id, titulo: e.titulo }));
}

async function capitulosDe(id: string): Promise<CapituloEstandar[]> {
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
  const deControl = ESTANDARES_DE_SERVICIOS.has(estandar.id)
    ? await controlDeObrasComoSimilares(b, capitulos, paginas, p.cliente)
    : [];
  const tramosDeControl = deControl
    .map((h): [number, number] => {
      const o = b.texto.indexOf(h.enLasBases.slice(0, 80));
      return [o, o + h.enLasBases.length];
    })
    .filter((t) => t[0] >= 0);
  const deLaRevision = porCapitulo.flat().filter((h) => {
    if (!h.enLasBases || !/\bobras?\b/i.test(`${h.enLasBases} ${h.titulo}`)) return true;
    const o = b.texto.indexOf(h.enLasBases.slice(0, 80));
    return o < 0 || !tramosDeControl.some((t) => solapan(t, [o, o + h.enLasBases.length]));
  });

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
    .filter((h) => h.origen !== 'cotejo')
    .map((h) => ({
      id: h.id,
      titulo: h.titulo,
      texto: h.enLasBases,
      analisis: h.analisis,
      norma: [h.norma, ...(h.fuentes ?? []).map((f) => f.numero)].join('; '),
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
