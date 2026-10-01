import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A qué acto normativo pertenece un texto que acaba de entrar a la
 * biblioteca (lo usa el actualizador diario).
 *
 * Documento 11 de César (30/09/2026): las copias que traía el rastreador
 * («Directiva N.° 001-2026-OECE-CD» suelta, sin título) aparecían como
 * una directiva más, duplicada. Ahora, si el acto ya existe en
 * normative_acts (armado con el Tablero normativo del OECE, ver
 * scripts/biblioteca-actos.ts), el texto nuevo entra dentro de él: como
 * «Texto actualizado» si su ficha es una versión nueva («…-v-2»), o como
 * «Texto de la norma».
 */
export function claveDeActo(d: { type: string; title: string; number?: string | null }): string | null {
  const t = `${d.title} ${d.number ?? ''}`;
  const dga = /(\d{4})-(20\d{2})-EF\/?\s*54/.exec(t);
  if (dga) {
    const tipo = /^Resoluci[óo]n Directoral/i.test(d.title) && d.type === 'resolucion' ? 'rd' : 'directiva';
    return `DGA:${tipo}:${Number(dga[1])}-${dga[2]}`;
  }
  const oece = /(Directiva|Lineamiento)[^0-9]{0,12}(\d{3})-(20\d{2})-OECE/i.exec(t);
  if (oece) return `OECE:${/^lineamiento/i.test(oece[1]) ? 'lineamiento' : 'directiva'}:${Number(oece[2])}-${oece[3]}`;
  const pc = /Directiva[^0-9]{0,12}(\d{3})-(20\d{2})-PER[ÚU]\s*COMPRAS/i.exec(t);
  if (pc) return `PC:directiva:${Number(pc[1])}-${pc[2]}`;
  return null;
}

export async function vincularActo(
  supabase: SupabaseClient,
  doc: { id: string; type: string; title: string; number?: string | null; source_url?: string | null; metadata?: Record<string, unknown> | null },
): Promise<string | null> {
  const clave = claveDeActo(doc);
  if (!clave) return null;
  const { data: acto } = await supabase
    .from('normative_acts')
    .select('clave, tipo, entidad, vigente_desde, documentos, url')
    .eq('clave', clave)
    .maybeSingle();
  if (!acto) return null;

  const documentos = (acto.documentos ?? []) as Array<{ rol: string; fecha: string | null; url: string | null }>;
  const actualizada = /-v-\d+\b/.test(doc.source_url ?? '');
  const ultima = [...documentos].reverse().find((x) => x.rol === 'modificacion');
  const parte = actualizada
    ? { parte_rol: 'norma', parte_etiqueta: 'Texto actualizado (con sus modificaciones)', parte_fecha: ultima?.fecha ?? null, parte_url: doc.source_url ?? null }
    : { parte_rol: 'norma', parte_etiqueta: 'Texto de la norma', parte_fecha: acto.vigente_desde ?? null, parte_url: doc.source_url ?? acto.url ?? null };

  const { error } = await supabase
    .from('normative_documents')
    .update({
      acto_clave: clave,
      type: acto.tipo,
      metadata: { ...(doc.metadata ?? {}), entidad: acto.entidad, ...parte },
    })
    .eq('id', doc.id);
  return error ? null : clave;
}
