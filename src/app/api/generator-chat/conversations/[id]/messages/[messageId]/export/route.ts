import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markdownToDocxBuffer } from '@/lib/docx-from-markdown';
import { GENERATOR_PERFILES } from '@/lib/ai/generator-perfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/generator-chat/conversations/[id]/messages/[messageId]/export
 *
 * Descarga el contenido markdown de un mensaje del assistant como .docx
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

  const perfilLabel = GENERATOR_PERFILES[c.perfil].label;
  const buffer = await markdownToDocxBuffer(m.content, {
    title: c.title || 'Documento generado por LexIA',
    subtitle: `Perfil: ${perfilLabel} · Generado el ${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  });

  const filename = `${(c.title || 'documento').replace(/[^a-z0-9áéíóúñü\-_ ]/gi, '').slice(0, 50).trim() || 'documento'}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
