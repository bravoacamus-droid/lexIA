/**
 * POST /api/evaluations/[id]/bases/consultas  { hallazgos: string[] }
 *
 * Lleva los hallazgos elegidos a un pliego de consultas y observaciones
 * nuevo, ya con su escrito en borrador: es lo que César dice que el
 * proveedor hace con esta evaluación, «identificar aspectos
 * susceptibles de consulta u observación antes de su presentación».
 *
 * El escrito sigue los tramos del formato oficial —Referencia; Sustento
 * Fáctico, Sustento Jurídico y Solicitud en la observación—, y se puede
 * seguir redactando en el editor del pliego.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cargarEvaluacionDeBases } from '@/lib/evaluacion/bases/cargar';
import type { HallazgoBases } from '@/lib/evaluacion/bases/tipos';
import type { Tramo } from '@/lib/consultas/tipos';

export const runtime = 'nodejs';

const Pedido = z.object({ hallazgos: z.array(z.string().min(1).max(120)).min(1).max(60) });

function cuerpoDe(h: HallazgoBases): Tramo[] {
  const referencia: Tramo = {
    rotulo: 'Referencia',
    parrafos: [
      `Sección ${h.seccion} de las bases, ${h.capitulo.replace(/^CAPÍTULO/, 'Capítulo')}${h.numeral ? `, numeral ${h.numeral}` : ''}.`,
    ],
  };
  if (h.paraElProveedor.tipo === 'consulta') {
    return [referencia, { rotulo: 'Consulta', parrafos: [h.paraElProveedor.solicitud] }];
  }
  return [
    referencia,
    {
      rotulo: '1. Sustento Fáctico',
      parrafos: [h.enLasBases ? `Las bases establecen: «${h.enLasBases}».` : '', h.analisis].filter(Boolean),
    },
    {
      rotulo: '2. Sustento Jurídico',
      parrafos: [
        h.enElEstandar ? `Las bases estándar disponen: «${h.enElEstandar.slice(0, 700)}».` : '',
        h.norma ? `Se vulnera: ${h.norma}.` : '',
      ].filter(Boolean),
    },
    { rotulo: '3. Solicitud', parrafos: [h.paraElProveedor.solicitud] },
  ];
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeBases(ctx.params.id);
  if ('error' in c) return c.error;
  const pedido = Pedido.safeParse(await req.json().catch(() => null));
  if (!pedido.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const elegidos = c.ev.result.hallazgos.filter((h) => pedido.data.hallazgos.includes(h.id));
  if (elegidos.length === 0) return NextResponse.json({ error: 'sin_hallazgos' }, { status: 400 });

  const { data: pliego, error } = await c.supabase
    .from('pliegos_consultas')
    .insert({
      user_id: c.ev.user_id,
      cara: 'formulacion',
      procedimiento: c.ev.result.estandar.titulo,
      objeto: c.ev.title,
    } as never)
    .select('id')
    .single();
  if (error || !pliego) {
    return NextResponse.json({ error: 'no_creado', detail: error?.message }, { status: 500 });
  }
  const pliegoId = (pliego as { id: string }).id;

  const filas = elegidos.map((h, i) => ({
    pliego_id: pliegoId,
    numero: i + 1,
    tipo: h.paraElProveedor.tipo,
    seccion: h.seccion,
    numeral: h.numeral,
    cuerpo: cuerpoDe(h),
    norma_vulnerada: h.paraElProveedor.tipo === 'observacion' ? h.norma : '',
  }));
  const { error: e2 } = await c.supabase.from('entradas_consulta').insert(filas as never);
  if (e2) {
    // Un pliego vacío no le sirve a nadie: se deshace.
    await c.supabase.from('pliegos_consultas').delete().eq('id', pliegoId);
    return NextResponse.json({ error: 'no_creado', detail: e2.message }, { status: 500 });
  }
  return NextResponse.json({ pliegoId, entradas: filas.length });
}
