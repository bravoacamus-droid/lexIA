/**
 * Convierte el texto plano extraído de PDFs normativos en markdown
 * estructurado para que ReactMarkdown lo renderice con jerarquía
 * visual (headings, párrafos, listas).
 *
 * Los `raw_text` ingestados a normative_documents salen del extractor
 * de PDF sin estructura — solo párrafos con saltos de línea. Esto
 * hace que la vista del documento se vea como "texto plano
 * computarizado", queja explícita de César el 28/06/2026 y confirmada
 * de nuevo el 30/06/2026 al revisar la vista de detalle.
 *
 * Transformaciones aplicadas (en orden):
 *   1. Filtro de basura PDF:
 *      - "Página X de Y" / "Página | 35" (headers de página inline)
 *      - "28Manual de..." (número pegado al header repetido)
 *      - Códigos de folio "2387869-1", "8184038-pronunciamiento"
 *      - Líneas con solo puntuación o guiones
 *      - "Regístrese, comuníquese y publíquese" con firma
 *   2. TÍTULO/CAPÍTULO/SECCIÓN al inicio de línea → "# TÍTULO X"
 *   3. Artículo X | Artículo X.Y → "## Artículo X.Y"
 *   4. Sub-numerales "51.1.", "51.2." → sub-heading
 *   5. Numerales "1." "2." "3." → lista ordenada
 *   6. Sub-items "a.", "b.", "i.", "ii." → lista anidada
 *   7. Bullets "•" o "●" → lista no ordenada
 *   8. Re-unión de palabras cortadas por guión al fin de línea
 *   9. Colapso de saltos múltiples y espacios redundantes
 *
 * El resultado siempre es un string válido para ReactMarkdown. Si el
 * texto ya tiene estructura markdown previa, no se rompe.
 */

// Detección de headings principales — también los principales títulos
// de documentos: "PRONUNCIAMIENTO N° X", "OPINIÓN N° X", "RESOLUCIÓN N° X"
const TITULO_RX = /^(T[ÍI]TULO\s+[IVXLCDM]+|CAP[ÍI]TULO\s+[IVXLCDM]+|SECCI[ÓO]N\s+[IVXLCDM]+|DISPOSICIONES\s+(?:GENERALES|FINALES|COMPLEMENTARIAS|TRANSITORIAS|COMPLEMENTARIAS\s+FINALES|COMPLEMENTARIAS\s+TRANSITORIAS)|ANEXO\s+[IVXLCDM\d]+|PRONUNCIAMIENTO\s+N\.?°?\s*[\d\-\/A-Z]+|OPINI[ÓO]N\s+N\.?°?\s*[\dD\-\/A-Z]+|RESOLUCI[ÓO]N\s+N\.?°?\s*[\d\-\/A-Z]+|LEY\s+N\.?°?\s*\d+|DECRETO\s+SUPREMO)(\.?)(\s|$)/i;

// Nombres de secciones frecuentes en pronunciamientos/opiniones que
// deberían actuar como headings (H2) para dar estructura.
const SECCION_MAYUSCULA_RX = /^(ANTECEDENTES|CUESTIONAMIENTO|AN[ÁA]LISIS|CONCLUSI[ÓO]N|VISTO|RESULTA|CONSIDERANDO|SE\s+RESUELVE|POR\s+TANTO|EL\s+TRIBUNAL|MOTIVO\s+DE\s+LA\s+ELEVACI[ÓO]N|MATERIA|POSICI[ÓO]N|OPINI[ÓO]N|BASE\s+LEGAL|CONCLUSIONES|RECOMENDACIONES|MARCO\s+NORMATIVO)(\s|:|$)/i;

// Marcadores de callout — inicio de párrafo con palabra en mayúscula
// que debe resaltarse con caja destacada (feedback César 30/06/2026).
const CALLOUT_RX = /^(IMPORTANTE|CONCLUSI[ÓO]N|CONCLUSIONES|ATENCI[ÓO]N|NOTA|OJO|ADVERTENCIA|OBLIGATORIO|CRITERIO)([:.]?\s|$)/i;

