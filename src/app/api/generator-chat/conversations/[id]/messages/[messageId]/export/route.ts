import { NextResponse } from 'next/server';
import { nombreDeArchivo, cabeceraDescarga } from '@/lib/descargas/nombre-archivo';
import { createClient } from '@/lib/supabase/server';
import { markdownAPiezas } from '@/lib/documentos/desde-markdown';
import { FORMATO_DOCUMENTO, piezasADocx } from '@/lib/documentos/word';
import { GENERATOR_PERFILES } from '@/lib/ai/generator-perfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/generator-chat/conversations/[id]/messages/[messageId]/export
 *
 * Descarga el contenido markdown de un mensaje del assistant como .docx
 *
 * Se compone con el mismo `documentos/word.ts` que el requerimiento, el
 * acta y las cartas, y ya no lleva el «Generado con A-LexIA» ni el
 * «Perfil: …» encima: el documento lo firma quien lo usa.
 */
export async function GET(
  _req: Request,
  ctx: { params: { id: string; messageId: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Verificar conversación + mensaje
  const { data: convo } = await supabase
    .from('generator_conversations')
    .select('id, user_id, perfil, title')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!convo) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const c = convo as {
    id: string;
    user_id: string;
    perfil: keyof typeof GENERATOR_PERFILES;
    title: string | null;
  };
  if (c.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: msgRow } = await supabase
    .from('generator_messages')
    .select('id, content, role')
    .eq('id', ctx.params.messageId)
    .eq('conversation_id', ctx.params.id)
    .maybeSingle();
  if (!msgRow) return NextResponse.json({ error: 'message_not_found' }, { status: 404 });
  const m = msgRow as { id: string; content: string; role: string };
  if (m.role !== 'assistant') {
    return NextResponse.json(
      { error: 'only_assistant_exportable' },
      { status: 400 },
    );
  }

  const buffer = await piezasADocx(markdownAPiezas(m.content), FORMATO_DOCUMENTO);

  const filename = `${nombreDeArchivo(c.title || 'documento', 'documento', 60)}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': cabeceraDescarga(filename),
      'Content-Length': String(buffer.length),
    },
  });
}
