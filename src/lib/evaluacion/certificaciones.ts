/**
 * Los factores de evaluación que se acreditan con certificados ISO
 * (antisoborno 37001, calidad 9001, ambiental 14001, seguridad 45001).
 *
 * POR QUÉ
 *
 * Dos veces el modelo dio cero puntos por certificados que estaban en la
 * oferta:
 *   · CP SER-SM-6-2026 (documento 13): el Consorcio Mega trajo las tres ISO
 *     de cada integrante (tomo 2, páginas 198 a 203) y se dijo que
 *     Representaciones Automundo no tenía ninguna. César: «ambos sí
 *     acreditan … por lo que se debe otorgar el puntaje que corresponda»;
 *     y el alcance «mantenimiento vial» solo lo exigía la ISO 9001.
 *   · Servicio de estructura metálica de Socos (documento 14): ARLETTCONS
 *     S.A.C. adjuntó la ISO 37001 y la ISO 9001:2015, y el acta dijo que
 *     las había omitido.
 * Aquí se listan los certificados de la oferta (titular, norma, alcance,
 * vigencia) en una consulta corta, y si los de la norma del factor
 * existen, se vuelve a puntuar el factor con la regla de las Bases y solo
 * esos certificados a la vista.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { FichaRequisito } from './etapas';
import { plano } from './equipos';

interface Certificado {
  norma: string;
  titular: string;
  alcance: string;
  vigencia: string;
  pagina: string;
}

const LEIDOS = new Map<string, Promise<Certificado[]>>();

function certificadosDe(texto: string): Promise<Certificado[]> {
  const clave = `${texto.length}:${texto.slice(0, 200)}`;
  let p = LEIDOS.get(clave);
  if (!p) {
    p = leer(texto).catch((e) => {
      console.warn('[evaluacion] lectura de certificados omitida:', (e as Error).message.slice(0, 160));
      return [];
    });
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
    system: `Lees páginas de una oferta. Lista cada CERTIFICADO de sistema de gestión (ISO 9001, ISO 14001, ISO 37001, ISO 45001 o sus NTP) que emite un organismo certificador a nombre de una empresa: la norma, la empresa TITULAR del certificado (razón social, tal como aparece), el ALCANCE (las actividades certificadas, copiadas, hasta 300 caracteres), la VIGENCIA (fechas de emisión y de vencimiento) y la página. No cuentes menciones de que un proveedor o un fabricante tiene una ISO.
Devuelve SOLO JSON: {"certificados": [{"norma": "ISO 9001:2015", "titular": "", "alcance": "", "vigencia": "", "pagina": "la etiqueta tal como viene"}]}`,
    prompt: paginas.slice(0, 30).join('\n\n'),
    temperature: 0,
    maxTokens: 10_000,
    abortSignal: AbortSignal.timeout(120_000),
  });
  const o = parseJsonLoose(text) as { certificados?: Array<Record<string, unknown>> } | null;
  return (o?.certificados ?? []).map((c) => ({
    norma: String(c.norma ?? ''),
    titular: String(c.titular ?? ''),
    alcance: String(c.alcance ?? ''),
    vigencia: String(c.vigencia ?? ''),
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
  if (/seguridad y salud/i.test(t)) return '45001';
  return null;
}

const ENCABEZADO_DEL_FACTOR: Record<string, RegExp> = {
  '37001': /INTEGRIDAD\s+EN\s+LA\s+CONTRATACI[ÓO]N/i,
  '9001': /GESTI[ÓO]N\s+DE\s+(?:LA\s+)?CALIDAD|SISTEMA\s+DE\s+GESTI[ÓO]N\s+DE\s+LA\s+CALIDAD/i,
  '14001': /SOSTENIBILIDAD\s+AMBIENTAL/i,
  '45001': /SEGURIDAD\s+Y\s+SALUD/i,
};

/** El texto del factor en las Bases: evaluación, acreditación y puntajes. */
function reglaDelFactor(textoBases: string, norma: string): string {
  const rx = ENCABEZADO_DEL_FACTOR[norma];
  if (!rx || !textoBases) return '';
  const g = new RegExp(rx.source, 'gi');
  // La mención que trae la metodología de puntaje, no la del índice.
  for (const m of textoBases.matchAll(g)) {
    const trozo = textoBases.slice(m.index!, m.index! + 2600);
    if (/PUNTAJE|puntos/i.test(trozo) && /Acreditaci[óo]n|Evaluaci[óo]n/i.test(trozo)) return trozo;
  }
  return '';
}

