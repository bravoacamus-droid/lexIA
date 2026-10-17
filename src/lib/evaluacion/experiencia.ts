/**
 * La experiencia del postor en la especialidad, contratación por
 * contratación, con las reglas del Tribunal aplicadas por código.
 *
 * POR QUÉ
 *
 * César, documento 14 (16/10/2026), sobre el servicio de estructura
 * metálica y cobertura de Socos: A-LexIA dio por calificado a ARLETTCONS
 * S.A.C., que acreditó su experiencia con un CONTRATO DE EJECUCIÓN DE OBRA
 * y su acta de recepción. Dos errores:
 *   · El objeto convocado es un SERVICIO, y una obra es un objeto distinto
 *     (Anexo I del Reglamento). El Tribunal declaró la nulidad de
 *     procedimientos de servicios cuyas bases admitían obras como
 *     «servicios similares» (Resoluciones N° 5325-2026-TCP-S6,
 *     8067-2026-TCP-S3 y 7146-2026-TCP-S3; esta última recoge que los
 *     evaluadores no pueden tomar contratos de obra como si fueran de
 *     servicios).
 *   · Aun en obras, el acta de recepción que no dice el monto ejecutado no
 *     acredita la experiencia: hace falta un documento de cierre con el
 *     monto total (Acuerdo de Sala Plena N° 002-2023/TCE), y si el
 *     contrato tuvo adicionales, deductivos o ampliaciones, los documentos
 *     que los sustentan o una liquidación con el monto final.
 * Dentro de la lectura general el modelo no hacía esta cuenta. Aquí una
 * consulta corta lista cada contratación con sus documentos y montos, y
 * las reglas las aplica el código.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { FichaRequisito, Resultado } from './etapas';
import { plano } from './equipos';

type Objeto = 'servicio' | 'obra' | 'bien';

/** Qué se contrata, según cómo las Bases definen la experiencia. */
export function objetoDeLasBases(extracto: string, textoBases: string): Objeto {
  const e = plano(extracto);
  if (/servicios iguales o similares|servicios similares/.test(e)) return 'servicio';
  if (/obras? similares|obras iguales/.test(e)) return 'obra';
  if (/bienes iguales o similares|bienes similares/.test(e)) return 'bien';
  const inicio = plano(textoBases.slice(0, 20_000));
  if (/ejecucion de (la )?obra|licitacion publica (para|de) obras/.test(inicio)) return 'obra';
  if (/servicio/.test(inicio)) return 'servicio';
  return 'bien';
}

/** Si la definición de similares de un servicio admite obras: vicio de las Bases. */
export function similaresIncluyenObras(extracto: string): boolean {
  const e = plano(extracto);
  const similares = e.slice(Math.max(0, e.search(/servicios similares|similares a/)), e.search(/acreditacion/) > 0 ? e.search(/acreditacion/) : undefined);
  return /ejecucion de obras?|obras? (en general|civiles|de edificacion)|edificaciones|obra publica/.test(similares);
}

interface Contratacion {
  n: string;
  cliente: string;
  objeto: string;
  tipo: Objeto | 'otro';
  folio: string;
  montoDeclarado: number;
  montoQueConsta: number | null;
  documentoDeCierre: string;
  participacion: number;
  tieneModificaciones: boolean;
  sustentoModificaciones: string;
}

/**
 * Primer paso: qué contrataciones declara el postor y en qué páginas están
 * sus documentos. Segundo paso: cada contratación por separado, solo con
 * sus páginas. En una sola consulta con cien páginas, la lectura de los
 * montos de Grupo Constructor Ore cambiaba de corrida en corrida (un
 * contrato aparecía y otro se perdía).
 */
const LISTAR = `Lees la parte de una oferta donde el postor acredita su EXPERIENCIA EN LA ESPECIALIDAD. Lista CADA contratación que declara (normalmente en el Anexo de experiencia del postor) y las PÁGINAS («=== Página N ===») donde están SUS documentos: contrato u orden, adendas, conformidades, constancias, actas, liquidaciones, facturas, constancias de pago o de transferencia, estados de cuenta.
Además: "esMype": true si el postor acredita ser micro o pequeña empresa (constancia REMYPE, declaración en el anexo), false si no.
Devuelve SOLO JSON: {"esMype": false, "contrataciones": [{"n": "1", "cliente": "", "objeto": "", "montoDeclarado": 0, "paginas": [12, 13, 14]}]}`;