// "Artículo 51" o "Artículo 51.1"
const ARTICULO_RX = /^(Art[íi]culo\s+\d+(?:[.\-]\d+)*\.?)(\s|$)/;

// Sub-numeral "51.1." o "51.1"
const SUBNUMERAL_RX = /^(\d+\.\d+\.?)\s/;

// Lista ordenada al inicio: "1." "1)" "1.-"
const NUM_LISTA_RX = /^(\d{1,2}[.)\-])\s+/;

// Sub-items alfabéticos "a." "b)" o romanos "i." "ii)"
const ALPHA_ITEM_RX = /^([a-z]|[ivx]{1,4})[.)]\s+/i;

// Bullets
const BULLET_RX = /^[•●○◦·]\s+/;

// Basura de PDF: números de página
const PAGE_INLINE_RX = /Página\s*\|\s*\d+|Página\s+\d+\s+de\s+\d+/gi;

// Códigos de folio (tipo "2387869-1", "8184038-pronunciamiento-n-...")
const FOLIO_CODE_RX = /^\d{7,}-\d+$|^\d{7,}-[a-z-]+/i;

// Marcas de firma/publicación al final de un doc
const PUB_MARKS_RX = /^Reg[íi]strese,?\s*com[uú]n[íi]quese\s*y\s*publ[íi]quese\.?/i;

/**
 * Detecta si una línea es basura del PDF que debería filtrarse.
 * Conservador: solo filtra si claramente NO aporta contenido.
 */
function isPdfNoise(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  // Números de página en línea propia
  if (/^Página\s*(\|\s*)?\d+(\s+de\s+\d+)?$/i.test(trimmed)) return true;
  // Números de folio sueltos
  if (FOLIO_CODE_RX.test(trimmed)) return true;
  // Solo puntuación o guiones (líneas de separación mal extraídas)
  if (/^[\s\-–—=_*.,;:]+$/.test(trimmed) && trimmed.length > 3) return true;
  // Sub-caracteres de una sola letra sueltos (residuo)
  if (/^[a-z]$/.test(trimmed)) return true;
  return false;
}

/**
 * Limpia residuos típicos de extracción de PDF donde había TABLAS y
 * los convierte en tablas markdown para render bonito en la BIBLIOTECA.
 *
 * Feedback César 30/06/2026:
 *   "los pronunciamientos tienen tablas con CANTIDAD, COD. SIGA, SISMED,
 *    UND. MED. que quedan como texto plano ilegible. Lo ideal es que
 *    para la biblioteca se puedan ver tablas de manera bonita. La
 *    biblioteca es para el usuario y no tendría que ser la misma que
 *    usa el sistema para responder."
 *
 * Ejemplo real (Pronunciamiento 346-2026):
 *   Input:  "Nº COD. SIGA CODIGO SISMED DESCRIPCION UND. MED. CANTIDAD
 *            1 (...) (...) SOPORTE IMPREGNADO CON ALOE VERA 20 cm X 20 cm X 10 UNID 9400
 *            2 (...) (...) SOPORTE IMPREGNADO CON MANZANILLA 20 cm X 20 cm X 10 UNID 4300"
 *   Output: tabla markdown con headers "N° | Descripción | Unidad | Cantidad"
 *
 * Modo:
 *   'display'  → renderiza tabla markdown (para biblioteca / usuario)
 *   'strip'    → colapsa a "[Cuadro de requerimiento]" (para chunk-sheet / RAG)
 */
