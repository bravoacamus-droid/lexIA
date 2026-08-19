/**
 * Redacción asistida de los bloques `redactado` de una plantilla.
 *
 * El modelo interviene SOLO aquí. No arma el documento, no toca los
 * textos invariables y no decide qué secciones aplican: recibe un bloque
 * concreto y devuelve el párrafo o la lista que corresponde a ese bloque.
 *
 * Por qué el prompt se construye desde la plantilla y no desde una guía
 * escrita a mano: cada bloque trae la instrucción literal de César y, en
 * 22 de los 22 casos de "Bienes en General", una redacción de ejemplo. El
 * ejemplo fija el registro y el nivel de detalle esperado —"melamina de
 * alta densidad de 18 mm", "tapacantos de PVC de 2 mm"— que es justo lo
 * que un prompt genérico no consigue. Reescribir esa guía a mano sería
 * duplicarla y dejarla desincronizada en cuanto César cambie una
 * plantilla.
 */
import type { BloqueRedactado, PlantillaRequerimiento } from './plantilla-tipos';

export interface ContextoRedaccion {
  /** Denominación de la contratación. */
  denominacion: string;
  /** Órgano o unidad orgánica que requiere la contratación. */
  organo?: string;
  /** Lo que el usuario aportó sobre este bloque en concreto. */
  aporteUsuario?: string;
  /**
   * Lo que el area usuaria ya escribio en este apartado.
   *
   * Cuando viene, el trabajo NO es redactar sino mejorar: el contenido
   * es suyo y las decisiones son suyas. Hasta el 17/08/2026 este texto
   * no se enviaba nunca, asi que el boton generaba desde cero y
   * descartaba en silencio lo que la persona habia escrito. Observacion
   * de Cesar: "debe haber una opcion para mejorar la redaccion con la IA
   * cada clausula".
   */
  textoActual?: string;
  /** Sustento normativo recuperado de la biblioteca, si lo hay. */
  contextoNormativo?: string;
}

/** Consulta con la que se busca sustento normativo para este bloque. */
export function consultaNormativa(
  plantilla: PlantillaRequerimiento,
  bloque: BloqueRedactado,
  contexto: ContextoRedaccion,
): string {
  // Frase corta y concreta: las consultas largas de palabras sueltas no
  // recuperan nada útil, cosa ya medida en el buscador.
  return `${bloque.etiqueta} ${plantilla.subtitulo} ${contexto.denominacion}`.slice(0, 200);
}

const FORMA: Record<NonNullable<BloqueRedactado['extension']>, string> = {
  parrafo: 'Un solo párrafo corrido. No uses viñetas ni títulos.',
  varios_parrafos: 'Dos o tres párrafos. No uses viñetas ni títulos.',
  lista:
    'Una lista: una línea por elemento, sin numerar y sin viñetas al inicio (el documento las agrega). No escribas párrafos introductorios.',
};

export function promptSistema(plantilla: PlantillaRequerimiento): string {
  return `Eres LexIA, asistente jurídico en Contrataciones del Estado peruano (Ley N° 32069 y su Reglamento, DS N° 009-2025-EF).

Estás completando el documento "${plantilla.encabezado} — ${plantilla.subtitulo}", que sigue el formato oficial. Tu trabajo es redactar UN apartado concreto de ese documento, no el documento entero.

REGLAS QUE NO PUEDES ROMPER:
- Devuelve únicamente el texto del apartado. Sin título, sin encabezado, sin comentarios, sin markdown de bloque, sin comillas envolventes.
- No inventes cifras, plazos, marcas, números de norma ni de opinión. Si falta un dato imprescindible, escribe [Pendiente: qué falta] en su lugar.
- No exijas marcas comerciales. Si el usuario menciona una, reformúlala en términos funcionales y añade "o equivalente técnico".
- Cita norma solo cuando el sustento provisto la respalde, con artículo y numeral exactos.
- Español jurídico-administrativo peruano, formal y directo. Sin fórmulas de cortesía.`;
}

