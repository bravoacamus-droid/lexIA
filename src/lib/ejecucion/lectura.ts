/**
 * Leer un documento del expediente: qué es y qué dice.
 *
 * Es la fase 2 del documento de César —«Reconstrucción»—, documento por
 * documento. De cada uno se saca qué clase de documento es, su número y
 * su fecha, los datos del contrato que trae, los hechos fechados, los
 * montos y los documentos que contiene dentro (una resolución que
 * transcribe el informe técnico ya acredita ese informe: no se vuelve a
 * pedir).
 *
 * Todo dato lleva la frase del documento que lo dice, y esa frase se
 * busca en el texto. Lo que el modelo afirma sin que el documento lo
 * diga se descarta: «nunca inventes hechos, documentos, fechas, montos».
 */
import { ubicarCita } from '@/lib/evaluacion/mejora/texto';
import { CLASES, LISTA_CLASES, type ClaseDocumental } from './catalogo';
import { pedirJSON } from './modelo';
import { fechaISO } from './regimen';
import { CAMPOS_FICHA, LISTA_CAMPOS, type CampoFicha, type LecturaDeDocumento } from './tipos';

/** Cuánto texto se le da al modelo: el principio y el final de lo muy largo. */
const TOPE = 70_000;

export function recortarParaLeer(texto: string): string {
  if (texto.length <= TOPE) return texto;
  const cabeza = texto.slice(0, Math.round(TOPE * 0.75));
  const cola = texto.slice(-Math.round(TOPE * 0.25));
  return `${cabeza}\n\n[… se omite la parte central del documento …]\n\n${cola}`;
}

function prompt(nombre: string, texto: string): string {
  return `Eres el lector de expedientes de A-LexIA, un sistema experto en ejecución contractual del Estado peruano. Lee el documento y devuelve SOLO un objeto JSON.

DOCUMENTO: «${nombre}»
"""
${recortarParaLeer(texto)}
"""

Devuelve:
{
  "clase": una de: ${LISTA_CLASES.map((c) => `"${c}" (${CLASES[c].nombre})`).join(', ')},
  "titulo": "cómo se llama el documento, con su número si lo tiene (p. ej. «Informe N.° 045-2026-GRA/OA»)",
  "numero": "número oficial o null",
  "fecha": "AAAA-MM-DD de emisión o null",
  "emisor": "quién lo emite (cargo y órgano, o el contratista) o null",
  "resumen": "dos a cuatro oraciones: qué es, qué dice y qué pide o decide",
  "ficha": [ { "campo": uno de ${LISTA_CAMPOS.map((c) => `"${c}"`).join(', ')}, "valor": "...", "cita": "frase LITERAL del documento que lo dice" } ],
  "hechos": [ { "fecha": "AAAA-MM-DD o null", "hecho": "qué ocurrió, en una oración", "cita": "frase LITERAL" } ],
  "montos": [ { "concepto": "qué es el monto (monto contractual, adicional, reducción, penalidad, valorización…)", "monto": número sin separadores, "cita": "frase LITERAL" } ],
  "contiene": [ clases de otros documentos que vienen transcritos o adjuntos DENTRO de este ]
}

REGLAS:
1. Cada "cita" debe copiarse del documento tal cual, entre 8 y 40 palabras. Si no puedes citarlo, no lo incluyas.
2. "ficha": solo los datos del CONTRATO al que se refiere el documento (${LISTA_CAMPOS.map((c) => `${c} = ${CAMPOS_FICHA[c].nombre}`).join('; ')}). "tipo_contratacion" se escribe como "Bienes", "Servicios", "Consultoría de obras" o "Ejecución de obras". "plazo_dias" es el número de días del plazo de ejecución. Las fechas, en AAAA-MM-DD. Los montos, como aparecen.
3. "hechos": los hechos relevantes para la ejecución del contrato (entregas, atrasos, paralizaciones, solicitudes, notificaciones, conformidades, pagos, anotaciones), con su fecha si el documento la da.
4. No deduzcas ni completes: si el documento no dice un dato, no lo pongas.
5. Si es una resolución, una carta o un informe que transcribe otro documento, indícalo en "contiene".`;
}

export async function leerDocumento(
  nombre: string,
  texto: string,
  usuario: string | null,
): Promise<LecturaDeDocumento> {
  const crudo = await pedirJSON<Record<string, unknown>>(prompt(nombre, texto), {
    usuario,
    funcion: 'ejecucion_lectura',
  });
  return depurarLectura(crudo, texto);
}

/**
 * Lo que devolvió el modelo, comprobado contra el texto. Es puro: se
 * prueba sin modelo.
 */
export function depurarLectura(crudo: Record<string, unknown>, texto: string): LecturaDeDocumento {
  let descartadas = 0;
  const citada = (cita: unknown): string | null => {
    if (typeof cita !== 'string' || cita.trim().length < 6) return null;
    if (ubicarCita(texto, cita) || texto.toLowerCase().includes(cita.trim().toLowerCase())) return cita.trim();
    descartadas++;
    return null;
  };
  const cadena = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const lista = (v: unknown) => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []);

  const clase = LISTA_CLASES.includes(crudo.clase as ClaseDocumental) ? (crudo.clase as ClaseDocumental) : 'otro';

  const ficha: LecturaDeDocumento['ficha'] = [];
  for (const f of lista(crudo.ficha)) {
    const campo = f.campo as CampoFicha;
    const valor = cadena(f.valor);
    if (!LISTA_CAMPOS.includes(campo) || !valor) continue;
    const cita = citada(f.cita);
    if (!cita) continue;
    if (CAMPOS_FICHA[campo].formato === 'fecha' && !fechaISO(valor)) continue;
    ficha.push({ campo, valor: CAMPOS_FICHA[campo].formato === 'fecha' ? fechaISO(valor)! : valor, cita });
  }

  const hechos: LecturaDeDocumento['hechos'] = [];
  for (const h of lista(crudo.hechos)) {
    const hecho = cadena(h.hecho);
    const cita = citada(h.cita);
    if (!hecho || !cita) continue;
    hechos.push({ hecho, fecha: fechaISO(cadena(h.fecha)), cita });
  }

  const montos: LecturaDeDocumento['montos'] = [];
  for (const m of lista(crudo.montos)) {
    const monto = typeof m.monto === 'number' ? m.monto : Number(String(m.monto ?? '').replace(/[^\d.]/g, ''));
    const concepto = cadena(m.concepto);
    const cita = citada(m.cita);
    if (!concepto || !cita || !Number.isFinite(monto) || monto <= 0) continue;
    montos.push({ concepto, monto, cita });
  }

  const contiene = (Array.isArray(crudo.contiene) ? crudo.contiene : []).filter(
    (c): c is ClaseDocumental => LISTA_CLASES.includes(c as ClaseDocumental) && c !== clase,
  );

  return {
    clase,
    titulo: cadena(crudo.titulo) ?? CLASES[clase].nombre,
    numero: cadena(crudo.numero),
    fecha: fechaISO(cadena(crudo.fecha)),
    emisor: cadena(crudo.emisor),
    resumen: cadena(crudo.resumen) ?? '',
    ficha,
    hechos,
    montos,
    contiene: [...new Set(contiene)],
    descartadas,
  };
}