const REVISAR = `Revisas UNA contratación que un postor presenta como experiencia, con las páginas de sus documentos:
· "tipo": "obra" si es un contrato de ejecución de obra (o su acta de recepción de obra, liquidación de obra, valorizaciones); "servicio" si es un contrato u orden de servicio; "bien" si es una compra de bienes.
· "montoQueConsta": el monto ejecutado, facturado o pagado que dice un documento de CIERRE (conformidad, constancia de prestación o de cumplimiento, acta de recepción que indique el monto, resolución de liquidación). Si ningún documento de cierre dice el monto —por ejemplo, un acta que solo certifica la entrega o la culminación—, null. El monto del contrato original NO es monto que consta.
· "pagosTotal": la SUMA de esos pagos.
· "pagos": CADA comprobante de pago (factura) cuya cancelación acredita una constancia de depósito o de transferencia, nota de abono, constancia de pago del SIAF («transferencia a cuenta de terceros»), estado de cuenta o retención del IGV: [{"comprobante": "número de la factura", "monto": número, "pagina": número}]. No sumes: lista.
· "documentoDeCierre": cuál documento de cierre hay y su página («acta de recepción de obra, página 45, no indica monto»).
· "participacion": si se ejecutó EN CONSORCIO, el porcentaje de las obligaciones que tuvo en aquel consorcio el postor o el integrante que la aporta; 100 si la ejecutó solo. "citaParticipacion": la frase LITERAL de la promesa o contrato de consorcio de entonces, o de la constancia, donde consta ese porcentaje (vacío si no la hay).
· "tieneModificaciones": true si hay adicionales, deductivos, ampliaciones con mayores costos, adendas que cambian el monto, o un monto final distinto del contratado.
· "sustentoModificaciones": qué documentos sustentan esas modificaciones o el monto final, o vacío.
Copia cifras sin separador de miles. No completes lo que no consta.
Devuelve SOLO JSON: {"tipo": "obra"|"servicio"|"bien"|"otro", "montoQueConsta": null, "pagosTotal": 0, "pagos": [], "documentoDeCierre": "", "participacion": 100, "citaParticipacion": "", "tieneModificaciones": false, "sustentoModificaciones": ""}`;

// La 5325 y la 8067 tratan justamente obras admitidas como «similares» en
// un servicio; la 7146, similares definidos por partidas de servicios u
// obras de mayor alcance. Las tres declararon la nulidad.
const RESOLUCIONES_OBJETO = 'Resoluciones N° 5325-2026-TCP-S6 y N° 8067-2026-TCP-S3';
const RESOLUCIONES_NULIDAD =
  'Resoluciones N° 5325-2026-TCP-S6 y N° 8067-2026-TCP-S3; en el mismo sentido, por similares definidos con partidas de obras de mayor alcance, la N° 7146-2026-TCP-S3';

