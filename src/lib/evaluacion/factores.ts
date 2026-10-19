/**
 * Los factores de evaluación cuya acreditación pide VARIOS documentos: el
 * puntaje de cada sub-factor solo si están todos.
 *
 * POR QUÉ
 *
 * César, 18/10/2026, LP Abreviada N° 005-2026-MDK/OC-2: la Mejora 1 se
 * acredita con una declaración jurada «y adicionalmente» el informe de
 * ensayo de granulometría de un laboratorio acreditado por INACAL. AGUILAR
 * HUAYLLA solo presentó la declaración: «al no haber presentado el informe
 * no cumpliría con la mejora 1, por lo que solo le correspondería [el
 * puntaje] por la mejora 2». El modelo le daba los 20 puntos en unas
 * corridas y 10 en otras.
 *
 * CÓMO
 *
 * El modelo lee de las Bases los sub-factores con su puntaje, sus
 * documentos y las palabras con que se reconocen. El código busca esas
 * palabras en la oferta y le da al modelo solo esas páginas para que diga si
 * cada documento está. El puntaje lo suma el código. Solo se BAJA el
 * puntaje: lo que el modelo no encuentre en esas páginas no puede inventar
 * puntos que la ficha no dio.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { FichaRequisito } from './etapas';

const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/** El texto del factor en las Bases: desde su título, con su acreditación y su puntaje. */
export function textoDelFactor(textoBases: string, requisito: string): string {
  const titulo = requisito.replace(/^[A-Z]\.\s*/, '').trim();
  const palabras = plano(titulo).split(' ').filter((w) => w.length > 3).slice(0, 4);
  if (palabras.length === 0) return '';
  const rx = new RegExp(palabras.map((w) => w.replace(/[^a-z0-9]/g, '')).join('[^\\n]{0,40}'), 'gi');
  const t = plano(textoBases);
  let elegido = '';
  for (const m of t.matchAll(rx)) {
    const trozo = textoBases.slice(m.index!, m.index! + 3500);
    // El de la metodología (con su acreditación y puntaje), no el del índice.
    if (/acreditaci[óo]n/i.test(trozo) && /puntos/i.test(trozo)) elegido = trozo;
  }
  return elegido;
}

/** Si la acreditación pide más de un documento: «adicionalmente deberá adjuntar…». */
export function pideVariosDocumentos(texto: string): boolean {
  const acreditacion = texto.slice(Math.max(0, texto.search(/acreditaci[óo]n/i)));
  return /adicionalmente|ademas|además|asimismo|conjuntamente|acompa[ñn]ad|deber[áa] adjuntar|junto con/i.test(acreditacion);
}

interface SubFactor {
  nombre: string;
  puntaje: number;
  documentos: Array<{ documento: string; claves: string[] }>;
}

const LEER_FACTOR = `Lees un factor de evaluación de unas Bases de contratación pública del Perú. Lista sus sub-factores (cada mejora, cada práctica que da puntaje por separado; si no tiene sub-factores, uno solo con el factor entero), con el puntaje que otorga cada uno y TODOS los documentos que exige su «Acreditación» para otorgarlo. Para cada documento, 2 a 4 palabras o frases cortas con que se reconoce en una oferta («informe de ensayo», «granulometría», «laboratorio»; «licencia de funcionamiento»).
Devuelve SOLO JSON: {"subfactores": [{"nombre": "", "puntaje": 0, "documentos": [{"documento": "", "claves": [""]}]}]}`;

const VERIFICAR = `Verificas si una oferta trae los documentos que exige un factor de evaluación. Te dan las páginas de la oferta donde aparecen las palabras de cada documento. Para cada documento exigido: "presente" true solo si ese documento está en la oferta (no basta que se lo mencione, se prometa o se comprometa a presentarlo después: una declaración jurada que promete un informe NO es el informe), con su página; false si no está.
Responde por el NÚMERO de cada documento exigido.
Devuelve SOLO JSON: {"documentos": [{"n": 1, "presente": false, "pagina": "", "cita": ""}]}`;

