/**
 * El requerimiento que se evaluó, tal como lo subieron.
 *
 * Del Word se lee el texto párrafo a párrafo, con el mismo lector que
 * luego marca los cambios: si el modelo copia un pasaje de ese texto, el
 * pasaje está en el Word exactamente así. Del PDF se lee el texto, que
 * sirve para proponer cambios pero no para marcarlos.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractPdfText } from '@/lib/ai/pdf';
import { textoDelWord, type CambioParaWord } from './control-de-cambios';
import { comentarioDelCambio } from './cuadro';
import { numerarHallazgos } from './orden';
import type { HallazgoAuditado } from './redactor';
import type { Mejora } from './tipos';

export interface Requerimiento {
  origen: 'docx' | 'pdf';
  texto: string;
  /** El archivo, cuando es Word: sobre él se marcan los cambios. */
  buffer?: Buffer;
}

export function origenDe(ruta: string): 'docx' | 'pdf' {
  return /\.docx$/i.test(ruta) ? 'docx' : 'pdf';
}

/** «1781574844920-TDR._Servicio.pdf» → «TDR. Servicio.pdf». */
export function nombreDelArchivo(ruta: string): string {
  const base = ruta.split('/').pop() ?? ruta;
  return base.replace(/^\d{10,}-/, '').replace(/_/g, ' ');
}

export async function leerRequerimiento(admin: SupabaseClient, ruta: string): Promise<Requerimiento> {
  const { data, error } = await admin.storage.from('uploads').download(ruta);
  if (error || !data) throw new Error(`No se pudo descargar el requerimiento: ${error?.message ?? 'sin datos'}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  if (origenDe(ruta) === 'docx') {
    return { origen: 'docx', texto: await textoDelWord(buffer), buffer };
  }
  // extractPdfText se queda con el búfer que recibe: se le pasa una copia.
  const { text } = await extractPdfText(Buffer.from(buffer));
  return { origen: 'pdf', texto: text };
}

/** Los cambios listos para el Word, con su comentario numerado. */
export function cambiosParaWord(hallazgos: HallazgoAuditado[], mejoras: Mejora[]): CambioParaWord[] {
  const numero = new Map(numerarHallazgos(hallazgos).map((x) => [x.hallazgo.id, x.numero]));
  const porId = new Map(hallazgos.map((h) => [h.id, h]));
  return mejoras
    .filter((m) => porId.has(m.hallazgoId) && m.textoOriginal && m.textoMejorado)
    .map((m) => ({
      id: m.hallazgoId,
      textoOriginal: m.textoOriginal,
      textoMejorado: m.textoMejorado,
      comentario: comentarioDelCambio(numero.get(m.hallazgoId) ?? 0, porId.get(m.hallazgoId)!, m),
    }));
}