function cleanPdfTables(text: string, mode: 'display' | 'strip'): string {
  let out = text;

  if (mode === 'display') {
    // 1) Cuadro de requerimiento (SIGA/SISMED) → tabla markdown real
    //    Patrón: "Nº COD. SIGA CODIGO SISMED DESCRIPCION UND. MED. CANTIDAD
    //             1 (...) (...) NOMBRE UNID 9400 2 (...) (...) NOMBRE UNID..."
    out = out.replace(
      /(?:N[°º.]|Nro\.?)\s*COD\.?\s*SIGA\s+CODIGO\s+SISMED\s+DESCRIPCION\s+UND\.?\s*MED\.?\s+CANTIDAD\s+((?:\d{1,3}\s+\(\.{3,}\)\s+\(\.{3,}\)\s+[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú0-9 ,.\-]+?\s+(?:UNID|UND|KG|ML|L|CM|MM)\s+\d+\s*)+)/gi,
      (_full, rowsBlock) => {
        const rowRx =
          /(\d{1,3})\s+\(\.{3,}\)\s+\(\.{3,}\)\s+([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú0-9 ,.\-]+?)\s+(UNID|UND|KG|ML|L|CM|MM)\s+(\d+)/g;
        const rows: Array<[string, string, string, string]> = [];
        let m;
        while ((m = rowRx.exec(rowsBlock)) !== null) {
          rows.push([m[1], m[2].trim(), m[3], Number(m[4]).toLocaleString('es-PE')]);
        }
        if (rows.length === 0) return '\n\n**Cuadro de requerimiento:** _[contenido omitido]_\n\n';
        // Cada línea en su propio renglón para que ReactMarkdown parsee la tabla.
        // La sintaxis GFM de tablas requiere \n entre filas.
        const header = '| N° | Descripción | Unidad | Cantidad |';
        const sep = '|:--:|:------------|:------:|---------:|';
        const body = rows.map(([n, desc, u, c]) => `| ${n} | ${desc} | ${u} | ${c} |`).join('\n');
        return `\n\n**Cuadro de requerimiento**\n\n${header}\n${sep}\n${body}\n\n`;
      },
    );

    // 2) Cronograma de entrega → tabla markdown
    //    Patrón: "Nº DESCRIPCION 1º E 2º E 3º E 4º E 5º E 6º E 7º E 8º E CANTIDAD TOTAL
    //             1 NOMBRE_DESCRIPCION (...) (...) (...) (...) (...) (...) (...) (...) 9400
    //             2 NOMBRE_DESCRIPCION (...) (...) (...) 4300..."
    //    Los "(...)" son las columnas de entregas vacías; solo importa el
    //    número del item, la descripción y la cantidad total.
    out = out.replace(
      /N[°º.]?\s*DESCRIPCION\s+(?:\d+º\s+E\s+){2,}(?:CANTI\s*DAD|CANTIDAD)\s*TOTAL\s+((?:\d{1,3}\s+[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú0-9 ,.\-]+?\s+(?:\(\.{3,}\)\s*)+\d+\s*)+)/gi,
      (_full, rowsBlock) => {
        const rowRx =
          /(\d{1,3})\s+([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú0-9 ,.\-]+?)\s+(?:\(\.{3,}\)\s*){2,}(\d+)/g;
        const rows: Array<[string, string, string]> = [];
        let m;
        while ((m = rowRx.exec(rowsBlock)) !== null) {
          rows.push([m[1], m[2].trim(), Number(m[3]).toLocaleString('es-PE')]);
        }
        if (rows.length === 0) return '\n\n**Cronograma de entrega:** _[contenido omitido]_\n\n';
        const header = '| N° | Descripción | Cantidad total |';
        const sep = '|:--:|:------------|---------------:|';
        const body = rows.map(([n, desc, c]) => `| ${n} | ${desc} | ${c} |`).join('\n');
        return `\n\n**Cronograma de entrega**\n\n${header}\n${sep}\n${body}\n\n`;
      },
    );

    // 3) Colapsar series de "N° E" sueltas restantes (headers de cronograma
    //    que no matchearon el patrón anterior)
    out = out.replace(/(?:\d+º\s+E\s+){2,}(?:CANTI\s*DAD|CANTIDAD)?\s*(?:TOTAL)?/gi, '');
  } else {
    // Modo strip (para chunk-sheet / RAG): sustituye por marcador simple
    // 1) Secuencias de "(...)" masivas
    out = out.replace(/(?:\s*\(\.{3,}\)\s*){3,}/g, ' [...] ');

    // 2) Encabezado de tabla + filas: colapsar a marcador
    out = out.replace(
      /(?:N[°º.]|Nro\.?)\s*COD\.?\s*SIGA\s+CODIGO\s+SISMED\s+DESCRIPCION\s+UND\.?\s*MED\.?\s+CANTIDAD/gi,
      '\n\n**Cuadro de requerimiento:** ',
    );

    // 3) Filas del cuadro individualmente
    out = out.replace(
      /(\d{1,3})\s+\(\.{3,}\)\s+\(\.{3,}\)\s+([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú ]+?)\s+(?:UNID|UND|KG|ML|L|CM|MM)\s+(\d+)/gi,
      '\n- **Ítem $1:** $2 (cantidad: $3)',
    );

    // 4) Cronogramas
    out = out.replace(
      /(?:\d+º\s+E\s+){3,}(?:CANTI\s*DAD|CANTIDAD)\s*TOTAL/gi,
      '\n\n**Cronograma de entrega:** ',
    );

    out = out.replace(/(?:\d+º\s+E\s+){2,}/gi, '');
  }

  return out;
}

