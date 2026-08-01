#!/usr/bin/env tsx
/**
 * NORMALIZACIÓN DE LA BIBLIOTECA — tipo, año, entidad emisora y duplicados.
 *
 * Pedido de César (01/08/2026): "la biblioteca tenemos que ordenar por
 * tipo de documento y año... respecto a las Directivas se tendría que
 * clasificar por año y entidad (OECE, Perú Compras y DGA), de la misma
 * forma los lineamientos".
 *
 * Auditoría previa que motivó este script:
 *   - 39 de 50 documentos con type='resolucion' son en realidad
 *     Directivas o Lineamientos (la resolución directoral APRUEBA la
 *     directiva, y se ingirió con el tipo del acto aprobatorio, no del
 *     contenido). Por eso el filtro "Resolución Directoral" mostraba
 *     directivas.
 *   - El año NO estaba registrado: 100% de resoluciones, 96% de
 *     directivas y 100% de lineamientos sin fecha → ordenar por año era
 *     imposible.
 *   - La entidad emisora solo existía dentro del título.
 *   - Títulos repetidos: NO son duplicados. Al comparar el contenido se
 *     verificó que 22 de 24 grupos son PARTES distintas del mismo acto
 *     normativo (la resolución que aprueba, la directiva, sus anexos y
 *     sus modificaciones). Ej. "1. Lineamientos... Adq. útiles de
 *     Oficina" son 6 documentos: el lineamiento, sus dos
 *     modificaciones y las tres resoluciones que las aprueban.
 *     Borrarlos habría destruido contenido real. Solo se eliminan los
 *     grupos con contenido IDÉNTICO, y el resto se agrupa en la UI.
 *
 * Uso:
 *   npx tsx scripts/normalizar-biblioteca.ts            (simulación)
 *   npx tsx scripts/normalizar-biblioteca.ts --apply
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const APPLY = process.argv.includes('--apply');

interface Doc {
  id: string;
  type: string;
  number: string | null;
  title: string;
  date: string | null;
  metadata: Record<string, unknown> | null;
  /** Longitud del texto — para distinguir copias reales de partes distintas. */
  rawLen?: number;
}

/** Entidad emisora, deducida del título/número. */
export function detectarEntidad(texto: string): string | null {
  const t = texto.toUpperCase();
  if (/PER[ÚU]\s*COMPRAS/.test(t)) return 'Perú Compras';
  if (/EF\s*\/?\s*54\.?01|\bDGA\b|DIRECCI[ÓO]N GENERAL DE ABASTECIMIENTO/.test(t))
    return 'DGA';
  if (/OECE|OSCE/.test(t)) return 'OECE';
  if (/SUNARP/.test(t)) return 'SUNARP';
  if (/PERU\s*COMPRAS/.test(t)) return 'Perú Compras';
  return null;
}