export async function revisarFactor(ficha: FichaRequisito, textoOferta: string, textoBases: string): Promise<FichaRequisito> {
  if (ficha.verificada || !(typeof ficha.puntaje === 'number' && ficha.puntaje > 0)) return ficha;
  const texto = textoDelFactor(textoBases, ficha.requisito);
  if (!texto || !pideVariosDocumentos(texto)) return ficha;

  const { text } = await generateText({
    model: chatModel,
    system: LEER_FACTOR,
    prompt: `FACTOR: ${ficha.requisito}\n\n${texto}`,
    temperature: 0,
    maxTokens: 1500,
    abortSignal: AbortSignal.timeout(60_000),
  });
  const o = parseJsonLoose(text) as { subfactores?: Array<Record<string, unknown>> } | null;
  const subs: SubFactor[] = (o?.subfactores ?? [])
    .map((x) => ({
      nombre: String(x.nombre ?? '').trim(),
      puntaje: Number(x.puntaje) || 0,
      documentos: (Array.isArray(x.documentos) ? (x.documentos as Array<Record<string, unknown>>) : []).map((d) => ({
        documento: String(d.documento ?? '').trim(),
        claves: (Array.isArray(d.claves) ? d.claves : []).map((c) => String(c).trim()).filter((c) => c.length >= 4),
      })),
    }))
    .filter((x) => x.nombre && x.puntaje > 0 && x.documentos.length > 0);
  // Solo los sub-factores con más de un documento: los de uno solo ya los
  // resuelve bien la lectura general.
  const conVarios = subs.filter((x) => x.documentos.length > 1);
  if (conVarios.length === 0) return ficha;

  // Las páginas de la oferta donde aparecen las palabras de cada documento.
  const paginas = textoOferta.split(/(?==== P[áa]gina \d+ ===)/);
  const deLasClaves = (claves: string[]) =>
    paginas.filter((p) => claves.some((c) => plano(p).includes(plano(c)))).slice(0, 6);

  const faltan: string[] = [];
  const vistos: string[] = [];
  let perdido = 0;
  for (const sub of conVarios) {
    const trozos = [...new Set(sub.documentos.flatMap((d) => deLasClaves(d.claves)))].slice(0, 8);
    let presentes: Array<Record<string, unknown>> = [];
    if (trozos.length > 0) {
      const { text: t2 } = await generateText({
        model: chatModel,
        system: VERIFICAR,
        prompt: `SUB-FACTOR: ${sub.nombre}\nDOCUMENTOS EXIGIDOS:\n${sub.documentos.map((d, k) => `${k + 1}. ${d.documento}`).join('\n')}\n\nPÁGINAS DE LA OFERTA:\n${trozos.join('\n').slice(0, 60_000)}`,
        temperature: 0,
        maxTokens: 1500,
        abortSignal: AbortSignal.timeout(90_000),
      });
      presentes = ((parseJsonLoose(t2) as { documentos?: Array<Record<string, unknown>> } | null)?.documentos ?? []);
    }
    // Sin respuesta legible no se quita nada: no saber no es «no está».
    if (trozos.length > 0 && presentes.length === 0) continue;
    const estado = (k: number) => presentes.find((p) => Number(p.n) === k + 1);
    const ausentes = sub.documentos.filter((_, k) => estado(k)?.presente !== true);
    if (ausentes.length > 0) {
      perdido += sub.puntaje;
      faltan.push(`${sub.nombre}: no presenta ${ausentes.map((d) => d.documento).join(' ni ')}`);
    } else {
      vistos.push(`${sub.nombre}: presenta ${sub.documentos.map((d, k) => `${d.documento}${estado(k)?.pagina ? ` (página ${String(estado(k)!.pagina)})` : ''}`).join('; ')}`);
    }
  }
  if (perdido === 0) return ficha;
  const puntaje = Math.max(0, (ficha.puntaje ?? 0) - perdido);
  if (puntaje >= (ficha.puntaje ?? 0)) return ficha;
  return {
    ...ficha,
    puntaje,
    resultado: puntaje > 0 ? 'cumple' : 'no_cumple',
    subsanable: false,
    verificada: true,
    confianza: 'alta',
    hallazgo:
      `${faltan.join('. ')}. Las Bases exigen todos esos documentos para otorgar el puntaje de ${faltan.length === 1 ? 'esa mejora' : 'esas mejoras'}, y un factor de evaluación no se subsana: no corresponde el puntaje (${perdido} puntos). ` +
      `${vistos.length ? `${vistos.join('. ')}. ` : ''}Puntaje del factor: ${puntaje} de ${ficha.puntajeMaximo ?? '—'}.`,
  };
}