/**
 * Palabras que fueron partidas por el extractor de PDF ("CANTI DAD" →
 * "CANTIDAD"). Es un fenómeno común cuando el PDF tiene kerning ancho
 * o cuando la palabra estaba dividida en columnas.
 *
 * Aplicamos una lista de palabras específicas (más seguro que un
 * regex genérico que podría fusionar cosas legítimas).
 */
const SPLIT_WORDS: Array<[RegExp, string]> = [
  [/\bCANTI\s+DAD\b/gi, 'CANTIDAD'],
  [/\bGENERAL\s+ES\b/gi, 'GENERALES'],
  [/\bCLORHEXIDIN\s+A\b/gi, 'CLORHEXIDINA'],
  [/\bDESCRIPCI\s+ÓN\b/gi, 'DESCRIPCIÓN'],
  [/\bINFORMACI\s+ÓN\b/gi, 'INFORMACIÓN'],
  [/\bMODIFICACI\s+ÓN\b/gi, 'MODIFICACIÓN'],
  [/\bABSOLUCI\s+ÓN\b/gi, 'ABSOLUCIÓN'],
  [/\bELEVACI\s+ÓN\b/gi, 'ELEVACIÓN'],
  [/\bCONTRATACI\s+ÓN\b/gi, 'CONTRATACIÓN'],
  [/\bCONSULT\s+ORÍA\b/gi, 'CONSULTORÍA'],
];

function reunifyBrokenWords(text: string): string {
  let out = text;
  for (const [rx, replacement] of SPLIT_WORDS) {
    out = out.replace(rx, replacement);
  }

  // Números de expediente sueltos que aparecen inline como notas al pie:
  //   ...texto legítimo. 5 (...). 6 Mediante Expediente N° 2026-0079927.
  //                        ^ nota   ^ nota
  // Los envolvemos entre paréntesis para dejar claro que son notas.
  out = out.replace(
    /([.,;])\s+(\d{1,2})\s+Mediante\s+(Expediente)/g,
    '$1 (nota $2 - $3',
  );

  return out;
}

/**
 * Extrae número de página que quedó pegado al principio de línea.
 * Ej: "28Manual de usuario" → "Manual de usuario"
 * Ej: "35 XVI." → "XVI." (mantiene el numeral romano)
 * Ej: "Página | 35 XVI." → "XVI." (aplicado después del filtro)
 */
function stripPageNumberPrefix(line: string): string {
  // Solo si el número está seguido de letra sin espacio: "28Manual"
  return line.replace(/^(\d{1,3})(?=[A-ZÁÉÍÓÚÑ][a-zá-úA-ZÁÉÍÓÚÑ])/, '');
}

