/**
 * El contraste por tema con la biblioteca (Fase 1) sobre el Capítulo III
 * de unas bases reales (CPA 008-2026, servicios), y cómo se suma a la
 * revisión por capítulos. Llama a Gemini (unos centavos) y solo lee la
 * base.
 *
 * Uso: npx tsx scripts/pruebas/contraste-de-bases.ts [ruta.pdf]
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';
import estandares from '../../src/lib/evaluacion/bases/estandar.generado.json';
import { cotejarBases, identificarEstandar, prepararBases, type BasesEstandar } from '../../src/lib/evaluacion/bases/cotejo';
import { partirEnCapitulos } from '../../src/lib/evaluacion/bases/capitulos';
import { capitulosDe, contrataUnBien } from '../../src/lib/evaluacion/bases/evaluar';
import {
  capituloDelRequerimiento,
  contrastarLasBases,
  objetoDelEstandar,
  sumarAlaRevision,
} from '../../src/lib/evaluacion/bases/contraste-de-las-bases';
import type { HallazgoBases } from '../../src/lib/evaluacion/bases/tipos';

const RUTA = process.argv[2] ?? '2. DOCUMENTOS PARA PROCEDIMIENTOS DE SELECCIÓN/2. BASES LLENADAS/MODELO DE SERVICIOS/2.- BASES INTEGRADAS CPA 008-2026[R][R][R].pdf';
let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

void (async () => {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(RUTA)));
  const { text } = await extractText(pdf, { mergePages: true });
  const b = prepararBases(String(text));
  const ES = estandares as unknown as BasesEstandar[];
  const estandar = identificarEstandar(b, ES)[0].estandar;
  const capitulos = partirEnCapitulos(b, cotejarBases(b, estandar), await capitulosDe(estandar.id));
  const cap = capituloDelRequerimiento(capitulos);
  ok(cap, `capítulo del requerimiento: ${cap?.rotulo} — ${cap?.titulo} (${cap?.bases.length} caracteres)`);
  const objeto = objetoDelEstandar(estandar.id, contrataUnBien(estandar.id, b.texto));
  ok(objeto === 'servicios', `objeto según el estándar ${estandar.id}: ${objeto}`);

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const t0 = Date.now();
  const r = await contrastarLasBases({ cliente: db, capitulo: cap!, objeto });
  console.log(`\nContraste: ${((Date.now() - t0) / 1000).toFixed(0)} s · ${r.temas} temas · ${r.hallazgos.length} hallazgos`);
  ok(r.hallazgos.length > 0, 'el contraste observa algo en el Capítulo III');
  ok(r.hallazgos.filter((h) => h.fuentes?.length).length >= r.hallazgos.length * 0.5, `con precedentes (${r.hallazgos.filter((h) => h.fuentes?.length).length}/${r.hallazgos.length})`);
  ok(r.hallazgos.every((h) => h.fuentes?.every((f) => f.documentId && f.numero && f.criterio)), 'cada precedente trae su documento para abrirlo');
  ok(r.hallazgos.filter((h) => h.enLasBases).some((h) => h.numeral), 'las citas se ubican en un numeral de las bases');

  // Suma con una revisión simulada que ya vio una de las observaciones.
  const una = r.hallazgos.find((h) => h.enLasBases && h.fuentes?.length);
  if (una) {
    const revision: HallazgoBases = { ...una, id: 'cap-iii-1', fuentes: [], severidad: 'bajo', origen: 'revision' };
    const sumada = sumarAlaRevision([revision], r.hallazgos);
    const fusion = sumada.find((h) => h.id === 'cap-iii-1')!;
    ok(sumada.length === r.hallazgos.length, `la misma observación no se duplica (${sumada.length} = ${r.hallazgos.length})`);
    ok(fusion.fuentes!.length > 0 && fusion.severidad === una.severidad, 'la de la revisión recibe los precedentes y la severidad mayor');
  }

  console.log('\nMuestra:');
  for (const h of r.hallazgos) {
    console.log(`\n· [${h.severidad}] ${h.titulo}\n  ${h.capitulo} · num. ${h.numeral || '—'} · lit. ${h.literal || '—'} · pág. ${h.pagina || '—'}`);
    for (const f of (h.fuentes ?? []).slice(0, 3)) console.log(`  - ${f.numero}: ${f.criterio.slice(0, 110)}`);
  }
  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ todo bien');
  process.exit(fallas ? 1 : 0);
})();
