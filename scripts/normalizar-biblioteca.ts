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
  /** Texto completo — para leer la fecha de suscripción. */
  rawText?: string | null;
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
  // Acepta prefijo de letras ("D000032-2026" de las opiniones del DTN) y
  // guiones repetidos ("341--2026", visto en un pronunciamiento).
  const m = texto.match(/N\.?[°º]?\s*[A-Z]?0*(\d{1,4})\s*-+\s*(19|20)\d{2}/i);
  if (m) return m[1].padStart(4, '0');
  // "1. Lineamientos para el cumplimiento..." → 1
  const m2 = texto.match(/^\s*(\d{1,3})\.\s/);
  if (m2) return m2[1].padStart(4, '0');
  return null;
}

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

/**
 * Fecha de SUSCRIPCIÓN leída del texto ya almacenado — sin descargar nada.
 *
 * Solo se aceptan los dos patrones que en la normativa peruana marcan la
 * firma del acto: "Lima, 9 de mayo de 2025" (ciudad + fecha, inmediatamente
 * después del número de resolución) y "a los quince (15) días del mes de...".
 *
 * Verificado el 01/08/2026 por qué NO vale cualquier fecha del texto:
 *   - tomar la más reciente devolvía 2027-11-30 y 2027-12-31 (plazos de
 *     vigencia, fechas futuras imposibles);
 *   - tomar la primera devolvía 2025-04-22 en tres documentos distintos,
 *     que es la entrada en vigencia de la Ley 32069 citada en el
 *     preámbulo, no la fecha de cada documento.
 */
