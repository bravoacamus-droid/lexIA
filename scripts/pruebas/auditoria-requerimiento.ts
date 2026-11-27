/**
 * El auditor de requerimientos con el prompt del 27/11/2026 (reunión con
 * César): régimen y objeto, temas obligatorios (penalidades, pago,
 * conformidad, garantías), ubicación por partes sin blancos, solicitud y
 * términos clave para buscar en la biblioteca.
 *
 * Usa el requerimiento real del Capítulo III de las bases del CPA
 * 008-2026 (servicios) y llama a Gemini de verdad (unos centavos). No
 * escribe en la base: solo lee la biblioteca.
 *
 * Uso: npx tsx scripts/pruebas/auditoria-requerimiento.ts [ruta.pdf] [menor_8uit|seleccion]
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { readFileSync } from 'node:fs';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { generatorModel } from '@/lib/ai/gemini';
import { textoPorPagina } from '@/lib/ai/pdf';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import { promptDeAuditoriaTdr } from '@/lib/ai/evaluator-prompts';
import { normalizarAuditoria, reforzarAuditoria } from '@/lib/evaluacion/auditoria-tdr';
import { denominacionPorRotulo, leerDenominacion } from '@/lib/evaluacion/denominacion';

const RUTA = process.argv[2] ?? '2. DOCUMENTOS PARA PROCEDIMIENTOS DE SELECCIÓN/2. BASES LLENADAS/MODELO DE SERVICIOS/2.- BASES INTEGRADAS CPA 008-2026[R][R][R].pdf';
const REGIMEN = (process.argv[3] as 'menor_8uit' | 'seleccion' | undefined) ?? 'seleccion';

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

void (async () => {
  const paginas = await textoPorPagina(readFileSync(RUTA));
  // Del Capítulo III (requerimiento) al IV, si son unas bases; si no, todo.
  const iIII = paginas.findIndex((p) => /CAP[IÍ]TULO\s+III\b/i.test(p) && /REQUERIMIENTO/i.test(p));
  const iIV = paginas.findIndex((p, i) => i > iIII && /CAP[IÍ]TULO\s+IV\b/i.test(p));
  const desde = iIII >= 0 ? iIII : 0;
  const hasta = iIII >= 0 && iIV > iIII ? iIV : paginas.length;
  const texto = paginas
    .slice(desde, hasta)
    .map((t, i) => `[[PÁGINA ${desde + i + 1}]]\n${t}`)
    .join('\n\n');
  console.log(`Requerimiento: páginas ${desde + 1}–${hasta} (${texto.length} caracteres), régimen ${REGIMEN}\n`);

  // ── Denominación ──
  const plano = paginas.slice(0, 6).join('\n');
  const d = await leerDenominacion(plano);
  console.log(`Denominación (${d.via}): ${d.denominacion}`);
  ok(d.denominacion && d.denominacion.length > 10, 'lee la denominación del documento');
  ok(denominacionPorRotulo('1. DENOMINACIÓN DE LA CONTRATACIÓN: Servicio de mantenimiento preventivo y correctivo de grupo electrógeno.\n\n2. FINALIDAD') ===
    'Servicio de mantenimiento preventivo y correctivo de grupo electrógeno', 'rótulo «Denominación de la contratación»');

  // ── Auditoría ──
  const t0 = Date.now();
  const r = await generateText({
    model: generatorModel,
    system: promptDeAuditoriaTdr({ regimen: REGIMEN, objeto: 'servicios', conPaginas: true }),
    prompt: `Audita el siguiente requerimiento. Devuelve EXCLUSIVAMENTE el JSON con la auditoría completa.\n\n${texto}`,
    temperature: 0.2,
    maxTokens: 32000,
  });
  console.log(`\nAuditoría: ${((Date.now() - t0) / 1000).toFixed(0)} s · ${r.usage?.promptTokens} tok entrada · ${r.usage?.completionTokens} tok salida`);
  const a = normalizarAuditoria(parseJsonLoose<Record<string, unknown>>(r.text));
  ok(a.hallazgos.length > 0, `${a.hallazgos.length} hallazgos (${a.stats.criticos} críticos, ${a.stats.altos} altos, ${a.stats.medios} medios, ${a.stats.bajos} bajos)`);
  const cats = new Map<string, number>();
  for (const h of a.hallazgos) cats.set(h.categoria, (cats.get(h.categoria) ?? 0) + 1);
  console.log('Categorías:', Object.fromEntries(cats));
  ok(a.hallazgos.every((h) => h.ubicacion_detalle && Object.values(h.ubicacion_detalle).every((v) => v.trim())), 'ninguna ubicación en blanco');
  ok(a.hallazgos.some((h) => /^\d+$/.test(h.ubicacion_detalle?.pagina ?? '')), 'trae páginas reales');
  ok(a.hallazgos.filter((h) => h.solicitud).length >= a.hallazgos.length * 0.8, 'casi todos dicen qué se solicita');
  ok(a.hallazgos.filter((h) => (h.terminos_clave ?? []).length > 0).length >= a.hallazgos.length * 0.8, 'casi todos traen términos clave');
  const citasReales = a.hallazgos.filter((h) => !h.extracto_literal.startsWith('(omisión)')).filter((h) => {
    const cita = h.extracto_literal.replace(/\s+/g, ' ').replace(/…$/, '').trim().slice(0, 40);
    return texto.replace(/\s+/g, ' ').includes(cita);
  }).length;
  const noOmisiones = a.hallazgos.filter((h) => !h.extracto_literal.startsWith('(omisión)')).length;
  ok(citasReales >= noOmisiones * 0.7, `las citas literales existen en el texto (${citasReales}/${noOmisiones})`);

  // ── Biblioteca ──
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const t1 = Date.now();
  const reforzada = await reforzarAuditoria(db, texto, a);
  const conFuentes = reforzada.hallazgos.filter((h) =>
    (h.fundamento_normativo ?? []).some((f) => /resoluci|pronunciamiento|opini|acuerdo|tribunal/i.test(`${f.norma} ${f.articulo ?? ''}`)),
  ).length;
  console.log(`\nBiblioteca: ${((Date.now() - t1) / 1000).toFixed(0)} s`);
  ok(conFuentes > 0, `${conFuentes}/${reforzada.hallazgos.length} hallazgos con precedentes de la biblioteca`);

  console.log('\nMuestra:');
  for (const h of reforzada.hallazgos.slice(0, 6)) {
    console.log(`\n· [${h.severidad}] ${h.titulo}\n  ${h.ubicacion}\n  Solicitud: ${h.solicitud ?? '—'} · claves: ${(h.terminos_clave ?? []).join(', ')}`);
    for (const f of (h.fundamento_normativo ?? []).slice(0, 4)) console.log(`  - ${f.norma}${f.articulo ? ` — ${f.articulo.slice(0, 110)}` : ''}`);
  }
  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ todo bien');
  process.exit(fallas ? 1 : 0);
})();
