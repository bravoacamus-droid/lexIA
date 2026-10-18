/**
 * Qué bonificaciones solicita cada postor y con qué las acredita.
 *
 * POR QUÉ
 *
 * César, «PROCEDIMIENTOS DE EVALUACIÓN» (17/10/2026), paso 7: bonificación
 * MYPE del 5 % en la modalidad abreviada (art. 75.5 del Reglamento) y del
 * 10 % por domicilio en la provincia o colindante (art. 75.6). En la LP
 * Abreviada N° 005-2026-MDK/OC-2 los tres postores presentaron el Anexo N°
 * 16 «Solicitud de bonificación del cinco por ciento» y el evaluador no lo
 * miraba: el acta tenía la columna «Puntaje total + bonificación» y ponía
 * el total sin bonificar.
 *
 * Se busca la solicitud LLENADA («solicito la asignación de la bonificación
 * del cinco por ciento»), no el título del anexo, que también aparece en el
 * índice de la oferta. Las bases piden verificar la condición MYPE en el
 * portal del REMYPE; la oferta a veces trae la constancia y a veces no: se
 * anota para el comité.
 */
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { SolicitudesDeBonificacion } from './etapas';

const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const PIDE_MYPE = /solicit\w*\s+(?:la\s+)?(?:asignacion\s+de\s+la\s+)?bonificacion\s+del?\s+(?:cinco\s+por\s+ciento|5\s*%)/;
const PIDE_PROVINCIA = /solicit\w*\s+(?:la\s+)?(?:asignacion\s+de\s+la\s+)?bonificacion\s+del?\s+(?:diez\s+por\s+ciento|10\s*%)/;
// No «condición de micro y pequeña empresa»: la dice la propia solicitud.
const REMYPE = /remype|registro nacional de la micro y pequena empresa|acreditad\w+ (?:en el registro|como micro)/;

export async function solicitudesDeBonificacion(textoOferta: string, textoBases: string): Promise<SolicitudesDeBonificacion> {
  const t = plano(textoOferta);
  const s: SolicitudesDeBonificacion = {
    mype: PIDE_MYPE.test(t),
    remype: REMYPE.test(t),
    provincia: PIDE_PROVINCIA.test(t),
  };
  if (s.provincia) {
    const lugar = await provincias(textoOferta, textoBases).catch(() => null);
    if (lugar) Object.assign(s, lugar);
  }
  return s;
}

/** Trozos de texto alrededor de lo buscado. */
function trozos(texto: string, rx: RegExp, ancho: number, maximo: number): string {
  const out: string[] = [];
  for (const m of texto.matchAll(new RegExp(rx.source, 'gi'))) {
    out.push(texto.slice(Math.max(0, m.index! - ancho), m.index! + ancho));
    if (out.length >= maximo) break;
  }
  return out.join('\n[…]\n');
}

/**
 * La provincia del domicilio del postor (constancia del RNP o Anexo N° 1) y
 * la de ejecución (Bases). Solo se pregunta si pidió el 10 %. La
 * colindancia no la decide el sistema: si son distintas, va al comité.
 */
async function provincias(textoOferta: string, textoBases: string) {
  const { text } = await generateText({
    model: fastModel,
    system:
      'Lees fragmentos de una oferta y de las bases de un procedimiento de selección del Perú. Devuelve SOLO JSON: {"provinciaDomicilio": "", "provinciaEjecucion": ""}. "provinciaDomicilio" es la PROVINCIA del domicilio del postor según su constancia del RNP (o, si no está, su declaración jurada de datos). "provinciaEjecucion" es la provincia donde se presta el servicio o se ejecuta la obra según las bases. Solo el nombre de la provincia; vacío si no consta.',
    prompt: `OFERTA:\n${trozos(textoOferta, /domicilio|constancia de inscripci|RNP/, 600, 6).slice(0, 12_000)}\n\nBASES:\n${trozos(textoBases, /lugar de (?:ejecuci|prestaci|entrega)|provincia de|distrito de/, 500, 6).slice(0, 10_000)}`,
    temperature: 0,
    maxTokens: 200,
    abortSignal: AbortSignal.timeout(45_000),
  });
  const o = parseJsonLoose(text) as { provinciaDomicilio?: string; provinciaEjecucion?: string } | null;
  const limpio = (v?: string) => (v ? v.replace(/^provincia\s+de\s+/i, '').trim() || undefined : undefined);
  return { provinciaDomicilio: limpio(o?.provinciaDomicilio), provinciaEjecucion: limpio(o?.provinciaEjecucion) };
}
