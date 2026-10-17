/**
 * El sustento de cada observación, sacado de la biblioteca de A-LexIA.
 *
 * POR QUÉ
 *
 * Documento 14 de César (16/10/2026): en el formato «Formulación de
 * consultas y/u observaciones», la columna «Artículo y norma que se
 * vulnera» solo citaba las bases estándar, la Ley 32069 y su Reglamento.
 * La biblioteca tiene diecisiete mil resoluciones del Tribunal, cuarenta
 * acuerdos de Sala Plena, setecientas opiniones y dos mil seiscientos
 * pronunciamientos del OECE, y la evaluación de bases no la consultaba
 * más que para la Ley. César pide que se analice a fondo y que se cite
 * en este orden: Ley → Reglamento → bases estándar → resoluciones del
 * Tribunal → acuerdos de Sala Plena → opiniones y pronunciamientos del
 * OECE (lo demás, como las directivas, después).
 *
 * CÓMO
 *
 *   1. Para cada observación se busca en la biblioteca por capas, cada
 *      una con su cupo —si compitieran juntas, las resoluciones taparían
 *      a la norma, como ya se vio en `jurisprudencia.ts`—, y un solo
 *      fragmento por documento.
 *   2. El modelo elige, de esos fragmentos y solo de esos, los que
 *      resuelven EL MISMO problema, y dice en una frase qué establece
 *      cada uno. Contesta con el código del fragmento («F3»), no con un
 *      número: el número lo pone el código a partir de la fila de la
 *      biblioteca. Así no hay número que no exista.
 *   3. Para la Ley y el Reglamento, el artículo que el modelo diga tiene
 *      que aparecer en el texto del fragmento; si no, no se cita.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { generatorModel } from '@/lib/ai/gemini';
import { embedOne } from '@/lib/ai/embeddings';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { partesDeLaNorma, ROTULO_PARTE, type ParteDeLaNorma } from '@/lib/normativa/ley-o-reglamento';
import { JERARQUIA, NOMBRE_DE_FUENTE, ordenar, type FuenteCitada, type TipoDeFuente } from './fuentes';

export { JERARQUIA, NOMBRE_DE_FUENTE, ordenar, type FuenteCitada, type TipoDeFuente };

interface Fragmento {
  chunk_id: string;
  document_id: string;
  content: string;
  doc_title: string;
  doc_type: string;
  doc_number: string | null;
}

/** Las capas que se piden, con su cupo de documentos distintos. */
const CAPAS: Array<{ tipo: string; cupo: number }> = [
  { tipo: 'ley', cupo: 3 },
  { tipo: 'resolucion_tce', cupo: 4 },
  { tipo: 'acuerdo_sala_plena', cupo: 1 },
  { tipo: 'opinion', cupo: 2 },
  { tipo: 'pronunciamiento', cupo: 3 },
  { tipo: 'directiva', cupo: 1 },
];

/** El problema que hay que fundamentar: una observación a las bases o al requerimiento. */
export interface ProblemaAFundamentar {
  id: string;
  titulo: string;
  /** Lo que dice el documento observado. */
  texto: string;
  analisis: string;
  /** Lo que ya se cita, para no repetirlo. */
  norma: string;
}

/**
 * El vector de búsqueda y la elección del modelo, por si hay que probarlo
 * sin Gemini (`scripts/pruebas/biblioteca-de-bases.ts`).
 */
export interface Dependencias {
  embeber: (texto: string) => Promise<number[]>;
  elegir: (sistema: string, prompt: string) => Promise<{ texto: string; entrada: number; salida: number }>;
}

const DEPENDENCIAS: Dependencias = {
  embeber: async (texto) => (await embedOne(texto, 'RETRIEVAL_QUERY')) as unknown as number[],
  elegir: async (sistema, prompt) => {
    const { text, usage } = await generateText({
      model: generatorModel,
      system: sistema,
      prompt,
      temperature: 0,
      maxTokens: 8000,
    });
    return { texto: text, entrada: usage?.promptTokens ?? 0, salida: usage?.completionTokens ?? 0 };
  },
};

