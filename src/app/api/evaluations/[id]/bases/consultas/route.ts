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
import { createAdminClient } from '@/lib/supabase/server';
import { cargarEvaluacionDeBases } from '@/lib/evaluacion/bases/cargar';
import { cacheEnEvaluacion, leerBases } from '@/lib/evaluacion/bases/leer';
import { ubicarHallazgosGuardados } from '@/lib/evaluacion/bases/evaluar';
import { NOMBRE_DE_FUENTE } from '@/lib/evaluacion/bases/biblioteca';
import type { HallazgoBases } from '@/lib/evaluacion/bases/tipos';
import type { Tramo } from '@/lib/consultas/tipos';

export const runtime = 'nodejs';
export const maxDuration = 120;

const Pedido = z.object({ hallazgos: z.array(z.string().min(1).max(120)).min(1).max(60) });

function cuerpoDe(h: HallazgoBases): Tramo[] {
  const referencia: Tramo = {
    rotulo: 'Referencia',
    parrafos: [
      `Sección ${h.seccion} de las bases, ${h.capitulo.replace(/^CAPÍTULO/, 'Capítulo')}` +
        `${h.numeral ? `, numeral ${h.numeral}` : ''}` +
        `${h.literal ? `, literal ${h.literal}` : ''}` +
        `${h.pagina ? `, página ${h.pagina}` : ''}.`,
    ],
  };
  if (h.paraElProveedor.tipo === 'consulta') {
    return [referencia, { rotulo: 'Consulta', parrafos: [h.paraElProveedor.solicitud] }];
  }
  return [
    referencia,
    {
      rotulo: '1. Sustento Fáctico',
      parrafos: [h.enLasBases ? `Las bases establecen: «${h.enLasBases.replace(/\.$/, '')}».` : '', h.analisis].filter(Boolean),
    },
    {
      rotulo: '2. Sustento Jurídico',
      parrafos: [
        h.enElEstandar ? `Las bases estándar disponen: «${h.enElEstandar.slice(0, 700)}».` : '',
        h.norma ? `Se vulnera: ${h.norma}.` : '',
      ].filter(Boolean),
      // Lo que trae la biblioteca, cada fuente con su criterio y en el
      // orden de César (Ley, Reglamento, bases estándar, Tribunal, Sala
      // Plena, OECE): es lo que el comité tiene que rebatir.
      ...((h.fuentes ?? []).length
        ? {
            vinetas: (h.fuentes ?? []).map((f) => ({
              titulo: f.tipo === 'ley' || f.tipo === 'reglamento' ? f.numero : `${f.numero} (${NOMBRE_DE_FUENTE[f.tipo]})`,
              texto: f.criterio,
            })),
          }
        : {}),
    },
    { rotulo: '3. Solicitud', parrafos: [h.paraElProveedor.solicitud] },
  ];
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const c = await cargarEvaluacionDeBases(ctx.params.id);
  if ('error' in c) return c.error;
  const pedido = Pedido.safeParse(await req.json().catch(() => null));
  if (!pedido.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  let hallazgos = c.ev.result.hallazgos;
  // Una evaluación de antes del 16/10/2026 no trae literal ni página. Se
  // ubican ahora, sin modelo, con lo que ya se había leído de las bases.
  if (!c.ev.result.paginacion && hallazgos.some((h) => pedido.data.hallazgos.includes(h.id) && !h.pagina)) {
    try {
      const admin = createAdminClient();
      const leidas = await leerBases(admin, c.ev.bases_file_path, {
        cache: cacheEnEvaluacion(admin, c.ev.id),
        transcribir: false,
      });
      hallazgos = await ubicarHallazgosGuardados(c.ev.result, leidas);
      await c.supabase
        .from('evaluations')
        .update({ result: { ...c.ev.result, hallazgos } as never } as never)
        .eq('id', c.ev.id);
    } catch (e) {
      console.error('[bases/consultas] no se pudieron ubicar los hallazgos:', (e as Error).message);
    }
  }

  const elegidos = hallazgos.filter((h) => pedido.data.hallazgos.includes(h.id));
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
    literal: h.literal ?? '',
    pagina: h.pagina ?? '',
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
