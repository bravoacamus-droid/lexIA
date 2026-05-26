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
  const clean = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found');
  }
  return JSON.parse(clean.slice(firstBrace, lastBrace + 1)) as T;
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
    const basesText = (await extractPdfText(basesBlob)).text.slice(0, 60000);

    if (basesText.length < 200) {
      throw new Error('El PDF de Bases parece estar vacío o no contiene texto extraíble.');
    }

    // 2. Extract requirements from Bases
    const reqRes = await generateText({
      model: chatModel,
      system: REQUIREMENTS_EXTRACTION_PROMPT,
      prompt: `Texto de las Bases Integradas:\n\n${basesText}`,
      temperature: 0.1,
      maxTokens: 4000,
    });

    const { requirements } = parseJsonLoose<{ requirements: Requirement[] }>(reqRes.text);
    if (!requirements || requirements.length === 0) {
      throw new Error('No se pudo extraer requisitos de las Bases.');
    }

    // 3. Evaluate each offer in parallel (max 5)
    const offers = ev.offer_files || [];
    const offerEvaluations: OfferEvaluation[] = await Promise.all(
      offers.map(async (o) => {
        try {
          const blob = await downloadFromStorage(admin, o.path);
          const text = (await extractPdfText(blob)).text.slice(0, 60000);

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
            prompt: `REQUISITOS DE LAS BASES:\n${reqJson}\n\nOFERTA DEL POSTOR (${o.name}):\n${text}`,
            temperature: 0.2,
            maxTokens: 4000,
          });

          const { items } = parseJsonLoose<{ items: EvaluationItem[] }>(res.text);
          // Display name: limpiar extensión y prefijos
          const displayName = o.name
            .replace(/\.pdf$/i, '')
            .replace(/^Oferta[_\s-]+/i, '')
            .replace(/_/g, ' ')
            .slice(0, 80);
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
        return {
          nombre: offer.nombre,
          status: (item?.status || 'no_cumple') as 'cumple' | 'subsanable' | 'no_cumple',
          detalle: item?.detalle || 'No fue posible evaluar este requisito en la oferta.',
          sustento_normativo: item?.sustento_normativo || [],
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
      maxTokens: 600,
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
    console.error('Evaluation pipeline error:', err);
    await supabase
      .from('evaluations')
      .update({ status: 'failed' } as never)
      .eq('id', ev.id);
    return NextResponse.json(
      { error: 'processing_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}

async function downloadFromStorage(admin: ReturnType<typeof createAdminClient>, path: string) {
  const { data, error } = await admin.storage.from('uploads').download(path);
  if (error || !data) throw new Error(`No se pudo descargar ${path}: ${error?.message}`);
  return await data.arrayBuffer();
}
