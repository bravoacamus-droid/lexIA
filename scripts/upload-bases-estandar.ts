#!/usr/bin/env tsx
/**
 * Sube las plantillas oficiales de Bases Estándar/Especiales al bucket
 * "templates" de Supabase Storage y actualiza/registra los renglones
 * correspondientes en generator_templates.
 *
 * Origen: carpeta "BASES ESTÁNDAR/" en la raíz del proyecto.
 *   ├─ BASES ESTÁNDAR - DGA/        (19 .docx)
 *   └─ BASES ESPECIALES ESTÁNDAR - OECE/ (5 .pdf)
 *
 * Destino:
 *   bucket "templates":
 *     bases-estandar/{slug}.docx       (Bases Estándar DGA)
 *     bases-especiales/{slug}.pdf      (Bases Especiales OECE)
 *
 * BD (tabla generator_templates):
 *   - Para los 19 .docx ya registrados con slug='bases_estandar':
 *     se UPDATEa el source_path al path de Storage.
 *   - Para los 5 .pdf nuevos: INSERT con slug='bases_especiales',
 *     audience='entity', object_type según el nombre.
 *
 * Uso:
 *   pnpm exec tsx scripts/upload-bases-estandar.ts                # ejecuta
 *   pnpm exec tsx scripts/upload-bases-estandar.ts --dry-run      # solo lista
 */
