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

// Detección de headings principales
const TITULO_RX = /^(T[ÍI]TULO\s+[IVXLCDM]+|CAP[ÍI]TULO\s+[IVXLCDM]+|SECCI[ÓO]N\s+[IVXLCDM]+|DISPOSICIONES\s+(?:GENERALES|FINALES|COMPLEMENTARIAS|TRANSITORIAS|COMPLEMENTARIAS\s+FINALES|COMPLEMENTARIAS\s+TRANSITORIAS)|ANEXO\s+[IVXLCDM\d]+)(\.?)(\s|$)/i;

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
 * Extrae número de página que quedó pegado al principio de línea.
 * Ej: "28Manual de usuario" → "Manual de usuario"
 * Ej: "35 XVI." → "XVI." (mantiene el numeral romano)
 * Ej: "Página | 35 XVI." → "XVI." (aplicado después del filtro)
 */
function stripPageNumberPrefix(line: string): string {
  // Solo si el número está seguido de letra sin espacio: "28Manual"
  return line.replace(/^(\d{1,3})(?=[A-ZÁÉÍÓÚÑ][a-zá-ú])/, '');
}

export function formatNormativaText(raw: string | null | undefined): string {
  if (!raw) return '';

  let text = raw;

  // 1. Re-unir guiones de salto al final de línea (artefacto PDF)
  text = text.replace(/-\n\s*(?=[a-záéíóúñü])/g, '');

  // 2. Quitar marcas de página inline dentro de párrafos
  text = text.replace(PAGE_INLINE_RX, ' ');

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
