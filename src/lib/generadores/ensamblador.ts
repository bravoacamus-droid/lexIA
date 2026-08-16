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

export interface RespuestasRequerimiento {
  /** id de campo → valor que escribió el usuario. */
  campos: Record<string, string>;
  /** id de bloque redactado → texto producido por el modelo. */
  redacciones: Record<string, string>;
  /** id de bloque de opción → `valor` de la alternativa elegida. */
  opciones: Record<string, string>;
  /** id de tabla → filas (sin la cabecera). */
  tablas: Record<string, string[][]>;
  /** id de condición → si la sección aplica. */
  condiciones: Record<string, boolean>;
}

/** Datos económicos contra los que se contrastan los topes. */
export interface ContextoContratacion {
  /** Cuantía de la contratación o del ítem, en la moneda del proceso. */
  cuantia?: number;
  /** Monto del contrato original, para el tope de adelantos. */
  montoContrato?: number;
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
  condiciones: {},
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
): RespuestasRequerimiento {
  return {
    campos: { ...(r?.campos ?? {}) },
    redacciones: { ...(r?.redacciones ?? {}) },
    opciones: { ...(r?.opciones ?? {}) },
    tablas: { ...(r?.tablas ?? {}) },
    condiciones: { ...(r?.condiciones ?? {}) },
  };
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
  const m = texto.match(/\d[\d.,  ]*\d|\d/);
  if (!m) return null;
  let s = m[0].replace(/[  ]/g, '');
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  if (coma > punto) {
    // Formato peruano: 1.234.567,89
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (punto > coma) {
    // Formato anglosajón: 1,234,567.89
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(/[.,]/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

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

  if (
    respuestas.condiciones.usa_jprd &&
    contexto.montoContrato !== undefined &&
    contexto.montoContrato <= 10_000_000
  ) {
    avisos.push({
      validacion: 'jprd_umbral',
      mensaje: `La JPRD solo procede si el monto contractual supera S/ 10 000 000,00; el indicado es ${soles(contexto.montoContrato)}.`,
      fundamento: fundamentoDe('jprd_umbral'),
      nivel: 'error',
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
          if (op) {
            partes.push(op.texto, '');
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
            partes.push(b.extension === 'lista' ? enLista(texto) : texto, '');
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
          const filas = respuestas.tablas[b.id] ?? [];
          const minimo = b.minimo ?? 0;
          if (filas.length < minimo) {
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
          if (filas.length === 0 && minimo === 0) {
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
    partes.push(`${'#'.repeat(Math.min(nivel + 2, 6))} ${numero}. ${s.titulo}`, '');
    escribirBloques(s.bloques, s.titulo);
    let sub = 0;
    for (const hija of s.subsecciones ?? []) {
      if (hija.condicion && !respuestas.condiciones[hija.condicion]) {
        omitidas.push(hija.titulo);
        continue;
      }
      sub++;
      escribirSeccion(hija, `${numero}.${sub}`, nivel + 1);
    }
  };

  let n = 0;
  for (const s of plantilla.secciones) {
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

/** Convierte un texto de varias líneas en viñetas de Markdown. */
function enLista(texto: string): string {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^[-*•]\s/.test(l) ? `- ${l.replace(/^[-*•]\s*/, '')}` : `- ${l}`))
    .join('\n');
}
