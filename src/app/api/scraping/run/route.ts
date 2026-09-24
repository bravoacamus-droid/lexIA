import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { discoverLinks, resolverPdfDeFicha, variantesDeFicha } from '@/lib/scraping/discover';
import { ingestPdfFromUrl } from '@/lib/scraping/ingest';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SCHEMA = z.object({
  /** Si se provee, corre solo esa source; si no, corre todas las activas. */
  source_id: z.string().uuid().optional(),
  /** Máximo de docs nuevos a ingestar en esta corrida (rate-limit safe). */
  limit_per_source: z.number().int().min(1).max(60).default(40),
});

/**
 * Los topes que impiden que una corrida se desboque.
 *
 * Vercel corta la función a los 300 s (maxDuration). Pasado LIMITE_MS no
 * se empieza ningún documento nuevo: lo que falte queda para la corrida
 * siguiente, que lo encuentra igual porque el índice se lee de nuevo.
 * Una corrida que siga «running» después de CORRIDA_COLGADA_MS murió a
 * medias y se da por abandonada. Tras MAX_INTENTOS fallos, una URL ya
 * no se reintenta sola.
 */
const LIMITE_MS = 230_000;
/**
 * El cron corre una vez al día. Si en este lapso ya hubo una corrida,
 * la llamada del cron se descarta: Vercel puede entregar el mismo
 * disparo dos veces, y una llamada repetida con la clave no debe
 * convertirse en una segunda pasada que gaste recursos.
 */
const UNA_VEZ_AL_DIA_MS = 20 * 60 * 60 * 1000;
const CORRIDA_COLGADA_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 3;
/** Escaneos que se leen con Gemini por corrida, entre todas las fuentes. */
const MAX_OCR_POR_CORRIDA = 3;
/** El mismo error en tantos documentos seguidos es una falla del sistema. */
const CORTACIRCUITOS = 5;

interface Source {
  id: string;
  url: string;
  doc_type: string;
  label: string;
  link_selector: string;
  link_filter_regex: string | null;
  /**
   * Selector del enlace al PDF dentro de la ficha. Cuando está, el
   * índice no enlaza el PDF sino una ficha por documento, y hay que
   * entrar a buscarlo. Es como quedó gob.pe tras pasar el OSCE a OECE.
   */
  pdf_selector: string | null;
  active: boolean;
  /** AAAA-MM-DD: lo fechado antes no lo trae el actualizador. */
  publicados_desde: string | null;
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
    // SE DEJA RASTRO A PROPÓSITO.
    //
    // El 07/09/2026 la biblioteca llevaba semanas sin crecer y la tabla
    // `scraping_runs` estaba vacía, así que no había forma de saber si
    // el cron de Vercel no llegaba o llegaba y se le rechazaba: la fila
    // de la corrida se inserta DESPUÉS de autorizar, de modo que un 401
    // no deja huella ninguna. Con esto, el registro de Vercel dice cuál
    // de las dos cosas pasa.
    console.warn('[scraping] llamada rechazada', {
      motivo: authz.message,
      trae_authorization: Boolean(req.headers.get('authorization')),
      hay_cron_secret: Boolean(process.env.CRON_SECRET),
      user_agent: req.headers.get('user-agent')?.slice(0, 80) ?? null,
    });
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
  const inicio = Date.now();
  const quedaTiempo = () => Date.now() - inicio < LIMITE_MS;
  let ocrRestantes = MAX_OCR_POR_CORRIDA;

