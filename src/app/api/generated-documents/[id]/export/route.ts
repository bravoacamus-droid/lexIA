import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markdownToDocxBuffer } from '@/lib/docx-from-markdown';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('generated_documents')
    .select('id, title, generated_content, user_id, document_type')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const row = data as {
    id: string;
    title: string;
    generated_content: string | null;
    user_id: string;
    document_type: string;
  };
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!row.generated_content || row.generated_content.length < 20) {
    return NextResponse.json({ error: 'not_ready' }, { status: 400 });
  }

  const buffer = await markdownToDocxBuffer(row.generated_content, {
    title: row.title,
    subtitle: 'LexIA · Generador de documentos',
  });

  const safeTitle = (row.title || 'documento').replace(/[^a-z0-9_-]+/gi, '_');
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="LexIA_${safeTitle}.docx"`,
    },
  });
}
