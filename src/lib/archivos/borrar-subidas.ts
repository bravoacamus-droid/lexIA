/**
 * Borrar del almacenamiento los archivos que subió el usuario, en cuanto
 * terminan de procesarse.
 *
 * César (18/10/2026): «Una vez evaluadas estas ofertas y/o documentos
 * fuentes que cargan los suscriptores a las funcionalidades de A-LexIA,
 * este debe eliminarse a fin de que no se almacene.»
 *
 * Qué se borra y cuándo (el inventario completo está en el informe del
 * 18/10/2026):
 *   · evaluación de ofertas por etapas y segunda evaluación: al terminar
 *     o fallar la evaluación (`/api/evaluations/[id]/etapas`);
 *   · revisión de la propia oferta y evaluación de una pasada: al
 *     terminar o fallar (`/process`);
 *   · evaluación de bases: al terminar o fallar; antes se guarda lo leído
 *     de las bases para reevaluar y armar el pliego (`bases-leidas.ts`);
 *   · expediente de ejecución: al terminar de leer cada documento.
 *
 * Nunca lanza: un archivo que no se pudo borrar no debe tumbar una
 * evaluación que sí terminó. Solo borra dentro de la carpeta del dueño
 * (`<user_id>/…`): las rutas vienen de la base y las escribió el
 * navegador.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET_DE_SUBIDAS = 'uploads';

export async function borrarSubidas(
  cliente: SupabaseClient,
  dueno: string,
  rutas: Array<string | null | undefined>,
  motivo: string,
): Promise<{ borrados: number; error?: string }> {
  const propias = [...new Set(rutas.filter((r): r is string => !!r && r.startsWith(`${dueno}/`)))];
  if (propias.length === 0) return { borrados: 0 };
  let borrados = 0;
  for (let i = 0; i < propias.length; i += 100) {
    const { data, error } = await cliente.storage
      .from(BUCKET_DE_SUBIDAS)
      .remove(propias.slice(i, i + 100))
      .catch((e: Error) => ({ data: null, error: e }));
    if (error) {
      console.error(`[subidas] no se pudieron borrar (${motivo}):`, error.message);
      return { borrados, error: error.message };
    }
    borrados += data?.length ?? 0;
  }
  if (borrados) console.info(`[subidas] ${borrados} archivo(s) borrados: ${motivo}`);
  return { borrados };
}

/**
 * Las rutas que NO están en la carpeta del dueño (`<user_id>/…`).
 * Antes de descargar con service role una ruta que viene de una fila:
 * si la lista no está vacía, no se descarga nada.
 */
export function rutasAjenas(dueno: string, rutas: Array<string | null | undefined>): string[] {
  return rutas.filter((r): r is string => !!r && (!r.startsWith(`${dueno}/`) || r.includes('..')));
}

/** Las rutas de una evaluación: las bases y cada oferta, con sus partes si se subieron partidas. */
export function rutasDeEvaluacion(fila: {
  bases_file_path?: string | null;
  bases_partes?: string[] | null;
  offer_files?: Array<{ path?: string | null; partes?: string[] | null }> | null;
}): string[] {
  return [
    fila.bases_file_path,
    ...(fila.bases_partes ?? []),
    ...(fila.offer_files ?? []).flatMap((o) => [o.path, ...(o.partes ?? [])]),
  ].filter((r): r is string => !!r);
}
