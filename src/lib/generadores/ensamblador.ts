/**
 * Ensamblador de requerimientos.
 *
 * Toma una plantilla codificada (ver plantilla-tipos.ts) más las
 * respuestas del usuario y produce el documento en Markdown, que el
 * exportador existente (docx-from-markdown.ts) convierte a Word.
 *
 * EL ENSAMBLADOR NO REDACTA. Recorre la plantilla en orden y decide, por
 * el tipo de cada bloque, si copia texto invariable, sustituye un dato o
 * inserta una redacción ya producida. Esto es deliberado: si el armado
 * dependiera del modelo, la cláusula antisoborno y los párrafos de
 * acreditación saldrían distintos en cada generación. El modelo redacta
 * solo los bloques `redactado`, y lo hace antes, fuera de aquí.
 *
 * Tres garantías que ofrece:
 *
 *  1. Nada se emite en silencio. Un dato obligatorio sin respuesta
 *     aparece como [PENDIENTE: …] en el documento y en `faltantes`. Es
 *     preferible un documento que enseña sus huecos a uno que los
 *     disimula.
 *  2. Las secciones condicionales se omiten enteras si no aplican, en
 *     vez de quedar como títulos vacíos.
 *  3. Los topes normativos de la plantilla se verifican contra la
 *     cuantía y se devuelven como avisos.
 */
import type {
  PlantillaRequerimiento,
  Seccion,
  Bloque,
  BloqueCampo,
} from './plantilla-tipos';
import { z } from 'zod';

export interface RespuestasRequerimiento {
  /** id de campo → valor que escribió el usuario. */
  campos: Record<string, string>;
  /** id de bloque redactado → texto producido por el modelo. */
  redacciones: Record<string, string>;
  /** id de bloque de opción → `valor` de la alternativa elegida. */
  opciones: Record<string, string>;
  /** id de tabla → filas (sin la cabecera). */
  tablas: Record<string, string[][]>;
  /**
   * Cuadros repetidos, cada uno con su título.
   *
   * Para las características técnicas: el formato pone un cuadro por
   * bien —"Bien N.° 01: XYZ" y debajo su tabla— y LexIA tenía uno solo.
   * Observación de César de agosto de 2026.
   *
   * El PRIMER cuadro sigue viviendo en `tablas`, sin título, para no
   * romper lo que ya haya guardado ninguna entidad: aquí van los que se
   * añaden después. Un requerimiento de un solo bien no cambia en nada.
   */
  gruposTabla: Record<string, Array<{ titulo: string; filas: string[][] }>>;
  /**
   * En qué orden van las subsecciones dentro de cada apartado.
   *
   * id de la sección madre → ids de sus hijas, en el orden que eligió la
   * entidad. Lo que no figure va detrás, en el orden del formato.
   *
   * Observación de César (agosto de 2026): "la funcionalidad de subir y
   * bajar debe añadirse para todos los numerales y no solo para los
   * principales". Se podía reordenar el apartado 5 entero, pero no
   * mover el 5.3 por delante del 5.2.
   */
  ordenHijas: Record<string, string[]>;
  /**
   * Títulos que la entidad cambió, en las secciones que lo admiten.
   *
   * id de la sección → título propio. Solo se aplica donde la plantilla
   * declara `renombrable`; ver `Seccion`.
   */
  titulos: Record<string, string>;
  /** id de condición → si la sección aplica. */
  condiciones: Record<string, boolean>;
  /**
   * Apartados que añade la entidad por su cuenta.
   *
   * El formato oficial no lo prevé todo y cada entidad tiene sus
   * particularidades. Van como apartados de primer nivel, se numeran
   * con los demás y se colocan donde el usuario los ponga. Observación
   * de César del 18/08/2026: "debe permitir agregar otros campos según
   * la necesidad de cada entidad".
   */
  extras: ApartadoExtra[];
  /**
   * Con qué se marca cada apartado que va en lista.
   *
   * id del bloque → viñeta, literal (a, b, c) o número. Lo eligió cada
   * entidad: los objetivos específicos se suelen numerar con literales
   * y las actividades con viñetas, y el formato no lo impone. Petición
   * de César del 19/08/2026. Lo que no figure aquí va con viñeta.
   */
  marcadores: Record<string, MarcadorLista>;
  /**
   * Orden de los apartados de primer nivel, por id.
   *
   * Lo que no figure aquí conserva el orden del formato y se coloca
   * detrás. La numeración se recalcula al armar, así que mover un
   * apartado renumera el documento entero sin tocar un solo texto
   * invariable. Observación de César: "cada componente debe permitir
   * ser reubicado en la posición que cada entidad lo crea conveniente".
   */
  orden: string[];
}

