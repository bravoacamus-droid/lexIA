import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Borra el save asociado al documento_id (NO al saved.id) por user_id.
 * El [id] aquí es el document_id (más conveniente para el cliente).
 */
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('user_saved_documents')
    .delete()
    .eq('user_id', user.id)
    .eq('document_id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
