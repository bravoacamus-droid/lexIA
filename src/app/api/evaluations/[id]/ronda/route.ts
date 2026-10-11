/**
 * Segunda evaluación: recibe los documentos que llegaron después de la
 * primera acta y deja la evaluación lista para que el ejecutor los evalúe.
 *
 * Documento 13 de César (10/10/2026): el comité gestiona la subsanación
 * (o el rechazo, o la negociación) fuera de A-LexIA y luego «debe volver
 * a evaluar nuevamente añadiendo el documento de subsanación, o los
 * documentos de rechazo de oferta o los documentos de negociación […]
 * solo debe considerar los resultados de la primera acta y los nuevos
 * documentos añadidos».
 *
 * Los PDF ya están en Storage (los sube el navegador, como las ofertas).
 * Aquí se valida, se prepara el progreso de la ronda y la fila pasa a
 * «processing»; la pantalla de la evaluación pide las vueltas a
 * `/etapas`, que hace el trabajo (`ejecucion.ts`, modo ronda).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { prepararRonda } from '@/lib/evaluacion/ejecucion';
import type { ResultadoPostor } from '@/lib/evaluacion/etapas';

export const runtime = 'nodejs';

const esquema = z.object({
  documentos: z
    .array(
      z.object({
        postor: z.string().min(1),
        tipo: z.enum(['subsanacion', 'rechazo', 'negociacion']),
        nombre: z.string().min(1).max(300),
        path: z.string().min(1),
        partes: z.array(z.string().min(1)).max(20).optional(),
      }),
    )
    .max(30)
    .default([]),
  noSubsanaron: z.array(z.string().min(1)).max(20).default([]),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const cuerpo = esquema.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return NextResponse.json({ error: 'invalid_body', issues: cuerpo.error.issues }, { status: 400 });
  const { documentos, noSubsanaron } = cuerpo.data;
  if (documentos.length === 0 && noSubsanaron.length === 0) {
    return NextResponse.json({ error: 'sin_documentos', detail: 'Agrega al menos un documento o indica qué postor no subsanó.' }, { status: 400 });
  }

  const { data: fila } = await supabase
    .from('evaluations')
    .select('id, user_id, status, result')
    .eq('id', ctx.params.id)
    .maybeSingle();
  if (!fila) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ev = fila as { user_id: string; status: string; result: { version?: string; postores?: ResultadoPostor[]; rondas?: unknown[] } | null };
  if (ev.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (ev.status !== 'done' || ev.result?.version !== 'etapas-1' || !ev.result.postores) {
    return NextResponse.json(
      { error: 'sin_primera_evaluacion', detail: 'La segunda evaluación necesita una primera evaluación terminada.' },
      { status: 409 },
    );
  }

  // Los documentos son del usuario y los postores, de esta evaluación.
  const nombres = new Set(ev.result.postores.map((p) => p.postor));
  const ajenos = [...documentos.map((d) => d.postor), ...noSubsanaron].filter((n) => !nombres.has(n));
  if (ajenos.length > 0) {
    return NextResponse.json({ error: 'postor_desconocido', detail: `No están en la evaluación: ${ajenos.join(', ')}` }, { status: 400 });
  }
  const propio = (path: string) => path.startsWith(`${user.id}/`);
  if (!documentos.every((d) => propio(d.path) && (d.partes ?? []).every(propio))) {
    return NextResponse.json({ error: 'forbidden', detail: 'Documento fuera de tu carpeta.' }, { status: 403 });
  }

  const progreso = prepararRonda({ numero: (ev.result.rondas?.length ?? 0) + 1, documentos, noSubsanaron });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await admin
    .from('evaluations')
    .update({ status: 'processing', progreso, corriendo_hasta: null })
    .eq('id', ctx.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