async function fragmentosDe(cliente: SupabaseClient, consulta: string, dep: Dependencias): Promise<Fragmento[]> {
  const texto = consulta.replace(/\s+/g, ' ').slice(0, 700);
  let emb: number[];
  try {
    emb = await dep.embeber(texto);
  } catch (e) {
    console.error('[bases] biblioteca: sin embedding:', (e as Error).message);
    return [];
  }
  const capas = await Promise.all(
    CAPAS.map(async (capa) => {
      // Con muchas búsquedas a la vez, la de resoluciones (diecisiete mil
      // documentos) se pasa del tiempo de la base y vuelve con error. Se
      // reintenta una vez, ya sin la cola.
      let data: unknown[] | null = null;
      for (let intento = 1; intento <= 2 && data === null; intento++) {
        const r = await cliente.rpc('hybrid_search', {
          query_text: texto,
          query_embedding: emb,
          match_count: capa.cupo * 3,
          filter_type: capa.tipo,
        });
        if (!r.error) data = (r.data ?? []) as unknown[];
        else if (intento === 2) console.error('[bases] biblioteca:', capa.tipo, r.error.message);
        else await new Promise((ok) => setTimeout(ok, 800));
      }
      if (data === null) return [] as Fragmento[];
      const vistos = new Set<string>();
      return ((data ?? []) as Fragmento[])
        .filter((f) => !vistos.has(f.document_id) && (vistos.add(f.document_id), true))
        .slice(0, capa.cupo);
    }),
  );
  return capas.flat();
}

/** «Resolución N° 05325-2026-TCP-S6» → tal cual; el número es el de la fila. */
function numeroDe(f: Fragmento): string {
  return (f.doc_number || f.doc_title || '').replace(/\s+\(Tribunal de Contrataciones\)$/, '').trim();
}

const SISTEMA = `Eres abogado especialista en contratación pública del Perú. Recibes observaciones a unas bases o a un requerimiento y, para cada una, fragmentos de la biblioteca normativa con un código (F1, F2…). Eliges los fragmentos que SUSTENTAN esa observación.

ORDEN DE LAS FUENTES: Ley N° 32069 → su Reglamento (D.S. N° 009-2025-EF) → bases estándar → resoluciones del Tribunal → acuerdos de Sala Plena → opiniones y pronunciamientos del OECE → lo demás.

REGLAS QUE NO SE NEGOCIAN
1. Solo citas fragmentos de la lista de ESA observación, por su código. Nunca un número de memoria.
2. Una resolución, opinión o pronunciamiento se cita SOLO si trata el MISMO problema (la misma exigencia, el mismo requisito, el mismo vicio de las bases) y su criterio apoya la observación. Un fragmento que solo comparte el tema general no sirve. Si el fragmento recoge lo que alegó una parte y no lo que se decidió, no lo atribuyas como criterio.
3. "criterio": una o dos oraciones con lo que ese documento establece o resolvió, aplicado a la observación. Fiel al fragmento: no le hagas decir más. Si el documento trata el mismo factor o requisito pero por OTRO defecto (p. ej. el perfil del capacitador, cuando la observación es un plazo añadido), no lo cites.
4. Para la Ley o el Reglamento (fragmentos con PARTE: LEY o PARTE: REGLAMENTO), "articulo" es el numeral o artículo exacto que aparece en el texto del fragmento («numeral 55.3 del artículo 55»). Atribúyelo a la parte que dice el fragmento.
5. La Ley N° 30225 y su Reglamento están derogados. Una resolución u opinión del régimen anterior solo si su criterio sigue siendo aplicable; en ese caso termina el criterio con «(régimen anterior)».
6. Como mucho cuatro fuentes por observación, las más pertinentes. Si ninguna sirve, lista vacía: es mejor no citar que citar mal.

Devuelve SOLO este JSON:
{"observaciones": [{"id": "<id>", "fuentes": [{"f": "F3", "articulo": "<solo Ley/Reglamento>", "criterio": "…"}]}]}`;

/** Que el artículo que se dice esté en el fragmento: «55.3», «artículo 55». */
function articuloEnElFragmento(articulo: string, contenido: string): boolean {
  const numeros = articulo.match(/\d{1,3}(?:\.\d{1,2})?/g) ?? [];
  if (numeros.length === 0) return false;
  const plano = contenido.replace(/\s+/g, ' ');
  return numeros.every((n) => new RegExp(`(?<![\\d.])${n.replace('.', '\\.')}(?![\\d])`).test(plano));
}

/** Observaciones por llamada. Con cinco, la respuesta salía cortada o mal formada. */
const TAMANO_TANDA = 3;

