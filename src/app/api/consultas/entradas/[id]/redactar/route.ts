import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ensureCanUse, recordUsage } from '@/lib/billing/feature-gate';
import { redactarAbsolucion, redactarFormulacion } from '@/lib/consultas/redactor';
import type { Formulacion, Tramo } from '@/lib/consultas/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const Peticion = z.object({
  /** `formulacion` redacta el escrito del participante; `absolucion`, la respuesta. */
  que: z.enum(['formulacion', 'absolucion']),
  /** Lo que cuenta la persona con sus palabras. */
  relato: z.string().max(8000).default(''),
  /** El extremo de las bases sobre el que recae, pegado a mano. */
  textoDeBases: z.string().max(20000).optional(),
  /** Para la absolución: la postura ya tomada, si la hay. */
  decision: z.enum(['acoge', 'acoge_parcialmente', 'no_acoge', 'aclara']).optional(),
});

interface FilaEntrada {
  id: string;
  pliego_id: string;
  numero: number;
  tipo: 'consulta' | 'observacion';
  participante: string;
  tema: string;
  seccion: 'General' | 'Específica';
  numeral: string;
  literal: string;
  pagina: string;
  cuerpo: Tramo[] | null;
  norma_vulnerada: string;
}

/**
 * Redacta el escrito de una fila con la estructura del modelo.
 *
 * Lo que devuelve el modelo NO se guarda tal cual en un campo de texto:
 * llega ya separado en tramos y así se guarda, que es lo que permite que
 * el Word salga con la forma del documento de César.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const leido = Peticion.safeParse(await req.json().catch(() => null));
  if (!leido.success) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: leido.error.flatten() },
      { status: 400 },
    );
  }
  const p = leido.data;

  const puerta = await ensureCanUse(user.id, 'generator_call');
  if (!puerta.ok) return NextResponse.json(puerta.body, { status: puerta.status });

  const { data } = await supabase
    .from('entradas_consulta')
    .select(
      'id, pliego_id, numero, tipo, participante, tema, seccion, numeral, literal, pagina, cuerpo, norma_vulnerada, pliegos_consultas!inner(procedimiento, user_id)',
    )
    .eq('id', params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const fila = data as unknown as FilaEntrada & {
    pliegos_consultas:
      | { procedimiento: string; user_id: string }
      | Array<{ procedimiento: string; user_id: string }>;
  };
  const pliego = Array.isArray(fila.pliegos_consultas)
    ? fila.pliegos_consultas[0]
    : fila.pliegos_consultas;
  if (!pliego || pliego.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ubicacion = {
    seccion: fila.seccion,
    numeral: fila.numeral,
    literal: fila.literal,
    pagina: fila.pagina,
  };

  try {
    if (p.que === 'formulacion') {
      const salida = await redactarFormulacion({
        tipo: fila.tipo,
        ubicacion,
        relato: p.relato,
        textoDeBases: p.textoDeBases,
        procedimiento: pliego.procedimiento,
      });
      await supabase
        .from('entradas_consulta')
        .update({
          cuerpo: salida.cuerpo,
          norma_vulnerada: salida.normaVulnerada,
          avisos_formulacion: salida.avisos,
        } as never)
        .eq('id', fila.id);
      await recordUsage(user.id, 'generator_call');
      return NextResponse.json(salida);
    }

    const formulacion: Formulacion = {
      id: fila.id,
      numero: fila.numero,
      tipo: fila.tipo,
      participante: fila.participante ?? '',
      tema: fila.tema ?? '',
      ubicacion,
      cuerpo: Array.isArray(fila.cuerpo) ? fila.cuerpo : [],
      normaVulnerada: fila.norma_vulnerada ?? '',
      // El auditor ya revisó lo que presentó el participante al
      // redactarlo; aquí solo se le pasa al modelo para responderlo.
      avisos: [],
    };
    if (formulacion.cuerpo.length === 0) {
      return NextResponse.json(
        { error: 'sin_formulacion', detail: 'Primero hay que escribir la consulta u observación.' },
        { status: 400 },
      );
    }

    const salida = await redactarAbsolucion({
      formulacion,
      decision: p.decision,
      postura: p.relato || undefined,
      textoDeBases: p.textoDeBases,
      procedimiento: pliego.procedimiento,
    });
    await supabase
      .from('entradas_consulta')
      .update({
        decision: salida.decision,
        fundamentos: salida.fundamentos,
        conclusion: salida.conclusion,
        precision_en_bases: salida.precisionEnBases,
        avisos_absolucion: salida.avisos,
      } as never)
      .eq('id', fila.id);
    await recordUsage(user.id, 'generator_call');
    return NextResponse.json(salida);
  } catch (e) {
    return NextResponse.json(
      { error: 'fallo_redaccion', detail: (e as Error).message.slice(0, 300) },
      { status: 500 },
    );
  }
}
