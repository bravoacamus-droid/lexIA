import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  uploadFileToGemini,
  deleteGeminiFile,
  GENERATOR_FILE_LIMITS,
} from '@/lib/ai/gemini-files';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * POST /api/generator-chat/conversations/[id]/files
 *
 * Recibe un archivo (multipart/form-data), lo sube a Gemini Files
 * API y guarda referencia en generator_files.
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Verificar ownership de la conversación
  const { data: convo } = await supabase
    .from('generator_conversations')
    .select('user_id')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!convo || (convo as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }

  if (file.size > GENERATOR_FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: 'file_too_large',
        detail: `Máximo ${GENERATOR_FILE_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB por archivo`,
      },
      { status: 413 },
    );
  }

  const mimeType = file.type || 'application/octet-stream';
  const accepted = GENERATOR_FILE_LIMITS.ACCEPTED_MIME_TYPES as readonly string[];
  if (!accepted.includes(mimeType)) {
    return NextResponse.json(
      {
        error: 'unsupported_mime',
        detail: `Tipo no soportado: ${mimeType}. Aceptados: ${accepted.join(', ')}`,
      },
      { status: 415 },
    );
  }

  // Verificar límite de N archivos por conversación
  const { count } = await supabase
    .from('generator_files')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', ctx.params.id);
  if ((count || 0) >= GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION) {
    return NextResponse.json(
      {
        error: 'file_limit_reached',
        detail: `Máximo ${GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION} archivos por conversación`,
      },
      { status: 409 },
    );
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  let uploadMime = mimeType;
  // Word: Gemini no procesa .docx nativamente. Extraemos el texto con
  // mammoth (mismo extractor que la ingesta) y lo subimos como
  // text/plain — para el modelo es equivalente y para el usuario es
  // transparente (pedido César 27/07/2026).
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const mammoth = (await import('mammoth')).default;
      const { value } = await mammoth.extractRawText({ buffer });
      const text = (value || '').trim();
      if (!text) {
        return NextResponse.json(
          { error: 'empty_docx', detail: 'El Word no contiene texto extraíble.' },
          { status: 422 },
        );
      }
      buffer = Buffer.from(`[Contenido extraído de ${file.name}]\n\n${text}`, 'utf8');
      uploadMime = 'text/plain';
    } catch (e) {
      return NextResponse.json(
        { error: 'docx_parse_failed', detail: (e as Error).message.slice(0, 200) },
        { status: 422 },
      );
    }
  }
  const uploaded = await uploadFileToGemini(buffer, uploadMime, file.name);

  const { data: row, error } = await supabase
    .from('generator_files')
    .insert({
      conversation_id: ctx.params.id,
      user_id: user.id,
      gemini_file_name: uploaded.name,
      gemini_file_uri: uploaded.uri,
      expires_at: uploaded.expiresAt || null,
      original_name: file.name,
      mime_type: mimeType,
      // El MIME con el que realmente se subió a Gemini. Difiere del
      // anterior cuando hubo conversión (.docx → text/plain), y es el
      // único que puede viajar en la petición: si no coincide con el
      // contenido del URI, Gemini responde INVALID_ARGUMENT.
      gemini_mime_type: uploadMime,
      size_bytes: file.size,
    } as never)
    .select('id')
    .single();

  if (error || !row) {
    // Intentamos limpiar el archivo de Gemini para no dejar basura
    void deleteGeminiFile(uploaded.name).catch(() => {});
    return NextResponse.json(
      { error: 'insert_failed', detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: (row as { id: string }).id,
    name: file.name,
    size: file.size,
    mimeType,
  });
}

/**
 * GET — lista archivos de la conversación
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('generator_files')
    .select('id, original_name, mime_type, size_bytes, created_at, expires_at')
    .eq('conversation_id', ctx.params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ items: data || [] });
}
