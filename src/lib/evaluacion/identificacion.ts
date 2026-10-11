/**
 * Quién presenta la oferta: un postor solo o un consorcio, con sus
 * integrantes.
 *
 * POR QUÉ
 *
 * En el CP SER-SM-6-2026 (mantenimiento vial, Ayacucho) las cinco ofertas
 * eran de consorcios. El acta las presentó como postores individuales,
 * con el nombre de UNO de los integrantes —el que más se repetía en el
 * texto— y «No aplica» en las columnas de integrantes y porcentaje.
 * César (documento 13, 10/10/2026): «debió haber puesto el nombre del
 * consorcio y no el nombre de uno de los integrantes, asimismo […]
 * quiénes forman parte del consorcio y su porcentaje de participación».
 * Y en admisión, los documentos que corresponden a cada integrante —la
 * representación de quien suscribe, sobre todo— se evalúan integrante
 * por integrante.
 *
 * CÓMO
 *
 * La promesa de consorcio (Anexo N° 4) dice el nombre, los integrantes,
 * su participación y el representante común. Se le da al modelo el
 * comienzo de la oferta y los tramos donde aparecen la promesa y la
 * declaración de datos del postor, y devuelve esa identificación. Si no
 * responde, se cae a la razón social más repetida (`postor.ts`).
 */
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';

export interface IntegranteConsorcio {
  nombre: string;
  ruc?: string;
  /** «60 %» tal como lo dice la promesa. */
  participacion?: string;
  obligaciones?: string;
}

export interface IdentificacionPostor {
  /** El nombre con que se presenta: el del consorcio o la razón social. */
  nombre: string;
  esConsorcio: boolean;
  ruc?: string;
  integrantes: IntegranteConsorcio[];
  representanteComun?: string;
}

const SISTEMA = `Identificas al postor de una oferta presentada en un procedimiento de selección del Estado peruano.

Devuelve SOLO este JSON, sin markdown:
{"esConsorcio": true|false, "nombre": "", "ruc": "", "integrantes": [{"nombre": "", "ruc": "", "participacion": "", "obligaciones": ""}], "representanteComun": ""}

- Si hay PROMESA DE CONSORCIO (o contrato de consorcio) del postor, es un consorcio: "nombre" es el nombre del consorcio tal como lo escribe la promesa («CONSORCIO MANTENIMIENTO VIAL AYACUCHO»), "integrantes" son TODAS las empresas o personas que lo conforman, con su RUC, su porcentaje de participación («60%») y un resumen breve de sus obligaciones, y "representanteComun" el nombre del representante común.
- Si no, "esConsorcio" es false, "nombre" es la razón social del postor y "integrantes" va vacío.
- No confundas al postor con terceros que aparecen en la oferta: clientes de su experiencia, proveedores que le alquilan equipos, bancos, aseguradoras, profesionales.
- Copia nombres, RUC y porcentajes tal como figuran. Si un dato no está, déjalo vacío; no lo inventes.`;

/** Lo que se le da a leer: el comienzo y los tramos de la promesa y del Anexo 1. */
function extracto(texto: string): string {
  const t = texto;
  const trozos: string[] = [t.slice(0, 12_000)];
  const marcas = /PROMESA\s+(?:FORMAL\s+)?DE\s+CONSORCIO|CONTRATO\s+DE\s+CONSORCIO|DATOS\s+DEL\s+POSTOR|ANEXO\s+N[°º.]?\s*0?[14]\b/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  const vistos: number[] = [];
  while ((m = marcas.exec(t)) && n < 8) {
    if (vistos.some((v) => Math.abs(v - m!.index) < 3000)) continue;
    vistos.push(m.index);
    trozos.push(t.slice(Math.max(0, m.index - 500), m.index + 5000));
    n++;
  }
  return trozos.join('\n\n[…]\n\n').slice(0, 50_000);
}

export async function identificarPostor(texto: string): Promise<IdentificacionPostor | null> {
  try {
    const { text } = await generateText({
      model: fastModel,
      system: SISTEMA,
      prompt: extracto(texto),
      temperature: 0,
      maxTokens: 900,
      abortSignal: AbortSignal.timeout(60_000),
    });
    const crudo = parseJsonLoose(text) as Partial<IdentificacionPostor> & { integrantes?: unknown };
    const nombre = String(crudo?.nombre ?? '').replace(/\s+/g, ' ').trim();
    if (!nombre) return null;
    const integrantes = (Array.isArray(crudo.integrantes) ? crudo.integrantes : [])
      .map((x) => {
        const o = x as unknown as Record<string, unknown>;
        const limpio = (v: unknown) => (v ? String(v).replace(/\s+/g, ' ').trim() : '') || undefined;
        return {
          nombre: limpio(o.nombre) ?? '',
          ruc: limpio(o.ruc),
          participacion: limpio(o.participacion),
          obligaciones: limpio(o.obligaciones),
        };
      })
      .filter((x) => x.nombre);
    const esConsorcio = !!crudo.esConsorcio && integrantes.length >= 2;
    return {
      nombre: esConsorcio && !/consorcio/i.test(nombre) ? `CONSORCIO ${nombre}` : nombre,
      esConsorcio,
      ruc: crudo.ruc ? String(crudo.ruc).trim() || undefined : undefined,
      integrantes: esConsorcio ? integrantes : [],
      representanteComun: crudo.representanteComun ? String(crudo.representanteComun).trim() || undefined : undefined,
    };
  } catch (e) {
    console.warn('[evaluacion] no se pudo identificar al postor:', (e as Error).message.slice(0, 160));
    return null;
  }
}

/** Para el prompt de cada etapa: quién es el postor y, si es consorcio, cómo se evalúa. */
export function bloqueDeIdentificacion(id: IdentificacionPostor | null | undefined): string {
  if (!id) return '';
  if (!id.esConsorcio) {
    return `IDENTIFICACIÓN DEL POSTOR: ${id.nombre}${id.ruc ? ` (RUC ${id.ruc})` : ''}, postor individual.`;
  }
  const lista = id.integrantes
    .map((i) => `  - ${i.nombre}${i.ruc ? ` (RUC ${i.ruc})` : ''}${i.participacion ? ` — ${i.participacion}` : ''}${i.obligaciones ? ` — obligaciones: ${i.obligaciones}` : ''}`)
    .join('\n');
  return `IDENTIFICACIÓN DEL POSTOR: ${id.nombre}, CONSORCIO integrado por:
${lista}${id.representanteComun ? `\nRepresentante común: ${id.representanteComun}` : ''}

Por ser consorcio, los documentos que las Bases piden a CADA integrante —la representación de quien suscribe (vigencia de poder o documento equivalente de cada uno), las declaraciones juradas que cada integrante debe firmar, su inscripción en el RNP, su habilitación— se evalúan INTEGRANTE POR INTEGRANTE: en el hallazgo di, para cada uno, qué presentó y si cumple. Un requisito de este tipo solo se cumple si lo cumplen todos los que deben cumplirlo. Al escribir, llama al postor por el nombre del consorcio, no por el de un integrante.`;
}
