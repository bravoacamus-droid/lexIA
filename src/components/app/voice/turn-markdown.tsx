'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  text: string;
}

/**
 * Renderiza el texto de un turno de la transcripción de voz con el
 * MISMO estilo del chat (prose-lexia). Feedback César 30/06/2026:
 * "también para las transcripciones de las llamadas".
 *
 * Convierte listas numeradas inline ("1. Publicación... 2. Formulación...")
 * en listas markdown formales, y párrafos separados en párrafos reales.
 */
export function TurnMarkdown({ text }: Props) {
  const md = normalizeTurnText(text);
  return (
    <div className="prose-lexia">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  );
}

/**
 * El texto transcrito de voz viene continuo (una línea gigante). Lo
 * normalizamos insertando saltos ANTES de:
 *  - "N. Palabra:" (numeración con dos puntos)
 *  - "N. **Palabra**" (numeración con negrita)
 *  - Puntos de introducción de listas
 * Similar al preprocesamiento que hicimos para format-raw.ts.
 */
function normalizeTurnText(text: string): string {
  let t = text;

  // "Fase 1:" "Fase 2:" en negrita
  t = t.replace(/([.!?])\s+(Fase\s+\d+\s*[:.])/g, '$1\n\n**$2**');

  // "1. Publicación:" → "1. **Publicación:**"
  t = t.replace(/([.!?])\s+(\d{1,2}\.\s+)([A-ZÁÉÍÓÚ][^:.]{3,50}:)/g, '$1\n\n$2**$3**');

  // Sub-numerales inline "51.2" al inicio de oración
  t = t.replace(/([.!?])\s+(\d{1,3}\.\d{1,3}\.\s)/g, '$1\n\n**$2**');

  // Doble espacio → salto (a veces la transcripción usa doble espacio como separador)
  t = t.replace(/\s{3,}/g, '\n\n');

  return t.trim();
}
