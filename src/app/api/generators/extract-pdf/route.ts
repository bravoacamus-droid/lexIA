import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Extrae texto plano de un PDF subido como FormData. Lo usan los wizards
 * de Consultas, Pliego y Apelaciones para procesar las Bases o el acto
 * impugnado que el usuario sube como contexto.
 *
 * El PDF no se persiste — se procesa en memoria. El texto extraído
 * vive solo en el cliente hasta que se llama al generador de selección.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'no_form' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }
  if (file.size > 30 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'file_too_large', detail: 'Máximo 30 MB.' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    const pdf = await getDocumentProxy(data);
    const result = await extractText(pdf, { mergePages: true });
    const text = String(result.text)
      .replace(/ /g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (text.length < 200) {
      return NextResponse.json(
        {
          error: 'too_little_text',
          detail:
            'El PDF tiene muy poco texto extraíble. ¿Es un escaneo sin OCR?',
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      text,
      pages: pdf.numPages,
      filename: file.name,
      size: file.size,
    });
  } catch (e) {
    const msg = (e as Error).message || 'unknown';
    console.error('[extract-pdf] error:', msg);
    return NextResponse.json(
      { error: 'extract_failed', detail: msg },
      { status: 500 },
    );
  }
}
