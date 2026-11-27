/**
 * Contraste de UNA observación (añadida a mano o editada) con el
 * requerimiento, la normativa y la biblioteca.
 *
 * POR QUÉ (reunión con César del 27/11/2026)
 *
 * «Lo que añado, primero lo contrasto: no simplemente pongo lo que sea y lo
 * mejoro; me debería decir una alerta, no es correcto lo que tú estás
 * diciendo, por esta razón; y si fuera correcto, mejora la redacción»
 * (César). Aquí:
 *   1. si la observación cita el requerimiento, se comprueba que la cita
 *      exista en su texto;
 *   2. se traen de la biblioteca los precedentes del tema, con la misma
 *      búsqueda del contraste por tema (`precedentesParaTexto`: literal,
 *      afinada con el objeto, y por parecido, tipo por tipo);
 *   3. un juez dice si la observación procede, con qué precisiones o por
 *      qué no, citando solo los precedentes que tiene delante, y propone la
 *      redacción mejorada. Nunca reemplaza el texto: el usuario decide.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { generatorModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { temaDeLaPregunta } from '@/lib/ai/fuentes-del-tema';
import type { FuenteCitada, TipoDeFuente } from '@/lib/evaluacion/bases/fuentes';
import type { Solicitud } from '@/lib/evaluacion/auditoria-tdr';
import { precedentesParaTexto } from './contrastar';
import type { ObjetoDeContratacion, Regimen } from './comprobaciones';
import type { CamposDeObservacion, ContrasteDeObservacion, Veredicto } from './observaciones';

const VEREDICTOS: Veredicto[] = ['compatible', 'compatible_con_condiciones', 'incompatible', 'evidencia_insuficiente'];
const SOLICITUDES: Solicitud[] = ['modificar', 'suprimir', 'ampliar', 'precisar', 'incorporar'];

const plano = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[«»"“”']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * ¿La cita está en el requerimiento? Se busca su comienzo (60 caracteres)
 * sin tildes ni comillas: el PDF corta líneas y cambia comillas.
 * `null` = no se pudo comprobar (no hay texto, o es una omisión).
 */
export function citaEnElTexto(extracto: string, texto?: string): boolean | null {
  const cita = extracto.replace(/…$/, '').trim();
  if (!texto || !cita || /^\(omisi[óo]n\)/i.test(cita)) return null;
  const inicio = plano(cita).slice(0, 60);
  if (inicio.length < 12) return null;
  return plano(texto).includes(inicio);
}

const SISTEMA = `Eres especialista en Contrataciones del Estado peruano (Ley N° 32069 y su Reglamento). Un especialista formuló una OBSERVACIÓN a un requerimiento (términos de referencia o especificaciones técnicas). Tu trabajo es contrastarla, no darle la razón: decidir si procede frente al requerimiento, la normativa y los precedentes de la biblioteca [F1], [F2]… (resoluciones del Tribunal, acuerdos de Sala Plena, pronunciamientos, opiniones, informes de vicio de nulidad y dictámenes del OECE).

Veredicto:
- "compatible": la observación procede tal como está planteada.
- "compatible_con_condiciones": procede, pero hay que precisar o corregir algo (dilo).
- "incompatible": no procede: lo observado es correcto o permitido, o la observación pide algo contrario a la normativa o a los precedentes. Explica por qué, con el precedente si lo hay.
- "evidencia_insuficiente": no hay base normativa ni precedentes para sostenerla ni para descartarla.

Reglas:
- Si se te indica que la cita NO está en el requerimiento, dilo en la explicación y no la des por cierta.
- Cita en "fuentes" SOLO códigos F que traten el mismo punto; si ninguno aplica, deja la lista vacía. Nunca inventes números de resoluciones, pronunciamientos ni opiniones.
- "propuesta": la observación redactada como en un pliego de observaciones formal (español del Perú, tercera persona, sin primera persona): título breve, fundamento (descripcion) que explique la contravención y su base, solicitud y la redacción concreta de lo que se pide (recomendacion). Si el veredicto es "incompatible", la propuesta reformula la observación para que proceda, o, si no hay forma, lo dice en el fundamento.

Responde SOLO JSON:
{"veredicto": "...", "explicacion": "2 a 5 oraciones", "fuentes": [{"codigo": "F2", "criterio": "qué decidió ese precedente sobre este punto, en una oración"}], "propuesta": {"titulo": "máx. 120 caracteres", "descripcion": "fundamento, máx. 900 caracteres", "solicitud": "modificar|suprimir|ampliar|precisar|incorporar", "recomendacion": "máx. 700 caracteres"}}`;

