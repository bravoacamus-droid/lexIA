/**
 * La ficha (tipo, número, título, fecha) de un documento que se sube a la
 * Biblioteca Normativa desde el panel.
 *
 * POR QUÉ (reunión con César del 27/11/2026)
 *
 * «Uno para subir manual, sería genial para yo subirlo manualmente»: el
 * actualizador no trae las modificaciones de la Ley y el Reglamento, los
 * acuerdos de Sala Plena, los dictámenes ni los informes de vicio de
 * nulidad. Para que el documento quede como los demás —y para detectar si
 * ya estaba— el número se escribe COMO LO ESCRIBEN LOS INGESTORES de cada
 * tipo (`scripts/ingest-carpeta-cesar.ts`, `ingest-acuerdos-sala-plena.ts`
 * y el actualizador): «Informe IVN N° 032-2025/DSAT», «Acuerdo de Sala
 * Plena N.° 004-2026/TCP», «Resolución N° 9164-2026-TCP-S6»…
 *
 * Primero reglas sobre el texto (exactas); lo que no reconocen, el modelo
 * rápido lo propone. El usuario siempre confirma o corrige antes de subir.
 */
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { NormativeDocType } from '@/lib/supabase/types';

export { TIPOS_SUBIBLES, LEYES, type LeyAplicable, type FichaPropuesta } from './tipos';
import { TIPOS_SUBIBLES, type FichaPropuesta, type LeyAplicable } from './tipos';

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07',
  agosto: '08', setiembre: '09', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

const plano = (t: string) => t.replace(/\s+/g, ' ');
const pad = (n: string | number, l = 3) => String(Number(n)).padStart(l, '0');

/** La fecha de cierre: «Jesús María, 7 de julio de 2026» (la última que aparezca). */
export function fechaDeCierre(t: string): string | null {
  const todas = [
    ...plano(t).matchAll(/(?:Jes[úu]s\s+Mar[íi]a|Lima|San\s+Isidro|Magdalena\s+del\s+Mar)\s*,\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})/gi),
  ];
  const m = todas.at(-1);
  if (!m || !MESES[m[2].toLowerCase()]) return null;
  return `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
}

/** La primera fecha con forma «23 de noviembre de 2026» del texto. */
function primeraFecha(t: string): string | null {
  const m = plano(t.slice(0, 6000)).match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})/i);
  if (!m || !MESES[m[2].toLowerCase()]) return null;
  return `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
}

/** Reglas exactas por tipo, sobre el encabezado. */
export function fichaPorReglas(texto: string, nombreArchivo = ''): Omit<FichaPropuesta, 'origen' | 'ley'> | null {
  const cab = plano(texto.slice(0, 8000));
  const nom = nombreArchivo.replace(/[-_]+/g, ' ');

  let m = cab.match(/INFORME\s+IVN\s+N\s*[.°º]*\s*[°º]?\s*(\d{1,3})\s*-\s*(\d{4})\s*\/\s*DSAT/i);
  if (m) {
    const numero = `Informe IVN N° ${pad(m[1])}-${m[2]}/DSAT`;
    const entidad = cab.match(/Entidad\s+contratante\s*:\s*(.+?)\s+Procedimiento\s*:/i)?.[1]?.trim().slice(0, 160);
    let fecha = fechaDeCierre(texto) ?? '';
    if (fecha && Number(fecha.slice(0, 4)) < Number(m[2])) fecha = m[2] + fecha.slice(4);
    return { tipo: 'informe_vicio_nulidad', numero, titulo: entidad ? `${numero} · ${entidad}` : numero, fecha };
  }
  m = cab.match(/EXPEDIENTE\s+DIC\s+N\s*[.°º]*\s*[°º]?\s*(\d{3,5})\s*-\s*(\d{4})(\s*-\s*[A-Z]{2,6})?/i);
  if (m) {
    const numero = `Dictamen — Expediente DIC N° ${Number(m[1])}-${m[2]}${m[3] ? m[3].replace(/\s+/g, '') : ''}`;
    const entidad = cab.match(/\bENTIDAD\s+(.+?)\s+PROCEDIMIENTO\s+DE\s+SELECCI[ÓO]N/i)?.[1]?.trim().slice(0, 160);
    return { tipo: 'dictamen', numero, titulo: entidad ? `${numero} · ${entidad}` : numero, fecha: fechaDeCierre(texto) ?? '' };
  }
  m =
    cab.match(/ACUERDO\s+DE\s+SALA\s+PLENA\s+N\s*[.°º]*\s*[°º]?\s*0*(\d{1,3})\s*-\s*(\d{4})\s*\/?\s*-?\s*(TC[EP]?)?/i) ??
    nom.match(/acuerdo\s+de\s+sala\s+plena\s+(?:n\s+)?0*(\d{1,3})\s+(\d{4})\s+(tc[ep]?)?/i);
  if (m) {
    const anio = Number(m[2]);
    const sigla = (m[3] ?? (anio >= 2025 ? 'TCP' : 'TCE')).toUpperCase();
    const numero = `Acuerdo de Sala Plena N.° ${pad(m[1])}-${anio}/${sigla}`;
    return { tipo: 'acuerdo_sala_plena', numero, titulo: numero, fecha: primeraFecha(texto) ?? '' };
  }
  m = cab.match(/PRONUNCIAMIENTO\s+N\s*[.°º]*\s*[°º]?\s*(\d{1,4})\s*-\s*(\d{4})\s*\/\s*(OECE|OSCE)\s*-\s*(DSAT|DGR)/i);
  if (m) {
    const numero = `Pronunciamiento N° ${pad(m[1])}-${m[2]}/${m[3].toUpperCase()}-${m[4].toUpperCase()}`;
    return { tipo: 'pronunciamiento', numero, titulo: numero, fecha: fechaDeCierre(texto) ?? '' };
  }
  m = cab.match(/OPINI[ÓO]N\s+N\s*[.°º]*\s*[°º]?\s*(D?\d{1,6})\s*-\s*(\d{4})\s*\/\s*DTN/i);
  if (m) {
    const numero = `Opinión N° ${/^D/i.test(m[1]) ? m[1].toUpperCase() : pad(m[1])}-${m[2]}/DTN`;
    return { tipo: 'opinion', numero, titulo: numero, fecha: fechaDeCierre(texto) ?? '' };
  }
  m = cab.match(/RESOLUCI[ÓO]N\s+N\s*[.°º]*\s*[°º]?\s*0*(\d{1,5})\s*-\s*(\d{4})\s*-\s*(TCP|TCE)\s*-\s*S\s*(\d)/i);
  if (m) {
    const numero = `Resolución N° ${Number(m[1])}-${m[2]}-${m[3].toUpperCase()}-S${m[4]}`;
    return { tipo: 'resolucion_tce', numero, titulo: numero, fecha: fechaDeCierre(texto) ?? '' };
  }
  m = cab.match(/DECRETO\s+SUPREMO\s+N\s*[.°º]*\s*[°º]?\s*0*(\d{1,4})\s*-\s*(\d{4})\s*-\s*EF/i);
  if (m) {
    const numero = `Decreto Supremo N° ${pad(m[1])}-${m[2]}-EF`;
    return { tipo: 'reglamento', numero, titulo: numero, fecha: primeraFecha(texto) ?? '' };
  }
  m = cab.match(/\bLEY\s+N\s*[.°º]*\s*[°º]?\s*(\d{5})\b/i);
  if (m) {
    const numero = `Ley N° ${m[1]}`;
    return { tipo: 'ley', numero, titulo: numero, fecha: primeraFecha(texto) ?? '' };
  }
  return null;
}

