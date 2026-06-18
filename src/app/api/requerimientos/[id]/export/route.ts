import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRequirementDocx } from '@/lib/requerimientos/word-export';
import {
  OBJETO_LABELS,
  OBJETO_ANEXO_TITULOS,
  type ObjectoContractual,
} from '@/lib/requerimientos/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/requerimientos/[id]/export?format=docx
 *
 * Genera y devuelve el documento Word real (.docx) del requerimiento.
 * Editable en MS Word / LibreOffice / Google Docs.
 */
export async function GET(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'docx';

  const { data, error } = await supabase
    .from('entity_requirements')
    .select('*')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const row = data as {
    id: string;
    user_id: string;
    anio: number;
    objeto: ObjectoContractual;
    area_usuaria: string | null;
    denominacion: string;
    organo_unidad_organica: string | null;
    actividad_poi: string | null;
    clauses: Array<{
      label: string;
      content: string;
      order: number;
      included: boolean;
    }>;
  };

  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (format !== 'docx') {
    return NextResponse.json(
      {
        error: 'unsupported_format',
        message: 'Solo se soporta format=docx por ahora.',
      },
      { status: 400 },
    );
  }

  const buf = await generateRequirementDocx({
    anexoTitulo: OBJETO_ANEXO_TITULOS[row.objeto],
    objeto: OBJETO_LABELS[row.objeto],
    anio: row.anio,
    organoUnidad: row.organo_unidad_organica || '',
    actividadPoi: row.actividad_poi || '',
    denominacion: row.denominacion,
    areaUsuaria: row.area_usuaria,
    clauses: row.clauses || [],
  });

  const safeName = row.denominacion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

  const filename = `requerimiento-${row.objeto}-${row.anio}-${safeName}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buf.length),
    },
  });
}
