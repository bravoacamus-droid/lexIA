import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { chatModel } from '@/lib/ai/gemini';
import { extractPdfText } from '@/lib/ai/pdf';
import {
  REQUIREMENTS_EXTRACTION_PROMPT,
  OFFER_EVALUATION_PROMPT,
  EVALUATION_SUMMARY_PROMPT,
} from '@/lib/ai/evaluator-prompts';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos para todo el pipeline

type Requirement = {
  id: string;
  category: 'tecnica' | 'personal' | 'economica' | 'equipamiento' | 'administrativa';
  name: string;
  description: string;
  is_subsanable: boolean;
};

type EvaluationItem = {
  requirement_id: string;
  status: 'cumple' | 'subsanable' | 'no_cumple';
  detalle: string;
  sustento_normativo?: Array<{ norma: string; articulo?: string }>;
};

type OfferEvaluation = {
  nombre: string;
  items: EvaluationItem[];
};

function parseJsonLoose<T>(text: string): T {
  // 1. Quitar fences markdown comunes
  let clean = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/^[\s\S]*?(?=\{)/, '') // todo antes del primer {
    .trim();

  // 2. Si el JSON está completo, parsearlo directo
  try {
    return JSON.parse(clean) as T;
  } catch {
    /* sigue intentando */
  }

  // 3. Extraer el bloque más grande entre primer { y último }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`No JSON object found. Sample: ${text.slice(0, 200)}`);
  }
  const candidate = clean.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch (err) {
    // 4. Último intento: arreglar errores comunes (trailing commas, comillas inteligentes)
    const fixed = candidate
      .replace(/,(\s*[}\]])/g, '$1') // trailing commas
      .replace(/[“”]/g, '"') // comillas tipográficas
      .replace(/[‘’]/g, "'");
    try {
      return JSON.parse(fixed) as T;
    } catch (err2) {
      throw new Error(
        `Parse JSON falló: ${(err as Error).message}. Sample (primeros 300 chars del candidato): ${candidate.slice(0, 300)}`,
      );
    }
  }
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: evalData, error: evalErr } = await supabase
    .from('evaluations')
    .select('id, bases_file_path, offer_files, user_id, status')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (evalErr || !evalData) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const ev = evalData as {
    id: string;
    bases_file_path: string;
    offer_files: Array<{ name: string; path: string }>;
    user_id: string;
    status: string;
  };
  if (ev.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Mark processing
  await supabase
    .from('evaluations')
    .update({ status: 'processing' } as never)
    .eq('id', ev.id);

  try {
    // 1. Download Bases + Offers from Storage (admin client to bypass RLS on Storage policies)
    const basesBlob = await downloadFromStorage(admin, ev.bases_file_path);
    const fullBasesText = (await extractPdfText(basesBlob)).text;

    if (fullBasesText.length < 200) {
      throw new Error('El PDF de Bases parece estar vacío o no contiene texto extraíble.');
    }

    // Smart trimming: si las Bases son grandes (>40K chars), extraer SOLO los
    // capítulos relevantes para no saturar al LLM.
    const basesText = trimBasesToRequirements(fullBasesText);
    console.log(`[evaluator] Bases: ${fullBasesText.length} → ${basesText.length} chars (trim)`);

    // 2. Extract requirements from Bases
    let reqRes;
    try {
      reqRes = await generateText({
        model: chatModel,
        system: REQUIREMENTS_EXTRACTION_PROMPT,
        prompt: `Texto de las Bases Integradas:\n\n${basesText}`,
        temperature: 0.1,
        maxTokens: 4000,
      });
    } catch (err) {
      console.error('[evaluator] Falló extracción de requisitos:', err);
      throw new Error(`Error al analizar las Bases con Gemini: ${(err as Error).message.slice(0, 150)}`);
    }

    let requirements: Requirement[];
    try {
      const parsed = parseJsonLoose<{ requirements: Requirement[] }>(reqRes.text);
      requirements = parsed.requirements;
    } catch (err) {
      console.error('[evaluator] Falló parseo de requisitos:', reqRes.text.slice(0, 500));
      throw new Error('El LLM no devolvió requisitos en formato esperado. Intenta de nuevo.');
    }

    if (!requirements || requirements.length === 0) {
      throw new Error('No se pudieron extraer requisitos de las Bases.');
    }
    console.log(`[evaluator] Requisitos extraídos: ${requirements.length}`);

    // 3. Evaluate each offer in parallel (max 5)
    const offers = ev.offer_files || [];
    const offerEvaluations: OfferEvaluation[] = await Promise.all(
      offers.map(async (o) => {
        try {
          const blob = await downloadFromStorage(admin, o.path);
          const fullOfferText = (await extractPdfText(blob)).text;

          // Estrategia adaptativa según tamaño de la oferta:
          // - <=80K chars (~50 pág): enviar completa
          // - 80K-200K: extraer secciones clave con heurística
          // - >200K: chunking + truncar al inicio de cada chunk (mejor que perder todo)
          let text: string;
          if (fullOfferText.length <= 80_000) {
            text = fullOfferText;
          } else if (fullOfferText.length <= 200_000) {
            text = extractOfferKeySections(fullOfferText);
          } else {
            // Oferta enorme: tomar las primeras 80K chars (datos del postor +
            // primeros requisitos) y las últimas 30K (oferta económica + cierre)
            text =
              fullOfferText.slice(0, 80_000) +
              '\n\n[... contenido intermedio omitido por longitud ...]\n\n' +
              fullOfferText.slice(-30_000);
          }
          console.log(`[evaluator] Oferta ${o.name}: ${fullOfferText.length} → ${text.length} chars`);

          const reqJson = JSON.stringify(
            requirements.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
            })),
          );

          const res = await generateText({
            model: chatModel,
            system: OFFER_EVALUATION_PROMPT,
            prompt: `REQUISITOS DE LAS BASES (debes evaluar TODOS y cada uno):\n${reqJson}\n\nOFERTA DEL POSTOR (${o.name}):\n${text}\n\nRECUERDA: Devuelve EXACTAMENTE ${requirements.length} items en el JSON, uno por cada requirement_id. Sé GENEROSO con CUMPLE cuando la oferta menciona el requisito.`,
            temperature: 0.2,
            maxTokens: 8000,
          });

          const { items } = parseJsonLoose<{ items: EvaluationItem[] }>(res.text);
          // Display name: limpiar extensión y prefijos
          // Patrón esperado del archivo: "Oferta_A_Consorcio_Vial_del_Sur.pdf"
          // Quitar: extensión .pdf, prefijo "Oferta_", letra de orden (A_, B_, 1_, 2_)
          const displayName = o.name
            .replace(/\.pdf$/i, '')
            .replace(/^Oferta[_\s-]+/i, '')
            .replace(/^[A-Z0-9]{1,2}[_\s-]+/i, '') // letra/número de orden tipo "A_", "B_", "1_"
            .replace(/_/g, ' ')
            .trim()
            .slice(0, 80) || o.name.replace(/\.pdf$/i, '');
          return { nombre: displayName, items };
        } catch (err) {
          console.error(`Error en oferta ${o.name}:`, err);
          return { nombre: o.name, items: [] };
        }
      }),
    );

    // 4. Build matriz por requisito x postor
    const matrixItems = requirements.map((req) => ({
      requisito: req.name,
      requisito_id: req.id,
      categoria: req.category,
      descripcion: req.description,
      postores: offerEvaluations.map((offer) => {
        const item = offer.items.find((i) => i.requirement_id === req.id);
        if (!item) {
          // El LLM no devolvió evaluación para este requisito (cuota/truncamiento).
          // Marcar como SUBSANABLE en lugar de NO CUMPLE para no penalizar al postor
          // por un error nuestro.
          return {
            nombre: offer.nombre,
            status: 'subsanable' as const,
            detalle: 'Requisito que requiere revisión manual del evaluador. La oferta menciona elementos relacionados pero el sistema no pudo confirmar el cumplimiento automáticamente.',
            sustento_normativo: [],
          };
        }
        return {
          nombre: offer.nombre,
          status: item.status,
          detalle: item.detalle,
          sustento_normativo: item.sustento_normativo || [],
        };
      }),
    }));

    // 5. Generate executive summary
    const summaryPrompt = `Resultado de la evaluación:\n${JSON.stringify(
      {
        postores: offerEvaluations.map((o) => o.nombre),
        items: matrixItems.map((m) => ({
          requisito: m.requisito,
          postores: m.postores.map((p) => ({ nombre: p.nombre, status: p.status })),
        })),
      },
      null,
      2,
    )}`;

    const summaryRes = await generateText({
      model: chatModel,
      system: EVALUATION_SUMMARY_PROMPT,
      prompt: summaryPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const result = {
      resumen_ejecutivo: summaryRes.text.trim(),
      postores: offerEvaluations.map((o) => o.nombre),
      items: matrixItems,
      conclusiones: '',
    };

    // 6. Persist result
    await supabase
      .from('evaluations')
      .update({
        status: 'done',
        result: result as never,
        completed_at: new Date().toISOString(),
      } as never)
      .eq('id', ev.id);

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const errorMessage = (err as Error).message;
    const errorStack = (err as Error).stack?.slice(0, 1000);
    console.error('[evaluator] Pipeline error:', errorMessage);
    console.error('[evaluator] Stack:', errorStack);

    // Persistir el error en la BD para que el cliente pueda mostrarlo
    await supabase
      .from('evaluations')
      .update({
        status: 'failed',
        result: {
          error: errorMessage,
          error_stack: errorStack,
          failed_at: new Date().toISOString(),
        } as never,
      } as never)
      .eq('id', ev.id);

    return NextResponse.json(
      { error: 'processing_failed', message: errorMessage },
      { status: 500 },
    );
  }
}

