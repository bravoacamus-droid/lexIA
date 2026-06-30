import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { searchNormativa, formatResultsForLLM } from '@/lib/ai/voice-search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Schema = z.object({
  query: z.string().min(2).max(500),
  filter_type: z.string().max(40).nullable().optional(),
  call_id: z.string().uuid(),
});

/**
 * POST /api/voice/search-normativa
 * Ejecutado por el cliente cuando Gemini Live API pide un function call
 * search_normativa durante la conversación. El cliente recibe el tool
 * call de Gemini, lo reenvía a este endpoint, recibe el resultado y se
 * lo devuelve a Gemini para que continúe hablando.
 *
 * Body: { query, filter_type?, call_id }
 * Response: { content: string, citations: [...], results_count }
 *
 * Además incrementa rag_queries_count y acumula cited_documents en la
 * llamada para el resumen final.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Validar ownership de la llamada
  const { data: call } = await supabase
    .from('voice_calls')
    .select('id, user_id, rag_queries_count, cited_documents, law_filter')
    .eq('id', parsed.data.call_id)
    .maybeSingle();
  if (!call) return NextResponse.json({ error: 'call_not_found' }, { status: 404 });
  const callRow = call as {
    user_id: string;
    rag_queries_count: number;
    cited_documents: Array<{ citation: string; title: string }>;
    law_filter: string[] | null;
  };
  if (callRow.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Filtro de ley a nivel de llamada (null/vacío = ambas leyes).
  const lawFilter =
    callRow.law_filter && callRow.law_filter.length > 0
      ? callRow.law_filter
      : null;

  // Ejecutar búsqueda. CRÍTICO: cualquier error aquí NO debe lanzar
  // 500 — el cliente de voz necesita una respuesta 200 con content para
  // entregársela al modelo y que la conversación continúe. Si la
  // búsqueda falla, devolvemos un mensaje al modelo en lugar de
  // dejar al modelo esperando indefinidamente.
  try {
    const results = await searchNormativa({
      query: parsed.data.query,
      filter_type: parsed.data.filter_type ?? null,
      filter_law: lawFilter,
      match_count: 5,
    });
    const formatted = formatResultsForLLM(results);

    // Acumular en la llamada (rag_queries_count + cited_documents)
    const prevCount = callRow.rag_queries_count || 0;
    const prevCited = callRow.cited_documents || [];
    const newCitations = results.map((r) => ({
      citation: r.citation,
      title: r.title,
    }));
    // Deduplicar por citation+title
    const seen = new Set(prevCited.map((c) => `${c.citation}::${c.title}`));
    for (const nc of newCitations) {
      const k = `${nc.citation}::${nc.title}`;
      if (!seen.has(k)) {
        seen.add(k);
        prevCited.push(nc);
      }
    }

    await supabase
      .from('voice_calls')
      .update({
        rag_queries_count: prevCount + 1,
        cited_documents: prevCited as never,
      } as never)
      .eq('id', parsed.data.call_id);

    return NextResponse.json({
      content: formatted,
      results_count: results.length,
      citations: results.map((r) => ({
        citation: r.citation,
        title: r.title,
        type: r.type,
      })),
    });
  } catch (err) {
    console.error('[voice/search-normativa] búsqueda falló:', err);
    return NextResponse.json({
      content:
        'No se pudo consultar la base normativa en este momento. Responde al usuario con tu mejor conocimiento general indicando que verifique el numeral exacto en el portal del OECE.',
      results_count: 0,
      citations: [],
      error_internal: (err as Error).message,
    });
  }
}