/** Con qué se marca cada elemento de una lista. */
export type MarcadorLista = 'vineta' | 'literal' | 'numero';

export const MARCADORES: MarcadorLista[] = ['vineta', 'literal', 'numero'];

/** Apartado escrito enteramente por la entidad. */
export interface ApartadoExtra {
  /** Identificador propio; lleva el prefijo `extra:` para no chocar. */
  id: string;
  titulo: string;
  texto: string;
  /**
   * Sección dentro de la que vive, si no es de primer nivel.
   *
   * Las prestaciones accesorias más comunes —mantenimiento, soporte,
   * capacitación— vienen en el formato, pero hay otras: monitoreo,
   * asistencia técnica especializada. Con esto la entidad las añade
   * donde corresponde en vez de al final del documento. Petición de
   * César del 19/08/2026.
   */
  dentroDe?: string;
}

/**
 * Si un bloque condicionado por una opción está a la vista.
 *
 * Vive aquí y no en cada sitio porque lo consultan el ensamblador, el
 * índice, el revisor y el reparto de proyectos: si cada uno decidiera
 * por su cuenta, el documento y la pantalla acabarían discrepando.
 */
export function bloqueVisible(
  bloque: {
    visibleSi?: { condicion?: string; opcion?: string; valor?: string | string[] };
  },
  respuestas: RespuestasRequerimiento,
): boolean {
  const cond = bloque.visibleSi;
  if (!cond) return true;
  if (cond.condicion && !respuestas.condiciones[cond.condicion]) return false;
  if (!cond.opcion) return true;
  const elegida = respuestas.opciones[cond.opcion] ?? '';
  if (cond.valor === undefined) return !!elegida;
  return Array.isArray(cond.valor) ? cond.valor.includes(elegida) : cond.valor === elegida;
}

/** Dónde se guarda un texto del usuario. Lo comparten revisor y reparto. */
export type DestinoRespuesta = 'redacciones' | 'campos' | 'extras' | 'tablas';

/**
 * Valor que marca "ninguna de las alternativas del formato me sirve".
 *
 * El texto lo escribe entonces la entidad y se guarda en `campos` bajo
 * `<id de la opción>__propia`. Los ids del formato no llevan doble
 * guion bajo, así que no puede chocar con ninguno. Observación de César
 * del 18/08/2026 sobre la forma de contratación: las opciones "deben
 * dejar agregar".
 */
export const OPCION_PROPIA = '__propia';

/** Dónde se guarda el texto de una alternativa escrita por la entidad. */
export const campoOpcionPropia = (idOpcion: string) => `${idOpcion}${OPCION_PROPIA}`;

/** Prefijo con el que se distinguen de los apartados del formato. */
export const PREFIJO_EXTRA = 'extra:';

/** Un id de apartado propio, único dentro del documento. */
export function nuevoIdExtra(existentes: ApartadoExtra[]): string {
  let n = existentes.length + 1;
  const usados = new Set(existentes.map((e) => e.id));
  while (usados.has(`${PREFIJO_EXTRA}${n}`)) n++;
  return `${PREFIJO_EXTRA}${n}`;
}

/** Datos económicos contra los que se contrastan los topes. */
export interface ContextoContratacion {
  /** Cuantía de la contratación o del ítem, en la moneda del proceso. */
  cuantia?: number;
  /**
   * El monto del contrato NO se pide.
   *
   * Cuando se redacta el requerimiento todavía no hay contrato: lo
   * único que existe es la cuantía. Se pedía como un dato más del
   * expediente y solo alimentaba una comprobación de la JPRD que nunca
   * llegaba a ejecutarse —ninguna plantilla enciende esa condición; el
   * umbral de los S/ 10 000 000,00 viaja al lector como nota del propio
   * formato—. Observación de César del 18/08/2026: "la opción de monto
   * contratado la veo innecesaria".
   */
}

