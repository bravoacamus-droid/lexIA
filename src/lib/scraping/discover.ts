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

/**
 * El PDF que hay dentro de una ficha, cuando el índice no lo enlaza.
 *
 * POR QUÉ HIZO FALTA
 *
 * El portal cambió. Hasta agosto de 2026 las colecciones del OSCE
 * enlazaban el PDF directamente desde el índice, y bastaba con pedir
 * `a[href*=".pdf"]`. Ahora el OSCE es el OECE, gob.pe reasignó los
 * identificadores de colección —las URLs viejas dan 404, y dos de ellas
 * llevan a otra institución— y el índice enlaza a una ficha por
 * documento; el PDF está dentro de esa ficha.
 *
 * Sin esto la biblioteca dejó de crecer el 10 de agosto de 2026, y se
 * notó porque un sistema de la competencia citaba resoluciones del
 * Tribunal que nosotros no teníamos: las nuestras se cortaban en la
 * 7564 de 2026 y las suyas pasaban de la 8000.
 */
export async function resolverPdfDeFicha(
  fichaUrl: string,
  pdfSelector: string,
  timeoutMs = 20_000,
): Promise<{ url: string; titulo: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let html: string;
  try {
    const res = await fetch(fichaUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const href = $(pdfSelector).first().attr('href');
  if (!href) return null;
  let abs: string;
  try {
    abs = new URL(href, fichaUrl).toString();
  } catch {
    return null;
  }
  // El título de la ficha nombra el documento —«Resolución N.°
  // 8391-2026-TCP-S5»— y es mejor que el texto del enlace del índice.
  // Se lee del <title>, no del <h1>: el primer h1 de estas páginas es
  // el nombre de la institución, no el del documento.
  const titulo = ($('title').text() || $('h1').first().text() || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*(?:Normas y documentos legales|Informes y publicaciones|Compendios).*$/i, '')
    .trim()
    .slice(0, 240);
  return { url: abs, titulo };
}
