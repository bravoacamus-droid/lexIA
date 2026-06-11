import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { discoverLinks } from '@/lib/scraping/discover';
import { ingestPdfFromUrl } from '@/lib/scraping/ingest';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SCHEMA = z.object({
  /** Si se provee, corre solo esa source; si no, corre todas las activas. */
  source_id: z.string().uuid().optional(),
  /** Máximo de docs nuevos a ingestar en esta corrida (rate-limit safe). */
  limit_per_source: z.number().int().min(1).max(50).default(15),
});

interface Source {
  id: string;
  url: string;
  doc_type: string;
  label: string;
  link_selector: string;
  link_filter_regex: string | null;
  active: boolean;
}

/**
 * Autorización:
 *   1. Bearer token con CRON_SECRET (para Vercel Cron / scripts).
 *   2. Sesión de usuario con profiles.is_admin = true (para el panel).
 */
async function authorize(req: Request): Promise<
  | { ok: true; via: 'cron' | 'admin' }
  | { ok: false; status: number; message: string }
> {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return { ok: true, via: 'cron' };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, message: 'unauthorized' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;
  if (!isAdmin) return { ok: false, status: 403, message: 'forbidden' };
  return { ok: true, via: 'admin' };
}

/**
 * Wrapper compartido entre GET (Vercel Cron) y POST (panel admin).
 * GET ignora el body y corre con defaults; POST acepta el schema.
 */
async function handleRun(req: Request, body: unknown): Promise<NextResponse> {
  const authz = await authorize(req);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message }, { status: authz.status });
  }

  const parsed = SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { source_id, limit_per_source } = parsed.data;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
  if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
    return NextResponse.json({ error: 'missing_env' }, { status: 500 });
  }

  const admin = createAdmin(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Cargar sources a procesar
  let query = admin.from('scraping_sources').select('*').eq('active', true);
  if (source_id) query = query.eq('id', source_id);
  const { data: sources, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: 'sources_query_failed', detail: error.message },
      { status: 500 },
    );
  }
  const list = (sources || []) as Source[];

  const runSummary: Array<{
    source: string;
    links_found: number;
    docs_new: number;
    docs_embedded: number;
    status: string;
    error?: string;
  }> = [];

  for (const src of list) {
    // Insertar run row inicial
    const { data: runRow } = await admin
      .from('scraping_runs')
      .insert({ source_id: src.id, status: 'running' } as never)
      .select('id')
      .single();
    const runId = (runRow as { id: string } | null)?.id;

    let linksFound = 0;
    let docsNew = 0;
    let docsEmbedded = 0;
    let chunksInserted = 0;
    let runStatus = 'ok';
    let runError: string | null = null;

    try {
      const links = await discoverLinks({
        sourceUrl: src.url,
        linkSelector: src.link_selector || 'a[href]',
        linkFilterRegex: src.link_filter_regex,
      });
      linksFound = links.length;

      let processedInThisRun = 0;
      for (const link of links) {
        if (processedInThisRun >= limit_per_source) break;
        const r = await ingestPdfFromUrl({
          url: link.url,
          docType: src.doc_type,
          linkText: link.text,
          supabaseUrl: SUPABASE_URL,
          serviceKey: SERVICE_KEY,
          geminiKey: GEMINI_KEY,
        });
        if (r.inserted) {
          docsNew += 1;
          docsEmbedded += 1;
          chunksInserted += r.chunkCount ?? 0;
          processedInThisRun += 1;
        }
        // Si fue skip por "ya existe", no cuenta para el limit
      }
    } catch (e) {
      runStatus = 'failed';
      runError = (e as Error).message.slice(0, 500);
    }

    // Cerrar run
    if (runId) {
      await admin
        .from('scraping_runs')
        .update({
          finished_at: new Date().toISOString(),
          links_found: linksFound,
          docs_new: docsNew,
          docs_embedded: docsEmbedded,
          chunks_inserted: chunksInserted,
          status: runStatus,
          error_message: runError,
        } as never)
        .eq('id', runId);
    }

    // Update source
    await admin
      .from('scraping_sources')
      .update({
        last_crawled_at: new Date().toISOString(),
        last_doc_count: docsNew,
      } as never)
      .eq('id', src.id);

    runSummary.push({
      source: src.label,
      links_found: linksFound,
      docs_new: docsNew,
      docs_embedded: docsEmbedded,
      status: runStatus,
      error: runError || undefined,
    });
  }

  return NextResponse.json({
    via: authz.via,
    sources_processed: list.length,
    runs: runSummary,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handleRun(req, body);
}

// GET para Vercel Cron (envía Authorization: Bearer <CRON_SECRET>)
export async function GET(req: Request) {
  return handleRun(req, {});
}
