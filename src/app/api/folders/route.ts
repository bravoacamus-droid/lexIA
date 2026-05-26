import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1).max(60),
  color: z.string().max(20).optional(),
  icon: z.string().max(30).optional(),
});

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Cuento docs guardados por carpeta en el cliente — primero traigo carpetas y luego saved
  const { data: folders, error } = await supabase
    .from('user_folders')
    .select('id, name, color, icon, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: saved } = await supabase
    .from('user_saved_documents')
    .select('folder_id')
    .eq('user_id', user.id);

  const counts = new Map<string, number>();
  let unfiled = 0;
  for (const s of (saved || []) as Array<{ folder_id: string | null }>) {
    if (s.folder_id) {
      counts.set(s.folder_id, (counts.get(s.folder_id) || 0) + 1);
    } else {
      unfiled += 1;
    }
  }

  return NextResponse.json({
    folders: (folders || []).map((f: { id: string; name: string; color: string; icon: string; created_at: string }) => ({
      ...f,
      count: counts.get(f.id) || 0,
    })),
    unfiledCount: unfiled,
  });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_folders')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      color: parsed.data.color || 'slate',
      icon: parsed.data.icon || 'folder',
    } as never)
    .select('id, name, color, icon, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: { ...data, count: 0 } });
}
