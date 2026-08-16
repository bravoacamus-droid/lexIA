import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { formatForDisplay, formatNormativaText } from '../src/lib/normativa/format-raw';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

config({ path: '.env.local', override: true });

/**
 * Test VISUAL de las tablas de un pronunciamiento.
 *
 * No solo imprime el markdown — también valida que remarkGfm lo interprete
 * como una tabla real (nodo type='table' en el AST), no como texto plano
 * con caracteres `|`. Ese es el fallo que César reportó en los screenshots.
 */

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  align?: unknown;
}

function findTables(node: MdNode, tables: MdNode[] = []): MdNode[] {
  if (node.type === 'table') tables.push(node);
  if (node.children) for (const c of node.children) findTables(c, tables);
  return tables;
}

function findParagraphsWithPipes(node: MdNode, results: string[] = []): string[] {
  if (node.type === 'paragraph') {
    const flat = JSON.stringify(node).match(/"value":"([^"]*)"/g)?.join(' ') ?? '';
    if (flat.includes('|')) results.push(flat.slice(0, 200));
  }
  if (node.children) for (const c of node.children) findParagraphsWithPipes(c, results);
  return results;
}

function validateMarkdown(label: string, md: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md) as unknown as MdNode;
  const tables = findTables(tree);
  const strayPipes = findParagraphsWithPipes(tree);
  console.log(`\n─── VALIDACIÓN AST: ${label} ───`);
  console.log(`Tablas reconocidas por remarkGfm: ${tables.length}`);
  for (const t of tables) {
    const rows = t.children?.length ?? 0;
    const cols = t.children?.[0]?.children?.length ?? 0;
    console.log(`  · tabla de ${rows} filas × ${cols} columnas`);
  }
  if (strayPipes.length > 0) {
    console.log(`⚠  Párrafos con '|' literales (tabla NO reconocida): ${strayPipes.length}`);
    for (const p of strayPipes.slice(0, 3)) console.log(`     ${p}`);
  } else {
    console.log('✓ Sin `|` sueltos en párrafos (todas las tablas fueron reconocidas)');
  }
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await admin
    .from('normative_documents')
    .select('raw_text')
    .ilike('number', '%346-2026%')
    .maybeSingle();

  const raw = (data as { raw_text: string }).raw_text;

  const cases = [
    { name: 'Chunk 1: tabla al inicio', start: raw.indexOf('COD. SIGA'), size: 2500 },
    {
      name: 'Chunk 2: cuadro citado en párrafo (imagen 5)',
      start: raw.indexOf('OBJETO DE LA CONVOCATORIA'),
      size: 2500,
    },
    {
      name: 'Chunk 3: análisis con notas de expediente',
      start: raw.indexOf('Nota 2'),
      size: 2000,
    },
  ].filter((c) => c.start >= 0);

  for (const c of cases) {
    const slice = raw.slice(Math.max(0, c.start - 300), c.start + c.size);
    const md = formatForDisplay(slice);

    console.log(`\n\n═══════════════════════════════════════════════`);
    console.log(`CASO: ${c.name}`);
    console.log(`═══════════════════════════════════════════════`);
    console.log('--- MARKDOWN GENERADO (primeros 1500 chars) ---');
    console.log(md.slice(0, 1500));
    validateMarkdown(c.name, md);
  }

  console.log('\n\n═══════════════════════════════════════════════');
  console.log('CHUNK-SHEET (modo strip): sin tablas, bullets');
  console.log('═══════════════════════════════════════════════');
  const first = raw.slice(raw.indexOf('COD. SIGA') - 200, raw.indexOf('COD. SIGA') + 800);
  console.log(formatNormativaText(first).slice(0, 800));
}

main().catch(console.error);