/**
 * Fuentes de la biblioteca para cada problema, ya en el orden de César.
 * Si la biblioteca o el modelo fallan, devuelve lo que tenga: el
 * hallazgo sigue con la norma que ya traía.
 */
export async function fundamentarConLaBiblioteca(
  cliente: SupabaseClient,
  problemas: ProblemaAFundamentar[],
  opciones: {
    contexto?: string;
    alUsar?: (uso: { entrada: number; salida: number }) => void;
    dependencias?: Dependencias;
  } = {},
): Promise<Map<string, FuenteCitada[]>> {
  const dep = opciones.dependencias ?? DEPENDENCIAS;
  const salida = new Map<string, FuenteCitada[]>();
  if (problemas.length === 0) return salida;

  // 1. Fragmentos de cada problema, de a dos problemas a la vez (cada uno
  //    con sus seis capas en paralelo): con seis a la vez, la base cortaba
  //    las búsquedas de resoluciones por tiempo.
  const fragmentos = new Map<string, Fragmento[]>();
  for (let i = 0; i < problemas.length; i += 2) {
    await Promise.all(
      problemas.slice(i, i + 2).map(async (p) => {
        const consulta = `${p.titulo}. ${p.texto.slice(0, 300)} ${p.analisis.slice(0, 300)}`;
        fragmentos.set(p.id, await fragmentosDe(cliente, consulta, dep));
      }),
    );
  }
  const todos = [...fragmentos.values()].flat();
  let partes = new Map<string, ParteDeLaNorma>();
  try {
    partes = await partesDeLaNorma(cliente, todos);
  } catch {
    /* sin rótulo de parte, la Ley y el Reglamento no se citan por artículo */
  }

  // 2. El modelo elige, por tandas.
  const tandas: ProblemaAFundamentar[][] = [];
  for (let i = 0; i < problemas.length; i += TAMANO_TANDA) tandas.push(problemas.slice(i, i + TAMANO_TANDA));
  await Promise.all(
    tandas.map(async (tanda) => {
      const bloques = tanda.map((p) => {
        const fs = fragmentos.get(p.id) ?? [];
        const lista = fs
          .map((f, k) => {
            const parte = partes.get(f.chunk_id);
            const rotulo = parte ? ` · PARTE: ${parte.toUpperCase()}` : '';
            return `[F${k + 1}] ${f.doc_type} — ${numeroDe(f)}${rotulo}\n${f.content.replace(/\s+/g, ' ').slice(0, 1300)}`;
          })
          .join('\n');
        return `=== OBSERVACIÓN ${p.id}\nTítulo: ${p.titulo}\nTexto observado: ${p.texto.slice(0, 600) || '(omisión)'}\nAnálisis: ${p.analisis.slice(0, 900)}\nNorma que ya cita: ${p.norma || '(ninguna)'}\nFRAGMENTOS:\n${lista || '(ninguno)'}`;
      });
      try {
        // El modelo a veces contesta en viñetas en vez de JSON, o lo deja
        // mal cerrado: un segundo intento casi siempre sale bien.
        let crudo: { observaciones?: Array<{ id?: string; fuentes?: Array<Record<string, unknown>> }> } | null = null;
        for (let intento = 1; intento <= 2 && !crudo; intento++) {
          const r = await dep.elegir(
            SISTEMA,
            `${opciones.contexto ? `PROCEDIMIENTO: ${opciones.contexto}\n\n` : ''}${bloques.join('\n\n')}\n\nResponde SOLO con el JSON, empezando por {.`,
          );
          opciones.alUsar?.({ entrada: r.entrada, salida: r.salida });
          try {
            crudo = parseJsonLoose(r.texto);
          } catch (e) {
            if (intento === 2) throw e;
          }
        }
        if (!crudo) return;
        for (const o of crudo.observaciones ?? []) {
          const p = tanda.find((x) => x.id === o.id);
          if (!p) continue;
          const fs = fragmentos.get(p.id) ?? [];
          const elegidas: FuenteCitada[] = [];
          for (const e of (o.fuentes ?? []).slice(0, 4)) {
            const k = Number(String(e.f ?? '').replace(/\D/g, ''));
            const f = fs[k - 1];
            const criterio = typeof e.criterio === 'string' ? e.criterio.trim() : '';
            if (!f || !criterio) continue;
            if (elegidas.some((x) => x.documentId === f.document_id && f.doc_type !== 'ley')) continue;
            if (f.doc_type === 'ley') {
              const parte = partes.get(f.chunk_id);
              const articulo = typeof e.articulo === 'string' ? e.articulo.trim() : '';
              // Sin parte o sin artículo comprobable, la Ley no se cita: ya
              // la cita el hallazgo, y un numeral atribuido a la norma
              // equivocada es el error que más se ha repetido.
              if (!parte || !articulo || !articuloEnElFragmento(articulo, f.content)) continue;
              elegidas.push({
                tipo: parte,
                numero: `${articulo.replace(/\s+de\s+la\s+Ley.*$|\s+del\s+Reglamento.*$/i, '')} ${parte === 'ley' ? 'de la' : 'del'} ${ROTULO_PARTE[parte]}`,
                documentId: f.document_id,
                criterio,
              });
              continue;
            }
            if (!JERARQUIA.includes(f.doc_type as TipoDeFuente)) continue;
            elegidas.push({ tipo: f.doc_type as TipoDeFuente, numero: numeroDe(f), documentId: f.document_id, criterio });
          }
          salida.set(p.id, ordenar(elegidas));
        }
      } catch (e) {
        console.error('[bases] biblioteca: la selección falló:', (e as Error).message);
      }
    }),
  );
  return salida;
}


