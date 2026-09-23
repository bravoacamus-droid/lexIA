import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Un tramo del escrito, tal como se guarda. */
const Tramo = z.object({
  rotulo: z.string().max(120).nullable(),
  parrafos: z.array(z.string().max(12000)).max(40),
  vinetas: z
    .array(z.object({ titulo: z.string().max(200).optional(), texto: z.string().max(6000) }))
    .max(30)
    .optional(),
});

const Cambio = z.object({
  tipo: z.enum(['consulta', 'observacion']).optional(),
  seccion: z.enum(['General', 'Específica']).optional(),
  numeral: z.string().max(60).optional(),
  literal: z.string().max(40).optional(),
  pagina: z.string().max(20).optional(),
  cuerpo: z.array(Tramo).max(20).optional(),
  normaVulnerada: z.string().max(2000).optional(),
  decision: z.enum(['acoge', 'acoge_parcialmente', 'no_acoge', 'aclara']).nullable().optional(),
  fundamentos: z.array(Tramo).max(20).optional(),
  conclusion: z.string().max(4000).optional(),
  precisionEnBases: z.string().max(8000).optional(),
});

/**
 * PATCH — guarda una fila.
 *
 * La pertenencia no se comprueba aquí: la política de la tabla solo deja
 * tocar las entradas de un pliego propio, así que un identificador ajeno
 * no actualiza nada. Se responde igual para no revelar si existe.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const leido = Cambio.safeParse(await req.json().catch(() => null));
  if (!leido.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: leido.error.flatten() },
      { status: 400 },
    );
  }
  const d = leido.data;

  const fila: Record<string, unknown> = {};
  if (d.tipo !== undefined) fila.tipo = d.tipo;
  if (d.seccion !== undefined) fila.seccion = d.seccion;
  if (d.numeral !== undefined) fila.numeral = d.numeral;
  if (d.literal !== undefined) fila.literal = d.literal;
  if (d.pagina !== undefined) fila.pagina = d.pagina;
  if (d.cuerpo !== undefined) fila.cuerpo = d.cuerpo;
  if (d.normaVulnerada !== undefined) fila.norma_vulnerada = d.normaVulnerada;
  if (d.decision !== undefined) fila.decision = d.decision;
  if (d.fundamentos !== undefined) fila.fundamentos = d.fundamentos;
  if (d.conclusion !== undefined) fila.conclusion = d.conclusion;
  if (d.precisionEnBases !== undefined) fila.precision_en_bases = d.precisionEnBases;
  if (Object.keys(fila).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from('entradas_consulta')
    .update(fila as never)
    .eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { error } = await supabase.from('entradas_consulta').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
