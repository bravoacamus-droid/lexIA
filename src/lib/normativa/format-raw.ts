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
// Fix 08/07/2026: CUESTIONAMIENTO → CUESTIONAMIENTOS? (plural).
const SECCION_MAYUSCULA_RX = /^(ANTECEDENTES|CUESTIONAMIENTOS?|AN[ÁA]LISIS|CONCLUSI[ÓO]N|VISTO|RESULTA|CONSIDERANDO|SE\s+RESUELVE|POR\s+TANTO|EL\s+TRIBUNAL|MOTIVO\s+DE\s+LA\s+ELEVACI[ÓO]N|MATERIA|POSICI[ÓO]N|OPINI[ÓO]N|BASE\s+LEGAL|CONCLUSIONES|RECOMENDACIONES|MARCO\s+NORMATIVO)(\s|:|$)/i;

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
    // Prefijos comunes que preceden un cuadro y que deben absorberse en el
    // mismo replace para no dejar texto huérfano entre el título y la tabla.
    // Ejemplos: "ANEXO Nº 01-RTM CUADRO DE REQUERIMIENTO", "ANEXO N° 02-RTM
    // CRONOGRAMA DE ENTREGA", "CAPÍTULO III (...) 1.3. OBJETO DE LA
    // CONVOCATORIA (...)"
    const OPTIONAL_ANEXO_PREFIX =
      /(?:\s*(?:ANEXO\s+N[°º.]?\s*\d+[\-\s]*RTM\s+(?:CUADRO\s+DE\s+REQUERIMIENTO|CRONOGRAMA\s+DE\s+ENTREGA)\s*)?)/;

    // 1) Cuadro de requerimiento (SIGA/SISMED) → tabla markdown real
    //    Patrón: "[ANEXO Nº 01-RTM CUADRO DE REQUERIMIENTO]
    //             Nº COD. SIGA CODIGO SISMED DESCRIPCION UND. MED. CANTIDAD
    //             1 (...) (...) NOMBRE UNID 9400 2 (...) (...) NOMBRE UNID..."
    out = out.replace(
      new RegExp(
        OPTIONAL_ANEXO_PREFIX.source +
          /(?:N[°º.]|Nro\.?)\s*COD\.?\s*SIGA\s+CODIGO\s+SISMED\s+DESCRIPCION\s+UND\.?\s*MED\.?\s+CANTIDAD\s+((?:\d{1,3}\s+\(\.{3,}\)\s+\(\.{3,}\)\s+[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú0-9 ,.\-]+?\s+(?:UNID|UND|KG|ML|L|CM|MM)\s+\d+\s*)+)/
            .source,
        'gi',
      ),
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
        // La sintaxis GFM de tablas requiere \n entre filas + línea en blanco antes.
        const header = '| N° | Descripción | Unidad | Cantidad |';
        const sep = '|:---|:------------|:------:|---------:|';
        const body = rows.map(([n, desc, u, c]) => `| ${n} | ${desc} | ${u} | ${c} |`).join('\n');
        return `\n\n**Cuadro de requerimiento**\n\n${header}\n${sep}\n${body}\n\n`;
      },
    );

    // 2) Cronograma de entrega → tabla markdown
    //    Patrón: "[ANEXO Nº 02-RTM CRONOGRAMA DE ENTREGA]
    //             Nº DESCRIPCION 1º E 2º E ... 8º E CANTIDAD TOTAL
    //             1 NOMBRE_DESCRIPCION (...) (...) ... 9400"
    out = out.replace(
      new RegExp(
        OPTIONAL_ANEXO_PREFIX.source +
          /N[°º.]?\s*DESCRIPCION\s+(?:\d+º\s+E\s+){2,}(?:CANTI\s*DAD|CANTIDAD)\s*TOTAL\s+((?:\d{1,3}\s+[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-zá-ú0-9 ,.\-]+?\s+(?:\(\.{3,}\)\s*)+\d+\s*)+)/
            .source,
        'gi',
      ),
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
        const sep = '|:---|:------------|---------------:|';
        const body = rows.map(([n, desc, c]) => `| ${n} | ${desc} | ${c} |`).join('\n');
        return `\n\n**Cronograma de entrega**\n\n${header}\n${sep}\n${body}\n\n`;
      },
    );

    // 3) Colapsar series de "N° E" sueltas restantes (headers de cronograma
    //    que no matchearon el patrón anterior)
    out = out.replace(/(?:\d+º\s+E\s+){2,}(?:CANTI\s*DAD|CANTIDAD)?\s*(?:TOTAL)?/gi, '');

    // 4) "ANEXO Nº XX-RTM …" sueltos (los que quedaron sin cuadro detrás)
    //    Los convertimos a línea propia en negrita para que se lean como
    //    encabezado, no como texto plano en medio del párrafo.
    out = out.replace(
      /\s+(ANEXO\s+N[°º.]?\s*\d+[\-\s]*RTM\s+(?:CUADRO\s+DE\s+REQUERIMIENTO|CRONOGRAMA\s+DE\s+ENTREGA|ESPECIFICACI[ÓO]N))\b/gi,
      '\n\n**$1**\n\n',
    );
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

