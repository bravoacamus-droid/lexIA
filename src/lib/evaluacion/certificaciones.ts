/**
 * Las certificaciones ISO de una oferta en consorcio, por integrante.
 *
 * En el CP SER-SM-6-2026 las Bases piden la ISO 37001 a cada integrante
 * del consorcio, y las de calidad y ambiente a los que ejecutan el objeto.
 * El Consorcio Mega trajo las tres de cada integrante (tomo 2, páginas
 * 198 a 203), y el modelo, en una corrida, dijo que Representaciones
 * Automundo no tenía ninguna y le quitó treinta puntos. Aquí se listan
 * los certificados de la oferta con su titular, y el código compara.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { FichaRequisito } from './etapas';
import { plano } from './equipos';

interface Certificado {
  norma: string;
  titular: string;
  pagina: string;
}

const LEIDOS = new Map<string, Promise<Certificado[]>>();

function certificadosDe(texto: string): Promise<Certificado[]> {
  const clave = `${texto.length}:${texto.slice(0, 200)}`;
  let p = LEIDOS.get(clave);
  if (!p) {
    p = leer(texto).catch(() => []);
    LEIDOS.set(clave, p);
    if (LEIDOS.size > 20) LEIDOS.delete(LEIDOS.keys().next().value!);
  }
  return p;
}

async function leer(texto: string): Promise<Certificado[]> {
  let tomo = '';
  const paginas: string[] = [];
  for (const trozo of texto.split(/(?==== P[áa]gina \d+ ===|^=== TOMO \d+)/m)) {
    const t = trozo.match(/^=== TOMO (\d+)/);
    if (t) {
      tomo = t[1];
      continue;
    }
    const n = trozo.match(/^=== P[áa]gina (\d+) ===/)?.[1];
    if (n && /\biso\b|ntp.?iso|certificad[oa] de (?:registro|conformidad)/i.test(trozo) && /certific/i.test(trozo)) {
      paginas.push(`##### ${tomo ? `tomo ${tomo}, ` : ''}página ${n}\n${trozo.slice(0, 4000)}`);
    }
  }
  if (paginas.length === 0) return [];
  const { text } = await generateText({
    model: chatModel,
    system: `Lees páginas de una oferta. Lista cada CERTIFICADO de sistema de gestión (ISO 9001, ISO 14001, ISO 37001, ISO 45001 o sus NTP) que emite un organismo certificador a nombre de una empresa: la norma, la empresa TITULAR del certificado (razón social, tal como aparece) y la página. No cuentes menciones de que un proveedor o un fabricante tiene una ISO.
Devuelve SOLO JSON: {"certificados": [{"norma": "ISO 9001:2015", "titular": "", "pagina": "la etiqueta tal como viene"}]}`,
    prompt: paginas.slice(0, 30).join('\n\n'),
    temperature: 0,
    maxTokens: 3000,
    abortSignal: AbortSignal.timeout(90_000),
  });
  const o = parseJsonLoose(text) as { certificados?: Array<Record<string, unknown>> } | null;
  return (o?.certificados ?? []).map((c) => ({
    norma: String(c.norma ?? ''),
    titular: String(c.titular ?? ''),
    pagina: String(c.pagina ?? ''),
  }));
}

const SOCIETARIO = /\b(s a c|s r l|e i r l|s a|sac|srl|eirl|sociedad|anonima|cerrada|empresa|contratistas?|generales?|constructora|representaciones|corporacion|inversiones|servicios|y|de|del|la|el)\b/g;
function nucleo(n: string): string[] {
  return plano(n).replace(SOCIETARIO, ' ').split(/\s+/).filter((w) => w.length >= 3);
}
function mismaEmpresa(a: string, b: string): boolean {
  const x = nucleo(a);
  const y = new Set(nucleo(b));
  return x.length > 0 && x.some((w) => y.has(w));
}

/** La norma que pide la ficha: 37001, 14001, 9001 o 45001. */
function normaDe(f: FichaRequisito): string | null {
  const t = `${f.requisito} ${f.reglaBases}`;
  const m = t.match(/\b(37001|14001|9001|45001)\b/);
  if (m) return m[1];
  if (/antisoborno|integridad/i.test(t)) return '37001';
  if (/ambiental|sostenib/i.test(t)) return '14001';
  if (/calidad/i.test(t)) return '9001';
  return null;
}

/**
 * Si la ficha de un factor de certificación no da el puntaje completo y
 * todos los integrantes tienen la norma, pasa al comité con la lista de
 * certificados. No cambia el puntaje: el alcance y la vigencia los mira
 * el comité.
 */
export async function revisarCertificaciones(
  fichas: FichaRequisito[],
  texto: string,
  integrantes: string[],
): Promise<FichaRequisito[]> {
  if (integrantes.length < 2) return fichas;
  const candidatas = fichas.filter(
    (f) => normaDe(f) && (f.resultado === 'no_cumple' || (typeof f.puntajeMaximo === 'number' && (f.puntaje ?? 0) < f.puntajeMaximo)),
  );
  if (candidatas.length === 0) return fichas;
  const certificados = await certificadosDe(texto);
  return fichas.map((f) => {
    if (!candidatas.includes(f)) return f;
    const norma = normaDe(f)!;
    const deLaNorma = certificados.filter((c) => c.norma.includes(norma));
    const cubiertos = integrantes.filter((i) => deLaNorma.some((c) => mismaEmpresa(i, c.titular)));
    if (cubiertos.length < integrantes.length) return f;
    const lista = deLaNorma.map((c) => `${c.titular} (${c.pagina})`).join('; ');
    return {
      ...f,
      resultado: 'revision_humana',
      confianza: 'baja',
      conflicto: [
        f.conflicto,
        `La oferta trae un certificado ISO ${norma} de cada integrante del consorcio: ${lista}. La conclusión de la ficha dice que falta en alguno: el comité debe verificar el alcance y la vigencia de cada certificado y asignar el puntaje.`,
      ]
        .filter(Boolean)
        .join(' '),
    };
  });
}