/**
 * También filtramos "18Manual de usuario..." incrustado a mitad de
 * párrafo. Los PDFs a veces meten el pie-de-página en medio del texto
 * al hacer el layout re-flow. Detectamos el patrón: número de página
 * inmediatamente seguido de una repetición del título del documento.
 */
function stripInlinePageHeaders(text: string): string {
  // "18Manual de usuario del Cotizador..." o "35Manual general para..."
  return text.replace(/\s+\d{1,3}(?=[A-Z][a-z]{2,}\s+[a-záéíóúñ]+\s+(?:de|del|para|general|técnico))/g, ' ');
}

export interface FormatOptions {
  /**
   * 'display' → para la biblioteca (usuario final). Convierte tablas
   *              del PDF en tablas markdown reales.
   * 'strip'   → para chunk-sheet (citas rápidas). Colapsa tablas a
   *              marcadores para no diluir el fragmento.
   *
   * Default: 'strip' (retrocompat con llamadas existentes).
   */
  mode?: 'display' | 'strip';
}

/**
 * Alias explícito para la biblioteca: formato bonito con tablas
 * renderizadas. NO usar para chunk-sheet ni RAG.
 */
export function formatForDisplay(raw: string | null | undefined): string {
  return formatNormativaText(raw, { mode: 'display' });
}

