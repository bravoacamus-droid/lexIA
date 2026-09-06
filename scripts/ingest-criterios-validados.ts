#!/usr/bin/env tsx
/**
 * Mete en la biblioteca los criterios ya resueltos.
 *
 * POR QUÉ EXISTE
 *
 * Las preguntas cuya respuesta está escrita en un artículo se aciertan
 * siempre; las que hay que deducir encadenando varios se quedan entre el
 * 60 % y el 90 % por mucho que se afine el prompt. Escribir la
 * conclusión convierte la segunda clase en la primera: en vez de razonar
 * que el comité continúa, el chat lo encuentra y lo cita.
 *
 * POR QUÉ NO SE TROCEA COMO LOS DEMÁS
 *
 * Un criterio vale entero o no vale. Si el troceador normal parte el
 * fundamento por la mitad, el chat puede recuperar la respuesta sin los
 * artículos que la sostienen, o el supuesto vecino sin el principal
 * —que es justo la confusión que estos textos vienen a evitar—. Así que
 * cada criterio es un fragmento, delimitado por sus encabezados.
 *
 *   npx tsx scripts/ingest-criterios-validados.ts            (en seco)
 *   npx tsx scripts/ingest-criterios-validados.ts --aplicar
 */
import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { embed } from '../src/lib/ai/embeddings';

config({ path: join(process.cwd(), '.env.local'), override: true });

const ARCHIVO = 'data/criterios-validados.md';
const TITULO = 'Criterios resueltos y verificados — LexIA';

interface Criterio {
  titulo: string;
  texto: string;
}

/** Parte el archivo por sus encabezados de segundo nivel. */
function leerCriterios(md: string): Criterio[] {
  const partes = md.split(/^## /m).slice(1);
  return partes
    .map((p) => {
      const salto = p.indexOf('\n');
      const titulo = p.slice(0, salto).trim();
      const cuerpo = p
        .slice(salto + 1)
        .replace(/^---$/gm, '')
        .trim();
      // El título va dentro del texto: el fragmento tiene que poder
      // leerse suelto, sin depender de metadatos que el modelo no ve.
      return { titulo, texto: `${titulo}\n\n${cuerpo}` };
    })
    .filter((c) => c.texto.length > 200);
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  console.log(aplicar ? '\nESCRIBIENDO\n' : '\nEN SECO — nada se escribe. Añade --aplicar.\n');

  const md = await readFile(ARCHIVO, 'utf8');
  const criterios = leerCriterios(md);
  console.log(`${criterios.length} criterio(s) en ${ARCHIVO}`);
  for (const c of criterios) {
    console.log(`   · ${c.titulo.slice(0, 72)} (${c.texto.length} caracteres)`);
  }
  if (!aplicar) return;

  const admin = createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    { auth: { persistSession: false } },
  );

  // Se rehace entero cada vez: la lista es corta y así una corrección en
  // el archivo se refleja sin dejar la versión vieja rondando.
  const { data: previo } = await admin
    .from('normative_documents')
    .select('id')
    .eq('title', TITULO)
    .maybeSingle();
  if (previo) {
    await admin.from('normative_documents').delete().eq('id', (previo as { id: string }).id);
    console.log('   (se retiró la versión anterior)');
  }

  const { data: doc, error } = await admin
    .from('normative_documents')
    .insert({
      type: 'criterio_validado',
      title: TITULO,
      number: null,
      date: new Date().toISOString().slice(0, 10),
      summary:
        'Casos resueltos y comprobados artículo por artículo contra la Ley N° 32069 y su Reglamento. No sustituyen a la norma que citan.',
      source_url: `local://${ARCHIVO}`,
      raw_text: md,
      metadata: { origen: 'curado', archivo: ARCHIVO } as never,
    } as never)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const docId = (doc as { id: string }).id;

  const vectores = await embed(
    criterios.map((c) => c.texto),
    'RETRIEVAL_DOCUMENT',
  );

  const filas = criterios.map((c, i) => ({
    document_id: docId,
    chunk_index: i,
    content: c.texto,
    embedding: vectores[i] as never,
    metadata: { heading: c.titulo } as never,
  }));

  for (let i = 0; i < filas.length; i += 10) {
    const { error: e } = await admin.from('normative_chunks').insert(filas.slice(i, i + 10) as never);
    if (e) {
      await admin.from('normative_documents').delete().eq('id', docId);
      throw new Error(`insertando fragmentos: ${e.message}`);
    }
  }

  console.log(`\n✅ ${criterios.length} criterios en la biblioteca.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
