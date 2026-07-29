/**
 * Extrae la referencia normativa (artículo / numeral / literal) de un
 * snippet de chunk para mostrarla junto a la fuente.
 *
 * Observación César (27/07/2026): "la opinión a veces son textos de
 * cuatro o seis páginas y no me enmarca en qué numeral... en cambio con
 * la ley sí: literal c) del artículo 20". Con esta referencia el chip de
 * fuente dice "Opinión D000040 · num. 2.1.2" y el usuario se ubica sin
 * abrir el documento.
 */
export function extractSnippetRef(snippet: string): string | null {
  if (!snippet) return null;
  const s = snippet.slice(0, 600); // el encabezado del chunk suele estar al inicio

  // FAQ OECE: "[FAQ OECE — Pregunta 2.1]"
  const faq = s.match(/Pregunta\s+(\d+\.\d+)/i);
  if (faq) return `Pregunta ${faq[1]}`;

  // "literal c) del artículo 20"
  const lit = s.match(/literal\s+([a-z])\)?\s+del\s+art[íi]culo\s+(\d+)/i);
  if (lit) return `lit. ${lit[1]}) art. ${lit[2]}`;

  // "artículo 120.1" / "Artículo 89" / "Art. 364.5"
  const art = s.match(/art[íi]culo\s+(\d{1,3}(?:\.\d{1,2})*)|art\.?\s+(\d{1,3}(?:\.\d{1,2})*)/i);

  // "numeral 2.1.2" explícito
  const num = s.match(/numeral(?:es)?\s+(\d{1,3}(?:\.\d{1,2}){1,3})/i);

  // Numeral "suelto" al inicio del chunk: "89.5. En caso de..." o
  // "2.1.2. Sobre la consulta..." — típico de leyes y opiniones.
  const lead = s.match(/^\s*(\d{1,3}\.\d{1,2}(?:\.\d{1,2})?)[.\s]/);

  // Prioridad: numeral explícito > numeral al inicio > artículo.
  // (el numeral ubica más fino que el artículo)
  if (num) return `num. ${num[1]}`;
  if (lead) return `num. ${lead[1]}`;
  if (art) return `art. ${art[1] || art[2]}`;
  return null;
}
