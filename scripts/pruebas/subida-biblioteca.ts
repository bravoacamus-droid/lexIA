/**
 * Subida manual a la Biblioteca Normativa (reunión con César, 27/11/2026).
 *
 *   1. Con PDF reales de César que ya están en la biblioteca (un IVN, un
 *      dictamen y un acuerdo de Sala Plena): la ficha se propone bien y el
 *      duplicado se detecta, por archivo o por número, sin insertar nada.
 *   2. Un documento sintético de prueba (PDF generado con texto único) se
 *      sube de punta a punta como directiva: fragmentos con vector, la
 *      búsqueda lo encuentra, el PDF queda en `normativa`. Al final se borra
 *      todo (documento, fragmentos, archivos y su registro).
 *
 * Contra la base real; llama a Gemini (embeddings, resumen, ficha: centavos).
 * Uso: npx tsx scripts/pruebas/subida-biblioteca.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buscarDuplicado, subirALaBiblioteca, textoDelArchivo, ErrorDeSubida } from '@/lib/biblioteca/subir';
import { fichaPorReglas, nucleoDelNumero, proponerFicha } from '@/lib/biblioteca/fichas';
import { embedOne } from '@/lib/ai/embeddings';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const CESAR = 'C:/Users/luigi/Documents/cesar';

let fallas = 0;
const ok = (c: unknown, t: string) => {
  console.log(`${c ? '✅' : '❌'} ${t}`);
  if (!c) fallas++;
};

function primerPdf(carpeta: RegExp): string | null {
  const dir = readdirSync(CESAR).find((d) => carpeta.test(d));
  if (!dir) return null;
  const buscar = (p: string): string | null => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const r = join(p, e.name);
      if (e.isDirectory()) {
        const x = buscar(r);
        if (x) return x;
      } else if (/\.pdf$/i.test(e.name) && !/-1\.pdf$/i.test(e.name)) return r;
    }
    return null;
  };
  return buscar(join(CESAR, dir));
}

async function contarDocumentos() {
  const { count } = await admin.from('normative_documents').select('id', { count: 'exact', head: true });
  return count ?? 0;
}

void (async () => {
  // ── Reglas sueltas ──
  ok(nucleoDelNumero('Acuerdo de Sala Plena N.° 004-2026/TCP')?.correlativo === '4', 'núcleo sin ceros: 004 → 4');
  ok(nucleoDelNumero('Ley N° 32515')?.correlativo === '32515', 'núcleo de una ley');
  ok(fichaPorReglas('RESOLUCIÓN N° 09164-2026-TCP-S6\nSumilla…')?.numero === 'Resolución N° 9164-2026-TCP-S6', 'resolución del Tribunal con el formato de la biblioteca');
  ok(fichaPorReglas('DECRETO SUPREMO N° 222-2026-EF')?.tipo === 'reglamento', 'un decreto supremo del MEF entra como reglamento');

  // ── PDF reales de César (ya en la biblioteca) ──
  const antes = await contarDocumentos();
  for (const [carpeta, tipo] of [
    [/VICIO DE NULIDAD/i, 'informe_vicio_nulidad'],
    [/DICT[ÁA]MENES/i, 'dictamen'],
    [/SALA PLENA/i, 'acuerdo_sala_plena'],
  ] as const) {
    const ruta = primerPdf(carpeta);
    if (!ruta) {
      ok(false, `no está la carpeta de ${tipo}`);
      continue;
    }
    const buf = readFileSync(ruta);
    const md5 = createHash('md5').update(buf).digest('hex');
    const { texto } = await textoDelArchivo(buf, ruta);
    const p = await proponerFicha(texto, ruta.split(/[\\/]/).pop()!);
    ok(p.tipo === tipo, `${tipo}: tipo propuesto ${p.tipo} · ${p.numero} · ${p.fecha || 'sin fecha'} (${p.origen})`);
    const dup = await buscarDuplicado(admin, { md5, tipo: p.tipo, numero: p.numero });
    ok(dup, `${tipo}: ya estaba → ${dup?.number} (por ${dup?.por})`);
  }
  ok((await contarDocumentos()) === antes, 'la lectura y el control de duplicados no insertan nada');

  // ── Documento sintético de punta a punta ──
  const sello = `PRUEBASUBIDA${Date.now()}`;
  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([595, 842]);
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const lineas = [
    `DIRECTIVA N° 999-2099-PRUEBA`,
    `Documento de prueba ${sello} para verificar la subida manual a la biblioteca.`,
    'Objeto: comprobar que el texto se trocea, se vectoriza y se encuentra con la busqueda.',
    'Disposicion 1: el codigo unico de esta prueba es ' + sello + ' y no debe quedar en la biblioteca.',
    'Disposicion 2: si este texto aparece en una respuesta del chat, la prueba no limpio lo que creo.',
    'Disposicion 3: la entidad verifica el cumplimiento de las obligaciones del contratista con un acta.',
    'Disposicion 4: el plazo de verificacion es de cinco dias habiles desde la entrega del producto.',
  ];
  lineas.forEach((l, i) => pagina.drawText(l, { x: 40, y: 800 - i * 22, size: 9, font: fuente }));
  const bytes = Buffer.from(await pdf.save());
  const ruta = `prueba-subida/${sello}.pdf`;
  const { error: eSubida } = await admin.storage.from('uploads').upload(ruta, bytes, { contentType: 'application/pdf' });
  ok(!eSubida, `PDF sintético subido a uploads (${eSubida?.message ?? 'ok'})`);

  const { data: actor } = await admin.from('permisos_de_usuario').select('user_id').eq('rol', 'superadmin').limit(1).single();
  let id: string | null = null;
  try {
    const r = await subirALaBiblioteca(admin, {
      ruta,
      ficha: { tipo: 'directiva', numero: `Directiva N° 999-2099-${sello}`, titulo: `Prueba ${sello}`, fecha: '2026-01-01', ley: 'ley_32069', fuente: null },
      actor: (actor as { user_id: string }).user_id,
    });
    id = r.id;
    ok(r.fragmentos > 0, `ingresado: ${r.fragmentos} fragmento(s), resumen ${r.resumen}, PDF guardado ${r.pdfGuardado}`);
    const { data: frags } = await admin.from('normative_chunks').select('id, embedding').eq('document_id', id);
    ok((frags ?? []).length === r.fragmentos && (frags ?? []).every((f) => f.embedding), 'todos los fragmentos tienen vector');
    const emb = await embedOne(`codigo unico de la prueba ${sello}`, 'RETRIEVAL_QUERY');
    const { data: hits } = await admin.rpc('hybrid_search', { query_text: sello, query_embedding: emb, match_count: 5, filter_type: 'directiva' });
    ok(((hits ?? []) as Array<{ document_id: string }>).some((h) => h.document_id === id), 'la búsqueda de la biblioteca lo encuentra');
    const { data: d } = await admin.from('normative_documents').select('metadata, pdf_storage_path').eq('id', id).single();
    ok((d as { metadata: { origen?: string } }).metadata.origen === 'panel', 'marcado como subido desde el panel');

    // El mismo archivo otra vez: duplicado, no se agrega.
    await admin.storage.from('uploads').upload(ruta, bytes, { contentType: 'application/pdf', upsert: true });
    let codigo = '';
    try {
      await subirALaBiblioteca(admin, {
        ruta,
        ficha: { tipo: 'directiva', numero: `Directiva N° 999-2099-${sello}-B`, titulo: 'otra', fecha: null, ley: 'ley_32069', fuente: null },
        actor: (actor as { user_id: string }).user_id,
      });
    } catch (e) {
      codigo = e instanceof ErrorDeSubida ? e.codigo : 'otro';
    }
    ok(codigo === 'duplicado', 'el mismo archivo no entra dos veces');
  } catch (e) {
    ok(false, `la subida falló: ${(e as Error).message}`);
  } finally {
    // Limpieza: nada de la prueba queda en la biblioteca.
    if (id) {
      await admin.from('normative_chunks').delete().eq('document_id', id);
      await admin.from('normative_documents').delete().eq('id', id);
      await admin.storage.from('normativa').remove([`panel/${id}.pdf`]);
      await admin.from('registro_de_administracion').delete().eq('accion', 'subir_documento').eq('detalle->>documento', id);
    }
    await admin.storage.from('uploads').remove([ruta]);
    const { count } = await admin.from('normative_documents').select('id', { count: 'exact', head: true }).ilike('number', `%${sello}%`);
    ok((count ?? 0) === 0, 'la prueba no dejó nada en la biblioteca');
  }

  console.log(fallas ? `\n❌ ${fallas} falla(s)` : '\n✅ todo bien');
  process.exit(fallas ? 1 : 0);
})();