const SISTEMA = `Clasificas un documento de contrataciones públicas peruanas para una biblioteca normativa. Devuelve SOLO JSON:
{"tipo": uno de [${TIPOS_SUBIBLES.join(', ')}] o null, "numero": "el número oficial como figura (p. ej. «Directiva N° 001-2026-OECE/CD»)", "titulo": "título o sumilla breve (máx. 200 caracteres)", "fecha": "YYYY-MM-DD de emisión o publicación, o vacío"}
No inventes: si no aparece un dato, déjalo vacío.`;

/** Reglas y, si no alcanzan, el modelo rápido (una llamada corta). */
export async function proponerFicha(texto: string, nombreArchivo: string): Promise<FichaPropuesta> {
  const ley: LeyAplicable = /\b30225\b/.test(texto.slice(0, 6000)) && !/\b32069\b/.test(texto.slice(0, 6000)) ? 'ley_30225' : 'ley_32069';
  const porReglas = fichaPorReglas(texto, nombreArchivo);
  if (porReglas) return { ...porReglas, ley, origen: 'reglas' };
  const inicio = texto.slice(0, 5000).trim();
  if (inicio.length < 40) return { tipo: null, numero: '', titulo: nombreArchivo.replace(/\.(pdf|docx)$/i, ''), fecha: '', ley, origen: 'nada' };
  try {
    const { text } = await generateText({
      model: fastModel,
      system: SISTEMA,
      prompt: `Archivo: ${nombreArchivo}\n\n${inicio}`,
      temperature: 0,
      maxTokens: 400,
    });
    const r = parseJsonLoose<{ tipo?: string | null; numero?: string; titulo?: string; fecha?: string }>(text);
    const tipo = TIPOS_SUBIBLES.includes(r.tipo as NormativeDocType) ? (r.tipo as NormativeDocType) : null;
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(r.fecha ?? '') ? (r.fecha as string) : '';
    return {
      tipo,
      numero: String(r.numero ?? '').replace(/\s+/g, ' ').trim().slice(0, 200),
      titulo: String(r.titulo ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) || nombreArchivo,
      fecha,
      ley,
      origen: 'modelo',
    };
  } catch {
    return { tipo: null, numero: '', titulo: nombreArchivo.replace(/\.(pdf|docx)$/i, ''), fecha: '', ley, origen: 'nada' };
  }
}

/**
 * El «núcleo» del número para buscar duplicados aunque se escriba distinto
 * («N.° 4-2026» y «N° 004-2026»): correlativo sin ceros y año, o el número
 * de la ley.
 */
export function nucleoDelNumero(numero: string): { correlativo: string; anio: string } | null {
  const m = numero.match(/(D?\d{1,6})\s*[-/]\s*((?:19|20)\d\d)/i);
  if (m) return { correlativo: m[1].toUpperCase().replace(/^0+(?=\d)/, ''), anio: m[2] };
  const ley = numero.match(/\bLey\s+N\s*[.°º]*\s*[°º]?\s*(\d{4,5})\b/i);
  return ley ? { correlativo: ley[1], anio: '' } : null;
}