export function detectarFechaDelTexto(raw: string | null): string | null {
  if (!raw) return null;
  const hoy = new Date();
  const fmt = (d: number, m: number, y: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const valida = (d: number, m: number, y: number) =>
    m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2015 && new Date(y, m - 1, d) <= hoy;

  // 1) "<Ciudad>, D de <mes> de AAAA"
  for (const m of raw.matchAll(
    /[A-ZÁÉÍÓÚ][a-záéíóúñ]+,\s*(\d{1,2})\s+de\s+(\w+)\s+de[l]?\s+(20\d{2})/g,
  )) {
    const mes = MESES[m[2].toLowerCase()];
    if (mes && valida(+m[1], mes, +m[3])) return fmt(+m[1], mes, +m[3]);
  }
  // 2) "a los quince (15) días del mes de abril de 2025"
  for (const m of raw.matchAll(
    /\((\d{1,2})\)\s*d[íi]as?\s+del\s+mes\s+de\s+(\w+)\s+de[l]?\s+(20\d{2})/gi,
  )) {
    const mes = MESES[m[2].toLowerCase()];
    if (mes && valida(+m[1], mes, +m[3])) return fmt(+m[1], mes, +m[3]);
  }
  return null;
}

/** Tipo real según lo que el documento ES, no el acto que lo aprueba. */
export function detectarTipo(titulo: string, tipoActual: string): string {
  const t = titulo.trim();
  if (/^c[óo]digo\s+de\s+[ée]tica/i.test(t)) return 'codigo_etica';
  // TUPA — César lo reportó el 01/08/2026: "en las opiniones aún
  // encontramos TUPAS del OECE". El mismo documento estaba además
  // duplicado bajo pronunciamiento.
  if (/TUPA/i.test(t)) return 'tupa';
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
    rawText: d.raw_text,
  })) as Doc[];

  const cambios: Array<{
    doc: Doc;
    tipoNuevo?: string;
    anio?: number;
    /** Fecha completa leída del texto (día exacto), si se pudo. */
    fechaExacta?: string;
    entidad?: string;
    correlativo?: string;
  }> = [];

  for (const d of docs) {
    const texto = `${d.title} ${d.number || ''}`;
    const tipoNuevo = detectarTipo(d.title, d.type);
    // Prioridad: fecha ya guardada > fecha de suscripción leída del texto
    // (más precisa: día exacto) > año deducido del número normativo.
    const fechaTexto = d.date ? null : detectarFechaDelTexto(d.rawText ?? null);
    const anio = d.date
      ? new Date(d.date).getUTCFullYear()
      : fechaTexto
        ? Number(fechaTexto.slice(0, 4))
        : detectarAnio(texto);
    const entidad =
      (d.metadata?.entidad as string | undefined) || detectarEntidad(texto) || undefined;
    // Las normas base (ley, reglamento) NO son una serie numerada: el
    // "correlativo" que se extraía venía de los decretos citados en el
    // título (ej. "N° 32069 y su Reglamento DS N° 009-2025-EF" daba
    // 0009), lo cual confundía. Se ordenan por fecha.
    const esNormaBase = tipoNuevo === 'ley' || tipoNuevo === 'reglamento';
    const correlativo = esNormaBase
      ? undefined
      : (d.metadata?.correlativo as string | undefined) ||
        detectarCorrelativo(d.title) ||
        detectarCorrelativo(d.number || '') ||
        undefined;

    const cambiaTipo = tipoNuevo !== d.type;
    const agregaAnio = !!anio && !d.date;
    const fechaExacta = agregaAnio ? fechaTexto : null;
    const agregaEntidad = !!entidad && !d.metadata?.entidad;
    const agregaCorr = !!correlativo && !d.metadata?.correlativo;
    const agregaAnioMeta = !d.metadata?.anio && (!!anio || !!d.date);
    if (cambiaTipo || agregaAnio || agregaEntidad || agregaCorr || agregaAnioMeta) {
      cambios.push({
        doc: d,
        tipoNuevo: cambiaTipo ? tipoNuevo : undefined,
        anio: agregaAnio ? (anio as number) : undefined,
        fechaExacta: fechaExacta || undefined,
        entidad: agregaEntidad ? entidad : undefined,
        correlativo: agregaCorr ? correlativo : undefined,
      });
    }
  }

  // Copias REALES: mismo título Y contenido prácticamente idéntico.
  // Verificado que la mayoría de títulos repetidos son partes distintas
  // del mismo acto (anexos, modificaciones, resolución aprobatoria), así
  // que la comparación de contenido es obligatoria antes de borrar.
  // La clave es SOLO el título: el mismo documento puede estar ingerido
  // bajo tipos distintos y seguir siendo una copia. Caso real
  // (01/08/2026): "Modificación del TUPA del OECE" existía tres veces
  // —como tupa, pronunciamiento y opinion— con 316,731 caracteres y 122
  // fragmentos idénticos cada una. Incluir el tipo en la clave las
  // separaba en tres grupos de uno y no se detectaban.
  const porClave = new Map<string, Doc[]>();
  for (const d of docs) {
    const k = claveTitulo(d.title);
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
    // Con día exacto si se leyó del texto; si no, 1 de enero del año
    // (aproximación suficiente para agrupar por año).
    if (c.fechaExacta) patch.date = c.fechaExacta;
    else if (c.anio) patch.date = `${c.anio}-01-01`;
    // El AÑO se guarda también en metadata para poder ordenar por
    // "año descendente + correlativo ascendente": ordenar por `date`
    // completa haría que la fecha exacta dominara y el correlativo nunca
    // se aplicara (César, 01/08/2026: opiniones y pronunciamientos deben
    // ir en orden correlativo, igual que las directivas).
    const anioFinal =
      c.anio ?? (c.doc.date ? Number(c.doc.date.slice(0, 4)) : undefined);
    if (c.entidad || c.correlativo || anioFinal) {
      patch.metadata = {
        ...(c.doc.metadata || {}),
        ...(c.entidad ? { entidad: c.entidad } : {}),
        ...(c.correlativo ? { correlativo: c.correlativo } : {}),
        ...(anioFinal ? { anio: String(anioFinal) } : {}),
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
    // Conserva la que tenga más fragmentos; a igualdad, la que YA está
    // en el tipo correcto según el título (evita quedarse con la copia
    // mal clasificada).
    conConteo.sort(
      (a, b) =>
        b.chunks - a.chunks ||
        Number(detectarTipo(b.doc.title, b.doc.type) === b.doc.type) -
          Number(detectarTipo(a.doc.title, a.doc.type) === a.doc.type),
    );
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