  // Una corrida que Vercel cortó por tiempo queda «running» para
  // siempre: se cierra como abandonada para que no bloquee el candado.
  await admin
    .from('scraping_runs')
    .update({
      status: 'abandonada',
      finished_at: new Date().toISOString(),
      error_message: 'La corrida no terminó (tiempo agotado o proceso cortado).',
    } as never)
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - CORRIDA_COLGADA_MS).toISOString());

  if (authz.via === 'cron') {
    const { data: reciente, error: errReciente } = await admin
      .from('scraping_runs')
      .select('started_at')
      .neq('status', 'prueba_invalida')
      .gte('started_at', new Date(Date.now() - UNA_VEZ_AL_DIA_MS).toISOString())
      .order('started_at', { ascending: false })
      .limit(1);
    if (errReciente) console.error('[scraping] no se pudo revisar la última corrida:', errReciente.message);
    if ((reciente ?? []).length > 0) {
      const ultima = (reciente as Array<{ started_at: string }>)[0].started_at;
      console.warn('[scraping] el cron ya corrió hoy; se omite', { ultima });
      return NextResponse.json({ omitida: true, motivo: 'ya_corrio_hoy', ultima });
    }
  }

  // Candado: dos corridas a la vez (la del cron y una manual) procesan
  // los mismos enlaces y duplican trabajo.
  const { data: enCurso } = await admin.from('scraping_runs').select('id').eq('status', 'running').limit(1);
  if ((enCurso ?? []).length > 0) {
    return NextResponse.json({ error: 'en_curso', detail: 'Ya hay una corrida del rastreador en marcha.' }, { status: 409 });
  }

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
    ya_estaban: number;
    en_espera: number;
    fallidos: number;
    omitidos: number;
    status: string;
    error?: string;
  }> = [];

  for (const src of list) {
    if (!quedaTiempo()) {
      runSummary.push({
        source: src.label,
        links_found: 0,
        docs_new: 0,
        docs_embedded: 0,
        ya_estaban: 0,
        en_espera: 0,
        fallidos: 0,
        omitidos: 0,
        status: 'pendiente',
        error: 'sin tiempo en esta corrida',
      });
      continue;
    }
    // Insertar run row inicial
    const { data: runRow, error: errRun } = await admin
      .from('scraping_runs')
      .insert({ source_id: src.id, status: 'running' } as never)
      .select('id')
      .single();
    // Si esto falla en silencio, la corrida se ejecuta pero no queda
    // registrada, y desde fuera es idéntico a que el cron no haya
    // corrido. Pasó: se diagnosticó «el cron nunca se ejecutó» leyendo
    // una tabla que no se estaba llenando.
    if (errRun) console.error('[scraping] no se pudo registrar la corrida:', errRun.message);
    const runId = (runRow as { id: string } | null)?.id;

    let linksFound = 0;
    let docsNew = 0;
    let docsEmbedded = 0;
    let chunksInserted = 0;
    let yaEstaban = 0;
    let enEspera = 0;
    let fallidos = 0;
    let omitidos = 0;
    let runStatus = 'ok';
    let runError: string | null = null;

    try {
      const links = await discoverLinks({
        sourceUrl: src.url,
        linkSelector: src.link_selector || 'a[href]',
        linkFilterRegex: src.link_filter_regex,
      });
      linksFound = links.length;
      // Un índice sin enlaces no es «nada nuevo»: es que gob.pe cambió
      // (pasó en agosto de 2026, cuando el OSCE pasó a OECE y la
      // biblioteca dejó de crecer sin que nada avisara).
      if (links.length === 0) throw new Error('El índice de la fuente no devolvió ningún enlace: la página pudo cambiar de dirección o de estructura.');

      // Lo que ya está en la biblioteca se descarta de una vez, sin
      // entrar a la ficha ni descargar nada: es lo que más se repite de
      // una corrida a otra.
      const urls = links.map((l) => l.url);
      // Cada enlace, con las formas en que su ficha puede estar guardada.
      // Una variante puede venir de dos enlaces: el índice de directivas
      // enlaza la misma ficha bajo /osce/ y bajo /oece/.
      const deVariante = new Map<string, string[]>();
      for (const u of urls) for (const v of variantesDeFicha(u)) deVariante.set(v, [...(deVariante.get(v) ?? []), u]);
      const variantes = [...deVariante.keys()];
      const conocidas = new Set<string>();
      const fallos = new Map<string, { intentos: number; proximo_intento: string; tipo: string }>();
      for (let k = 0; k < variantes.length; k += 100) {
        const { data: docs, error: errDocs } = await admin
          .from('normative_documents')
          .select('source_url')
          .in('source_url', variantes.slice(k, k + 100));
        if (errDocs) throw new Error(`No se pudo consultar la biblioteca: ${errDocs.message}`);
        for (const d of (docs ?? []) as Array<{ source_url: string }>) for (const u of deVariante.get(d.source_url) ?? []) conocidas.add(u);
      }
      for (let k = 0; k < urls.length; k += 100) {
        const { data: f } = await admin.from('scraping_fallos').select('url, intentos, proximo_intento, tipo').in('url', urls.slice(k, k + 100));
        for (const x of (f ?? []) as Array<{ url: string; intentos: number; proximo_intento: string; tipo: string }>) fallos.set(x.url, x);
      }
      // Lo que se anotó como fallo o como anterior al corte y ya entró
      // por la carga manual sale de la lista: el panel muestra solo lo
      // que de verdad falta.
      const resueltos = [...fallos.keys()].filter((u) => conocidas.has(u));
      if (resueltos.length) await admin.from('scraping_fallos').delete().in('url', resueltos);

      // Los fallos no se anotan en el acto: si el mismo error se repite
      // en varios documentos seguidos, lo roto es el sistema (una
      // librería, la red, la cuota), no los documentos, y anotarlos los
      // castigaría a todos. Se acumulan y se anotan cuando otro
      // documento sale bien o el error cambia.
      let racha: Array<{ url: string; motivo: string; intentos: number }> = [];
      const anotarRacha = async () => {
        for (const f of racha) await anotarFallo(admin, f.url, src.id, f.motivo, f.intentos);
        racha = [];
      };

      let processedInThisRun = 0;
      for (const link of links) {
        if (processedInThisRun >= limit_per_source) break;
        if (!quedaTiempo()) {
          runStatus = 'partial';
          runError = 'Se detuvo por tiempo; lo pendiente sigue en la próxima corrida.';
          break;
        }
        if (conocidas.has(link.url)) {
          yaEstaban++;
          continue;
        }
        const previo = fallos.get(link.url);
        if (previo?.tipo === 'anterior_al_corte') {
          omitidos++;
          continue;
        }
        if (previo && (previo.intentos >= MAX_INTENTOS || new Date(previo.proximo_intento).getTime() > Date.now())) {
          enEspera++;
          continue;
        }

        // Con `pdf_selector` el enlace del índice es una ficha, no el
        // documento: hay que entrar a por el PDF. Si la ficha no lo
        // tiene, se anota como fallo y se salta sin romper la corrida.
        let url = link.url;
        let texto = link.text;
        let fichaTitulo: string | null = null;
        let fichaFecha: string | null = null;
        let motivoFallo: string | null = null;
        let r: Awaited<ReturnType<typeof ingestPdfFromUrl>> | null = null;
        if (src.pdf_selector) {
          const ficha = await resolverPdfDeFicha(link.url, src.pdf_selector);
          if (!ficha) motivoFallo = 'la ficha no tiene PDF o no respondió';
          else {
            url = ficha.url;
            texto = ficha.titulo || link.text;
            fichaTitulo = ficha.titulo || null;
            fichaFecha = ficha.fecha;
          }
        }

        // De hoy en adelante: lo fechado antes de la fecha de corte no lo
        // trae el actualizador —lo carga la ingesta masiva—, pero tampoco
        // se ignora: queda anotado para el panel.
        if (!motivoFallo && src.publicados_desde && fichaFecha && fichaFecha < src.publicados_desde) {
          omitidos++;
          await anotarAnterior(admin, link.url, src.id, fichaTitulo ?? texto, fichaFecha, src.publicados_desde);
          continue;
        }

        if (!motivoFallo) {
          r = await ingestPdfFromUrl({
            url,
            docType: src.doc_type,
            linkText: texto,
            fichaUrl: src.pdf_selector ? link.url : undefined,
            fichaTitulo,
            fichaFecha,
            // Leer escaneos con Gemini cuesta: unos pocos por corrida.
            permitirOcr: ocrRestantes > 0,
            supabaseUrl: SUPABASE_URL,
            serviceKey: SERVICE_KEY,
            geminiKey: GEMINI_KEY,
          });
          if (r.viaOcr) ocrRestantes--;
          if (!r.inserted && !r.yaExiste) motivoFallo = r.reason ?? 'desconocido';
        }

        if (!motivoFallo && r) {
          await anotarRacha();
          if (r.inserted) {
            docsNew += 1;
            docsEmbedded += 1;
            chunksInserted += r.chunkCount ?? 0;
            processedInThisRun += 1;
          } else {
            yaEstaban++;
          }
          if (previo) await admin.from('scraping_fallos').delete().eq('url', link.url);
          continue;
        }

        // Lo que falló no se reintenta en cada corrida: espera un día,
        // luego tres, luego una semana, y tras el tercer intento queda
        // para la ingesta manual.
        fallidos++;
        const motivo = motivoFallo ?? 'desconocido';
        if (racha.length && racha[0].motivo !== motivo) await anotarRacha();
        racha.push({ url: link.url, motivo, intentos: previo?.intentos ?? 0 });
        if (racha.length >= CORTACIRCUITOS) {
          // No se anota la racha: los documentos no tienen la culpa.
          racha = [];
          runStatus = 'failed';
          runError = `Se detuvo: el mismo error se repitió en ${CORTACIRCUITOS} documentos seguidos («${motivo.slice(0, 160)}»). Es una falla del sistema, no de los documentos: revisar antes de la próxima corrida.`;
          break;
        }
      }
      await anotarRacha();
    } catch (e) {
      runStatus = 'failed';
      runError = (e as Error).message.slice(0, 500);
    }

    // Un estado que no mienta: con fallos no es «ok», y si nada entró y
    // todo lo intentado falló, es un fracaso aunque no haya excepción.
    if (runStatus === 'ok' && fallidos > 0) runStatus = 'con_errores';
    if (runStatus !== 'ok') {
      // Queda en el registro de Vercel, no solo en la tabla.
      console.error('[scraping] corrida con problemas', {
        fuente: src.label,
        estado: runStatus,
        nuevos: docsNew,
        fallidos,
        en_espera: enEspera,
        error: runError,
      });
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
          docs_existentes: yaEstaban,
          docs_fallidos: fallidos,
          docs_en_espera: enEspera,
          docs_omitidos: omitidos,
          status: runStatus,
          error_message:
            runError ??
            (fallidos || enEspera
              ? `${fallidos} ${fallidos === 1 ? 'documento' : 'documentos'} con error, ${enEspera} en espera de reintento`
              : null),
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
      ya_estaban: yaEstaban,
      en_espera: enEspera,
      fallidos,
      omitidos,
      status: runStatus,
      error: runError || undefined,
    });
  }

  return NextResponse.json({
    via: authz.via,
    sources_processed: list.length,
    segundos: Math.round((Date.now() - inicio) / 1000),
    runs: runSummary,
  });
}