export interface Falta {
  seccion: string;
  bloque: string;
  etiqueta: string;
  ayuda?: string;
}

export interface Aviso {
  validacion: string;
  mensaje: string;
  fundamento: string;
  /** `error` bloquea; `advertencia` solo señala. */
  nivel: 'error' | 'advertencia';
}

export interface DocumentoEnsamblado {
  markdown: string;
  faltantes: Falta[];
  avisos: Aviso[];
  /** Secciones omitidas por no cumplirse su condición. */
  omitidas: string[];
}

export const respuestasVacias = (): RespuestasRequerimiento => ({
  campos: {},
  redacciones: {},
  opciones: {},
  tablas: {},
  gruposTabla: {},
  ordenHijas: {},
  titulos: {},
  condiciones: {},
  extras: [],
  orden: [],
  marcadores: {},
});

/**
 * Completa los grupos ausentes de unas respuestas leídas de la base.
 *
 * El JSONB guardado puede venir con grupos faltantes —de una versión
 * anterior, o de un guardado parcial—, y el ensamblador no debería tener
 * que comprobar la existencia de cada uno. Se normaliza una vez, aquí.
 */
export function normalizarRespuestas(
  r: Partial<RespuestasRequerimiento> | null | undefined,
  /**
   * Denominación del expediente. Si viene, rellena el campo homónimo
   * del formato cuando está vacío.
   *
   * La denominación se pedía tres veces —al crear, en los datos del
   * expediente y en el numeral 1— y era la misma. Se escribe una vez y
   * el campo del documento la toma de ahí. Observación de César del
   * 18/08/2026.
   */
  denominacion?: string,
): RespuestasRequerimiento {
  const campos = { ...(r?.campos ?? {}) };
  if (denominacion?.trim() && !(campos.denominacion ?? '').trim()) {
    campos.denominacion = denominacion.trim();
  }
  return {
    campos,
    redacciones: { ...(r?.redacciones ?? {}) },
    opciones: { ...(r?.opciones ?? {}) },
    tablas: { ...(r?.tablas ?? {}) },
    gruposTabla: { ...(r?.gruposTabla ?? {}) },
    ordenHijas: { ...(r?.ordenHijas ?? {}) },
    titulos: { ...(r?.titulos ?? {}) },
    condiciones: { ...(r?.condiciones ?? {}) },
    extras: [...(r?.extras ?? [])],
    orden: [...(r?.orden ?? [])],
    marcadores: { ...(r?.marcadores ?? {}) },
  };
}

/**
 * Apartado de primer nivel: uno del formato o uno propio de la entidad.
 */
export type ApartadoOrdenado =
  | { tipo: 'seccion'; id: string; seccion: Seccion }
  | { tipo: 'extra'; id: string; extra: ApartadoExtra };

/**
 * Los apartados en el orden en que van a salir.
 *
 * Lo usan el ensamblador y el formulario, para que lo que se ve en
 * pantalla y lo que sale en el Word sean el mismo documento. Un id que
 * ya no existe —una plantilla que cambió, un apartado propio
 * borrado— simplemente se ignora, y lo que nadie colocó conserva el
 * orden del formato al final.
 */
/**
 * Las subsecciones de un apartado, en el orden que eligió la entidad.
 *
 * Lo que la entidad no haya movido conserva el orden del formato, y una
 * hija que ya no exista en la plantilla se ignora: el orden guardado es
 * una preferencia, no una fuente de verdad.
 */
export function hijasOrdenadas(
  seccion: Seccion,
  respuestas: RespuestasRequerimiento,
): Seccion[] {
  const hijas = seccion.subsecciones ?? [];
  const orden = respuestas.ordenHijas[seccion.id];
  if (!orden || orden.length === 0) return hijas;
  const porId = new Map(hijas.map((h) => [h.id, h]));
  const out: Seccion[] = [];
  const vistos = new Set<string>();
  for (const id of orden) {
    const h = porId.get(id);
    if (h && !vistos.has(id)) {
      out.push(h);
      vistos.add(id);
    }
  }
  for (const h of hijas) if (!vistos.has(h.id)) out.push(h);
  return out;
}