/**
 * Colapsa rachas de kerning ancho detectadas por tokens.
 * Ejemplo: "R e g l a m e n t o d e l a L e y" → "Reglamentodela Ley"
 * (Luego el post-procesamiento re-inserta espacios por casing.)
 */
function collapseKerning(text: string): string {
  // Procesar línea por línea para no cruzar bloques
  return text
    .split('\n')
    .map((line) => {
      const parts = line.split(' ');
      const result: string[] = [];
      let i = 0;
      while (i < parts.length) {
        // Ver si arranca una racha de tokens de 1 char
        if (parts[i].length === 1 && /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9°.,\-]/.test(parts[i])) {
          let j = i;
          while (
            j < parts.length &&
            parts[j].length === 1 &&
            /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9°.,\-]/.test(parts[j])
          ) {
            j++;
          }
          if (j - i >= 4) {
            // Colapsar la racha (umbral bajado de 5 a 4 para atrapar
            // secuencias más cortas del TUPA como "N ° 3 2 0")
            result.push(parts.slice(i, j).join(''));
            i = j;
            continue;
          }
        }
        result.push(parts[i]);
        i++;
      }
      return result.join(' ');
    })
    .join('\n');
}

function reunifyBrokenWords(text: string): string {
  let out = text;
  for (const [rx, replacement] of SPLIT_WORDS) {
    out = out.replace(rx, replacement);
  }

  // Kerning ancho — común en PDFs generados con software profesional
  // (InDesign, Acrobat) donde el texto tiene letter-spacing extra.
  // El extractor lee cada letra como token, quedando: "R e g l a m e n t o".
  //
  // Estrategia token-based: tokenizamos por espacios, detectamos rachas de
  // ≥5 tokens de longitud 1 (letras/dígitos/símbolos sueltos) y colapsamos
  // esa racha en una sola palabra sin espacios.
  //
  // Ejemplo real (TUPA del OECE):
  //   "R e g l a m e n t o d e l a L e y N ° 3 2 0 6 9 , L e y G e n e r a l"
  //   → primero: "Reglamentodela Ley N°32069, LeyGeneral"
  //   → después re-espaciado: "Reglamento de la Ley N° 32069, Ley General"
  out = collapseKerning(out);

  // Re-espaciado tras colapso: separar límites de palabra evidentes.
  //   Ejemplo tras colapsar: "Reglamentodela Ley N°32069, LeyGeneralde..."
  //   Queremos: "Reglamento de la Ley N° 32069, Ley General de..."
  out = out.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2'); // minúscula → Mayúscula
  out = out.replace(/\b(N)°(\d)/g, '$1° $2'); // "N°32069" → "N° 32069"
  // "General,Ley" → "General, Ley" (coma sin espacio tras separar)
  out = out.replace(/([a-záéíóúñ]),([A-ZÁÉÍÓÚÑ])/g, '$1, $2');
  // Palabras normativas específicas seguidas de dígitos (sin espacio):
  //   "Artículo381" → "Artículo 381", "Ley32069" → "Ley 32069",
  //   "Numeral381.5" → "Numeral 381.5", etc.
  // Solo aplicamos para el vocabulario típico de normativa para evitar
  // romper códigos alfanuméricos legítimos (RUC, DNI, PA42003A92, etc).
  out = out.replace(
    /\b(Art[íi]culo|Ley|Numeral|Reglamento|Decreto|Supremo|T[íi]tulo|Cap[íi]tulo|Secci[óo]n|Anexo|Directiva|Opini[óo]n|Pronunciamiento|p[áa]g)(\d)/gi,
    '$1 $2',
  );
  // Dígitos seguidos de palabra normativa capitalizada (>=4 letras):
  //   "381Reglamentodela" → "381 Reglamentodela"
  //   "24/06/2024 25Reglamento" → "24/06/2024 25 Reglamento"
  // No aplicamos si la palabra siguiente es corta (evita romper códigos
  // como PA42003A92 donde A + 92 son parte del código).
  out = out.replace(
    /(\d)(Art[íi]culo|Ley|Reglamento|Decreto|Supremo|T[íi]tulo|Cap[íi]tulo|Secci[óo]n|Anexo|Directiva|Opini[óo]n|Pronunciamiento|Numeral)\b/gi,
    '$1 $2',
  );
  // Nota: NO separamos conectoras internas ("de", "la", "el", "en", "al")
  // dentro de palabras porque generan falsos positivos rompiendo palabras
  // legítimas como "Reglamento" → "Reglam en to", "General" → "Gener al",
  // "Numeral" → "Numer al", "documento" → "docum en to". Preferimos dejar
  // "Reglamentodela Ley" (legible aunque no ideal) antes que corromper
  // palabras válidas del texto.

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

/**
 * Preposiciones/artículos comunes que legítimamente pueden iniciar un
 * chunk en minúscula. Cualquier OTRA palabra minúscula al inicio es
 * probablemente residuo de un corte a mitad de palabra por el chunker.
 */
const COMMON_LOWER_STARTS = new Set([
  'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en',
  'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin',
  'sobre', 'tras', 'salvo', 'excepto',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al',
  'y', 'e', 'o', 'u', 'ni', 'pero', 'sino', 'aunque', 'como', 'cuando',
  'donde', 'que', 'quien', 'cual', 'cuyo', 'cuya',
  'este', 'esta', 'esto', 'ese', 'esa', 'eso', 'aquel', 'aquella',
  'no', 'sí', 'se', 'lo', 'le', 'les', 'me', 'te', 'nos', 'os',
  'si', 'ya', 'aún', 'aun', 'muy', 'más', 'menos', 'tan', 'tanto',
  'i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.', 'ix.', 'x.',
]);

/**
 * Restaura los límites del chunk cuando el chunker cortó a mitad de
 * palabra. Prefija/sufija "…" para indicar que es fragmento.
 *
 * Auditoría 01/07/2026 sobre 12,292 chunks:
 *   · 4,616 (37.6%) empiezan mid-word con minúscula ("ecreto", "curso",
 *     "l/los", "ontrataciones", etc.)
 *   · 332 (2.7%) empiezan con símbolo/puntuación suelto (",", "-", ";")
 * Sin este helper, en el chunk-sheet el usuario ve estos residuos como
 * texto normal y confunde su lectura. Con "…" queda claro que es corte.
 */
function restoreChunkBoundaries(text: string): string {
  if (!text) return text;
  let out = text.replace(/^\s+|\s+$/g, '');
  if (!out) return out;

  // Inicio: si arranca con símbolo/puntuación, prefijar "…"
  //   ", según correspondan..." → "… , según correspondan..."
  //   "- Item..." se preserva (podría ser bullet legítimo)
  const firstChar = out[0];
  const isPunctStart = /^[,;:.)\]]/.test(firstChar);

  // Inicio: primera palabra en minúscula que NO es preposición/artículo común
  let isMidWordStart = false;
  if (/^[a-záéíóúñ]/.test(firstChar)) {
    const firstWord = out.split(/[\s.,;:!?)\]]/)[0].toLowerCase();
    if (!COMMON_LOWER_STARTS.has(firstWord)) {
      isMidWordStart = true;
    }
  }

  if (isPunctStart || isMidWordStart) {
    // Añadir "…" al inicio para señalar corte
    out = '… ' + out;
  }

  // Final: si termina abrupto (última letra alfanumérica sin puntuación),
  // sufijar "…" para señalar continuación.
  const lastChar = out[out.length - 1];
  if (/[a-záéíóúñA-ZÁÉÍÓÚÑ0-9)"]/.test(lastChar)) {
    out = out + ' …';
  }

  return out;
}

