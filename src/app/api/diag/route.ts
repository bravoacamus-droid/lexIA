import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { chatModel, fastModel, CHAT_MODEL_ID, FAST_MODEL_ID } from '@/lib/ai/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint de diagnóstico — verifica que el deploy tenga todas las env vars
 * y conexiones necesarias funcionando. NO expone los valores, solo si están
 * presentes y si las llamadas externas responden.
 *
 * Sólo accesible para usuarios autenticados.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
  };

  // Test Gemini Embeddings (raw REST)
  let geminiEmbedStatus: { ok: boolean; detail?: string } = { ok: false };
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: 'test' }] },
            taskType: 'RETRIEVAL_QUERY',
            outputDimensionality: 1024,
          }),
        },
      );
      const detail = res.ok ? 'OK' : `HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`;
      geminiEmbedStatus = { ok: res.ok, detail };
    } catch (err) {
      geminiEmbedStatus = { ok: false, detail: (err as Error).message };
    }
  } else {
    geminiEmbedStatus = { ok: false, detail: 'GOOGLE_GENERATIVE_AI_API_KEY no configurada' };
  }

  // Test Gemini Chat Model (la causa más probable del error del chat)
  let geminiChatStatus: { ok: boolean; detail?: string; model: string } = {
    ok: false,
    model: CHAT_MODEL_ID,
  };
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { text } = await generateText({
        model: chatModel,
        prompt: 'Responde solo "OK".',
        maxTokens: 10,
      });
      geminiChatStatus = {
        ok: true,
        model: CHAT_MODEL_ID,
        detail: `respuesta: "${text.slice(0, 30)}"`,
      };
    } catch (err) {
      geminiChatStatus = {
        ok: false,
        model: CHAT_MODEL_ID,
        detail: `${(err as Error).name}: ${(err as Error).message.slice(0, 300)}`,
      };
    }
  }

  // Test Fast model (usado para títulos y sugerencias)
  let geminiFastStatus: { ok: boolean; detail?: string; model: string } = {
    ok: false,
    model: FAST_MODEL_ID,
  };
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    try {
      const { text } = await generateText({
        model: fastModel,
        prompt: 'Responde solo "OK".',
        maxTokens: 10,
      });
      geminiFastStatus = {
        ok: true,
        model: FAST_MODEL_ID,
        detail: `respuesta: "${text.slice(0, 30)}"`,
      };
    } catch (err) {
      geminiFastStatus = {
        ok: false,
        model: FAST_MODEL_ID,
        detail: `${(err as Error).name}: ${(err as Error).message.slice(0, 300)}`,
      };
    }
  }

  // Test hybrid_search
  let searchStatus: { ok: boolean; detail?: string } = { ok: false };
  try {
    const { error } = await supabase.rpc('hybrid_search', {
      query_text: 'test',
      query_embedding: new Array(1024).fill(0),
      match_count: 1,
      filter_type: null,
    });
    searchStatus = { ok: !error, detail: error?.message || 'OK' };
  } catch (err) {
    searchStatus = { ok: false, detail: (err as Error).message };
  }

  // Count docs
  const { count: docCount } = await supabase
    .from('normative_documents')
    .select('id', { count: 'exact', head: true });
  const { count: chunkCount } = await supabase
    .from('normative_chunks')
    .select('id', { count: 'exact', head: true });

  const allOk =
    !!env.NEXT_PUBLIC_SUPABASE_URL &&
    !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!env.SUPABASE_SERVICE_ROLE_KEY &&
    !!env.GOOGLE_GENERATIVE_AI_API_KEY &&
    geminiEmbedStatus.ok &&
    geminiChatStatus.ok &&
    searchStatus.ok;

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'unhealthy',
      user: user.email,
      env,
      gemini: {
        chat: geminiChatStatus,
        fast: geminiFastStatus,
        embed: geminiEmbedStatus,
      },
      hybrid_search: searchStatus,
      data: {
        normative_documents: docCount || 0,
        normative_chunks: chunkCount || 0,
      },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
