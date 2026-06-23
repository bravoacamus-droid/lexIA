import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractPdfText,
  PdfHasNoTextError,
  PDF_OCR_INSTRUCTIONS,
} from '@/lib/ai/pdf';

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
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'file_too_large', detail: 'Máximo 100 MB.' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text: raw, pages } = await extractPdfText(buffer);
    const text = raw
      .replace(/ /g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({
      text,
      pages,
      filename: file.name,
      size: file.size,
    });
  } catch (e) {
    if (e instanceof PdfHasNoTextError) {
      console.warn(
        `[extract-pdf] PDF sin OCR: ${e.charsExtracted} chars en ${e.pages} pág.`,
      );
      return NextResponse.json(
        {
          error: 'pdf_needs_ocr',
          detail: PDF_OCR_INSTRUCTIONS,
        },
        { status: 422 },
      );
    }
    const msg = (e as Error).message || 'unknown';
    console.error('[extract-pdf] error:', msg);
    return NextResponse.json(
      { error: 'extract_failed', detail: msg },
      { status: 500 },
    );
  }
}
