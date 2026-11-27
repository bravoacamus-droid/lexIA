import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { extractPdfText } from '@/lib/ai/pdf';
import { textoDelWord } from '@/lib/evaluacion/mejora/control-de-cambios';
import { origenDe } from '@/lib/evaluacion/mejora/fuente';
import { leerDenominacion } from '@/lib/evaluacion/denominacion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * La denominación del documento recién subido, para llenar el título de
 * la evaluación (reunión con César, 27/11/2026). No cobra: es una lectura
 * del inicio del archivo con el modelo rápido, y solo si el rótulo
 * «Denominación de la contratación» no está.
 */
const Cuerpo = z.object({ path: z.string().min(3).max(500) });

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  // Solo archivos de su carpeta: se descargan con service role.
  if (!p.data.path.startsWith(`${user.id}/`) || p.data.path.includes('..')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data, error } = await createAdminClient().storage.from('uploads').download(p.data.path);
  if (error || !data) return NextResponse.json({ denominacion: null });
  try {
    const buffer = await data.arrayBuffer();
    const texto =
      origenDe(p.data.path) === 'docx'
        ? await textoDelWord(Buffer.from(buffer))
        : (await extractPdfText(buffer, { detectScanned: false })).text;
    const r = await leerDenominacion(texto);
    return NextResponse.json(r);
  } catch {
    // Un escaneo o un archivo raro: el usuario escribe el título.
    return NextResponse.json({ denominacion: null });
  }
}
