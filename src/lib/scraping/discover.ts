import * as cheerio from 'cheerio';

/**
 * Visita la URL índice de una fuente y devuelve los enlaces candidatos
 * a documentos normativos (URLs absolutas + texto del enlace).
 *
 * Estrategia:
 *   1. fetch del HTML con timeout y UA realista.
 *   2. Aplica el CSS selector configurado en la source.
 *   3. Filtra los hrefs que matcheen el regex opcional configurado.
 *   4. Devuelve URLs absolutas resueltas contra el origin de la fuente.
 */
export interface DiscoveredLink {
  url: string;
  text: string;
}

const UA =
  'Mozilla/5.0 (compatible; LexIA-Bot/1.0; +https://lexia.pe/bot)';

export async function discoverLinks(opts: {
  sourceUrl: string;
  linkSelector: string;
  linkFilterRegex: string | null;
  timeoutMs?: number;
}): Promise<DiscoveredLink[]> {
  const timeout = opts.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let html: string;
  try {
    const res = await fetch(opts.sourceUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const base = new URL(opts.sourceUrl);
  const filter = opts.linkFilterRegex ? new RegExp(opts.linkFilterRegex) : null;
  const seen = new Set<string>();
  const out: DiscoveredLink[] = [];

  $(opts.linkSelector).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let abs: string;
    try {
      abs = new URL(href, base).toString();
    } catch {
      return;
    }
    if (filter && !filter.test(abs)) return;
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push({ url: abs, text: $(el).text().trim().slice(0, 240) });
  });

  return out;
}