/** Año de emisión: "N° 006-2025-...", "0001-2026-EF54.01". */
export function detectarAnio(texto: string): number | null {
  // Patrón normativo NNN-AAAA (el año va después del número correlativo)
  const m = texto.match(/\b\d{1,5}\s*-\s*(19|20)(\d{2})\b/);
  if (m) {
    const a = parseInt(`${m[1]}${m[2]}`, 10);
    if (a >= 1998 && a <= 2100) return a;
  }
  // Año suelto en el texto
  const m2 = texto.match(/\b(20[0-4]\d)\b/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

/** Número correlativo dentro del año: "Directiva N° 016-2025" → 16.
 *  Se guarda con relleno de ceros para poder ordenarlo como texto en
 *  Postgres (metadata->>correlativo). */
export function detectarCorrelativo(texto: string): string | null {
  const m = texto.match(/N\.?[°º]?\s*0*(\d{1,4})\s*-\s*(19|20)\d{2}/i);
  if (m) return m[1].padStart(4, '0');
  // "1. Lineamientos para el cumplimiento..." → 1
  const m2 = texto.match(/^\s*(\d{1,3})\.\s/);
  if (m2) return m2[1].padStart(4, '0');
  return null;
}

/** Tipo real según lo que el documento ES, no el acto que lo aprueba. */
export function detectarTipo(titulo: string, tipoActual: string): string {
  const t = titulo.trim();
  if (/^c[óo]digo\s+de\s+[ée]tica/i.test(t)) return 'codigo_etica';
  if (/^lineamiento/i.test(t) || /^\d+\.\s*lineamientos/i.test(t)) return 'lineamiento';
  if (/^directiva/i.test(t)) return 'directiva';
  if (/^disposiciones\s+que\s+regulan/i.test(t)) return 'directiva';
  if (/resoluci[óo]n\s+directoral/i.test(t)) return 'resolucion';
  return tipoActual;
}

/** Clave para detectar duplicados: título normalizado. */
function claveTitulo(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function main() {
  const { data, error } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, date, metadata, raw_text');
  if (error) throw new Error(error.message);
  const docs = ((data || []) as Array<Doc & { raw_text: string | null }>).map((d) => ({
    ...d,
    rawLen: (d.raw_text || '').length,
  })) as Doc[];

  const cambios: Array<{
    doc: Doc;
    tipoNuevo?: string;
    anio?: number;
    entidad?: string;
    correlativo?: string;
  }> = [];

  for (const d of docs) {
    const texto = `${d.title} ${d.number || ''}`;
    const tipoNuevo = detectarTipo(d.title, d.type);
    const anio = d.date ? new Date(d.date).getUTCFullYear() : detectarAnio(texto);
    const entidad =
      (d.metadata?.entidad as string | undefined) || detectarEntidad(texto) || undefined;
    const correlativo =
      (d.metadata?.correlativo as string | undefined) ||
      detectarCorrelativo(d.title) ||
      undefined;

    const cambiaTipo = tipoNuevo !== d.type;
    const agregaAnio = !!anio && !d.date;
    const agregaEntidad = !!entidad && !d.metadata?.entidad;
    const agregaCorr = !!correlativo && !d.metadata?.correlativo;
    if (cambiaTipo || agregaAnio || agregaEntidad || agregaCorr) {
      cambios.push({
        doc: d,
        tipoNuevo: cambiaTipo ? tipoNuevo : undefined,
        anio: agregaAnio ? (anio as number) : undefined,
        entidad: agregaEntidad ? entidad : undefined,
        correlativo: agregaCorr ? correlativo : undefined,
      });
    }
  }

  // Copias REALES: mismo título Y contenido prácticamente idéntico.
  // Verificado que la mayoría de títulos repetidos son partes distintas
  // del mismo acto (anexos, modificaciones, resolución aprobatoria), así
  // que la comparación de contenido es obligatoria antes de borrar.
  const porClave = new Map<string, Doc[]>();
  for (const d of docs) {
    const tipoFinal = detectarTipo(d.title, d.type);
    const k = `${tipoFinal}::${claveTitulo(d.title)}`;
    porClave.set(k, [...(porClave.get(k) || []), d]);
  }
  const dupes = [...porClave.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const largos = g.map((d) => (d.rawLen ?? 0) as number);
      const min = Math.min(...largos);
      const max = Math.max(...largos);
      const idéntico = max > 0 && (max - min) / max < 0.02;
      return { grupo: g, idéntico };
    })
    .filter((x) => x.idéntico)
    .map((x) => x.grupo);

  console.log('══ RECLASIFICACIÓN DE TIPO ══');
  const porTipo = new Map<string, number>();
  cambios
    .filter((c) => c.tipoNuevo)
    .forEach((c) => {
      const k = `${c.doc.type} → ${c.tipoNuevo}`;
      porTipo.set(k, (porTipo.get(k) || 0) + 1);
    });
  [...porTipo.entries()].forEach(([k, n]) => console.log(`  ${k}: ${n}`));

  console.log('\n══ AÑO EXTRAÍDO ══');
  const porAnio = new Map<number, number>();
  cambios
    .filter((c) => c.anio)
    .forEach((c) => porAnio.set(c.anio!, (porAnio.get(c.anio!) || 0) + 1));
  [...porAnio.entries()].sort().forEach(([a, n]) => console.log(`  ${a}: ${n} documentos`));
  const sinAnio = docs.filter(
    (d) => !d.date && !detectarAnio(`${d.title} ${d.number || ''}`),
  );
  console.log(`  (quedan sin año: ${sinAnio.length})`);

  console.log('\n══ ENTIDAD EMISORA ══');
  const porEnt = new Map<string, number>();
  cambios
    .filter((c) => c.entidad)
    .forEach((c) => porEnt.set(c.entidad!, (porEnt.get(c.entidad!) || 0) + 1));
  [...porEnt.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([e, n]) => console.log(`  ${e}: ${n}`));

  console.log('\n══ DUPLICADOS POR TÍTULO ══');
  console.log(`  grupos: ${dupes.length} | documentos a borrar: ${dupes.reduce((a, g) => a + g.length - 1, 0)}`);
  dupes.slice(0, 8).forEach((g) => console.log(`   ×${g.length} ${g[0].title.slice(0, 68)}`));

  if (!APPLY) {
    console.log('\n(simulación — ejecuta con --apply)');
    return;
  }

  console.log('\nAplicando...');
  let actualizados = 0;
  for (const c of cambios) {
    const patch: Record<string, unknown> = {};
    if (c.tipoNuevo) patch.type = c.tipoNuevo;
    if (c.anio) patch.date = `${c.anio}-01-01`;
    if (c.entidad || c.correlativo) {
      patch.metadata = {
        ...(c.doc.metadata || {}),
        ...(c.entidad ? { entidad: c.entidad } : {}),
        ...(c.correlativo ? { correlativo: c.correlativo } : {}),
      };
    }
    const { error: e } = await supabase
      .from('normative_documents')
      .update(patch as never)
      .eq('id', c.doc.id);
    if (e) {
      console.error(`  ⚠️ ${c.doc.title.slice(0, 40)}: ${e.message}`);
      continue;
    }
    actualizados++;
  }
  console.log(`  ✅ ${actualizados} documentos actualizados`);

  // Borrado de duplicados: conserva el que tiene más chunks (mejor ingesta)
  let borrados = 0;
  for (const g of dupes) {
    const conConteo = await Promise.all(
      g.map(async (d) => {
        const { count } = await supabase
          .from('normative_chunks')
          .select('id', { count: 'exact', head: true })
          .eq('document_id', d.id);
        return { doc: d, chunks: count || 0 };
      }),
    );
    conConteo.sort((a, b) => b.chunks - a.chunks);
    for (const perdedor of conConteo.slice(1)) {
      await supabase.from('normative_chunks').delete().eq('document_id', perdedor.doc.id);
      await supabase.from('normative_documents').delete().eq('id', perdedor.doc.id);
      borrados++;
    }
  }
  console.log(`  ✅ ${borrados} duplicados eliminados`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
