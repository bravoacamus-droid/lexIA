/**
 * Prestaciones ejecutadas sin contrato o fuera de él: el enriquecimiento
 * sin causa.
 *
 * Hasta el 27/09/2026 el generador dejaba la base legal «por precisar»:
 * la biblioteca no tiene el Código Civil. César respondió cuál es: el
 * artículo 1954 del Código Civil y la doctrina del OSCE/OECE que lo
 * aplica a la contratación pública, con sus cuatro elementos; y pidió que
 * A-LexIA se apoye en las opiniones de 2020 en adelante.
 *
 * El texto del Código Civil va aquí, literal, porque no está en la
 * biblioteca; las opiniones se traen de la biblioteca, con su pasaje,
 * para que la cita sea comprobable.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const ES_SIN_CONTRATO = /sin contrato|fuera/i;

export function sinContrato(respuestas: Record<string, string>): boolean {
  return ES_SIN_CONTRATO.test(respuestas.origen_obligacion ?? '');
}

/** Código Civil (Decreto Legislativo N.° 295), artículos 1954 y 1955, literales. */
export const CODIGO_CIVIL = `[CÓDIGO CIVIL — artículos 1954 y 1955] Decreto Legislativo N.° 295. Norma de aplicación supletoria.
Artículo 1954.- Aquel que se enriquece indebidamente a expensas de otro está obligado a indemnizarlo.
Artículo 1955.- La acción a que se refiere el artículo 1954 no es procedente cuando la persona que ha sufrido el perjuicio puede ejercitar otra acción para obtener la respectiva indemnización.`;

/**
 * El criterio que indicó César, con sus palabras. Las opiniones de 2018 y
 * 2019 y la resolución de 2004 que menciona no están en la biblioteca
 * (su corte es 2020): se anotan como citadas por él, para que el
 * documento no las presente como verificadas.
 */
export const CRITERIO_DEL_ESPECIALISTA = `[CRITERIO — Enriquecimiento sin causa en la contratación pública, según el especialista de A-LexIA (27/09/2026)]
El reconocimiento de prestaciones ejecutadas sin observar el procedimiento regular de contratación no es una forma de regularización contractual, sino una vía excepcional de naturaleza indemnizatoria, orientada a evitar que la entidad conserve un beneficio patrimonial sin causa jurídica en perjuicio del proveedor que ejecutó la prestación.
Para sustentarlo debe verificarse la concurrencia de sus elementos constitutivos:
i) el enriquecimiento de la entidad y el correlativo empobrecimiento del proveedor;
ii) la relación directa entre ese enriquecimiento y ese empobrecimiento, derivada de la prestación ejecutada por el proveedor y aprovechada por la entidad;
iii) la ausencia de una causa jurídica válida que sustente el desplazamiento patrimonial o el pago ordinario de la prestación; y
iv) la buena fe del proveedor.
Lo han desarrollado las Opiniones N.° 112-2018/DTN, N.° 024-2019/DTN y N.° 065-2022/DTN del OSCE, y el Tribunal de Contrataciones del Estado, en la Resolución N.° 176/2004.TC-SU, señaló que puede configurarse una situación de hecho jurídicamente relevante cuando existen prestaciones ejecutadas por una parte, aceptadas y utilizadas por la otra, aun sin contrato válido o sin cobertura contractual suficiente. (Solo la Opinión N.° 065-2022/DTN está en la biblioteca; las demás se citan por indicación del especialista y deben verificarse.)`;

/**
 * Las opiniones de 2020 en adelante que tratan el enriquecimiento sin
 * causa, con el pasaje donde lo hacen. Las más recientes primero.
 */
export async function opinionesSobreEnriquecimiento(supabase: SupabaseClient, cuantas = 6): Promise<string> {
  const terminos = ['enriquecimiento sin causa'];
  const { data: filas, error } = await supabase.rpc('buscar_con_todas_las_palabras', {
    p_terminos: terminos,
    p_tipo: 'opinion',
    p_ley: null,
    p_limite: cuantas,
    p_desde: 0,
    p_entidad: null,
    p_anio_desde: 2020,
    p_anio_hasta: null,
    p_fecha_desde: null,
  });
  if (error) {
    console.error('[ejecucion/enriquecimiento] búsqueda:', error.message);
    return '';
  }
  const ids = ((filas ?? []) as Array<{ document_id: string }>).map((f) => f.document_id);
  if (ids.length === 0) return '';
  const [{ data: docs }, { data: frags }] = await Promise.all([
    supabase.from('normative_documents').select('id, number, date').in('id', ids),
    supabase.rpc('fragmentos_con_palabras', { p_documentos: ids, p_terminos: terminos, p_por_termino: 2 }),
  ]);
  const porId = new Map(((docs ?? []) as Array<{ id: string; number: string | null; date: string | null }>).map((d) => [d.id, d]));
  const pasajes = new Map<string, string[]>();
  for (const f of (frags ?? []) as Array<{ document_id: string; fragmento: string }>) {
    pasajes.set(f.document_id, [...(pasajes.get(f.document_id) ?? []), f.fragmento.replace(/[⟦⟧]/g, '').replace(/\s+/g, ' ').trim()]);
  }
  return ids
    .map((id) => {
      const d = porId.get(id);
      const p = pasajes.get(id);
      if (!d || !p?.length) return null;
      return `[CRITERIO — ${d.number ?? 'Opinión'}${d.date ? ` (${d.date})` : ''}]\n${p.map((x) => `«… ${x} …»`).join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

/** Todo el sustento del caso sin contrato, para el modelo. */
export async function sustentoDelEnriquecimiento(supabase: SupabaseClient): Promise<string> {
  const opiniones = await opinionesSobreEnriquecimiento(supabase);
  return [CODIGO_CIVIL, CRITERIO_DEL_ESPECIALISTA, opiniones].filter(Boolean).join('\n\n---\n\n');
}