/** «S/ 250,000.00» → 250000. */
function montoDe(t: string | undefined): number | null {
  if (!t) return null;
  const n = Number(t.replace(/[^\d.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(/,/g, '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function montosExigidos(extracto: string): { general: number | null; mype: number | null } {
  const general = montoDe(extracto.match(/equivalente\s+a\s+S\/\.?\s*([\d.,]+)/i)?.[1]);
  // «En el caso de postores que declaren … tener la condición de micro y
  // pequeña empresa, se acredita una experiencia de S/ 55,000.00».
  const mype = montoDe(
    extracto.match(/(?:MYPE[s]?|micro\s+y\s+peque[ñn]a\s+empresa)[\s\S]{0,160}?S\/\.?\s*([\d.,]+)/i)?.[1],
  );
  return { general, mype };
}

const DE_EXPERIENCIA =
  // Las constancias de pago del SIAF («transferencia a cuenta de terceros»)
  // acreditan la cancelación de las facturas: sin ellas, a Grupo
  // Constructor Ore no se le computó el contrato N° 22-2024.
  /experiencia del postor|anexo n\S* ?1[01]\b|contrato|orden de servicio|conformidad|constancia de prestaci|constancia de pago|transferencia|abono|dep[óo]sito|nota de pago|estado de cuenta|retenci[óo]n|acta de recepci|liquidaci|comprobante|factura|valorizaci|adicional|deductivo|remype|micro y peque/i;

/**
 * Las páginas de la experiencia: desde el anexo de experiencia del postor,
 * las que siguen, que es donde van sus contratos y comprobantes. Con toda
 * la oferta filtrada por palabras, el Consorcio Mega daba 670 000
 * caracteres «pertinentes» y la lectura salía distinta en cada corrida.
 */
function paginasDeLaExperiencia(texto: string): string[] {
  const todas = texto.split(/(?==== P[áa]gina \d+ ===|^=== TOMO \d+)/m);
  const anexo = todas.findIndex(
    (p) => /experiencia del postor en la especialidad/i.test(p) && /anexo/i.test(p) && /monto|importe|facturad/i.test(p),
  );
  if (anexo < 0) return todas.filter((p) => DE_EXPERIENCIA.test(p));
  const ventana = todas.slice(anexo, anexo + 160).filter((p) => DE_EXPERIENCIA.test(p));
  // La constancia REMYPE suele ir antes, con los documentos de admisión.
  const mype = todas.slice(0, anexo).filter((p) => /remype|micro y peque[ñn]a empresa/i.test(p)).slice(0, 3);
  return [...mype, ...ventana];
}

/**
 * Los pagos los suma el código, cada comprobante una vez: sumados por el
 * modelo, los del contrato AY-1108 de Kametsa daban 3,8 millones en una
 * corrida y 2,6 en la siguiente.
 */
function sumaDePagos(r: Record<string, unknown>): number {
  const vistos = new Set<string>();
  let total = 0;
  for (const x of Array.isArray(r.pagos) ? (r.pagos as Array<Record<string, unknown>>) : []) {
    const monto = Number(x.monto) || 0;
    const clave = String(x.comprobante ?? '').replace(/\W/g, '').toUpperCase() || `${monto}@${String(x.pagina ?? '')}`;
    if (monto <= 0 || vistos.has(clave)) continue;
    vistos.add(clave);
    total += monto;
  }
  return total;
}

function evidenciaDe(r: Record<string, unknown>): number {
  return Math.max(Number(r.montoQueConsta) || 0, sumaDePagos(r), Number(r.pagosTotal) || 0);
}

export async function verificarExperiencia(args: {
  ficha: FichaRequisito;
  textoOferta: string;
  extracto: string;
  textoBases: string;
  nombrePostor: string;
}): Promise<FichaRequisito> {
  const { ficha, extracto } = args;
  if (!extracto) return ficha;
  const objeto = objetoDeLasBases(extracto, args.textoBases);
  const { general, mype } = montosExigidos(extracto);

  // Las páginas que tratan la experiencia: el anexo y los documentos de
  // cada contratación.
  const paginas = paginasDeLaExperiencia(args.textoOferta);
  const { text } = await generateText({
    model: chatModel,
    system: LISTAR,
    prompt: `POSTOR: ${args.nombrePostor}
LO QUE PIDEN LAS BASES:
${extracto}

PÁGINAS DE LA OFERTA:
${paginas.join('\n').slice(0, 450_000)}`,
    temperature: 0,
    maxTokens: 6000,
    abortSignal: AbortSignal.timeout(180_000),
  });
  const o = parseJsonLoose(text) as { esMype?: unknown; contrataciones?: Array<Record<string, unknown>> } | null;
  const textoPlano = plano(args.textoOferta);
  const porNumero = new Map<number, string>();
  for (const p of paginas) {
    const n = Number(p.match(/^=== P[áa]gina (\d+) ===/)?.[1]);
    if (Number.isFinite(n) && !porNumero.has(n)) porNumero.set(n, p);
  }
  let fallidas = 0;
  const declaradas = (o?.contrataciones ?? []).slice(0, 20);
  const veces = new Map<number, number>();
  for (const c of declaradas) {
    for (const n of new Set((Array.isArray(c.paginas) ? c.paginas : []).map(Number))) veces.set(n, (veces.get(n) ?? 0) + 1);
  }
  const comunes = new Set(
    declaradas.length >= 3 ? [...veces].filter(([, k]) => k >= Math.ceil(declaradas.length / 2)).map(([n]) => n) : [],
  );
  const lista: Contratacion[] = (
    await Promise.all(
      declaradas.map(async (c): Promise<Contratacion | null> => {
        // Sin las páginas comunes a casi todas (el anexo): Kametsa listó la
        // página del anexo en sus cinco contrataciones, el rango de cada una
        // empezaba ahí y todas terminaban leyendo los documentos de la
        // primera.
        const nums = (Array.isArray(c.paginas) ? c.paginas : [])
          .map(Number)
          .filter((n) => Number.isFinite(n) && !comunes.has(n));
        // Todo el rango de sus páginas, sin huecos, y una más a cada lado:
        // la resolución de liquidación del contrato MO-107 de Kametsa tiene
        // el monto en su primera hoja (página 139) y el modelo solo listó la
        // segunda (140).
        const desde = Math.min(...nums) - 1;
        const hasta = Math.min(Math.max(...nums) + 1, desde + 60);
        const suyas = Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, k) => desde + k)
          .map((n) => porNumero.get(n))
          .filter((x): x is string => Boolean(x));
        if (suyas.length === 0) return null;
        try {
          // Con la lista de pagos la respuesta puede ser larga: cortada, el
          // JSON no se lee y la contratación se perdía en silencio (Kametsa
          // quedó una vez en S/ 0). Se reintenta; si no, se cuenta la falla.
          const leerUnaVez = async (): Promise<Record<string, unknown> | null> => {
            for (let intento = 1; intento <= 2; intento++) {
              try {
                const { text: t2 } = await generateText({
                  model: chatModel,
                  system: REVISAR,
                  prompt: `CONTRATACIÓN ${String(c.n ?? '')}: ${String(c.objeto ?? '')} — cliente ${String(c.cliente ?? '')} — monto declarado ${String(c.montoDeclarado ?? '')}

PÁGINAS DE SUS DOCUMENTOS:
${suyas.join('\n').slice(0, 120_000)}`,
                  temperature: 0,
                  maxTokens: 12_000,
                  abortSignal: AbortSignal.timeout(150_000),
                });
                const r = parseJsonLoose(t2) as Record<string, unknown> | null;
                if (r) return r;
              } catch {
                // se reintenta
              }
            }
            return null;
          };
          // Dos lecturas y la de más evidencia. Con documentos confusos (las
          // actas sin monto y las decenas de comprobantes del contrato
          // AY-1108 de Kametsa), una sola lectura a veces no veía los pagos
          // y el postor caía por debajo del monto exigido. Lo computable
          // queda topado por lo declarado, así que elegir la lectura con más
          // evidencia no infla nada.
          const lecturas = (await Promise.all([leerUnaVez(), leerUnaVez()])).filter(
            (x): x is Record<string, unknown> => x !== null,
          );
          if (lecturas.length === 0) {
            fallidas++;
            return null;
          }
          const r = lecturas.sort((a, b) => evidenciaDe(b) - evidenciaDe(a))[0];
          const pagos = sumaDePagos(r);
          // Con muchos comprobantes el modelo lista solo algunos; su total
          // suele ser más completo. Se toma lo mayor: lo computable queda
          // topado por lo que el postor declara, así que el riesgo es
          // quedarse corto, no pasarse.
          const consta = Math.max(Number(r.montoQueConsta) || 0, pagos, Number(r.pagosTotal) || 0);
          // El porcentaje de un consorcio anterior solo se aplica con su
          // cita literal en la oferta; si no, manda lo que el postor declara.
          const cita = plano(String(r.citaParticipacion ?? ''));
          const pct = Number(r.participacion);
          const participacion =
            pct > 0 && pct < 100 && cita.length >= 8 && textoPlano.includes(cita.slice(0, 25)) && cita.includes(String(Math.round(pct)))
              ? pct
              : 100;
          return {
            n: String(c.n ?? ''),
            cliente: String(c.cliente ?? ''),
            objeto: String(c.objeto ?? ''),
            tipo: (['obra', 'servicio', 'bien'].includes(String(r.tipo)) ? String(r.tipo) : 'otro') as Contratacion['tipo'],
            folio: nums.length ? `páginas ${Math.min(...nums)} a ${Math.max(...nums)}` : '',
            montoDeclarado: Number(c.montoDeclarado) || 0,
            // Lo que acredita el cierre o, si es más, lo pagado con constancia.
            montoQueConsta: consta > 0 ? consta : null,
            documentoDeCierre: String(r.documentoDeCierre ?? ''),
            participacion,
            tieneModificaciones: r.tieneModificaciones === true,
            sustentoModificaciones: String(r.sustentoModificaciones ?? '').trim(),
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((x): x is Contratacion => x !== null);
  if (lista.length === 0) return ficha;

  const esMype = o?.esMype === true;
  const exigido = esMype && mype ? mype : general;
  const incluyeObras = objeto === 'servicio' && similaresIncluyenObras(extracto);

  const observaciones: string[] = [];
  let computable = 0;
  // Lo declarado en contrataciones de servicio donde no se halló el monto.
  let sinMontoHallado = 0;
  const porRevisar: string[] = [];
  for (const c of lista) {
    const nombre = `Contratación ${c.n}${c.cliente ? ` (${c.cliente}` : ''}${c.folio ? `${c.cliente ? ', ' : ' ('}folio ${c.folio}` : ''}${c.cliente || c.folio ? ')' : ''}`;
    if (objeto === 'servicio' && c.tipo === 'obra') {
      // Aun si las Bases admiten obras como similares, su «Acreditación»
      // de servicios (contratos u órdenes de servicio con conformidad, o
      // comprobantes de pago) no prevé el acta de recepción ni la
      // liquidación de obra: es lo que la Resolución N° 5325-2026-TCP-S6
      // recoge como inconsistencia de las reglas.
      const sinFormaDeAcreditar = !/acta de recepci|liquidaci[oó]n de obra/i.test(extracto.slice(extracto.search(/Acreditaci[óo]n/i)));
      observaciones.push(
        `${nombre}: es un contrato de ejecución de OBRA y el objeto convocado es un SERVICIO; la obra es un objeto contractual distinto y no se computa como servicio similar (${RESOLUCIONES_OBJETO}).${
          sinFormaDeAcreditar
            ? ' Además, la «Acreditación» de las Bases solo admite contratos u órdenes de servicio con su conformidad o comprobantes de pago cancelados, no actas de recepción ni liquidaciones de obra.'
            : ''
        }`,
      );
      continue;
    }
    if (objeto === 'bien' && c.tipo === 'obra') {
      observaciones.push(`${nombre}: es un contrato de obra y el objeto convocado es un bien; no se computa.`);
      continue;
    }
    if (c.montoQueConsta === null && c.tipo !== 'obra') {
      observaciones.push(
        `${nombre}: no consta el monto con la conformidad, la constancia de prestación o el comprobante de pago cancelado que pide la «Acreditación» de las Bases (${c.documentoDeCierre || 'sin documento de cierre'}); no se computa.`,
      );
      sinMontoHallado += (c.montoDeclarado * 1) || 0;
      porRevisar.push(nombre);
      continue;
    }
    if (c.montoQueConsta === null) {
      observaciones.push(
        `${nombre}: ningún documento de cierre indica el monto ejecutado o facturado (${c.documentoDeCierre || 'no presenta documento de cierre'}); un acta que solo certifica la recepción o la culminación no acredita el monto (Acuerdo de Sala Plena N° 002-2023/TCE; Resoluciones N° 3723-2026-TCP-S4 y N° 2931-2025-TCP-S1). Debió presentar, por ejemplo, la resolución de liquidación.`,
      );
      continue;
    }
    if (c.tieneModificaciones && !c.sustentoModificaciones && Math.abs(c.montoQueConsta - c.montoDeclarado) > 1) {
      observaciones.push(
        `${nombre}: el contrato tuvo modificaciones y no se presentan los documentos que las sustentan ni un cierre que precise el monto final ejecutado (Acuerdo de Sala Plena N° 002-2023/TCE; Resoluciones N° 3299-2025-TCP-S5 y N° 1006-2025-TCE-S1).`,
      );
      continue;
    }
    // En un consorcio anterior se computa la parte del integrante (Consorcio
    // Mega: 49 % de S/ 3 498 236,72), nunca más de lo que el postor declara.
    const propio = (c.montoQueConsta * c.participacion) / 100;
    computable += Math.min(propio, c.montoDeclarado || propio);
  }

  if (incluyeObras) {
    observaciones.push(
      `Advertencia sobre las Bases: el objeto es un servicio y la definición de servicios similares admite la ejecución de obras. El Tribunal ha declarado la nulidad de procedimientos de servicios por esa misma regla (${RESOLUCIONES_NULIDAD}); el comité debe evaluarlo.`,
    );
  }

  const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let resultado: Resultado;
  let conclusion: string;
  if (exigido) {
    resultado = computable >= exigido ? 'cumple' : 'no_cumple';
    // Si no alcanza SOLO porque en contrataciones de servicio no se halló
    // el documento con el monto, y con ellas alcanzaría, decide el comité:
    // en ofertas con decenas de comprobantes la lectura de esos documentos
    // no es segura (la experiencia de Kametsa salió 3,98 millones en una
    // corrida y 7,58 en la siguiente).
    if (resultado === 'no_cumple' && porRevisar.length > 0 && computable + sinMontoHallado >= exigido) {
      resultado = 'revision_humana';
      observaciones.push(
        `Sin esas contrataciones se acreditan ${fmt(computable)}; con lo que el postor declara en ellas se alcanzaría lo exigido. El comité debe verificar sus documentos de pago o de cierre: ${porRevisar.join('; ')}.`,
      );
    }
    conclusion = `Conclusión: ${resultado === 'cumple' ? 'cumple' : resultado === 'revision_humana' ? 'queda para el comité' : 'NO CUMPLE'} — monto computable ${fmt(computable)} frente a ${fmt(exigido)} exigidos${esMype && mype ? ' (monto para MYPE)' : ''}.`;
  } else {
    // Sin el monto exigido no se decide por código: se deja lo que concluyó
    // la lectura general, con las observaciones a la vista.
    resultado = observaciones.length && computable === 0 ? 'no_cumple' : ficha.resultado;
    conclusion = `Monto computable: ${fmt(computable)} (no se pudo leer el monto exigido de las Bases).`;
  }

  if (fallidas > 0 && resultado === 'no_cumple') {
    resultado = 'revision_humana';
    observaciones.push(`No se pudo revisar ${fallidas} contratación(es); el comité debe completar la cuenta.`);
  }
  const detalle = lista
    .map((c) => `${c.n}. ${c.objeto.slice(0, 120)} — ${c.tipo}; declarado ${fmt(c.montoDeclarado)}; consta ${c.montoQueConsta ? fmt(c.montoQueConsta) : 'sin monto'}${c.participacion < 100 ? ` (participación ${c.participacion} %)` : ''} (${c.documentoDeCierre})`)
    .join(' | ');
  return {
    ...ficha,
    resultado,
    subsanable: resultado === 'no_cumple' ? false : ficha.subsanable,
    naturalezaDefecto: resultado === 'cumple' ? 'ninguno' : 'sustancial',
    hallazgo: [conclusion, observaciones.join(' '), `Contrataciones revisadas: ${detalle}`].filter(Boolean).join(' '),
    confianza: resultado === 'cumple' ? ficha.confianza : 'media',
    verificada: true,
  };
}