export async function contrastarObservacion(
  db: SupabaseClient,
  campos: CamposDeObservacion,
  ctx: {
    regimen?: Regimen | null;
    objeto?: ObjetoDeContratacion | null;
    textoDelRequerimiento?: string;
    alUsar?: (u: { entrada: number; salida: number }) => void;
  },
): Promise<ContrasteDeObservacion> {
  const enElTexto = citaEnElTexto(campos.extracto_literal, ctx.textoDelRequerimiento);
  const sobre = `${campos.titulo}. ${campos.extracto_literal} ${campos.descripcion}`.replace(/\s+/g, ' ').slice(0, 1_800);

  // Las expresiones literales del tema, con el extractor del chat.
  const tema = await temaDeLaPregunta(sobre, 5_000).catch(() => null);
  const expresiones = tema?.terminos?.length ? [tema.terminos.slice(0, 2), ...tema.terminos.slice(0, 2).map((t) => [t])] : [];
  const muestra = /^\(omisi[óo]n\)/i.test(campos.extracto_literal.trim()) ? '' : campos.extracto_literal.slice(0, 1_800);
  const prec = await precedentesParaTexto(db, { muestra, consulta: sobre, expresiones, etiqueta: 'observacion' }).catch(() => ({
    total: 0,
    fragmentos: [],
  }));

  const ubic = campos.ubicacion_detalle;
  const regimen =
    ctx.regimen === 'menor_8uit' ? 'contrato menor (≤ 8 UIT)' : ctx.regimen === 'seleccion' ? 'procedimiento de selección' : 'no indicado';
  const prompt = [
    `CONTRATACIÓN: ${regimen}; objeto: ${ctx.objeto ?? 'no indicado'}.`,
    '',
    'OBSERVACIÓN FORMULADA:',
    `Título: ${campos.titulo}`,
    `Ubicación: página ${ubic.pagina} · capítulo ${ubic.capitulo} · numeral ${ubic.numeral} · literal ${ubic.literal}`,
    `Texto observado: ${campos.extracto_literal || '(no indica)'}`,
    enElTexto === false
      ? 'ATENCIÓN: esa cita NO aparece en el texto del requerimiento.'
      : enElTexto === true
        ? '(La cita sí aparece en el requerimiento.)'
        : '',
    `Fundamento: ${campos.descripcion}`,
    `Solicitud: ${campos.solicitud} — ${campos.recomendacion}`,
    campos.marco_normativo ? `Marco normativo que invoca: ${campos.marco_normativo}` : '',
    '',
    'PRECEDENTES DE LA BIBLIOTECA:',
    prec.fragmentos.map((f, k) => `[F${k + 1}] ${f.tipo} — ${f.numero}\n${f.content.replace(/\s+/g, ' ').slice(0, 1_300)}`).join('\n\n') ||
      '(ninguno)',
    '',
    'Responde SOLO con el JSON, empezando por {.',
  ]
    .filter((l) => l !== '')
    .join('\n');

  const r = await generateText({
    model: generatorModel,
    system: SISTEMA,
    prompt,
    temperature: 0.1,
    maxTokens: 12_000,
    abortSignal: AbortSignal.timeout(90_000),
  });
  ctx.alUsar?.({ entrada: r.usage?.promptTokens ?? 0, salida: r.usage?.completionTokens ?? 0 });

  const crudo = parseJsonLoose<{
    veredicto?: string;
    explicacion?: string;
    fuentes?: Array<{ codigo?: string; criterio?: string }>;
    propuesta?: { titulo?: string; descripcion?: string; solicitud?: string; recomendacion?: string };
  }>(r.text);

  const veredicto = VEREDICTOS.includes(crudo.veredicto as Veredicto) ? (crudo.veredicto as Veredicto) : 'evidencia_insuficiente';
  const vistos = new Set<string>();
  const fuentes: FuenteCitada[] = [];
  for (const f of Array.isArray(crudo.fuentes) ? crudo.fuentes : []) {
    const k = Number(String(f?.codigo ?? '').replace(/\D/g, '')) - 1;
    const criterio = String(f?.criterio ?? '').trim();
    if (k < 0 || k >= prec.fragmentos.length || !criterio) continue;
    const doc = prec.fragmentos[k];
    if (vistos.has(doc.document_id)) continue;
    vistos.add(doc.document_id);
    fuentes.push({ tipo: doc.tipo as TipoDeFuente, numero: doc.numero, documentId: doc.document_id, criterio: criterio.slice(0, 400) });
  }
  let explicacion = String(crudo.explicacion ?? '').trim().slice(0, 1_500);
  if (enElTexto === false && !/no (aparece|figura|se encuentra|consta)/i.test(explicacion)) {
    explicacion = `La cita indicada no aparece en el texto del requerimiento. ${explicacion}`.trim();
  }
  const p = crudo.propuesta ?? {};
  return {
    veredicto,
    explicacion: explicacion || 'No se pudo explicar el contraste.',
    fuentes,
    propuesta: {
      titulo: String(p.titulo ?? campos.titulo).trim().slice(0, 200) || campos.titulo,
      descripcion: String(p.descripcion ?? campos.descripcion).trim().slice(0, 4_000) || campos.descripcion,
      solicitud: SOLICITUDES.includes(p.solicitud as Solicitud) ? (p.solicitud as Solicitud) : campos.solicitud,
      recomendacion: String(p.recomendacion ?? campos.recomendacion).trim().slice(0, 4_000) || campos.recomendacion,
    },
    en: new Date().toISOString(),
  };
}