export function formatNormativaText(
  raw: string | null | undefined,
  opts: FormatOptions = {},
): string {
  const mode = opts.mode || 'strip';
  if (!raw) return '';

  let text = raw;

  // 1. Re-unir guiones de salto al final de línea (artefacto PDF)
  text = text.replace(/-\n\s*(?=[a-záéíóúñü])/g, '');

  // 2. Quitar marcas de página inline dentro de párrafos
  text = text.replace(PAGE_INLINE_RX, ' ');

  // 2b. Quitar headers de página incrustados: "18Manual de usuario..."
  text = stripInlinePageHeaders(text);

  // 2c-bis. Feedback César 30/06/2026 (captura pronunciamiento 346):
  //   - Tablas del PDF quedaban como texto ilegible con placeholders "(...)"
  //   - Palabras partidas por columnas: "CANTI DAD", "CLORHEXIDIN A"
  //   Aplicamos limpiezas ANTES del pre-procesamiento de secciones para
  //   que el texto de tabla no confunda los detectores.
  text = cleanPdfTables(text, mode);
  text = reunifyBrokenWords(text);

  // 2c. Feedback César 30/06/2026: los textos vienen TODO PEGADO en una
  //     sola línea desde el PDF. Insertamos saltos ANTES de secciones
  //     estructurales para que el procesador línea por línea las detecte.
  //     Cubre 4 formatos comunes:
  //       PRONUNCIAMIENTOS: "1. ANTECEDENTES", "2. CUESTIONAMIENTO", "3. ANÁLISIS"
  //       DIRECTIVAS: "I. FINALIDAD", "II. OBJETO", "III. ÁMBITO DE APLICACIÓN"
  //       RESOLUCIONES: "VISTOS:", "CONSIDERANDO:", "SE RESUELVE:"
  //       OPINIONES: "MATERIA", "BASE LEGAL", "OPINIÓN"

  // Nombres de secciones (para prefijo numérico o romano opcional)
  const SECCION_NAMES =
    'ANTECEDENTES|CUESTIONAMIENTO|CUESTIONAMIENTO\\s+[ÚU]NICO|AN[ÁA]LISIS|POSICI[ÓO]N|OPINI[ÓO]N|CONCLUSI[ÓO]N|CONCLUSIONES|RECOMENDACIONES|BASE\\s+LEGAL|MARCO\\s+NORMATIVO|MATERIA';

  // Nombres típicos de secciones de DIRECTIVAS (con romano)
  const DIRECTIVA_SECCIONES =
    'FINALIDAD|OBJETO|OBJETIVO|OBJETIVOS|[ÁA]MBITO\\s+DE\\s+APLICACI[ÓO]N|DEFINICIONES|GLOSARIO\\s+DE\\s+T[ÉE]RMINOS|GLOSARIO|SIGLAS|ABREVIATURAS|DISPOSICIONES\\s+GENERALES|DISPOSICIONES\\s+ESPEC[ÍI]FICAS|DISPOSICIONES\\s+COMPLEMENTARIAS|DISPOSICIONES\\s+FINALES|DISPOSICIONES\\s+TRANSITORIAS|RESPONSABILIDADES|VIGENCIA|APROBACI[ÓO]N';

  // Nombres de secciones de RESOLUCIONES/ACTOS ADMINISTRATIVOS (sin numeral)
  const RES_SECCIONES =
    'VISTOS?|CONSIDERANDO|RESULTA|SE\\s+RESUELVE|POR\\s+TANTO|EL\\s+TRIBUNAL';

  // 1) Insertar salto ANTES de "N. SECCION" (numeral árabe + palabra)
  text = text.replace(
    new RegExp(`([^\\n])\\s+(\\d{1,2}[.)]?\\s+(?:${SECCION_NAMES}|${DIRECTIVA_SECCIONES}))\\b`, 'g'),
    '$1\n\n$2\n',
  );

  // 2) Insertar salto ANTES de "ROMANO. SECCION" (I. FINALIDAD, IV. BASE LEGAL, etc.)
  text = text.replace(
    new RegExp(
      `([^\\n])\\s+([IVXLCDM]{1,5}\\.[  ]*(?:${SECCION_NAMES}|${DIRECTIVA_SECCIONES}))\\b`,
      'g',
    ),
    '$1\n\n## $2\n',
  );

  // 3) Insertar salto ANTES de secciones administrativas (VISTOS:, CONSIDERANDO:, SE RESUELVE:)
  text = text.replace(
    new RegExp(`([^\\n])\\s+((?:${RES_SECCIONES})\\s*:)`, 'g'),
    '$1\n\n## $2\n',
  );

  // 4) "Que," al inicio de considerandos → salto (típico en resoluciones)
  text = text.replace(/([.;])\s+(Que,\s+)/g, '$1\n\n$2');

  // 5) Insertar salto ANTES de bullets Unicode inline
  text = text.replace(/([^\n])\s+([●○◦•▪]\s)/g, '$1\n$2');

  // 6) Insertar salto ANTES de sub-numerales inline "51.2. La formulación..."
  //    Feedback César 30/06/2026: el fix anterior no atrapaba el caso
  //    con comillas de cierre + apertura entre numerales, común en
  //    normativa con texto modificado. Ejemplo típico:
  //       "requerimiento." "51.3. En el plazo máximo de seis días hábiles..."
  //    El regex anterior fallaba porque las comillas ("," "”") aparecen
  //    ANTES del sub-numeral y no como parte del sub-numeral.
  //    Ahora aceptamos comillas o espacios entre el punto anterior y
  //    el sub-numeral, y también aceptamos comilla antes del sub-numeral.
  text = text.replace(
    /([.!?])[\s"“”'']+["“”'']?(\d{1,3}\.\d{1,3}[.)]?\s+["“'']?[A-ZÁÉÍÓÚ])/g,
    '$1\n\n$2',
  );

  // 6b) Sub-numerales con salto entre el numeral y su contenido:
  //     "51.1. \n\n En el caso..." → mantiene formato Word/PDF pero mal;
  //     detectar y limpiar
  text = text.replace(/(\d{1,3}\.\d{1,3}\.)\s*\n{1,2}\s*/g, '**$1** ');

  // 7) Insertar salto ANTES de "Artículo N." inline
  text = text.replace(/([^\n.])\s+(Art[íi]culo\s+\d+)/g, '$1\n\n$2');

  // 3. Colapsar 3+ saltos a doble salto
  text = text.replace(/\n{3,}/g, '\n\n');

  // 4. Procesar línea por línea
  const lines = text.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Filtro de ruido puro
    if (isPdfNoise(line)) {
      // Si la línea es ruido, insertamos línea vacía si no hay ya para
      // preservar la separación de párrafos
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }

    // Filtro específico: firma final típica
    if (PUB_MARKS_RX.test(line)) {
      // La firma marca fin de acto, ponemos separador horizontal
      if (out.length > 0 && out[out.length - 1] !== '---') {
        out.push('');
        out.push('---');
        out.push('');
      }
      out.push(`*${line}*`);
      continue;
    }

    // Quitar número de página pegado al inicio
    line = stripPageNumberPrefix(line);
    if (line.trim() === '') continue;

    // Título / Capítulo / Sección → H1
    const tm = line.match(TITULO_RX);
    if (tm) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`# ${line.replace(/\.+$/, '')}`);
      continue;
    }

    // Sección en mayúsculas frecuentes en pronunciamientos ("ANTECEDENTES",
    // "CUESTIONAMIENTO", "ANÁLISIS", "CONCLUSIÓN"). Se trata como H2.
    // NOTA: la línea debe comenzar con la palabra sección — si va
    // precedida por un numeral ("1. ANTECEDENTES"), también aplica.
    const numPrefixMatch = line.match(/^(\d{1,2}[.)]\s+)(.+)$/);
    const seccionLine = numPrefixMatch ? numPrefixMatch[2] : line;
    const sm2 = seccionLine.match(SECCION_MAYUSCULA_RX);
    if (sm2 && seccionLine.length < 100) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`## ${line}`);
      continue;
    }

    // Callout — párrafo que empieza con IMPORTANTE:/CONCLUSIÓN:/ATENCIÓN:
    // se envuelve en blockquote para que la card destacada lo resalte.
    // Feedback César 30/06/2026: "partes fundamentales resaltadas".
    const cm = line.match(CALLOUT_RX);
    if (cm) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`> **${cm[1]}**${line.slice(cm[0].length)}`);
      continue;
    }

    // Artículo X → H2
    const am = line.match(ARTICULO_RX);
    if (am) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`## ${line}`);
      continue;
    }

    // Sub-numeral "51.1." → sub-heading en negrita
    const sm = line.match(SUBNUMERAL_RX);
    if (sm && sm[1].length < 10) {
      // Sacamos el numeral del inicio y lo ponemos como bold prefijo
      const rest = line.slice(sm[1].length).trim();
      if (rest.length > 0) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
        out.push(`**${sm[1]}** ${rest}`);
        continue;
      }
    }

    // Bullet Unicode → convertir a lista markdown
    if (BULLET_RX.test(line)) {
      out.push('- ' + line.replace(BULLET_RX, ''));
      continue;
    }

    // Numerales sueltos "1." "2." → mantener (markdown los detecta)
    if (NUM_LISTA_RX.test(line)) {
      out.push(line);
      continue;
    }

    // Sub-items alfabéticos "a." "b." → convertir a bullet anidado
    if (ALPHA_ITEM_RX.test(line)) {
      out.push('   - ' + line);
      continue;
    }

    // Línea normal
    out.push(line);
  }

  // 5. Recombinar respetando párrafos
  const joined: string[] = [];
  let buf: string[] = [];
  function flushBuf() {
    if (buf.length > 0) {
      joined.push(buf.join(' '));
      buf = [];
    }
  }
  for (const line of out) {
    if (line === '' || line === '---') {
      flushBuf();
      joined.push(line);
      continue;
    }
    if (
      line.startsWith('#') ||
      line.startsWith('- ') ||
      line.startsWith('   - ') ||
      line.startsWith('**') ||
      line.startsWith('|') ||
      line.startsWith('>') ||
      NUM_LISTA_RX.test(line)
    ) {
      flushBuf();
      joined.push(line);
      continue;
    }
    buf.push(line);
  }
  flushBuf();

  return joined
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
