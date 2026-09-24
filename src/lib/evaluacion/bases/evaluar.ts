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
import estandaresJson from './estandar.generado.json';
import { cotejarBases, identificarEstandar, prepararBases, type BasesEstandar, type ResultadoTexto } from './cotejo';
import { partirEnCapitulos, type CapituloEstandar } from './capitulos';
import { revisarCapitulo } from './revision';
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
export function hallazgosDeLaSeccionGeneral(cotejo: ResultadoTexto[]): HallazgoBases[] {
  const fuera = cotejo.filter((r) => r.fijo.s === 'general' && r.estado !== 'esta');
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
    return {
      id: `general-${i + 1}`,
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
  /** Para corregir la bases estándar elegida. */
  estandarId?: string;
  buscarSustento: BuscarSustento;
  buscarEnBiblioteca?: BuscarEnBiblioteca;
  alUsar?: (uso: { entrada: number; salida: number }) => void;
}

export async function evaluarBases(p: PeticionDeEvaluacion): Promise<ResultadoBases> {
  const b = prepararBases(p.texto);
  const ranking = identificarEstandar(b, ESTANDARES);
  const elegida = (p.estandarId && ranking.find((r) => r.estandar.id === p.estandarId)) || ranking[0];
  const estandar = elegida.estandar;

  const cotejo = cotejarBases(b, estandar);
  const general = cotejo.filter((r) => r.fijo.s === 'general');
  const deLaGeneral = hallazgosDeLaSeccionGeneral(cotejo);

  const capitulos = partirEnCapitulos(b, cotejo, await capitulosDe(estandar.id));
  // El Capítulo I son los datos del procedimiento: se revisa, pero no
  // hace falta un modelo para cada uno si viene vacío.
  const aRevisar = capitulos.filter((c) => c.bases.length > 400);
  const porCapitulo = await Promise.all(
    aRevisar.map((c) =>
      revisarCapitulo({
        capitulo: c,
        procedimiento: estandar.titulo,
        desdePdf: p.origen === 'pdf',
        buscarSustento: p.buscarSustento,
        buscarEnBiblioteca: p.buscarEnBiblioteca,
        alUsar: p.alUsar,
      }),
    ),
  );

  const hallazgos = [...deLaGeneral, ...porCapitulo.flat()].sort(
    (x, y) => (ORDEN[x.severidad] ?? 9) - (ORDEN[y.severidad] ?? 9),
  );
  const criticos = hallazgos.filter((h) => h.severidad === 'critico').length;
  const resumen =
    `Se cotejaron ${general.length} textos de la Sección General con las bases estándar de ${estandar.titulo}: ` +
    (deLaGeneral.length
      ? `${deLaGeneral.length} ${deLaGeneral.length === 1 ? 'tramo difiere' : 'tramos difieren'} del estándar. `
      : 'coinciden todos. ') +
    `En la sección específica se revisaron ${aRevisar.length} capítulos` +
    (hallazgos.length
      ? `, con ${hallazgos.length} ${hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'} en total${criticos ? ` (${criticos} ${criticos === 1 ? 'crítico' : 'críticos'})` : ''}.`
      : ' sin hallazgos.');

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
    capitulosRevisados: aRevisar.map((c) => `${c.rotulo} — ${c.titulo}`),
    hallazgos,
    resumen,
  };
}
