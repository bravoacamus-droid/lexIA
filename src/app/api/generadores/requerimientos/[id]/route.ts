import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import {
  ensamblarRequerimiento,
  MontoSchema,
  normalizarRespuestas,
  type RespuestasRequerimiento,
} from '@/lib/generadores/ensamblador';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Quita los caracteres de control que llegan al pegar desde Word.
 *
 * PostgreSQL NO admite \u0000 en jsonb: rechaza la fila entera con
 * "unsupported Unicode escape sequence". El resto de controles no
 * rompen la base pero ensucian el Word exportado. Es la misma clase de
 * fallo que ya obligó a limpiar el texto de los PDF en la ingesta.
 *
 * Se conservan el salto de línea y el tabulador, que sí son
 * significativos en los apartados redactados.
 */
function limpiarTexto(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** Aplica la limpieza a todo lo que escribe el usuario. */
function limpiarRespuestas(
  r: NonNullable<z.infer<typeof ActualizarSchema>['respuestas']>,
) {
  const mapa = (o?: Record<string, string>) =>
    o && Object.fromEntries(Object.entries(o).map(([k, v]) => [k, limpiarTexto(v)]));
  return {
    campos: mapa(r.campos),
    redacciones: mapa(r.redacciones),
    opciones: r.opciones,
    tablas:
      r.tablas &&
      Object.fromEntries(
        Object.entries(r.tablas).map(([k, filas]) => [
          k,
          filas.map((f) => f.map(limpiarTexto)),
        ]),
      ),
    condiciones: r.condiciones,
    extras:
      r.extras &&
      r.extras.map((e) => ({
        id: e.id,
        titulo: limpiarTexto(e.titulo),
        texto: limpiarTexto(e.texto),
      })),
    orden: r.orden,
  };
}

/** Lo que se guarda; todo opcional para permitir guardado incremental. */
const ActualizarSchema = z.object({
  denominacion: z.string().min(2).max(500).optional(),
  cuantia: MontoSchema.optional(),
  status: z.enum(['draft', 'review', 'final', 'archived']).optional(),
  respuestas: z
    .object({
      campos: z.record(z.string()).optional(),
      redacciones: z.record(z.string()).optional(),
      opciones: z.record(z.string()).optional(),
      tablas: z.record(z.array(z.array(z.string()))).optional(),
      condiciones: z.record(z.boolean()).optional(),
      /**
       * Apartados propios de la entidad. El tope no es por avaricia:
       * cada uno se numera en el documento y se manda entero al revisor,
       * así que una lista sin límite convierte el requerimiento en otra
       * cosa.
       */
      extras: z
        .array(
          z.object({
            id: z.string().min(1).max(40),
            titulo: z.string().max(300),
            texto: z.string().max(20000),
          }),
        )
        .max(30)
        .optional(),
      /** Orden de los apartados de primer nivel, por id. */
      orden: z.array(z.string().min(1).max(80)).max(200).optional(),
    })
    .optional(),
});

interface Fila {
  id: string;
  user_id: string;
  plantilla_id: string;
  denominacion: string;
  cuantia: number | null;
  status: string;
  respuestas: Partial<RespuestasRequerimiento>;
  created_at: string;
  updated_at: string;
}

async function cargar(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };

  const { data, error } = await supabase
    .from('requerimientos_plantilla')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!data) return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };

  const fila = data as Fila;
  // RLS ya lo impediría, pero un 403 explícito evita depender de una sola
  // capa para algo que no debe fallar nunca.
  if (fila.user_id !== user.id) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { supabase, user, fila };
}

/**
 * GET /api/generadores/requerimientos/[id]
 *
 * Devuelve la plantilla, las respuestas y el estado del documento: qué
 * falta, qué secciones quedaron fuera y qué topes se incumplen. La
 * interfaz no recalcula nada de eso por su cuenta, para que el aviso que
 * ve el usuario y el que se aplica al exportar sean el mismo.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const r = await cargar(ctx.params.id);
  if ('error' in r) return r.error;

  const plantilla = obtenerPlantilla(r.fila.plantilla_id);
  if (!plantilla) {
    return NextResponse.json(
      { error: 'plantilla_desconocida', detail: r.fila.plantilla_id },
      { status: 500 },
    );
  }

  const respuestas = normalizarRespuestas(r.fila.respuestas, r.fila.denominacion);
  const doc = ensamblarRequerimiento(plantilla, respuestas, {
    cuantia: r.fila.cuantia ?? undefined,
  });

  return NextResponse.json({
    requerimiento: {
      id: r.fila.id,
      plantilla_id: r.fila.plantilla_id,
      denominacion: r.fila.denominacion,
      cuantia: r.fila.cuantia,
      status: r.fila.status,
      respuestas,
      created_at: r.fila.created_at,
      updated_at: r.fila.updated_at,
    },
    plantilla,
    estado: {
      faltantes: doc.faltantes,
      avisos: doc.avisos,
      omitidas: doc.omitidas,
    },
    vista_previa: doc.markdown,
  });
}

/** PATCH — guardado incremental de las respuestas. */
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const r = await cargar(ctx.params.id);
  if ('error' in r) return r.error;

  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = ActualizarSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Una cuantía ilegible no tumba el guardado, pero hay que decirlo: si
  // no, el usuario ve "Guardado" y la cifra no está.
  const avisos: string[] = [];
  const cuantiaCruda = cuerpo?.cuantia;
  if (
    typeof cuantiaCruda === 'string' &&
    cuantiaCruda.trim() !== '' &&
    parsed.data.cuantia === undefined
  ) {
    avisos.push(
      'No se entendió la cuantía. Escríbela solo con cifras, por ejemplo 100,000.00.',
    );
  }

  const cambios: Record<string, unknown> = {};
  if (parsed.data.denominacion !== undefined) cambios.denominacion = parsed.data.denominacion;
  if (parsed.data.cuantia !== undefined) cambios.cuantia = parsed.data.cuantia;
  if (parsed.data.status !== undefined) cambios.status = parsed.data.status;

  if (parsed.data.respuestas) {
    // Fusión por grupo, no reemplazo: la interfaz manda solo lo que el
    // usuario tocó, y dos pestañas abiertas no deben borrarse el trabajo
    // la una a la otra.
    const previas = normalizarRespuestas(r.fila.respuestas, r.fila.denominacion);
    const nuevas = limpiarRespuestas(parsed.data.respuestas);
    cambios.respuestas = {
      campos: { ...previas.campos, ...(nuevas.campos ?? {}) },
      redacciones: { ...previas.redacciones, ...(nuevas.redacciones ?? {}) },
      opciones: { ...previas.opciones, ...(nuevas.opciones ?? {}) },
      tablas: { ...previas.tablas, ...(nuevas.tablas ?? {}) },
      condiciones: { ...previas.condiciones, ...(nuevas.condiciones ?? {}) },
      // Estos dos son listas, no diccionarios: se reemplazan enteros o
      // se dejan como estaban. Fusionarlos por índice mezclaría el orden
      // de dos pestañas abiertas y saldría un documento que no quiso
      // nadie.
      extras: nuevas.extras ?? previas.extras,
      orden: nuevas.orden ?? previas.orden,
    };
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ ok: true, sin_cambios: true, avisos });
  }

  const { error } = await r.supabase
    .from('requerimientos_plantilla')
    .update(cambios)
    .eq('id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, avisos });
}

/** DELETE — borrado del requerimiento. */
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const r = await cargar(ctx.params.id);
  if ('error' in r) return r.error;

  const { error } = await r.supabase
    .from('requerimientos_plantilla')
    .delete()
    .eq('id', ctx.params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
