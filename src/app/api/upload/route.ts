import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ['application/pdf'];

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const folder = (formData.get('folder') as string) || 'misc';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 415 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user.id}/${folder}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    path,
    name: file.name,
    size: file.size,
  });
}
