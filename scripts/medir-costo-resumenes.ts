#!/usr/bin/env tsx
/**
 * Mide lo que costaría generar los resúmenes que faltan, con una muestra
 * real en vez de una estimación.
 *
 * Genera resúmenes de verdad sobre una muestra repartida por tipo,
 * registra tokens y tiempo, y extrapola. No escribe nada en la base: es
 * solo para decidir si vale la pena y con qué alcance.
 *
 * Uso: npx tsx scripts/medir-costo-resumenes.ts [--muestra=12]
 */
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { generateDocumentSummary } from '../src/lib/ai/document-summary';

loadEnv({ path: join(process.cwd(), '.env.local'), override: true });

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const POR_TIPO = Number(process.argv.find((a) => a.startsWith('--muestra='))?.slice(10) || 2);

/** Tipos ordenados por cuántos documentos faltan. */
const TIPOS = [
  'resolucion_tce',
  'pronunciamiento',
  'opinion',
  'directiva',
  'bases_estandar',
  'guia',
];

interface Medicion {
  tipo: string;
  chars: number;
  ms: number;
  ok: boolean;
  tokIn: number;
  tokOut: number;
}

async function main() {
  const mediciones: Medicion[] = [];

  for (const tipo of TIPOS) {
    const { data } = await supabase
      .from('normative_documents')
      .select('id, type, number, title, raw_text')
      .eq('type', tipo)
      .is('ai_summary', null)
      .limit(POR_TIPO);

    for (const d of (data || []) as Array<{
      type: string; number: string | null; title: string; raw_text: string;
    }>) {
      const t0 = Date.now();
      let ok = true;
      let tokIn = 0;
      let tokOut = 0;
      try {
        const r = await generateDocumentSummary({
          type: d.type,
          number: d.number,
          title: d.title,
          raw_text: d.raw_text || '',
        });
        ok = !!r.summary;
        tokIn = r.tokens?.in ?? 0;
        tokOut = r.tokens?.out ?? 0;
      } catch (err) {
        ok = false;
        console.log(`     ${(err as Error).message.slice(0, 70)}`);
      }
      const ms = Date.now() - t0;
      mediciones.push({ tipo, chars: Math.min((d.raw_text || '').length, 24000), ms, ok, tokIn, tokOut });
      console.log(`  ${ok ? '✅' : '❌'} ${tipo.padEnd(16)} ${String(ms).padStart(6)} ms · ${d.title.slice(0, 42)}`);
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  const buenas = mediciones.filter((m) => m.ok);
  const msMedio = buenas.reduce((s, m) => s + m.ms, 0) / buenas.length;
  const charsMedios = buenas.reduce((s, m) => s + m.chars, 0) / buenas.length;

  // Tokens REALES reportados por el modelo, no estimados.
  const tokensEntrada = buenas.reduce((s, m) => s + m.tokIn, 0) / buenas.length;
  const tokensSalida = buenas.reduce((s, m) => s + m.tokOut, 0) / buenas.length;

  const { count: faltan } = await supabase
    .from('normative_documents')
    .select('*', { count: 'exact', head: true })
    .is('ai_summary', null);
  const { count: faltanNormativa } = await supabase
    .from('normative_documents')
    .select('*', { count: 'exact', head: true })
    .is('ai_summary', null)
    .neq('type', 'resolucion_tce');

  console.log(`\n── MUESTRA: ${buenas.length} de ${mediciones.length} generados`);
  console.log(`   tiempo medio      ${Math.round(msMedio)} ms por documento`);
  console.log(`   texto medio       ${Math.round(charsMedios)} caracteres`);
  console.log(`   tokens medidos    ${Math.round(tokensEntrada)} entrada · ${Math.round(tokensSalida)} salida`);

  for (const [rotulo, n] of [
    ['TODO lo que falta', faltan ?? 0],
    ['solo normativa (sin resoluciones del Tribunal)', faltanNormativa ?? 0],
  ] as Array<[string, number]>) {
    const horas = (n * msMedio) / 3_600_000;
    const mEntrada = (n * tokensEntrada) / 1e6;
    const mSalida = (n * tokensSalida) / 1e6;
    // Precios de referencia de Gemini 2.5 Flash a agosto de 2026.
    const usd = mEntrada * 0.30 + mSalida * 2.50;
    console.log(`\n── ${rotulo}: ${n} documentos`);
    console.log(`   tiempo         ~${horas.toFixed(1)} horas en serie`);
    console.log(`   tokens         ${mEntrada.toFixed(1)} M entrada · ${mSalida.toFixed(2)} M salida`);
    console.log(`   costo          ~US$ ${usd.toFixed(2)}  (a $0.30/M entrada y $2.50/M salida)`);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