/**
 * Vuelve a puntuar los factores de certificación que la ficha dejó sin el
 * puntaje completo, cuando los certificados de esa norma están en la
 * oferta a nombre del postor (o de los integrantes del consorcio).
 */
export async function revisarCertificaciones(
  fichas: FichaRequisito[],
  texto: string,
  titulares: string[],
  textoBases = '',
): Promise<FichaRequisito[]> {
  const candidatas = fichas.filter(
    (f) => normaDe(f) && (f.resultado === 'no_cumple' || (typeof f.puntajeMaximo === 'number' && (f.puntaje ?? 0) < f.puntajeMaximo)),
  );
  if (candidatas.length === 0 || titulares.length === 0) return fichas;
  const certificados = await certificadosDe(texto);
  return Promise.all(
    fichas.map(async (f) => {
      if (!candidatas.includes(f)) return f;
      const norma = normaDe(f)!;
      const deLaNorma = certificados.filter(
        (c) => c.norma.includes(norma) && titulares.some((t) => mismaEmpresa(t, c.titular)),
      );
      if (deLaNorma.length === 0) return f;
      const regla = reglaDelFactor(textoBases, norma);
      try {
        const { text } = await generateText({
          model: chatModel,
          system: `Asignas el puntaje de UN factor de evaluación que se acredita con certificados ISO. Aplica SOLO la regla de las Bases (evaluación, acreditación y escala de puntajes): alcance exigido, vigencia, organismo, y qué integrantes del consorcio deben tenerlo. Si las Bases piden un alcance específico solo para esta norma, exígelo; si no lo piden, no lo exijas. Los certificados listados ESTÁN en la oferta: no digas que faltan.
Devuelve SOLO JSON: {"puntaje": número, "hallazgo": "por qué ese puntaje, nombrando cada certificado con su titular, alcance, vigencia y página"}`,
          prompt: `FACTOR: ${f.requisito}
REGLA RESUMIDA: ${f.reglaBases}
PUNTAJE MÁXIMO: ${f.puntajeMaximo ?? 'el que digan las Bases'}
${regla ? `TEXTO DE LAS BASES:\n${regla}\n` : ''}
POSTOR / INTEGRANTES: ${titulares.join(' · ')}

CERTIFICADOS ISO ${norma} EN LA OFERTA:
${deLaNorma.map((c) => `· ${c.titular} — ${c.norma} — alcance: ${c.alcance || 'no indicado'} — vigencia: ${c.vigencia || 'no indicada'} — ${c.pagina}`).join('\n')}`,
          temperature: 0,
          maxTokens: 1500,
          abortSignal: AbortSignal.timeout(90_000),
        });
        const o = parseJsonLoose(text) as { puntaje?: unknown; hallazgo?: unknown } | null;
        const max = typeof f.puntajeMaximo === 'number' ? f.puntajeMaximo : Infinity;
        const puntaje = Math.max(0, Math.min(max, Number(o?.puntaje) || 0));
        if (puntaje <= (f.puntaje ?? 0)) return f;
        return {
          ...f,
          puntaje,
          resultado: 'cumple',
          naturalezaDefecto: 'ninguno',
          confianza: 'media',
          hallazgo: `${String(o?.hallazgo ?? '').trim()} (Puntaje revisado: la conclusión anterior decía que el certificado no estaba; consta en ${deLaNorma.map((c) => `${c.titular}, ${c.pagina}`).join('; ')}.)`,
        } as FichaRequisito;
      } catch {
        return f;
      }
    }),
  );
}
