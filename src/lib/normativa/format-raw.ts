/**
 * Convierte el texto plano extraído de PDFs normativos en markdown
 * estructurado para que ReactMarkdown lo renderice con jerarquía
 * visual (headings, párrafos, listas).
 *
 * Los `raw_text` ingestados a normative_documents salen del extractor
 * de PDF sin estructura — solo párrafos con saltos de línea. Esto
 * hace que la vista del documento se vea como "texto plano
 * computarizado", queja explícita de César el 28/06/2026.
 *
 * Transformaciones aplicadas (en orden):
 *   1. TÍTULO / CAPÍTULO / SECCIÓN al inicio de línea → "# TÍTULO X"
 *   2. Artículo X | Artículo X.Y al inicio de línea → "## Artículo X.Y"
 *   3. Numerales "1." "2." "3." al inicio de línea → lista ordenada
 *   4. Doble salto de línea preservado entre párrafos
 *   5. Líneas que terminan con un guión + espacio se unen al siguiente
 *      (artefacto típico de PDF: "estatu-\ntario" → "estatutario").
 *
 * El resultado siempre es un string válido para ReactMarkdown. Si el
 * texto ya tiene estructura markdown previa, no se rompe.
 */

const ARTICULO_RX = /^(Art[íi]culo\s+\d+(?:\.\d+)*\.?)(\s|$)/;
const TITULO_RX = /^(T[ÍI]TULO\s+[IVXLCDM]+|CAP[ÍI]TULO\s+[IVXLCDM]+|SECCI[ÓO]N\s+[IVXLCDM]+|DISPOSICIONES\s+(?:GENERALES|FINALES|COMPLEMENTARIAS|TRANSITORIAS))(\.?)(\s|$)/i;
const NUMERAL_LISTA_RX = /^(\d{1,2}[.)])\s+/;

export function formatNormativaText(raw: string | null | undefined): string {
  if (!raw) return '';

  let text = raw;

  // 1. Re-unir guiones de salto al final de línea (artefacto PDF)
  text = text.replace(/-\n\s*/g, '');

  // 2. Normalizar 3+ saltos a doble salto (separador de párrafo)
  text = text.replace(/\n{3,}/g, '\n\n');

  // 3. Procesar línea por línea
  const lines = text.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      out.push('');
      continue;
    }

    // Título / Capítulo / Sección → H1 con espaciado
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
      // Si el resto de la línea tras "Artículo X." es una sumilla
      // ("Artículo 51. Difusión del requerimiento"), todo va en el heading.
      out.push(`## ${line}`);
      continue;
    }

    // Numerales sueltos al inicio → mantener (markdown los detectará)
    if (NUMERAL_LISTA_RX.test(line)) {
      out.push(line);
      continue;
    }

    // Línea normal
    out.push(line);
  }

  // 4. Recombinar respetando que las líneas dentro de un mismo párrafo
  //    a veces quedan separadas por un solo \n (no doble). Para que
  //    markdown las renderice como UN párrafo, las unimos con espacio
  //    cuando ambas son texto normal (no son headings ni listas).
  const joined: string[] = [];
  let buf: string[] = [];
  function flushBuf() {
    if (buf.length > 0) {
      joined.push(buf.join(' '));
      buf = [];
    }
  }
  for (const line of out) {
    if (line === '') {
      flushBuf();
      joined.push('');
      continue;
    }
    if (line.startsWith('#') || NUMERAL_LISTA_RX.test(line)) {
      flushBuf();
      joined.push(line);
      continue;
    }
    buf.push(line);
  }
  flushBuf();

  return joined.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