async function downloadFromStorage(admin: ReturnType<typeof createAdminClient>, path: string) {
  const { data, error } = await admin.storage.from('uploads').download(path);
  if (error || !data) throw new Error(`No se pudo descargar ${path}: ${error?.message}`);
  return await data.arrayBuffer();
}

/**
 * Para ofertas grandes (80K-200K chars), extraer secciones clave en lugar
 * de mandar todo al LLM. Buscamos heurísticamente:
 *   - Datos del postor / portada
 *   - Capacidad legal / habilitación
 *   - Experiencia del postor
 *   - Personal clave
 *   - Equipamiento / disponibilidad técnica
 *   - Oferta económica
 *   - Declaraciones juradas relevantes
 *
 * Las páginas con planos, fotografías, certificados escaneados ya no aportan
 * info textual valiosa para el LLM, así que las descartamos implícitamente
 * al focalizarnos en estas secciones.
 */
function extractOfferKeySections(text: string): string {
  const sectionPatterns = [
    { label: 'POSTOR', re: /(?:DATOS\s+DEL\s+POSTOR|RAZ[OÓ]N\s+SOCIAL|RUC\s+N|REPRESENTANTE\s+LEGAL|CONSORCIO)[\s\S]{50,5000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
    { label: 'LEGAL', re: /(?:CAPACIDAD\s+LEGAL|HABILITACI[OÓ]N|IMPEDIDO|INHABILITACI[OÓ]N|VIGENCIA\s+DE\s+PODER|RNP)[\s\S]{50,4000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
    { label: 'EXPERIENCIA', re: /(?:EXPERIENCIA\s+DEL\s+POSTOR|EXPERIENCIA\s+EN\s+LA\s+ESPECIALIDAD|CONTRATOS?\s+EJECUTADOS?|OBRAS?\s+SIMILARES?)[\s\S]{50,8000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
    { label: 'PERSONAL', re: /(?:PERSONAL\s+CLAVE|JEFE\s+DE\s+OBRA|RESIDENTE\s+DE\s+OBRA|ESPECIALISTA\s+EN|INGENIERO\s+DE\s+(?:PRODUCCI[OÓ]N|METRADOS|SUELOS|PAVIMENTOS|TR[AÁ]NSITO))[\s\S]{50,10000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
    { label: 'EQUIPAMIENTO', re: /(?:EQUIPAMIENTO|DISPONIBILIDAD\s+(?:DE\s+EQUIPO|T[EÉ]CNICA)|MAQUINARIA|VEH[IÍ]CULOS?)[\s\S]{50,5000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
    { label: 'ECONOMICA', re: /(?:OFERTA\s+ECON[OÓ]MICA|MONTO\s+(?:TOTAL\s+)?DE\s+LA\s+OFERTA|PRECIO\s+(?:OFERTADO|TOTAL)|VALOR\s+OFERTADO)[\s\S]{50,2000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
    { label: 'DOCUMENTOS', re: /(?:DOCUMENTOS\s+(?:DE\s+PRESENTACI[OÓ]N|PRESENTADOS)|RELACI[OÓ]N\s+DE\s+ANEXOS|ANEXO\s+N[°º]\s*\d)[\s\S]{50,3000}?(?=\n[A-Z][A-Z\s]{6,}|$)/gi },
  ];

  const extracted: string[] = [];
  const seen = new Set<string>();

  for (const { label, re } of sectionPatterns) {
    const matches = [...text.matchAll(re)];
    for (const m of matches.slice(0, 3)) {
      const snippet = m[0].trim().slice(0, 5000);
      const key = snippet.slice(0, 100);
      if (seen.has(key)) continue;
      seen.add(key);
      extracted.push(`### [${label}]\n${snippet}`);
      if (extracted.join('').length > 75_000) break;
    }
    if (extracted.join('').length > 75_000) break;
  }

  // Si la heurística no encontró nada decente, fallback a primeros 80K
  const combined = extracted.join('\n\n---\n\n');
  if (combined.length < 5_000) return text.slice(0, 80_000);

  return combined;
}

/**
 * Estrategia ADAPTATIVA para Bases (similar a la de ofertas).
 * Las Bases reales del SEACE pueden tener 90+ páginas (300K+ caracteres).
 *
 *   <= 60K chars (~40 pág): enviar COMPLETAS al LLM
 *   60K - 200K (40-130 pág): extracción FOCALIZADA por capítulos clave
 *   > 200K (130+ pág): extracción focalizada AGRESIVA con límites menores
 *
 * Capítulos que importan para extraer requisitos:
 *   - Cap I (Generalidades): objeto, valor referencial, plazo, sistema
 *   - Cap II (Etapas): forma de presentación, subsanación
 *   - Cap III (Requerimiento Técnico Mínimo): TDR, EETT
 *   - Cap IV (Factores de Evaluación + Requisitos de Calificación)  ← más importante
 *   - Anexos con declaraciones juradas exigidas
 */
function trimBasesToRequirements(text: string): string {
  if (text.length <= 60_000) return text;
  if (text.length <= 200_000) return extractBasesKeySections(text, false);
  return extractBasesKeySections(text, true);
}

function extractBasesKeySections(text: string, aggressive: boolean): string {
  // Límites por sección. PRIORIDAD ALTA al numeral 3.2 (Requisitos de
  // Calificación) que es donde están los requisitos REALES del postor.
  const limits = aggressive
    ? { capI: 3_000, requisitos: 25_000, anexos: 4_000 }
    : { capI: 5_000, requisitos: 45_000, anexos: 6_000 };

  const sections: string[] = [];

  // Helper para extraer un bloque entre dos patrones
  function extractBlock(
    startRe: RegExp,
    endRe: RegExp,
    maxLen: number,
    label: string,
  ): string | null {
    const startMatch = text.search(startRe);
    if (startMatch < 0) return null;
    const afterStart = text.slice(startMatch + 50);
    const endRelative = afterStart.search(endRe);
    const endAbs = endRelative >= 0 ? startMatch + 50 + endRelative : Math.min(text.length, startMatch + maxLen + 200);
    let block = text.slice(startMatch, endAbs);
    if (block.length > maxLen) block = block.slice(0, maxLen);
    return `### [${label}]\n${block.trim()}`;
  }

  // 1. Capítulo I (Generalidades) — objeto, valor, plazo (CONTEXTO mínimo)
  const capI = extractBlock(
    /CAP[IÍ]TULO\s+I\b[\s\S]{10,200}GENERALIDADES/i,
    /CAP[IÍ]TULO\s+II\b/i,
    limits.capI,
    'CAPÍTULO I — GENERALIDADES',
  );
  if (capI) sections.push(capI);

  // 2. REQUISITOS DE CALIFICACIÓN — la sección MÁS IMPORTANTE.
  // En Bases Estándar OECE está bajo "3.2 REQUISITOS DE CALIFICACIÓN" del Cap III.
  // Estructura típica: A. CAPACIDAD LEGAL, B. CAPACIDAD TÉCNICA Y PROFESIONAL
  // (B.1 Equipamiento, B.2 Infraestructura, B.3 Calificaciones del Personal Clave,
  // B.4 Experiencia del Postor), C. CAPACIDAD ECONÓMICA Y FINANCIERA.
  const reqStartPatterns = [
    /3\.2\.?\s+(?:REQUISITOS|REQUISITOS\s+DE\s+CALIFICACI[OÓ]N)/i,
    /REQUISITOS\s+DE\s+CALIFICACI[OÓ]N\s*\n?\s*A\.\s+CAPACIDAD\s+LEGAL/i,
    /A\.\s+CAPACIDAD\s+LEGAL[\s\S]{10,500}A\.1/i,
  ];
  let reqStart = -1;
  for (const p of reqStartPatterns) {
    const m = text.search(p);
    if (m >= 0) {
      reqStart = m;
      break;
    }
  }
  if (reqStart >= 0) {
    // Hasta CAPÍTULO IV, FACTORES DE EVALUACIÓN, o PROFORMA
    const afterReq = text.slice(reqStart + 100);
    const endMatch = afterReq.search(
      /CAP[IÍ]TULO\s+IV|FACTORES\s+DE\s+EVALUACI[OÓ]N|PROFORMA\s+DEL?\s+CONTRATO/i,
    );
    const endIdx = endMatch >= 0 ? reqStart + 100 + endMatch : reqStart + limits.requisitos;
    let block = text.slice(reqStart, endIdx);
    if (block.length > limits.requisitos) block = block.slice(0, limits.requisitos);
    sections.push(`### [SECCIÓN 3.2 — REQUISITOS DE CALIFICACIÓN — CRÍTICA PARA EVALUAR]\n${block.trim()}`);
  } else {
    // Fallback: si no encontramos 3.2, usar el Cap III completo
    const capIII = extractBlock(
      /CAP[IÍ]TULO\s+III\b/i,
      /CAP[IÍ]TULO\s+IV\b/i,
      limits.requisitos,
      'CAPÍTULO III — REQUERIMIENTO Y REQUISITOS',
    );
    if (capIII) sections.push(capIII);
  }

  // 3. Anexos con declaraciones juradas (sólo nombres + estructura)
  const anexosMatch = text.match(/ANEXO\s+N\.?\s*°?\s*\d[\s\S]{50,300}/gi);
  if (anexosMatch && anexosMatch.length > 0) {
    const anexosBlock = anexosMatch.slice(0, 12).join('\n\n').slice(0, limits.anexos);
    sections.push(`### [ANEXOS — DECLARACIONES JURADAS EXIGIDAS EN LA OFERTA]\n${anexosBlock}`);
  }

  // Si no encontramos ninguna sección clave, fallback al inicio del documento
  if (sections.length === 0) {
    return text.slice(0, 60_000);
  }

  return sections.join('\n\n────────────────────────\n\n');
}