/**
 * Un documento fechado antes de la fecha de corte que apareció en el
 * índice: no se trae, pero queda a la vista para cargarlo a mano. No se
 * reintenta (se anota una vez).
 */
async function anotarAnterior(admin: SupabaseClient, url: string, sourceId: string, titulo: string, fecha: string, corte: string) {
  const { error } = await admin.from('scraping_fallos').upsert(
    {
      url,
      source_id: sourceId,
      tipo: 'anterior_al_corte',
      motivo: `«${titulo.slice(0, 120)}», fechado el ${fecha}, antes de la fecha de corte (${corte}): cargar con la ingesta manual.`,
      intentos: MAX_INTENTOS,
      ultimo_intento: new Date().toISOString(),
      proximo_intento: new Date('9999-12-31').toISOString(),
    } as never,
    { onConflict: 'url' },
  );
  if (error) console.error('[scraping] no se pudo anotar el documento anterior al corte:', error.message);
}

/** Días de espera antes de reintentar, según cuántas veces falló ya. */
const ESPERA_DIAS = [1, 3, 7];

async function anotarFallo(
  admin: SupabaseClient,
  url: string,
  sourceId: string,
  motivo: string,
  intentosPrevios: number,
) {
  const intentos = intentosPrevios + 1;
  const dias = ESPERA_DIAS[Math.min(intentos - 1, ESPERA_DIAS.length - 1)];
  const { error } = await admin.from('scraping_fallos').upsert(
    {
      url,
      source_id: sourceId,
      motivo: motivo.slice(0, 300),
      intentos,
      ultimo_intento: new Date().toISOString(),
      proximo_intento: new Date(Date.now() + dias * 86400000).toISOString(),
    } as never,
    { onConflict: 'url' },
  );
  if (error) console.error('[scraping] no se pudo anotar el fallo:', error.message);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handleRun(req, body);
}

// GET para Vercel Cron (envía Authorization: Bearer <CRON_SECRET>)
export async function GET(req: Request) {
  return handleRun(req, {});
}
