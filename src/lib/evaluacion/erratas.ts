/**
 * Las observaciones por un dato mal escrito —un dígito de menos en el RUC,
 * una palabra de más en el monto en letras— se confirman en la IMAGEN de
 * la página antes de quedar en el acta.
 *
 * POR QUÉ
 *
 * César, documento 15 (17/10/2026): a AGUILAR HUAYLLA MOISES se le observó
 * el Anexo N° 1 por un RUC de diez dígitos («1041848088» en lugar de
 * «10418480888»). Ese RUC no estaba en el anexo: salía de la transcripción
 * de un sello en la ficha RUC, y en la imagen el sello dice 10418480888.
 * «Al revisar su oferta de manera manual no corresponde realizar dicha
 * observación». Lo mismo con el monto en letras de POZO HCJ (ver
 * `precio.ts`). Si la imagen no confirma el error, la observación cae;
 * si no se pudo mirar, queda como estaba.
 */
import type { FichaRequisito } from './etapas';
import { preguntarALasPaginas, type LectorDePaginas } from './lectura-visual';

/** Lo que dice el hallazgo cuando el defecto es una errata del documento. */
const ERRATA =
  /error\s+(?:material|de\s+transcripci[óo]n|tipogr[áa]fic|de\s+digitaci[óo]n|de\s+redacci[óo]n|en\s+la\s+consignaci[óo]n)|errata|d[íi]gitos?|en\s+lugar\s+de|redundante|mal\s+escrit|err[óo]ne/i;

/** Los fragmentos entre comillas del hallazgo, que son los que hay que buscar. */
function citados(hallazgo: string): string[] {
  const out: string[] = [];
  for (const m of hallazgo.matchAll(/['‘’"“”«»]([^'‘’"“”«»]{4,90})['‘’"“”«»]/g)) out.push(m[1].trim());
  // Y las cifras largas aunque no vayan entre comillas: «(1041848088 sin
  // el último dígito 8)».
  for (const m of hallazgo.matchAll(/\b\d{6,}\b/g)) out.push(m[0]);
  return [...new Set(out)];
}

const SISTEMA = `Eres el control de calidad de un evaluador de ofertas. Lees la IMAGEN de unas páginas escaneadas y transcribes LITERALMENTE lo que se te pide, letra por letra y dígito por dígito, tal como está impreso, sin corregir nada y sin suponer. Si algo no se distingue, escribe [ilegible] en su lugar.
Devuelve SOLO JSON: {"lecturas": [{"n": 1, "pagina": 0, "seLee": ""}]}`;

/**
 * El texto que precede a un fragmento en la transcripción, para pedirle al
 * modelo que lea lo que sigue SIN decirle qué se espera. Con el fragmento a
 * la vista lo repetía: le mostramos «TRESICIENTOS … CUENTA» y contestó que
 * eso decía la imagen, que dice «TRESCIENTOS … CINCUENTA CON».
 */
function anclaDe(texto: string, fragmento: string): { ancla: string; pagina: number } | null {
  // Una cifra se busca entera: «1041848088» está dentro de «10418480888», y
  // así se iba al RUC correcto en vez de al sello donde estaba el error.
  const rx = /^\d+$/.test(fragmento) ? new RegExp(`(?<!\d)${fragmento}(?!\d)`) : null;
  const i = rx ? texto.search(rx) : texto.indexOf(fragmento);
  if (i < 0) return null;
  const antes = texto.slice(Math.max(0, i - 160), i).split('\n').pop() ?? '';
  // «[Sello/Firma: MAQUINARIAS INVERSIONES "AGUILAR" RUC: » → «MAQUINARIAS INVERSIONES "AGUILAR" RUC:»
  const ancla = antes.replace(/\[(?:Sello|Firma|Sello\/Firma)[^:\]]*:/gi, '').replace(/[\[\]|]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(-7).join(' ');
  const pagina = Number([...texto.slice(0, i).matchAll(/=== P[áa]gina (\d+) ===/g)].pop()?.[1]);
  return ancla.length >= 3 && Number.isFinite(pagina) ? { ancla, pagina } : null;
}

const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Si lo leído contiene el fragmento; una cifra, entera («10418480888» no contiene «1041848088»). */
function contiene(leido: string, fragmento: string): boolean {
  if (/^\d+$/.test(fragmento)) return (leido.match(/\d+/g) ?? ([] as string[])).includes(fragmento);
  return plano(leido).includes(plano(fragmento));
}

/**
 * Para cada ficha con una errata: se pide leer en la imagen el mismo lugar
 * de la transcripción y se compara por código. Si la imagen no dice lo que
 * dice la transcripción en un fragmento citado, la observación se basó en
 * un error de lectura y cae.
 */
export async function revisarErratas(
  fichas: FichaRequisito[],
  texto: string,
  lector: LectorDePaginas | undefined,
  nombre?: string,
): Promise<FichaRequisito[]> {
  if (!lector) return fichas;
  const principal = texto.split(/^=== TOMO \d+/m)[0];
  return Promise.all(
    fichas.map(async (f) => {
      if (f.verificada || !ERRATA.test(f.hallazgo ?? '')) return f;
      const pedidos = citados(f.hallazgo)
        .map((fragmento) => ({ fragmento, a: anclaDe(principal, fragmento) }))
        .filter((x): x is { fragmento: string; a: { ancla: string; pagina: number } } => x.a !== null)
        .slice(0, 3);
      if (pedidos.length === 0) return f;
      const o = await preguntarALasPaginas({
        lector,
        paginas: pedidos.map((x) => x.a.pagina),
        sistema: SISTEMA,
        pregunta: pedidos
          .map((x, k) => `${k + 1}. En la página ${x.a.pagina}, transcribe lo que está escrito inmediatamente después de «${x.a.ancla}», hasta el final de esa frase o de ese dato.`)
          .join('\n'),
        nombre,
        maxTokens: 800,
      });
      const lecturas = Array.isArray(o?.lecturas) ? (o!.lecturas as Array<Record<string, unknown>>) : [];
      // La transcripción falló donde la imagen se lee y no contiene lo transcrito.
      const desmentidos = pedidos
        .map((x, k) => ({ ...x, seLee: String((lecturas.find((l) => Number(l.n) === k + 1) ?? lecturas[k])?.seLee ?? '').trim() }))
        .filter((x) => x.seLee && !/ilegible/i.test(x.seLee) && !contiene(x.seLee, x.fragmento));
      if (desmentidos.length === 0) return f;
      const pagina = desmentidos[0].a.pagina;
      const nota = `Revisada la imagen de la página ${pagina}, ${desmentidos.map((x) => `donde la transcripción decía «${x.fragmento}» se lee «${x.seLee}»`).join('; ')}: el error no está en el documento; provenía de la transcripción del escaneo.`;
      if (f.resultado === 'cumple') {
        // Ya cumplía, pero el hallazgo describía el error como «material»
        // (AGUILAR HUAYLLA): se quita esa oración, que no es cierta.
        const oraciones = f.hallazgo.split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ])/);
        const limpias = oraciones.filter((o2) => !desmentidos.some((x) => o2.includes(x.fragmento)) && !ERRATA.test(o2));
        return { ...f, verificada: true, hallazgo: `${limpias.join(' ')} ${nota}`.trim() };
      }
      return {
        ...f,
        resultado: 'cumple',
        subsanable: undefined,
        naturalezaDefecto: 'ninguno',
        confianza: 'alta',
        verificada: true,
        hallazgo: `${nota} No corresponde observarlo.`,
      } as FichaRequisito;
    }),
  );
}