export function formatNormativaText(
  raw: string | null | undefined,
  opts: FormatOptions = {},
): string {
  const mode = opts.mode || 'strip';
  if (!raw) return '';

  let text = raw;

  // 0. Modo 'strip' (chunk-sheet): restaurar límites del chunk añadiendo "…"
  //    cuando el chunker cortó a mitad de palabra o dejó un símbolo suelto
  //    al inicio. Auditoría muestra que 37.6% de los chunks tienen ese bug.
  //    Solo aplica en strip porque display siempre recibe el doc completo.
  if (mode === 'strip') {
    text = restoreChunkBoundaries(text);
  }

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

  // Nombres de secciones (para prefijo numérico o romano opcional).
  // Fix César 08/07/2026: agregado plural `CUESTIONAMIENTOS?` — antes
  // `CUESTIONAMIENTO\b` no matcheaba "CUESTIONAMIENTOS" (con S) porque
  // el `\b` requería fin de palabra justo después de "O". Como los
  // pronunciamientos usan indistintamente singular/plural en el título
  // de sección, la sección "2. CUESTIONAMIENTOS" quedaba inline sin
  // convertirse en heading.
  const SECCION_NAMES =
    'ANTECEDENTES|CUESTIONAMIENTOS?|CUESTIONAMIENTOS?\\s+[ÚU]NICO|AN[ÁA]LISIS|POSICI[ÓO]N|OPINI[ÓO]N|CONCLUSI[ÓO]N|CONCLUSIONES|RECOMENDACIONES|BASE\\s+LEGAL|MARCO\\s+NORMATIVO|MATERIA|PRONUNCIAMIENTO';

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

  // 4a) Insertar salto ANTES de "Artículo N.- ..." (con o sin guión) que
  //     aparece INLINE en un blob. Común en Códigos (Ética), Directivas,
  //     Leyes y Reglamentos donde el PDF viene todo pegado.
  //     ARTICULO_RX (línea completa) ya lo detecta, pero solo si está al
  //     INICIO de una línea propia — como el raw viene en 1 línea, nunca
  //     activa. Insertamos \n\n antes de cada aparición inline.
  //     El char anterior puede ser cualquier cosa (letra, punto, `)`, etc.)
  //     menos newline, porque si ya hay salto no queremos duplicar.
  text = text.replace(
    /([^\n])\s+(Art[íi]culo\s+\d{1,3}(?:[.\-]|\s))/g,
    '$1\n\n$2',
  );

  // 4a-bis) Insertar salto ANTES de "TÍTULO {romano} {Palabra Capitalizada}"
  //         (patrón común: "TÍTULO II Principios Generales", "TÍTULO III
  //         Revelación del Árbitro"). Los ya cubiertos por SECCION_NAMES
  //         requieren nombres específicos; este cubre cualquier título.
  text = text.replace(
    /([^\n])\s+(T[ÍI]TULO\s+[IVXLCDM]+\s+[A-ZÁÉÍÓÚ][A-Za-zÁÉÍÓÚñáéíóú]+)/g,
    '$1\n\n$2',
  );

  // 4a-ter) Sub-numerales inline "4.1", "5.1.", "6.2 El árbitro..."
  //         Capturamos la última PALABRA antes del sub-numeral. Si esa
  //         palabra es "artículo/numeral/literal/inciso/..." (contexto
  //         de cita cruzada), NO transformamos.
  //         Emitimos "**N.M** Contenido" (negrita como sub-heading) solo
  //         para inicios de sección legítimos.
  const CITE_WORDS = new Set([
    'artículo', 'articulo', 'art', 'art.',
    'numeral', 'numeral.',
    'literal', 'lit', 'lit.',
    'inciso', 'apartado',
    'párrafo', 'parrafo', 'párrafo.',
    'acápite', 'acapite',
    'subnumeral', 'subart', 'subart.',
    'subartículo', 'subarticulo',
    'ley', 'reglamento',
  ]);
  text = text.replace(
    /(\S+)(\s+)(\d{1,3}\.\d{1,3}[.)]?)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ])/g,
    (_full, prevWord: string, spc: string, num: string, after: string) => {
      const lowerPrev = prevWord.toLowerCase().replace(/[,;:"'()\[\]]/g, '');
      if (CITE_WORDS.has(lowerPrev)) return _full; // no tocar citas
      // Si prevWord es también un número (ej: "22 22.2"), tampoco tocar
      if (/^\d+$/.test(prevWord)) return _full;
      return `${prevWord}\n\n**${num}** ${after}`;
    },
  );

  // Los siguientes fixes solo se aplican en modo 'display' (biblioteca).
  // En modo 'strip' (chunk-sheet / RAG) mantenemos el texto compacto para
  // no diluir el fragmento con listas expandidas.
  if (mode === 'display') {
    // 4b) ÍNDICE CON PUNTOS DE RELLENO — patrón muy común en Bases Estándar,
    //     Manuales SEACE y textos íntegros consolidados:
    //         "Introducción............ 6 2.1. Ingreso...... 8 3. Requerimiento... 12"
    //     Convertimos a lista de índice con formato "- N°ref Nombre … p. N°"
    //     Solo si detectamos 3+ ocurrencias de "..... digit" (evita falsos
    //     positivos donde alguien escribe "... 5" como cita).
    //
    //     El prefijo numérico opcional (2., 3.1., 3.1.1.) se consume dentro
    //     del match — si no, quedaría colgado entre bullets y se pegaría al
    //     "**" de cierre del anterior, produciendo "**p. 12****3.1." (bug
    //     reportado por César en el Manual de Contratos Menores).
    const indexHits = (text.match(/\.{3,}\s*\d+/g) || []).length;
    if (indexHits >= 3) {
      // OJO: la clase de caracteres DEBE incluir tildes minúsculas
      // (á, é, í, ó, ú, ñ) sino palabras como "Introducción", "difusión",
      // "área" rompen el match a mitad y quedan sin bullet.
      text = text.replace(
        /(?:\d+(?:\.\d+)*\.?\s+)?([A-ZÁÉÍÓÚÑ"“][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ,.:()"“”'`°/–\-]{3,120}?)\s*\.{3,}\s*(\d{1,4})(?=\s|$)/g,
        '\n- $1 … **p. $2**\n',
      );
    }

    // 4c) LISTA DE DIRECTIVAS/RESOLUCIONES — Tablero Normativo OECE tiene
    //     todo pegado: "Directiva N° 0004-2025-EF/54.01 - Foo Resolución
    //     Directoral N° 0013-2025... Directiva N° 0003-2025..." Insertar
    //     salto ANTES de cada instrumento normativo referenciado.
    const NORM_INSTRUMENTS =
      /\b(Directiva\s+N[°º.]?\s*\d{3,4}-\d{4}-EF\/\d+(?:\.\d+)?|Resoluci[óo]n\s+Directoral\s+N[°º.]?\s*\d{3,4}-\d{4}-EF\/\d+(?:\.\d+)?|Ley\s+N[°º.]?\s*\d{4,5}|Decreto\s+Supremo\s+N[°º.]?\s*\d{3}-\d{4}-EF)/gi;
    const instrumentHits = (text.match(NORM_INSTRUMENTS) || []).length;
    if (instrumentHits >= 4) {
      text = text.replace(NORM_INSTRUMENTS, (m) => `\n- **${m}**`);
    }

    // 4d) TABLA MASIVA DE ENTIDADES CON RUC — común en ANEXOs de compras
    //     corporativas. Detectamos 15+ RUCs (11 dígitos, empiezan con 20)
    //     y separamos cada renglón por RUC.
    const rucHits = (text.match(/\b20\d{9}\b/g) || []).length;
    if (rucHits >= 15) {
      text = text.replace(/\s+(20\d{9})\s+/g, '\n- **RUC $1** — ');
    }

    // 4e) TUPA — cada procedimiento empieza con "N° {num}" (N° 4, N° 5...)
    //     Detectamos ≥8 ocurrencias de "N° \d " y las convertimos en items.
    //     Solo aplicar cuando el número tiene 1-3 dígitos (evita romper leyes
    //     como "N° 32069", "N° 27444" y "N° 009-2025-EF" que ya se separan
    //     con instrumentos).
    const tupaHits = (text.match(/\bN[°º.]\s*\d{1,3}(?=\s+[A-ZÁÉÍÓÚÑ])/g) || []).length;
    if (tupaHits >= 8) {
      text = text.replace(/\s+(N[°º.]\s*\d{1,3})\s+(?=[A-ZÁÉÍÓÚÑ])/g, '\n\n**$1** ');
    }

    // 4f) FAQ — cada pregunta "¿...?" en su propia línea como H3.
    //     Común en el FAQ SEACE (46 preguntas pegadas). Detectamos ≥4
    //     preguntas para evitar falsos positivos en textos que citen una
    //     pregunta ocasional.
    const questionHits = (text.match(/¿[^?¿]{5,150}\?/g) || []).length;
    if (questionHits >= 4) {
      text = text.replace(/\s*(¿[^?¿]{5,150}\?)\s*/g, '\n\n### $1\n\n');
    }

    // 4g) ANEXO I, ANEXO II, ANEXO N° X → H2 (heading destacado).
    //     Cubre inicio de texto o cualquier posición inline.
    //     Se emite dos regex: uno para inicio (^ANEXO ...) y otro inline.
    //     No sobrescribir si ya viene como "## ANEXO".
    text = text.replace(
      /(?<!##\s)\bANEXO\s+(?:N[°º.]?\s*)?([IVXLCDM]+|\d+)(?:\s*[:\-]\s*("[^"]{3,100}"|[A-ZÁÉÍÓÚÑ][^\n.:]{3,120}))?/g,
      (match, num: string, title: string | undefined) => {
        const cleanTitle = title ? ` — ${title.replace(/^"|"$/g, '')}` : '';
        return `\n\n## ANEXO ${num}${cleanTitle}\n\n`;
      },
    );

    // 4h) Corregir ":" sobrante al inicio de un párrafo tras un heading
    //     que originalmente terminaba con ":". Ejemplo:
    //       ## I. ANTECEDENTES:
    //       : 1. De acuerdo a la información...
    //     Debe quedar como:
    //       ## I. ANTECEDENTES
    //       1. De acuerdo a la información...
    text = text.replace(/^:\s*/gm, '');
    // También limpiar ":" al final de headings (## Titulo: → ## Titulo)
    text = text.replace(/^(#{1,3}\s.+):\s*$/gm, '$1');
  }

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

  // 7b) NOTAS AL PIE embebidas en el texto — los pronunciamientos y
  //     opiniones traen las notas al pie del PDF pegadas inline en
  //     medio del párrafo, con formato "N Mediante el Expediente ..."
  //     (donde N es el número de la nota). Feedback César 08/07/2026:
  //     se ven horrible mezcladas con el texto legal. Las separamos a
  //     un blockquote con formato de nota al pie.
  //     Patrón: puntuación fuerte + espacio + número 1-2 dígitos +
  //     espacio + palabra típica de nota ("Mediante", "Cabe", "El",
  //     seguida de "Expediente" u "Oficio" en los próximos 200 chars).
  //     El fin de la nota es el primer `.` que NO esté seguido de
  //     dígito o `°` (evita cortar "N.°" o "N.° 2026-..." que son
  //     abreviaciones legítimas dentro de la propia nota).
  //     Loopeamos hasta que no haya más cambios: cuando hay 3 notas
  //     consecutivas (nota3, nota2, nota1) el primer replace consume
  //     la nota3 y avanza el cursor DESPUÉS de su punto final, dejando
  //     " 2 Mediante..." (con espacio, no puntuación) que no matchea.
  //     Re-iterar con el output del pass anterior sí las captura.
  const NOTA_RX =
    /(^|[.;\n])\s*(\d{1,2})\s+(Mediante|Cabe\s+precisar|El\s+part[íi]cipe)\s+(el\s+|la\s+|los\s+|las\s+)?(Expediente|Oficio|Formulario|N\.?°?)\b((?:[^.]|\.(?=\d|°))*\.)/gi;
  for (let pass = 0; pass < 4; pass++) {
    const before = text;
    text = text.replace(NOTA_RX, (_full, boundary, num, verb, art, doc, rest) => {
      const prefix = boundary && boundary !== '\n' && boundary !== '' ? `${boundary}\n\n` : '\n\n';
      return `${prefix}> ⁽${num}⁾ ${verb} ${art || ''}${doc}${rest}\n\n`;
    });
    if (text === before) break;
  }

  // 7b-bis) Después de mover notas al pie, pueden quedar dígitos
  // sueltos huérfanos (el "1" residual que aparece entre paréntesis
  // en el input tras "2026-0069318. 1 2. CUESTIONAMIENTOS").
  // Los eliminamos si están en línea propia.
  text = text.replace(/\n\s*\d{1,2}\s*\n/g, '\n');

  // 7c) Doble ":" seguido en "Cuestionamiento N.° 1: :" ("Cuestionamiento N.° X: :")
  //     — bug de extracción cuando el PDF tenía la cita en negrita
  //     seguida por ":" y el extractor duplicó el separador.
  text = text.replace(/(Cuestionamiento\s+N\.?°?\s*\d+)\s*:\s*:\s*/gi, '$1: ');

  // 7d) "Cuestionamiento N.° N:" o "Cuestionamiento Único" inline →
  //     convertir a heading H3 con salto propio para que se vea como
  //     sub-sección de "2. CUESTIONAMIENTOS". Cubre variantes:
  //       - "Cuestionamiento N.° 1:"
  //       - "Cuestionamiento Único Respecto a..."
  //       - "Cuestionamiento Primero"
  //     Cuando la variante NO trae ":" al final, dejamos que el
  //     próximo blob quede como párrafo (no consumimos el ":").
  text = text.replace(
    /([^\n])\s+(Cuestionamiento\s+(?:N\.?°?\s*\d+|[ÚU]nico|Primero|Segundo|Tercero|Cuarto|Quinto))(\s*:|\s+(?=[A-ZÁÉÍÓÚ]))/gi,
    (_full, prev, header, terminator) => {
      const cleanTerminator = terminator.trim() === ':' ? '' : ' ';
      return `${prev}\n\n### ${header}\n${cleanTerminator}`;
    },
  );

  // 7e) Bullets Unicode (●, •, ○, etc.) huérfanos al final de línea
  //     — quedan pegados al párrafo anterior porque la regla 5
  //     inserta \n ANTES del bullet, pero si el contenido siguiente
  //     ya recibió otro salto (por regla 7d, headings, etc.), el
  //     bullet queda vagando sin item. Los eliminamos.
  text = text.replace(/\s+[●○◦•▪]\s*(?=\n)/g, '');
  // También bullets al final del texto sin nada después.
  text = text.replace(/\s+[●○◦•▪]\s*$/g, '');

  // 7f) Bullets guión medio inline dentro del texto (típico en
  //     pronunciamientos): "señalar que: - Este Organismo... - De
  //     conformidad... - Corresponderá...". El PDF usa "- " como
  //     separador de items pero queda todo en una línea.
  //     Detectamos ": -" o ". -" seguido de espacio + Mayúscula.
  //     La `<` del regex requiere que sean bullets reales, no
  //     rangos numéricos ("5-10 unidades") ni fechas ("2026-05").
  text = text.replace(
    /([.:;])\s+-\s+([A-ZÁÉÍÓÚ][a-záéíóúñ])/g,
    '$1\n\n- $2',
  );
  // Bullets guión medio siguientes en la misma serie: cuando ya hay
  // "- Item1. - Item2" (después del primer split), buscamos "- " que
  // NO esté al inicio de línea y viene tras un `.` de item previo.
  text = text.replace(
    /(\.)\s+-\s+([A-ZÁÉÍÓÚ][a-záéíóúñ])/g,
    '$1\n- $2',
  );

  // 7g) Notas al pie residuales tipo "(nota N - Expediente N.° YYYY-XXXX."
  //     que quedaron del extractor sin cerrar el paréntesis. Las
  //     movemos igual a un blockquote con superíndice. Loop hasta
  //     convergencia.
  const NOTA_RESIDUAL_RX =
    /\s*\(?\s*nota\s+(\d{1,2})\s*[-–]\s*(Expediente|Oficio|Formulario|N\.?°?)\b((?:[^.]|\.(?=\d|°))*\.\)?)/gi;
  for (let pass = 0; pass < 4; pass++) {
    const before = text;
    text = text.replace(NOTA_RESIDUAL_RX, (_full, num, doc, rest) => {
      // Cerrar paréntesis si quedó abierto
      const cleanRest = rest.endsWith(')') ? rest.slice(0, -1) : rest;
      return `\n\n> ⁽${num}⁾ ${doc}${cleanRest}\n\n`;
    });
    if (text === before) break;
  }

  // 7h) Conectores discursivos comunes en pronunciamientos y opiniones
  //     — son los que naturalmente inician un párrafo nuevo. Los
  //     pronunciamientos vienen del PDF como un único blob; separar
  //     por conectores le da respiración visual sin romper la
  //     coherencia (el conector siempre marca cambio de argumento).
  //
  //     Fix César 08/07/2026: aún después de las mejoras estructurales
  //     (headings, notas al pie), los párrafos entre secciones seguían
  //     siendo bloques de 2000+ chars sin puntos de respiro.
  const CONECTORES = [
    'Al\\s+respecto',
    'Por\\s+su\\s+parte',
    'En\\s+ese\\s+sentido',
    'De\\s+otro\\s+lado',
    'Ahora\\s+bien',
    'Asimismo',
    'Adicionalmente',
    'Cabe\\s+(?:se[ñn]alar|precisar|indicar|a[nñ]adir|mencionar|resaltar|destacar)',
    'En\\s+atenci[óo]n\\s+a\\s+lo\\s+(?:precisado|expuesto|indicado|se[ñn]alado)',
    'Sobre\\s+el\\s+particular',
    'Por\\s+(?:tanto|lo\\s+tanto)',
    'En\\s+virtud\\s+de',
    'De\\s+conformidad\\s+con',
    'En\\s+consecuencia',
    'En\\s+efecto',
    'Por\\s+consiguiente',
    'No\\s+obstante',
    'Sin\\s+embargo',
    'En\\s+tal\\s+sentido',
    'A\\s+mayor\\s+abundamiento',
    'De\\s+la\\s+revisi[óo]n',
  ].join('|');
  text = text.replace(
    new RegExp(`([.!?])\\s+(${CONECTORES})[,\\s]`, 'g'),
    (_full, punct, conn) => `${punct}\n\n${conn}${_full.endsWith(',') ? ',' : ' '}`,
  );

  // 7i) "Pronunciamiento" al inicio de una nueva sección analítica
  //     (después de la posición del participante). Común en
  //     pronunciamientos OECE: "el ítem 2. Pronunciamiento De la
  //     revisión..." → separar como sub-heading H3.
  text = text.replace(
    /([.!?])\s+(Pronunciamiento)\s+(De\s+la\s+revisi[óo]n)/g,
    '$1\n\n### $2\n\n$3',
  );

  // 7j) Sub-numerales inline "3.1. Título", "3.2. Título" (frecuente en
  //     Bases Integradas / Sección Específica). Si NO están precedidos
  //     por palabras de cita (artículo, numeral, literal...) y la
  //     próxima palabra empieza con mayúscula, los ponemos como bold
  //     sub-heading en su propia línea.
  //     La regla 4a-ter existente cubre esto pero solo el patrón exacto
  //     "\\S+(\\s+)(\\d\\.\\d)"; aquí ampliamos para "3.1." (con punto)
  //     y "3.1)" (con paréntesis) e igual capturamos.
  //     No aplicamos si es referencia interna ("del numeral 2.3", "el
  //     artículo 46.1"), controlado por el guard de palabras clave.

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
    // Preservar líneas en blanco — remarkGfm necesita línea vacía
    // ANTES del header de una tabla para reconocerla como tabla.
    // (Fix crítico 30/06/2026: sin esto, tablas del cuadro de
    //  requerimiento salían como texto plano con caracteres `|`.)
    if (line.trim() === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }

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
  // Helper: garantiza línea en blanco antes del próximo push si el
  // último elemento del joined NO es ya vacío. Necesario para que
  // remarkGfm reconozca tablas y encabezados que van pegados a prosa.
  function ensureBlankBefore() {
    if (joined.length > 0 && joined[joined.length - 1] !== '') {
      joined.push('');
    }
  }

  let prevWasTableRow = false;
  for (const line of out) {
    if (line === '' || line === '---') {
      flushBuf();
      if (line === '' && joined.length > 0 && joined[joined.length - 1] === '') {
        // no duplicar líneas vacías
      } else {
        joined.push(line);
      }
      prevWasTableRow = false;
      continue;
    }
    const isTableRow = line.startsWith('|');
    if (
      line.startsWith('#') ||
      line.startsWith('- ') ||
      line.startsWith('   - ') ||
      line.startsWith('**') ||
      isTableRow ||
      line.startsWith('>') ||
      NUM_LISTA_RX.test(line)
    ) {
      flushBuf();
      // Fila de tabla: SIEMPRE necesita línea vacía antes del header.
      // Si la línea anterior no era también fila de tabla, insertamos ''.
      if (isTableRow && !prevWasTableRow) {
        ensureBlankBefore();
      }
      joined.push(line);
      prevWasTableRow = isTableRow;
      continue;
    }
    // Salida de un bloque de tabla → línea vacía para cerrar la tabla
    if (prevWasTableRow) {
      ensureBlankBefore();
      prevWasTableRow = false;
    }
    buf.push(line);
  }
  flushBuf();
  // Si el documento termina en tabla, cerrar con línea vacía
  if (prevWasTableRow) ensureBlankBefore();

  return joined
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