export function apartadosOrdenados(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
): ApartadoOrdenado[] {
  const base: ApartadoOrdenado[] = [
    ...plantilla.secciones.map(
      (seccion) => ({ tipo: 'seccion', id: seccion.id, seccion }) as ApartadoOrdenado,
    ),
    ...respuestas.extras
      .filter((extra) => !extra.dentroDe)
      .map((extra) => ({ tipo: 'extra', id: extra.id, extra }) as ApartadoOrdenado),
  ];
  const porId = new Map(base.map((a) => [a.id, a]));
  const out: ApartadoOrdenado[] = [];
  const vistos = new Set<string>();
  for (const id of respuestas.orden) {
    const a = porId.get(id);
    if (a && !vistos.has(id)) {
      out.push(a);
      vistos.add(id);
    }
  }
  for (const a of base) if (!vistos.has(a.id)) out.push(a);
  return out;
}

/**
 * Extrae el importe de un texto como "S/ 150 000,00 (ciento cincuenta
 * mil con 00/100 soles)".
 *
 * La plantilla pide el monto "en números y letras", así que el campo
 * llega con ambos. Se toma el primer número y se normaliza el formato
 * peruano —punto o espacio para miles, coma para decimales— sin
 * confundirlo con el anglosajón.
 */
export function montoDe(texto: string): number | null {
  const m = texto.match(/\d[\d.,\u00a0 ]*\d|\d/);
  if (!m) return null;
  // El signo va delante del número y no entra en la coincidencia. Sin
  // esto "-5000" se leía como 5000, que es peor que no leerlo.
  const negativo = m.index !== undefined && texto[m.index - 1] === '-';
  let s = m[0].replace(/[\u00a0 ]/g, '');
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  // Grupos de tres desde el inicio: 1.234.567 o 100,000. No hay forma
  // de leerlo como decimales.
  const milesConComa = /^\d{1,3}(?:,\d{3})+$/;
  const milesConPunto = /^\d{1,3}(?:\.\d{3})+$/;

  if (coma >= 0 && punto >= 0) {
    // Están los dos: manda el último. "1.234.567,89" es peruano;
    // "1,234,567.89" es anglosajón.
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma >= 0) {
    // Solo comas. "1,50" son decimales; "100,000" son miles —que es
    // como se escribió la cuantía que no se conseguía guardar—.
    s = milesConComa.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (punto >= 0) {
    // Solo puntos, mismo criterio: "1.50" es decimal, "150.000" son
    // miles.
    s = milesConPunto.test(s) ? s.replace(/\./g, '') : s;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/**
 * Importe tal como lo escribe una persona, para los cuerpos de petición.
 *
 * Acepta número o cadena —"100,000.00", "S/ 150 000,00"— y devuelve el
 * número, o null si el campo viene vacío. Antes las rutas exigían un
 * número ya convertido: `Number("100,000.00")` daba NaN, Zod lo
 * rechazaba y la petición entera fallaba con 400, de modo que no se
 * guardaba ni la cuantía ni el texto escrito en ese mismo intervalo.
 */
export const MontoSchema = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : typeof v === 'string' ? montoDe(v) : null;
  // Un importe que no se entiende —o negativo— se ignora: el campo se
  // queda como estaba y el resto de lo que se guardaba en ese envío se
  // guarda igual. Rechazar la petición entera por una cifra mal escrita
  // es exactamente el fallo que se está corrigiendo.
  if (n === null || !Number.isFinite(n) || n <= 0) return undefined;
  return n;
}, z.number().positive().nullable().optional());

const soles = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Contrasta los topes que la plantilla enuncia contra lo respondido. */
function verificarTopes(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
  contexto: ContextoContratacion,
): Aviso[] {
  const avisos: Aviso[] = [];
  const validacionDe = (id: string) => plantilla.validaciones.find((v) => v.id === id);
  const fundamentoDe = (id: string) => validacionDe(id)?.fundamento ?? 'Plantilla';

  const pct = respuestas.campos.adelanto_porcentaje;
  if (pct) {
    const v = montoDe(pct);
    if (v !== null && v > 30) {
      avisos.push({
        validacion: 'adelanto_directo_max',
        mensaje: `El adelanto directo indicado (${v}%) excede el 30% del monto del contrato original.`,
        fundamento: fundamentoDe('adelanto_directo_max'),
        nivel: 'error',
      });
    }
  }

  if (contexto.cuantia && contexto.cuantia > 0) {
    const exp = respuestas.campos.experiencia_monto;
    if (exp) {
      const v = montoDe(exp);
      // El multiplicador lo fija la plantilla: tres veces en bienes y
      // servicios, una sola vez en consultoría en general.
      const factor = validacionDe('experiencia_max')?.factor ?? 3;
      const tope = contexto.cuantia * factor;
      if (v !== null && v > tope) {
        const veces = factor === 1 ? 'una vez' : `${factor} veces`;
        avisos.push({
          validacion: 'experiencia_max',
          mensaje: `La experiencia exigida (${soles(v)}) supera el máximo de ${veces} la cuantía (${soles(tope)}).`,
          fundamento: fundamentoDe('experiencia_max'),
          nivel: 'error',
        });
      }
    }
    const mype = respuestas.campos.experiencia_monto_mype;
    if (mype) {
      const v = montoDe(mype);
      const tope = contexto.cuantia * 0.25;
      if (v !== null && v > tope) {
        avisos.push({
          validacion: 'experiencia_mype',
          mensaje: `La experiencia exigida a micro y pequeña empresa (${soles(v)}) supera el 25% de la cuantía del ítem (${soles(tope)}).`,
          fundamento: fundamentoDe('experiencia_mype'),
          nivel: 'error',
        });
      }
    }
  } else if (respuestas.campos.experiencia_monto || respuestas.campos.experiencia_monto_mype) {
    // Sin cuantía no se puede afirmar que el tope se respeta. Decirlo es
    // más útil que dar por buena una cifra que nadie contrastó.
    avisos.push({
      validacion: 'experiencia_max',
      mensaje:
        'No se indicó la cuantía de la contratación, por lo que no fue posible verificar los topes de experiencia (3 veces la cuantía y 25% para MYPE).',
      fundamento: fundamentoDe('experiencia_max'),
      nivel: 'advertencia',
    });
  }

  return avisos;
}

/** Convierte una tabla a Markdown; el exportador a Word ya lo entiende. */
function tablaMarkdown(columnas: string[], filas: string[][]): string {
  const limpiar = (c: string) => (c ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  const ancho = columnas.length;
  const cuerpo = filas.map((f) => {
    const r = f.map(limpiar);
    while (r.length < ancho) r.push('');
    return `| ${r.slice(0, ancho).join(' | ')} |`;
  });
  return [
    `| ${columnas.map(limpiar).join(' | ')} |`,
    `|${Array(ancho).fill('---').join('|')}|`,
    ...cuerpo,
  ].join('\n');
}

/** Marca visible en el documento cuando falta un dato obligatorio. */
const pendiente = (etiqueta: string) => `**[PENDIENTE: ${etiqueta}]**`;

export function ensamblarRequerimiento(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
  contexto: ContextoContratacion = {},
): DocumentoEnsamblado {
  const partes: string[] = [];
  const faltantes: Falta[] = [];
  const omitidas: string[] = [];

  partes.push(`# ${plantilla.encabezado}`, '', `## ${plantilla.subtitulo}`, '');

  const valorCampo = (campo: BloqueCampo, seccion: string): string | null => {
    const v = (respuestas.campos[campo.id] ?? '').trim();
    if (v) return v;
    if (campo.obligatorio) {
      faltantes.push({
        seccion,
        bloque: campo.id,
        etiqueta: campo.etiqueta,
        ayuda: campo.ayuda,
      });
    }
    return null;
  };

  const escribirBloques = (bloques: Bloque[], seccion: string) => {
    for (const b of bloques) {
      // Un bloque que depende de una opción no elegida no está en el
      // documento: ni su texto ni su hueco pendiente.
      if (!bloqueVisible(b, respuestas)) continue;
      switch (b.clase) {
        case 'titulo':
          partes.push(`${'#'.repeat(Math.min(b.nivel + 2, 6))} ${b.texto}`, '');
          break;

        case 'fijo':
          partes.push(b.texto, '');
          break;

        case 'nota':
          // Las notas son advertencias para quien redacta, no parte del
          // requerimiento. Van en cursiva para que se distingan y puedan
          // retirarse antes de remitir el expediente.
          partes.push(`> *${b.texto}*`, '');
          break;

        case 'campo': {
          const v = valorCampo(b, seccion);
          partes.push(`**${b.etiqueta}:** ${v ?? pendiente(b.etiqueta)}`, '');
          break;
        }

        case 'parrafo': {
          let texto = b.texto;
          for (const campo of b.campos) {
            const v = valorCampo(campo, seccion);
            texto = texto.replaceAll(`{{${campo.id}}}`, v ?? pendiente(campo.etiqueta));
          }
          partes.push(texto, '');
          break;
        }

        case 'opcion': {
          const elegida = respuestas.opciones[b.id];
          const op = b.opciones.find((o) => o.valor === elegida);
          const propia =
            elegida === OPCION_PROPIA
              ? (respuestas.campos[campoOpcionPropia(b.id)] ?? '').trim()
              : '';
          if (op) {
            partes.push(op.texto, '');
          } else if (propia) {
            partes.push(propia, '');
          } else {
            faltantes.push({
              seccion,
              bloque: b.id,
              etiqueta: b.etiqueta,
              ayuda: b.instruccion,
            });
            partes.push(pendiente(b.etiqueta), '');
          }
          break;
        }

        case 'redactado': {
          const texto = (respuestas.redacciones[b.id] ?? '').trim();
          if (texto) {
            partes.push(
              b.extension === 'lista' ? enLista(texto, respuestas.marcadores[b.id]) : texto,
              '',
            );
          } else {
            faltantes.push({
              seccion,
              bloque: b.id,
              etiqueta: b.etiqueta,
              ayuda: b.instruccion,
            });
            partes.push(pendiente(b.etiqueta), '');
          }
          break;
        }

        case 'tabla': {
          // Lo que haya escrito la entidad; si no ha tocado nada, las
          // filas que el formato ya trae.
          const filas = respuestas.tablas[b.id] ?? b.filasIniciales ?? [];
          const minimo = b.minimo ?? 0;
          // Se cuentan las filas con algo escrito: pulsar "agregar fila"
          // y dejarla en blanco no completa nada, y el índice lateral
          // tiene que decir lo mismo que esto.
          const conContenido = filas.filter((f) => f.some((c) => c.trim())).length;
          if (conContenido < minimo) {
            faltantes.push({
              seccion,
              bloque: b.id,
              etiqueta:
                minimo === 1
                  ? `${b.etiqueta} (al menos una fila)`
                  : `${b.etiqueta} (al menos ${minimo} filas)`,
              ayuda: b.instruccion,
            });
          }
          if (conContenido === 0 && b.complementaria) {
            // Cuadro que acompaña a un texto: si no se llena, no sale.
            // Ni siquiera el "no aplica", que aquí sería ruido.
          } else if (filas.length === 0 && minimo === 0) {
            // Tabla opcional y vacía: una cabecera suelta sin filas se ve
            // como un error de armado en el Word. Se omite y se deja
            // constancia de por qué.
            partes.push(`*No aplica: ${b.etiqueta.toLowerCase()}.*`, '');
          } else {
            // Con filas exigidas se emite igual, aunque estén vacías: el
            // formato oficial lleva la tabla y quitarla cambiaría el
            // documento. El hueco ya quedó anotado en `faltantes`.
            partes.push(tablaMarkdown(b.columnas, filas), '');
          }

          // Los cuadros que la entidad añadió después, cada uno con su
          // título encima, como en el formato: "Bien N.° 02: ABC" y
          // debajo su tabla.
          if (b.repetible) {
            for (const grupo of respuestas.gruposTabla[b.id] ?? []) {
              const conAlgo = grupo.filas.filter((f) => f.some((c) => c.trim()));
              if (conAlgo.length === 0 && !grupo.titulo.trim()) continue;
              if (grupo.titulo.trim()) partes.push(`**${grupo.titulo.trim()}**`, '');
              partes.push(tablaMarkdown(b.columnas, grupo.filas), '');
            }
          }
          break;
        }
      }
    }
  };

  /** Numeración jerárquica: 1, 1.1, 1.1.1 — como el formato original. */
  const escribirSeccion = (s: Seccion, numero: string, nivel: number) => {
    if (s.condicion && !respuestas.condiciones[s.condicion]) {
      omitidas.push(s.titulo);
      return;
    }
    const suTitulo = (s.renombrable && respuestas.titulos[s.id]?.trim()) || s.titulo;
    partes.push(`${'#'.repeat(Math.min(nivel + 2, 6))} ${numero}. ${suTitulo}`, '');
    escribirBloques(s.bloques, s.titulo);
    let sub = 0;
    for (const hija of hijasOrdenadas(s, respuestas)) {
      if (hija.condicion && !respuestas.condiciones[hija.condicion]) {
        omitidas.push(hija.titulo);
        continue;
      }
      sub++;
      escribirSeccion(hija, `${numero}.${sub}`, nivel + 1);
    }

    // Los apartados que la entidad añadió dentro de esta sección van
    // detrás de los del formato, numerados con ellos.
    for (const extra of respuestas.extras) {
      if (extra.dentroDe !== s.id) continue;
      sub++;
      const titulo = extra.titulo.trim() || 'Apartado adicional';
      const texto = extra.texto.trim();
      partes.push(`${'#'.repeat(Math.min(nivel + 3, 6))} ${numero}.${sub}. ${titulo}`, '');
      if (texto) {
        partes.push(texto, '');
      } else {
        partes.push(pendiente(titulo), '');
        faltantes.push({
          seccion: s.titulo,
          bloque: extra.id,
          etiqueta: titulo,
          ayuda: 'Apartado añadido por la entidad; está sin escribir.',
        });
      }
    }
  };

  let n = 0;
  for (const apartado of apartadosOrdenados(plantilla, respuestas)) {
    if (apartado.tipo === 'extra') {
      const { extra } = apartado;
      const titulo = extra.titulo.trim() || 'Apartado adicional';
      const texto = extra.texto.trim();
      n++;
      partes.push(`### ${n}. ${titulo}`, '');
      if (texto) {
        partes.push(texto, '');
      } else {
        // Un apartado propio sin contenido es un olvido, no una
        // sección "de corresponder": se marca como pendiente igual que
        // cualquier otro dato obligatorio.
        partes.push(pendiente(titulo), '');
        faltantes.push({
          seccion: titulo,
          bloque: extra.id,
          etiqueta: titulo,
          ayuda: 'Apartado añadido por la entidad; está sin escribir.',
        });
      }
      continue;
    }

    const s = apartado.seccion;
    if (s.condicion && !respuestas.condiciones[s.condicion]) {
      omitidas.push(s.titulo);
      continue;
    }
    n++;
    escribirSeccion(s, String(n), 1);
  }

  return {
    markdown: partes.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
    faltantes,
    avisos: verificarTopes(plantilla, respuestas, contexto),
    omitidas,
  };
}

/**
 * Etiqueta de un elemento según el marcador elegido.
 *
 * Pasada la z se sigue con aa, ab… No es un capricho: un apartado de
 * actividades con treinta puntos existe, y quedarse sin letras a mitad
 * de lista sería peor que numerarlas.
 */
export function marcaDeLista(marcador: MarcadorLista, i: number): string {
  if (marcador === 'numero') return `${i + 1}.`;
  if (marcador !== 'literal') return '-';
  let n = i;
  let letras = '';
  do {
    letras = String.fromCharCode(97 + (n % 26)) + letras;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${letras})`;
}

/**
 * Convierte un texto de varias líneas en la lista que toque.
 *
 * Las viñetas y los números los entiende el exportador a Word como
 * lista de verdad; los literales viajan como texto —"a) …"— porque es
 * la forma que pide el documento, no una lista de procesador de
 * textos.
 */
function enLista(texto: string, marcador: MarcadorLista = 'vineta'): string {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    // Se quita la marca que el usuario o el modelo hayan puesto
    // delante: la pone el documento, no el texto.
    .map((l) => l.replace(/^(?:[-*•]|\d+[.)]|[a-z]{1,2}\))\s+/i, ''))
    .map((l, i) => `${marcaDeLista(marcador, i)} ${l}`)
    .join('\n');
}