import { config as loadEnv } from 'dotenv';
import { join, basename } from 'node:path';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadEnv({ path: join(process.cwd(), '.env.local') });

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  .trim()
  .replace(/[\r\n"']/g, '');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  .trim()
  .replace(/[\r\n"']/g, '');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan credenciales en .env.local');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ROOT = join(process.cwd(), 'BASES ESTÁNDAR');
const DGA_DIR = join(ROOT, 'BASES ESTÁNDAR - DGA');
const OECE_DIR = join(ROOT, 'BASES ESPECIALES ESTÁNDAR - OECE');

const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_PDF = 'application/pdf';

interface Plan {
  localPath: string;
  storageKey: string;
  mime: string;
  template: {
    slug: 'bases_estandar' | 'bases_especiales';
    audience: 'entity';
    object_type:
      | 'bienes'
      | 'servicios'
      | 'obras'
      | 'consultoria_obras'
      | 'consultoria_general'
      | 'mixto';
    label: string;
  };
}

// ════════════════════════════════════════════════════════════════════
// Mapeo: filename → object_type
// Para Bases Estándar DGA (los 19 .docx)
// ════════════════════════════════════════════════════════════════════
function inferObjectTypeDga(filename: string): Plan['template']['object_type'] {
  const l = filename.toLowerCase();
  if (l.includes('para-bienes') || l.includes('vaso-de-leche')) return 'bienes';
  if (l.includes('obras') && !l.includes('consultor')) return 'obras';
  if (l.includes('consultor-a-de-obra') || l.includes('consultoria-de-obra'))
    return 'consultoria_obras';
  if (l.includes('consultoria-en-general')) return 'consultoria_general';
  if (
    l.includes('servicios') ||
    l.includes('mantenimiento-vial') ||
    l.includes('expertos-y-gerentes')
  )
    return 'servicios';
  return 'mixto';
}

function inferObjectTypeOece(filename: string): Plan['template']['object_type'] {
  const l = filename.toLowerCase();
  if (l.includes('consultor')) return 'consultoria_obras';
  if (l.includes('ejecución de obras') || l.includes('ejecucion-de-obras'))
    return 'obras';
  if (l.includes('servicios')) return 'servicios';
  return 'mixto';
}

function buildLabelDga(filename: string): string {
  // Para .docx DGA: mantenemos el N° inicial para coincidir con los registros
  // existentes en BD que ya tienen labels "1 Bases Estandar...", "2 Bases ..."
  // Ejemplo: "7614342-1-bases-estandar-licitacion-publica-para-bienes.docx"
  //          → "1 Bases Estandar Licitacion Publica Para Bienes"
  let s = filename
    .replace(/\.docx$/i, '')
    .replace(/^7614342-/, '') // quitar prefijo OECE ID
    .replace(/\(\d+\)/g, '')
    .replace(/[\s-]+/g, ' ')
    .trim();
  // Capitalizar primera letra de cada palabra (sin tocar el interior)
  s = s
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
  return s;
}

function buildLabelOece(filename: string): string {
  // Para .pdf OECE: preservamos el "1. ", "2. ", etc. para que cada modelo
  // tenga label único (evita colisiones de upsert).
  let s = filename
    .replace(/\.pdf$/i, '')
    .replace(/\(\d+\)/g, '')
    .trim();
  // Capitalizar suavemente sin destruir acentos intermedios
  s = s
    .split(/\s+/)
    .map((w) => {
      if (w.length === 0) return '';
      // No alterar palabras con guión interno ni mayúsculas que ya tenían sentido
      const first = w[0].toUpperCase();
      const rest = w.slice(1).toLowerCase();
      return first + rest;
    })
    .join(' ');
  return s;
}

function buildStorageKey(folder: string, filename: string): string {
  // Limpiamos el filename para que el path en Storage sea ASCII y manejable
  const clean = filename
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${folder}/${clean}`;
}

// ════════════════════════════════════════════════════════════════════
// Construcción del plan de subida
// ════════════════════════════════════════════════════════════════════
function buildPlan(): Plan[] {
  const plans: Plan[] = [];

  // 1. Bases Estándar DGA (.docx)
  if (existsSync(DGA_DIR)) {
    const files = readdirSync(DGA_DIR).filter((f) => /\.docx$/i.test(f));
    for (const f of files) {
      plans.push({
        localPath: join(DGA_DIR, f),
        storageKey: buildStorageKey('bases-estandar', f),
        mime: MIME_DOCX,
        template: {
          slug: 'bases_estandar',
          audience: 'entity',
          object_type: inferObjectTypeDga(f),
          label: buildLabelDga(f),
        },
      });
    }
  }

  // 2. Bases Especiales OECE (.pdf)
  if (existsSync(OECE_DIR)) {
    const files = readdirSync(OECE_DIR).filter((f) => /\.pdf$/i.test(f));
    for (const f of files) {
      plans.push({
        localPath: join(OECE_DIR, f),
        storageKey: buildStorageKey('bases-especiales', f),
        mime: MIME_PDF,
        template: {
          slug: 'bases_especiales',
          audience: 'entity',
          object_type: inferObjectTypeOece(f),
          label: buildLabelOece(f),
        },
      });
    }
  }

  return plans;
}

async function uploadOne(plan: Plan): Promise<{ uploaded: boolean; error?: string }> {
  const buffer = readFileSync(plan.localPath);
  const { error } = await supabase.storage
    .from('templates')
    .upload(plan.storageKey, buffer, {
      contentType: plan.mime,
      upsert: true, // sobrescribir si existe (idempotente)
    });
  if (error) return { uploaded: false, error: error.message };
  return { uploaded: true };
}

async function upsertTemplateRow(plan: Plan): Promise<{
  action: 'updated' | 'inserted' | 'skipped';
  error?: string;
}> {
  // ¿Ya existe un registro con este label exacto y slug?
  const { data: existing } = await supabase
    .from('generator_templates')
    .select('id, source_path')
    .eq('slug', plan.template.slug)
    .eq('label', plan.template.label)
    .maybeSingle();

  if (existing) {
    // Actualizar source_path al de Storage
    const { error } = await supabase
      .from('generator_templates')
      .update({ source_path: plan.storageKey } as never)
      .eq('id', (existing as { id: string }).id);
    if (error) return { action: 'skipped', error: error.message };
    return { action: 'updated' };
  }

  // Insertar nuevo. sample_text es NOT NULL: usamos el label como
  // valor mínimo; el contenido real puede llenarse después con un
  // proceso de extracción de texto del PDF/DOCX.
  const { error } = await supabase
    .from('generator_templates')
    .insert({
      slug: plan.template.slug,
      audience: plan.template.audience,
      object_type: plan.template.object_type,
      label: plan.template.label,
      source_path: plan.storageKey,
      sample_text: plan.template.label,
      notes: 'Plantilla oficial subida desde carpeta del cliente',
      active: true,
    } as never);
  if (error) return { action: 'skipped', error: error.message };
  return { action: 'inserted' };
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Subida de Bases Estándar/Especiales → bucket templates');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);

  if (!existsSync(ROOT)) {
    console.error(`❌ No existe carpeta: ${ROOT}`);
    process.exit(1);
  }

  const plans = buildPlan();
  console.log(`Archivos detectados: ${plans.length}`);
  console.log('');

  // Mostrar plan agrupado por slug
  const bySlug = new Map<string, Plan[]>();
  for (const p of plans) {
    const k = p.template.slug;
    if (!bySlug.has(k)) bySlug.set(k, []);
    bySlug.get(k)!.push(p);
  }
  for (const [slug, list] of bySlug) {
    console.log(`📦 ${slug} (${list.length}):`);
    for (const p of list) {
      console.log(
        `   • ${p.template.object_type.padEnd(20)} ${p.template.label.slice(0, 70)}`,
      );
      console.log(`     → templates/${p.storageKey}`);
    }
    console.log('');
  }

  if (DRY_RUN) {
    console.log('✅ Dry-run. Para ejecutar de verdad corre sin --dry-run.');
    return;
  }

  // Ejecutar
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Subiendo y registrando...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let uploadedOk = 0;
  let uploadFail = 0;
  let dbUpdated = 0;
  let dbInserted = 0;
  let dbFailed = 0;

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const label = `[${i + 1}/${plans.length}] ${basename(p.localPath).slice(0, 60)}`;
    process.stdout.write(label.padEnd(76) + ' ');

    const up = await uploadOne(p);
    if (!up.uploaded) {
      console.log(`UPLOAD FAIL · ${up.error?.slice(0, 50)}`);
      uploadFail++;
      continue;
    }
    uploadedOk++;

    const db = await upsertTemplateRow(p);
    if (db.error) {
      console.log(`UP-OK · DB FAIL · ${db.error.slice(0, 50)}`);
      dbFailed++;
    } else if (db.action === 'updated') {
      console.log(`UP-OK · DB updated`);
      dbUpdated++;
    } else {
      console.log(`UP-OK · DB inserted`);
      dbInserted++;
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Resumen');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total procesado:    ${plans.length}`);
  console.log(`  Subidos OK:       ${uploadedOk}`);
  console.log(`  Subidas fallidas: ${uploadFail}`);
  console.log(`  BD actualizadas:  ${dbUpdated}`);
  console.log(`  BD insertadas:    ${dbInserted}`);
  console.log(`  BD falladas:      ${dbFailed}`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