export function promptUsuario(
  bloque: BloqueRedactado,
  contexto: ContextoRedaccion,
): string {
  const partes: string[] = [];

  partes.push(`APARTADO A REDACTAR: ${bloque.etiqueta}`);
  partes.push(`\nQUÉ DEBE CONTENER (instrucción del formato oficial):\n${bloque.instruccion}`);

  if (bloque.ejemplo) {
    // El ejemplo va como referencia de FORMA, con la advertencia
    // explícita de no copiarlo: son muebles de melamina y la
    // contratación puede ser cualquier otra cosa.
    partes.push(
      `\nREDACCIÓN DE EJEMPLO DEL FORMATO OFICIAL (imita el nivel de detalle y el estilo; NO copies su contenido, corresponde a otra contratación):\n${bloque.ejemplo}`,
    );
  }

  partes.push(`\nFORMA DE LA RESPUESTA: ${FORMA[bloque.extension ?? 'parrafo']}`);

  partes.push(`\nCONTRATACIÓN: ${contexto.denominacion}`);
  if (contexto.organo) partes.push(`ÁREA USUARIA: ${contexto.organo}`);

  const yaEscrito = contexto.textoActual?.trim();
  if (yaEscrito) {
    partes.push(
      `
TEXTO QUE YA REDACTO EL AREA USUARIA:
"""
${yaEscrito}
"""`,
    );
    partes.push(
      `
TU TAREA ES MEJORAR ESE TEXTO, NO ESCRIBIR OTRO. Conserva integras todas las decisiones y todos los datos que contiene -plazos, cantidades, condiciones, nombres- porque son del area usuaria y tu no puedes cambiarlas. Corrige la redaccion, ordena las ideas, ajusta el registro al del formato oficial y completa lo que la instruccion exige y falte. Si algo del texto contradice la instruccion del formato o la norma, NO lo corrijas por tu cuenta: mantenlo y anade al final una linea que empiece por "[Revisar:" senalando la discrepancia.`,
    );
  }

  if (contexto.aporteUsuario?.trim()) {
    partes.push(
      `\nINFORMACIÓN QUE APORTA EL ÁREA USUARIA (incorpórala sin cambiar su sentido):\n"""\n${contexto.aporteUsuario.trim()}\n"""`,
    );
  }

  if (contexto.contextoNormativo?.trim()) {
    partes.push(`\nSUSTENTO NORMATIVO DISPONIBLE:\n${contexto.contextoNormativo.trim()}`);
  }

  partes.push(
    yaEscrito
      ? `
Devuelve ahora el apartado "${bloque.etiqueta}" mejorado, y solo eso.`
      : `
Redacta ahora el apartado "${bloque.etiqueta}".`,
  );
  return partes.join('\n');
}

/**
 * Limpia lo que el modelo suele añadir pese a que se le pide que no:
 * vallas de código, el título del apartado repetido, comillas
 * envolventes y viñetas cuando el documento ya las pone.
 */
export function limpiarRedaccion(texto: string, bloque: BloqueRedactado): string {
  let t = texto.trim();
  t = t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();

  // Título repetido en la primera línea, con o sin markdown.
  const etiqueta = bloque.etiqueta.toLowerCase();
  const lineas = t.split('\n');
  const primera = lineas[0].replace(/^#+\s*/, '').replace(/[:.]\s*$/, '').trim().toLowerCase();
  if (primera === etiqueta || primera === `**${etiqueta}**`) {
    lineas.shift();
    t = lineas.join('\n').trim();
  }

  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim();

  if (bloque.extension === 'lista') {
    // El ensamblador antepone la viñeta; si el modelo también la pone,
    // salen dobles.
    t = t
      .split('\n')
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
      .filter(Boolean)
      .join('\n');
  }

  return t;
}

/** Una redacción demasiado corta es un fallo, no un resultado. */
export function redaccionUtil(texto: string): boolean {
  return texto.trim().length >= 40;
}
