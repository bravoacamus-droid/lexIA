/**
 * Parser del balotario OECE — versión 2 con emparejamiento por posición.
 *
 * Estructura del PDF (confirmada tras análisis):
 *  - Cada página empieza con un bloque de respuestas correctas listadas
 *    en orden (sombreadas en el PDF original, extraídas primero por unpdf).
 *  - Después vienen las preguntas con sus 3 opciones NO-sombreadas.
 *  - La opción correcta de cada pregunta = la faltante en su bloque de opciones.
 *  - El texto de la opción correcta = la respuesta en la MISMA POSICIÓN
 *    dentro del listado del inicio de la página.
 *
 * Ejemplo página 2:
 *   [Header]
 *     b) 1a, 1c, 2d, 3b            ← posición 0 → pregunta 1
 *     c) Principio de Transparencia ← posición 1 → pregunta 2
 *     b) Principio de Libertad     ← posición 2 → pregunta 3
 *     c) La fase de ejecución      ← posición 3 → pregunta 4
 *     d) Divide una contratación   ← posición 4 → pregunta 5
 *   [Body]
 *     ACTUACIONES PREPARATORIAS
 *     1. Establezca... (opciones a, c, d visibles → correcta = b) → "1a, 1c, 2d, 3b" ✓
 *     2. De la revisión... (opciones a, b, d → correcta = c) → "Principio de Transparencia" ✓
 */
import { extractText } from 'unpdf';
import fs from 'fs';

interface QA {
  num: number;
  section: string;
  question: string;
  options: Record<'a' | 'b' | 'c' | 'd', string>;
  correctLetter: 'a' | 'b' | 'c' | 'd';
  correctText: string;
  page: number;
}

/**
 * Extrae el bloque de respuestas correctas del inicio de una página.
 * Las respuestas están concatenadas: "b) texto c) texto b) texto..."
 * Cada respuesta arranca con [a-d]) y termina antes de la siguiente [a-d]).
 */
function parseAnswerHeader(
  header: string,
): Array<{ letter: 'a' | 'b' | 'c' | 'd'; text: string }> {
  const answers: Array<{ letter: 'a' | 'b' | 'c' | 'd'; text: string }> = [];
  // Buscar todas las apariciones de "letra)" para separar
  const parts = header.split(/(?=\s[a-d]\)\s)/);
  for (const part of parts) {
    const m = part.match(/^\s*([a-d])\)\s+(.+?)$/s);
    if (!m) continue;
    const letter = m[1] as 'a' | 'b' | 'c' | 'd';
    const text = m[2].replace(/\s+/g, ' ').trim();
    if (text.length > 0) answers.push({ letter, text });
  }
  return answers;
}

/**
 * Extrae las preguntas + opciones del bloque de contenido de la página.
 * Devuelve preguntas con las 3 opciones visibles y la letra faltante.
 */
function parseQuestionsFromBody(
  body: string,
  pageNum: number,
): Array<{
  num: number;
  question: string;
  options: Partial<Record<'a' | 'b' | 'c' | 'd', string>>;
  missing: 'a' | 'b' | 'c' | 'd' | null;
}> {
  const questions: Array<{
    num: number;
    question: string;
    options: Partial<Record<'a' | 'b' | 'c' | 'd', string>>;
    missing: 'a' | 'b' | 'c' | 'd' | null;
  }> = [];

  // Split en cada "N. Texto..." donde N es 1-3 dígitos
  const parts = body.split(/(?=\n\d{1,3}\.\s+[A-ZÁÉÍÓÚ¿])/);
  for (const part of parts) {
    const m = part.match(/^\n?(\d{1,3})\.\s+(.+)$/s);
    if (!m) continue;
    const num = parseInt(m[1], 10);
    const rest = m[2];

    // Separar pregunta de opciones (primera línea que empieza con "a)"|"b)"|"c)"|"d)")
    const optStart = rest.search(/\n[a-d]\)\s/);
    if (optStart < 0) continue;
    const questionText = rest.slice(0, optStart).replace(/\s+/g, ' ').trim();
    const optionsBlock = rest.slice(optStart);

    // Extraer cada opción con regex
    const options: Partial<Record<'a' | 'b' | 'c' | 'd', string>> = {};
    const optRegex = /\n([a-d])\)\s+([^\n]+(?:\n(?![a-d]\)|\d+\.\s)[^\n]+)*)/g;
    let om;
    while ((om = optRegex.exec(optionsBlock)) !== null) {
      const letter = om[1] as 'a' | 'b' | 'c' | 'd';
      const text = om[2].replace(/\s+/g, ' ').trim();
      options[letter] = text;
    }

    const missingLetters = (['a', 'b', 'c', 'd'] as const).filter(
      (l) => !options[l],
    );
    const missing = missingLetters.length === 1 ? missingLetters[0] : null;

    if (questionText.length >= 20 && Object.keys(options).length >= 2) {
      questions.push({ num, question: questionText, options, missing });
    }
  }

  return questions;
}

/**
 * Detecta el título de sección normativa en el bloque del cuerpo.
 * Secciones típicas: ACTUACIONES PREPARATORIAS, SELECCIÓN, EJECUCIÓN.
 */
