/**
 * Lo leído de las bases en una evaluación de bases, guardado en la fila
 * (`evaluations.textos.lectura`), para que el PDF se pueda borrar al
 * terminar (César, 18/10/2026) sin perder lo que viene después:
 *
 *   · «Reevaluar con otra bases estándar» vuelve a cotejar el mismo texto;
 *   · «Llevar al pliego de consultas» ubica los hallazgos por página.
 *
 * Las dos leían el PDF otra vez del almacenamiento. Ahora leen lo
 * guardado; si la evaluación es de antes (no tiene `lectura`), leen el
 * archivo como siempre: los archivos de entonces siguen en su sitio.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { cacheEnEvaluacion, leerBases, type BasesLeidas } from '@/lib/evaluacion/bases/leer';

/** Lo que se guarda: sin `texto` cuando sale de las páginas (sería el doble). */
export interface LecturaGuardada {
  origen: 'docx' | 'pdf';
  texto?: string;
  paginas?: number;
  textoPaginas?: string[];
  folios?: Array<number | null>;
  transcritas?: number[];
  ilegibles?: number[];
}

export function lecturaParaGuardar(l: BasesLeidas): LecturaGuardada {
  const porPaginas = !!l.textoPaginas && l.textoPaginas.join('\n') === l.texto;
  return {
    origen: l.origen,
    ...(porPaginas ? {} : { texto: l.texto }),
    ...(l.paginas !== undefined ? { paginas: l.paginas } : {}),
    ...(l.textoPaginas ? { textoPaginas: l.textoPaginas } : {}),
    ...(l.folios ? { folios: l.folios } : {}),
    ...(l.transcritas ? { transcritas: l.transcritas } : {}),
    ...(l.ilegibles ? { ilegibles: l.ilegibles } : {}),
  };
}

export function lecturaGuardadaABases(g: LecturaGuardada): BasesLeidas {
  return {
    texto: g.texto ?? (g.textoPaginas ?? []).join('\n'),
    origen: g.origen,
    paginas: g.paginas,
    textoPaginas: g.textoPaginas,
    folios: g.folios,
    transcritas: g.transcritas,
    ilegibles: g.ilegibles,
  };
}

/** Lee las bases de la evaluación: lo guardado si lo hay; si no, el archivo. */
export async function basesDeLaEvaluacion(
  admin: SupabaseClient,
  ev: { id: string; bases_file_path: string },
  opciones: { transcribir?: boolean } = {},
): Promise<BasesLeidas> {
  const { data } = await admin.from('evaluations').select('textos').eq('id', ev.id).maybeSingle();
  const guardada = (data as { textos: { lectura?: LecturaGuardada } | null } | null)?.textos?.lectura;
  if (guardada) return lecturaGuardadaABases(guardada);
  return leerBases(admin, ev.bases_file_path, { cache: cacheEnEvaluacion(admin, ev.id), ...opciones });
}

/** Guarda la lectura junto a lo que ya hubiera en `textos` (la transcripción de páginas escaneadas). */
export async function guardarLectura(admin: SupabaseClient, id: string, l: BasesLeidas): Promise<boolean> {
  const { data } = await admin.from('evaluations').select('textos').eq('id', id).maybeSingle();
  const previos = ((data as { textos: Record<string, unknown> | null } | null)?.textos ?? {}) as Record<string, unknown>;
  const { error } = await admin
    .from('evaluations')
    .update({ textos: { ...previos, lectura: lecturaParaGuardar(l) } } as never)
    .eq('id', id);
  if (error) console.error('[bases] no se guardó la lectura de las bases:', error.message);
  return !error;
}
