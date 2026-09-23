/**
 * De lo que cuenta el área usuaria, a los interruptores del formato.
 *
 * Devuelve una PROPUESTA, no la aplica. El usuario ve qué encendería
 * A-LexIA y por qué, y decide: aplicar un cambio de treinta y cuatro
 * interruptores sin enseñarlo antes sería peor que el formulario que
 * viene a sustituir.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { obtenerPlantilla } from '@/lib/generadores/plantillas';
import { interpretarNecesidad } from '@/lib/generadores/entrevista';

export const runtime = 'nodejs';
export const maxDuration = 120;

const cuerpo = z.object({ relato: z.string().min(20).max(8000) });

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = cuerpo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'relato_invalido', detail: 'Cuenta en unas líneas qué necesita la Entidad.' },
      { status: 400 },
    );
  }

  const { data } = await supabase
    .from('requerimientos_plantilla')
    .select('user_id, plantilla_id')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const fila = data as { user_id: string; plantilla_id: string };
  if (fila.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const plantilla = obtenerPlantilla(fila.plantilla_id);
  if (!plantilla) {
    return NextResponse.json({ error: 'plantilla_desconocida', detail: fila.plantilla_id }, { status: 409 });
  }

  try {
    const r = await interpretarNecesidad(plantilla, parsed.data.relato);
    const decididos = r.decisiones.filter((d) => d.estado !== 'no_se_sabe').length;
    console.log('[entrevista] propuesta', {
      plantilla: plantilla.id,
      interruptores: r.decisiones.length,
      decididos,
      preguntas: r.preguntas.length,
    });
    return NextResponse.json(r);
  } catch (e) {
    console.error('[entrevista] falló', (e as Error).message);
    return NextResponse.json(
      { error: 'entrevista_fallida', detail: (e as Error).message.slice(0, 200) },
      { status: 502 },
    );
  }
}