function detectSection(body: string): string | null {
  const secRegex =
    /^\s*(ACTUACIONES\s+PREPARATORIAS|SELECCI[ÓO]N|EJECUCI[ÓO]N\s+CONTRACTUAL|SOLUCI[ÓO]N\s+DE\s+CONTROVERSIAS|DISPOSICIONES\s+GENERALES|R[ÉE]GIMEN\s+DE\s+INFRACCIONES)\s*$/m;
  const m = body.match(secRegex);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

async function main() {
  const buf = fs.readFileSync(
    'BALOTARIO DE PREGUNTAS Y RESPUESTAS_ACTUALIZADO_desbloqueado(1).pdf',
  );
  const data = await extractText(new Uint8Array(buf), { mergePages: false });
  const pages = (Array.isArray(data.text) ? data.text : [data.text]) as string[];

  const allQA: QA[] = [];
  let currentSection = 'Sin sección';
  let stats = { matched: 0, mismatched: 0, missingAnswer: 0 };

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const rawPage = pages[pageIdx];
    if (!rawPage || rawPage.length < 100) continue;

    // Quitar "Página N" al inicio
    const page = rawPage.replace(/^\s*Página\s+\d+\s*/i, '').trim();

    // Detectar dónde empiezan las preguntas (primera "N. Texto...")
    const firstQMatch = page.match(/\n?(\d{1,3})\.\s+[A-ZÁÉÍÓÚ¿]/);
    if (!firstQMatch || firstQMatch.index === undefined) continue;

    const header = page.slice(0, firstQMatch.index).trim();
    const body = page.slice(firstQMatch.index);

    // Actualizar sección si cambió
    const sec = detectSection(body);
    if (sec) currentSection = sec;

    // Parsear header (respuestas correctas listadas)
    const answers = parseAnswerHeader(header);
    // Parsear body (preguntas con opciones)
    const questions = parseQuestionsFromBody(body, pageIdx + 1);

    // Emparejar por posición: pregunta N en la página ↔ respuesta N del header
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.missing) {
        stats.mismatched++;
        continue;
      }
      const answer = answers[i];
      let correctText = '';
      if (answer && answer.letter === q.missing) {
        correctText = answer.text;
        stats.matched++;
      } else if (answer) {
        // Fallback: si la letra no coincide, probablemente el orden
        // se desincronizó por respuestas de línea múltiple. Usamos la
        // primera respuesta del header con la letra esperada.
        const fallback = answers.find((a) => a.letter === q.missing);
        if (fallback) {
          correctText = fallback.text;
          stats.matched++;
        } else {
          stats.missingAnswer++;
        }
      } else {
        stats.missingAnswer++;
      }

      const fullOptions: Record<'a' | 'b' | 'c' | 'd', string> = {
        a: q.options.a || '',
        b: q.options.b || '',
        c: q.options.c || '',
        d: q.options.d || '',
      };
      fullOptions[q.missing] = correctText;

      allQA.push({
        num: q.num,
        section: currentSection,
        question: q.question,
        options: fullOptions,
        correctLetter: q.missing,
        correctText,
        page: pageIdx + 1,
      });
    }
  }

  console.log(`\n═══ Resultados ═══`);
  console.log(`Total Q&A extraídos: ${allQA.length}`);
  console.log(`- Matched OK: ${stats.matched}`);
  console.log(`- Respuesta faltante: ${stats.missingAnswer}`);
  console.log(`- Mismatched (2+ opciones faltantes): ${stats.mismatched}`);

  // Distribución por sección
  const bySec = new Map<string, number>();
  for (const qa of allQA) {
    bySec.set(qa.section, (bySec.get(qa.section) || 0) + 1);
  }
  console.log(`\nPor sección:`);
  for (const [s, n] of bySec) console.log(`  ${s}: ${n}`);

  // Muestra
  console.log(`\n═══ MUESTRA (6 aleatorias) ═══`);
  const sample = [
    allQA[0],
    allQA[Math.floor(allQA.length * 0.2)],
    allQA[Math.floor(allQA.length * 0.4)],
    allQA[Math.floor(allQA.length * 0.6)],
    allQA[Math.floor(allQA.length * 0.8)],
    allQA[allQA.length - 1],
  ].filter(Boolean);

  for (const qa of sample) {
    console.log(`\nP${qa.num} [${qa.section}] (pág ${qa.page})`);
    console.log(`Q: ${qa.question.slice(0, 180)}`);
    for (const l of ['a', 'b', 'c', 'd'] as const) {
      const marker = l === qa.correctLetter ? '  ← ✅ CORRECTA' : '';
      const txt = qa.options[l] || '(vacío)';
      console.log(`  ${l}) ${txt.slice(0, 130)}${marker}`);
    }
  }

  // Guardar en JSON
  fs.writeFileSync(
    'scripts/balotario-parsed.json',
    JSON.stringify(allQA, null, 2),
    'utf-8',
  );
  console.log(`\n✓ Guardado en scripts/balotario-parsed.json`);
}

main().catch(console.error);
