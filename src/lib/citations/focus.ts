/**
 * Detecta el numeral de artículo (o similar) cercano a una cita [N] en el
 * texto de la respuesta del chat. Sirve para llevar el modal de la fuente
 * DIRECTAMENTE al fragmento citado (ej: "Art. 125.2"), en lugar de mostrar
 * el chunk completo (que puede abarcar 125.1 + 125.2 + 125.3) y dar la
 * impresión de contradicción entre la respuesta y la cita.
 *
 * Reportado por César 08/07/2026 durante la reunión de revisión.
 *
 * Estrategia:
 * 1. Toma una ventana de ~120 chars ANTES del [N] y ~30 chars DESPUÉS.
 * 2. Busca patrones de numeral legal en ese contexto (por orden de
 *    especificidad, del más granular al más general):
 *      - "numeral 125.2 del artículo 125"    → "125.2"
 *      - "artículo 125.2"                    → "125.2"
 *      - "artículo 125"                      → "125"
 *      - "125.2 del Reglamento"              → "125.2"
 *      - "Art. 51"                           → "51"
 *      - "N° D000034-2026" (opinión / pronun) → "D000034-2026"
 * 3. Prefiere el patrón MÁS específico que aparece más cerca del [N]
 *    (la última mención antes del corchete suele ser la que se cita).
 */

const PATTERNS: Array<{ re: RegExp; key: string }> = [
  // Numeral compuesto tipo 125.2 o 125.2.3 (más específico)
  { re: /(?:numeral\s+|art[íi]culo\s+|art\.?\s*)(\d+(?:\.\d+){1,3})/gi, key: 'article_dotted' },
  // Numeral compuesto suelto (125.2) — solo si tiene punto
  { re: /\b(\d+\.\d+(?:\.\d+)?)\b/g, key: 'article_dotted_loose' },
  // Artículo entero: "artículo 125" / "art. 125" / "art 51"
  { re: /(?:art[íi]culo\s+|art\.?\s*)(\d+)\b/gi, key: 'article_int' },
  // Número de opinión/pronunciamiento tipo D000034-2026
  { re: /\bN[°º]\s*(D?\d{3,7}-\d{4}(?:[-/][A-Z]+)?)\b/g, key: 'doc_number' },
  // Literal/inciso: "literal a)" / "inciso 3"
  { re: /(?:literal\s+|inciso\s+)([a-z]|\d+)\)?/gi, key: 'literal' },
];

export interface FocusHint {
  /** El texto exacto que se debe destacar (ej: "125.2"). */
  value: string;
  /** Qué patrón matchó — útil para debugging / analytics. */
  kind: string;
}

/**
 * Busca el numeral citado en el contexto alrededor de la posición del
 * corchete `[N]` dentro del texto plano de la respuesta.
 *
 * @param text  Todo el content del mensaje (Markdown crudo).
 * @param pos   Índice donde comienza el `[N]` en ese texto.
 */
export function detectFocusHint(text: string, pos: number): FocusHint | null {
  // Ventana: 140 chars antes, 30 después. El artículo casi siempre está
  // ANTES del corchete ("... conforme al Art. 125.2 [3]").
  const start = Math.max(0, pos - 140);
  const end = Math.min(text.length, pos + 30);
  const window = text.slice(start, end);
  // Posición relativa del [ dentro de la ventana — usada para elegir
  // el match "más cercano al corchete".
  const bracketRelPos = pos - start;

  let best: (FocusHint & { distance: number; specificity: number }) | null = null;

  PATTERNS.forEach((p, i) => {
    // Cada patrón tiene una specificity implícita por su orden en el array
    // (los primeros son más específicos: "numeral 125.2" > "art. 125").
    const specificity = PATTERNS.length - i;
    const re = new RegExp(p.re.source, p.re.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(window)) !== null) {
      const value = m[1];
      if (!value) continue;
      // Distancia del match al corchete: preferimos el que está justo
      // antes de [N]. Si el match está DESPUÉS del corchete, penalizamos.
      const matchEnd = m.index + m[0].length;
      const distance =
        matchEnd <= bracketRelPos
          ? bracketRelPos - matchEnd
          : (m.index - bracketRelPos) * 2 + 200;

      if (
        !best ||
        specificity > best.specificity ||
        (specificity === best.specificity && distance < best.distance)
      ) {
        best = { value, kind: p.key, distance, specificity };
      }
    }
  });

  if (!best) return null;
  const { value, kind } = best as FocusHint & { distance: number; specificity: number };
  return { value, kind };
}
