import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { siguienteNumero } from '@/lib/consultas/repositorio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Cambio = z.object({
  procedimiento: z.string().max(400).optional(),
  numeroProcedimiento: z.string().max(120).optional(),
  objeto: z.string().max(4000).optional(),
  participante: z.string().max(300).optional(),
  status: z.enum(['draft', 'listo', 'presentado']).optional(),
});

/** PATCH — el encabezado del documento y su estado. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const leido = Cambio.safeParse(await req.json().catch(() => null));
  if (!leido.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const d = leido.data;
  const fila: Record<string, unknown> = {};
  if (d.procedimiento !== undefined) fila.procedimiento = d.procedimiento;
  if (d.numeroProcedimiento !== undefined) fila.numero_procedimiento = d.numeroProcedimiento;
  if (d.objeto !== undefined) fila.objeto = d.objeto;
  if (d.participante !== undefined) fila.participante = d.participante;
  if (d.status !== undefined) fila.status = d.status;
  if (Object.keys(fila).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from('pliegos_consultas')
    .update(fila as never)
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE — se lleva por delante sus entradas, por la clave foránea. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('pliegos_consultas')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const NuevaEntrada = z.object({
  tipo: z.enum(['consulta', 'observacion']).default('consulta'),
  seccion: z.enum(['General', 'Específica']).default('Específica'),
  numeral: z.string().max(60).default(''),
  literal: z.string().max(40).default(''),
  pagina: z.string().max(20).default(''),
});

/**
 * POST — añade una fila a la tabla del documento.
 *
 * El número se calcula aquí y no en el cliente: es el que empareja la
 * formulación con su absolución, y dos pestañas abiertas a la vez
 * podrían proponer el mismo.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: pliego } = await supabase
    .from('pliegos_consultas')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!pliego) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const leido = NuevaEntrada.safeParse((await req.json().catch(() => null)) ?? {});
  if (!leido.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  const d = leido.data;

  const { data, error } = await supabase
    .from('entradas_consulta')
    .insert({
      pliego_id: params.id,
      numero: await siguienteNumero(params.id),
      tipo: d.tipo,
      seccion: d.seccion,
      numeral: d.numeral,
      literal: d.literal,
      pagina: d.pagina,
    } as never)
    .select('id, numero')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'insert_failed', detail: error?.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
