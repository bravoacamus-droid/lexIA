/**
 * Leer las bases que subió el usuario.
 *
 * Del PDF, página a página, para quitar las cabeceras que se repiten
 * (`paginas.ts`). Del Word, con mammoth: trae los párrafos y las tablas
 * en orden y sin cabeceras de página.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import { assertHasExtractableText } from '@/lib/ai/pdf';
import { sinCabeceras } from './paginas';

export interface BasesLeidas {
  texto: string;
  origen: 'docx' | 'pdf';
  paginas?: number;
}

export async function leerBases(admin: SupabaseClient, ruta: string): Promise<BasesLeidas> {
  const { data, error } = await admin.storage.from('uploads').download(ruta);
  if (error || !data) throw new Error(`No se pudieron descargar las bases: ${error?.message ?? 'sin datos'}`);
  const buffer = Buffer.from(await data.arrayBuffer());

  if (/\.docx$/i.test(ruta)) {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return { texto: value, origen: 'docx' };
  }

  // Una copia: pdf.js se queda con el búfer que recibe.
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const paginas = (await extractText(pdf, { mergePages: false })).text as string[];
  const texto = sinCabeceras(paginas);
  // Un escaneo sin capa de texto no se puede cotejar: mejor decirlo.
  assertHasExtractableText(texto, pdf.numPages);
  return { texto, origen: 'pdf', paginas: pdf.numPages };
}