/** De qué rango es un trozo de la norma que escribió el modelo. */
function rangoDe(trozo: string): number {
  if (/reglamento|decreto supremo n[°º]?\s*0?09-2025/i.test(trozo)) return JERARQUIA.indexOf('reglamento');
  if (/\bley\b/i.test(trozo)) return JERARQUIA.indexOf('ley');
  if (/bases? est[áa]ndar/i.test(trozo)) return JERARQUIA.indexOf('bases_estandar');
  if (/resoluci[óo]n/i.test(trozo)) return JERARQUIA.indexOf('resolucion_tce');
  if (/sala plena/i.test(trozo)) return JERARQUIA.indexOf('acuerdo_sala_plena');
  if (/opini[óo]n/i.test(trozo)) return JERARQUIA.indexOf('opinion');
  if (/pronunciamiento/i.test(trozo)) return JERARQUIA.indexOf('pronunciamiento');
  if (/directiva/i.test(trozo)) return JERARQUIA.indexOf('directiva');
  return JERARQUIA.indexOf('bases_estandar');
}

const plegar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/**
 * La columna «Artículo y norma que se vulnera», en el orden de César:
 * lo que ya decía el hallazgo, partido y ordenado por rango, y detrás lo
 * de la biblioteca que no estuviera ya.
 */
export function normaEnJerarquia(normaOriginal: string, fuentes: FuenteCitada[]): string {
  const trozos = normaOriginal
    .split(/\s*;\s*|\s+y\s+(?=(?:el\s+|la\s+|las\s+|los\s+)?(?:numeral|art[íi]culo|literal|bases|principio|reglamento|ley)\b)/i)
    .map((t) => t.trim().replace(/[.\s]+$/, ''))
    .filter(Boolean);
  const items = trozos.map((t) => ({ texto: t, rango: rangoDe(t) }));
  const ya = plegar(normaOriginal);
  for (const f of fuentes) {
    const clave = plegar(f.numero).replace(/^(resolucion|opinion|pronunciamiento|acuerdo de sala plena)\s+n\.?[°º]?\s*/, '');
    if (clave && ya.includes(clave)) continue;
    // «artículo 73 del Reglamento» ya cubre «numeral 73.1 del artículo 73»:
    // en la columna no se repite el mismo artículo con otra forma.
    const articulo = f.numero.match(/art[íi]culo\s+(\d{1,3})\b/i)?.[1];
    if (
      (f.tipo === 'ley' || f.tipo === 'reglamento') &&
      articulo &&
      new RegExp(`art[íi]culo\\s+${articulo}\\b|numeral\\s+${articulo}\\.\\d`, 'i').test(normaOriginal)
    ) {
      continue;
    }
    items.push({ texto: f.numero, rango: JERARQUIA.indexOf(f.tipo) });
  }
  return items
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => a.rango - b.rango || a.i - b.i)
    .map((x) => x.texto)
    .join('; ');
}
