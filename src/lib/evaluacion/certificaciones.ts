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
  /** De qué trata: calidad, ambiental, antisoborno, seguridad o social. */
  materia: string;
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
    if (n && (/\biso\b|ntp.?iso|certificad[oa] de (?:registro|conformidad)/i.test(trozo) || SOCIAL.test(trozo)) && /certific|reconocimiento|registro/i.test(trozo)) {
      paginas.push(`##### ${tomo ? `tomo ${tomo}, ` : ''}página ${n}\n${trozo.slice(0, 4000)}`);
    }
  }
  if (paginas.length === 0) return [];
  const { text } = await generateText({
    model: chatModel,
    system: `Lees páginas de una oferta. Lista cada CERTIFICADO de sistema de gestión (ISO 9001, ISO 14001, ISO 37001, ISO 45001 o sus NTP) y cada certificado o reconocimiento de SOSTENIBILIDAD SOCIAL (SA 8000, certificación o registro de buenas prácticas laborales, reconocimiento del Ministerio de Trabajo) que se emite a nombre de una empresa: la norma o estándar tal como lo escribe («SA 8000:2014», «Buenas prácticas laborales — SR 2030:2023», «Reconocimiento MTPE»), la empresa TITULAR (razón social, tal como aparece), el ALCANCE (lo que certifica: las actividades o, en los de buenas prácticas laborales, las prácticas que declara —salario justo, entornos seguros, igualdad de oportunidades, trabajo infantil y forzoso—, copiado, hasta 300 caracteres), quién lo emite y ante quién está acreditado, la VIGENCIA (fechas de emisión y de vencimiento) y la página. No cuentes menciones de que un proveedor o un fabricante tiene una ISO.
"materia": "calidad", "ambiental", "antisoborno", "seguridad" o "social" (SA 8000, buenas prácticas laborales, responsabilidad social, reconocimiento del Ministerio de Trabajo), según lo que certifica y no según el número de la norma.
Devuelve SOLO JSON: {"certificados": [{"norma": "ISO 9001:2015", "materia": "calidad", "titular": "", "alcance": "", "vigencia": "", "pagina": "la etiqueta tal como viene"}]}`,
    prompt: paginas.slice(0, 30).join('\n\n'),
    temperature: 0,
    maxTokens: 10_000,
    abortSignal: AbortSignal.timeout(120_000),
  });
  const o = parseJsonLoose(text) as { certificados?: Array<Record<string, unknown>> } | null;
  return (o?.certificados ?? []).map((c) => ({
    norma: String(c.norma ?? ''),
    materia: String(c.materia ?? ''),
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

/** Los certificados del factor de sostenibilidad social. */
const SOCIAL = /SA\s*8000|buenas\s+pr[áa]cticas\s+laborales|responsabilidad\s+social|sostenibilidad\s+social/i;

/**
 * La norma que pide la ficha: 37001, 14001, 9001, 45001 o «social».
 *
 * La sostenibilidad social va primero: antes caía en 14001 por la palabra
 * «sostenibilidad», y se habría puntuado con la ISO ambiental.
 */
function normaDe(f: FichaRequisito): string | null {
  const t = `${f.requisito} ${f.reglaBases}`;
  if (/sostenibilidad\s+social|SA\s*8000|responsabilidad\s+social/i.test(f.requisito) || (/social/i.test(f.requisito) && SOCIAL.test(t))) return 'social';
  const m = t.match(/\b(37001|14001|9001|45001)\b/);
  if (m) return m[1];
  if (/antisoborno|integridad/i.test(t)) return '37001';
  if (/ambiental/i.test(t)) return '14001';
  if (/calidad/i.test(t)) return '9001';
  if (/seguridad y salud/i.test(t)) return '45001';
  return null;
}

const ENCABEZADO_DEL_FACTOR: Record<string, RegExp> = {
  '37001': /INTEGRIDAD\s+EN\s+LA\s+CONTRATACI[ÓO]N/i,
  '9001': /GESTI[ÓO]N\s+DE\s+(?:LA\s+)?CALIDAD|SISTEMA\s+DE\s+GESTI[ÓO]N\s+DE\s+LA\s+CALIDAD/i,
  '14001': /SOSTENIBILIDAD\s+AMBIENTAL/i,
  '45001': /SEGURIDAD\s+Y\s+SALUD/i,
  social: /SOSTENIBILIDAD\s+SOCIAL/i,
};

/** Si un certificado listado es de la norma del factor. */
function esDeLaNorma(c: Certificado, norma: string): boolean {
  if (norma === 'social') return /social/i.test(c.materia) || /8000|laboral|social|trabajo|MTPE/i.test(`${c.norma} ${c.alcance}`);
  return c.norma.includes(norma);
}

/**
 * El texto de la página de un certificado («página 60», «tomo 2, página
 * 198»). Lo que certifica no siempre está en el «alcance»: el de buenas
 * prácticas laborales de POZO HCJ (documento 15) lista sus actividades como
 * alcance y las prácticas laborales —salario justo, entornos seguros…— en
 * el cuerpo, y con solo el alcance se le negó el puntaje.
 */
export function paginaDelCertificado(texto: string, etiqueta: string, tope = 6000): string {
  // «página 60», «pág. 60» o solo «60».
  const n = etiqueta.match(/p[áa]g(?:ina)?\.?\s*(\d+)/i)?.[1] ?? etiqueta.match(/^\s*(\d{1,4})\s*$/)?.[1];
  if (!n) return '';
  const tomo = etiqueta.match(/tomo\s*(\d+)/i)?.[1];
  const zona = tomo ? texto.split(/^=== TOMO \d+/m)[Number(tomo) - 1] ?? '' : texto.split(/^=== TOMO \d+/m)[0];
  const m = zona.match(new RegExp(`=== P[áa]gina ${n} ===([\\s\\S]*?)(?==== P[áa]gina \\d+ ===|$)`));
  // 6 000: el alcance del certificado de POZO HCJ ocupa casi toda la hoja y
  // la vigencia va al final.
  return m ? m[1].trim().slice(0, tope) : '';
}

/** Las prácticas que nombran las Bases estándar para la certificación en buenas prácticas laborales. */
const PRACTICAS_LABORALES = [
  /salario\s+justo/i,
  /entornos?\s+de\s+trabajo\s+segur/i,
  /igualdad\s+de\s+oportunidades/i,
  /trabajo\s+infantil|trabajo\s+forzoso/i,
];

/**
 * Si un certificado acredita la sostenibilidad social, por la forma que le
 * corresponde. Las Bases estándar admiten tres: la SA 8000:2014 emitida por
 * un organismo acreditado ante SAAS, el reconocimiento del Ministerio de
 * Trabajo, o una certificación en buenas prácticas laborales vinculadas al
 * salario justo, entornos seguros, igualdad de oportunidades y debida
 * diligencia contra el trabajo infantil y forzoso.
 *
 * Por código y no por el modelo. César, documento 15: POZO HCJ trajo una
 * certificación de buenas prácticas laborales con esas cuatro prácticas y
 * se le negó el puntaje porque «no es SA 8000 acreditada ante SAAS» —la
 * exigencia de otra forma—; vuelto a preguntar con la regla a la vista, el
 * modelo lo negó otra vez y le dio el puntaje a una SA 8000 sin
 * acreditación SAAS.
 */
export function formaSocial(
  textoCertificado: string,
  reglaBases: string,
): { forma: 'sa8000' | 'mtpe' | 'buenas_practicas' | null; cumple: boolean; motivo: string } {
  const t = textoCertificado;
  if (/SA\s*8000/i.test(t)) {
    const saas = /\bSAAS\b|Social\s+Accountability\s+Accreditation/i.test(t);
    return {
      forma: 'sa8000',
      cumple: saas,
      motivo: saas
        ? 'certificado SA 8000 de un organismo acreditado ante SAAS'
        : 'es un certificado SA 8000 y no consta que el organismo que lo emite esté acreditado ante SAAS, como exigen las Bases para esa forma',
    };
  }
  if (/Ministerio\s+de\s+Trabajo|MTPE/i.test(t) && /reconocimiento/i.test(t)) {
    const admite = /Ministerio\s+de\s+Trabajo/i.test(reglaBases);
    return {
      forma: 'mtpe',
      cumple: admite,
      motivo: admite ? 'reconocimiento del Ministerio de Trabajo, que las Bases admiten' : 'reconocimiento del Ministerio de Trabajo, que las Bases no prevén',
    };
  }
  if (/buenas\s+pr[áa]cticas\s+laborales/i.test(t)) {
    const admite = /buenas\s+pr[áa]cticas\s+laborales/i.test(reglaBases);
    const temas = PRACTICAS_LABORALES.filter((r) => r.test(t)).length;
    return {
      forma: 'buenas_practicas',
      cumple: admite && temas >= 3,
      motivo: !admite
        ? 'certificación en buenas prácticas laborales, que las Bases no prevén'
        : temas >= 3
          ? `certificación en buenas prácticas laborales vinculadas a las prácticas que nombran las Bases (salario justo, entornos de trabajo seguros, igualdad de oportunidades, trabajo infantil y forzoso: ${temas} de 4); a esta forma no se le exige la acreditación SAAS, que es de la SA 8000`
          : `certificación en buenas prácticas laborales que no nombra las prácticas que exigen las Bases (${temas} de 4)`,
    };
  }
  return { forma: null, cumple: false, motivo: 'no es un certificado de sostenibilidad social' };
}

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
        (c) => esDeLaNorma(c, norma) && titulares.some((t) => mismaEmpresa(t, c.titular)),
      );
      if (deLaNorma.length === 0) return f;
      const regla = reglaDelFactor(textoBases, norma);
      if (norma === 'social') {
        const juicios = deLaNorma.map((c) => ({ c, j: formaSocial(paginaDelCertificado(texto, c.pagina) || `${c.norma} ${c.alcance}`, regla || f.reglaBases) }));
        const vale = juicios.find((x) => x.j.cumple);
        if (!vale || typeof f.puntajeMaximo !== 'number') return f;
        // La vigencia, de la página misma: la lista la confundía con el año
        // del número de registro.
        const vigencia =
          paginaDelCertificado(texto, vale.c.pagina, Infinity).match(/vigencia\s+(?:desde\s+)?(?:el\s+)?([^.\n]{8,90})/i)?.[1]?.trim() ?? vale.c.vigencia;
        return {
          ...f,
          puntaje: f.puntajeMaximo,
          resultado: 'cumple',
          naturalezaDefecto: 'ninguno',
          confianza: 'alta',
          verificada: true,
          hallazgo:
            `${vale.c.titular} presenta ${vale.c.norma} (${vale.c.pagina}${vigencia ? `, vigencia ${vigencia}` : ''}): ${vale.j.motivo}. ` +
            `Las Bases admiten, para acreditar una práctica de sostenibilidad social, la SA 8000:2014 emitida por un organismo acreditado ante SAAS, el reconocimiento del Ministerio de Trabajo o la certificación en buenas prácticas laborales; basta una. Acredita una práctica: ${f.puntajeMaximo} puntos.` +
            (juicios.length > 1 ? ` Otros certificados: ${juicios.filter((x) => x !== vale).map((x) => `${x.c.norma}, ${x.j.motivo}`).join('; ')}.` : ''),
        } as FichaRequisito;
      }
      try {
        const { text } = await generateText({
          model: chatModel,
          system: `Asignas el puntaje de UN factor de evaluación que se acredita con certificados. Aplica SOLO la regla de las Bases (evaluación, acreditación y escala de puntajes): alcance exigido, vigencia, organismo, y qué integrantes del consorcio deben tenerlo. Si las Bases piden un alcance específico solo para esta norma, exígelo; si no lo piden, no lo exijas. Si la «Acreditación» admite VARIAS formas (por ejemplo, un certificado SA 8000 emitido por un organismo acreditado ante SAAS, O el reconocimiento del Ministerio de Trabajo, O una certificación en buenas prácticas laborales vinculadas al salario justo, entornos de trabajo seguros…), basta UNA: evalúa cada certificado con los requisitos de la forma que le corresponde, no con los de otra (a una certificación de buenas prácticas laborales no se le exige la acreditación SAAS, que es de la SA 8000). Los certificados listados ESTÁN en la oferta: no digas que faltan.
Devuelve SOLO JSON: {"puntaje": número, "hallazgo": "por qué ese puntaje, nombrando cada certificado con su titular, alcance, vigencia y página"}`,
          prompt: `FACTOR: ${f.requisito}
REGLA RESUMIDA: ${f.reglaBases}
PUNTAJE MÁXIMO: ${f.puntajeMaximo ?? 'el que digan las Bases'}
${regla ? `TEXTO DE LAS BASES:\n${regla}\n` : ''}
POSTOR / INTEGRANTES: ${titulares.join(' · ')}

CERTIFICADOS ${norma === 'social' ? 'DE SOSTENIBILIDAD SOCIAL' : `ISO ${norma}`} EN LA OFERTA:
${deLaNorma.map((c) => `· ${c.titular} — ${c.norma} — alcance: ${c.alcance || 'no indicado'} — vigencia: ${c.vigencia || 'no indicada'} — ${c.pagina}`).join('\n')}

TEXTO DE LOS CERTIFICADOS (lo que certifican, quién los emite y ante quién están acreditados):
${deLaNorma.map((c) => `##### ${c.pagina}\n${paginaDelCertificado(texto, c.pagina) || '(no se halló la página)'}`).join('\n\n')}`,
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
