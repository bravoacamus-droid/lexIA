import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { respuestaDeRechazo, usarHerramienta, type Herramienta } from '@/lib/billing/creditos';
import { BUCKET_DE_SUBIDAS } from '@/lib/archivos/borrar-subidas';

/**
 * Lo que pesa de verdad cada oferta: la suma de lo que hay en el
 * almacenamiento (sus partes, si el navegador la partió para subirla).
 * Partir un PDF con pdf-lib repite recursos compartidos (fuentes, por
 * ejemplo), así que la suma de las partes puede pasar un poco del
 * original: se le da un margen y manda el tamaño que declaró el
 * navegador, que es el del archivo original.
 */
const MARGEN_DE_PARTES = 1.15;
async function pesoDeLasOfertas(
  ofertas: Array<{ name: string; path: string; partes?: string[]; size?: number }>,
): Promise<Array<{ nombre: string; bytes: number }>> {
  const admin = createAdminClient();
  return Promise.all(
    ofertas.map(async (o) => {
      const rutas = o.partes?.length ? o.partes : [o.path];
      const tamanos = await Promise.all(
        rutas.map(async (r) => {
          const { data } = await admin.storage.from(BUCKET_DE_SUBIDAS).info(r).catch(() => ({ data: null }));
          return Number((data as { size?: number } | null)?.size ?? 0);
        }),
      );
      const enStorage = tamanos.reduce((t, x) => t + x, 0);
      const partida = rutas.length > 1;
      return { nombre: o.name, bytes: Math.max(o.size ?? 0, partida ? enStorage / MARGEN_DE_PARTES : enStorage) };
    }),
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    title: z.string().min(2).max(160),
    bases_file_path: z.string().min(1),
    /** Las Bases partidas por el navegador para poder subirlas (Storage: 50 MB). */
    bases_partes: z.array(z.string().min(1)).max(20).optional(),
    offer_files: z
      .array(
        z.object({
          name: z.string(),
          path: z.string(),
          partes: z.array(z.string().min(1)).max(20).optional(),
          /** Bytes del archivo original (antes de partirlo): el tope por oferta del plan es sobre él. */
          size: z.number().int().nonnegative().optional(),
        }),
      )
      .max(5)
      .optional()
      .default([]),
    mode: z
      .enum(['committee', 'self_review', 'tdr_audit', 'bases_audit'])
      .optional()
      .default('committee'),
    // Revisión de un requerimiento: si es de un contrato menor (≤ 8 UIT)
    // entra en el plan Consulta; si es de un procedimiento de selección,
    // desde Profesional. Sin el dato, se trata como de selección.
    regimen: z.enum(['menor_8uit', 'seleccion']).optional(),
  })
  .refine(
    (v) =>
      v.mode === 'tdr_audit' || v.mode === 'bases_audit' || (v.offer_files && v.offer_files.length >= 1),
    {
      message:
        'committee y self_review requieren al menos una oferta; tdr_audit y bases_audit no usan ofertas.',
      path: ['offer_files'],
    },
  );

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('evaluations')
    .select('id, title, status, offer_files, mode, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ evaluations: data || [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Créditos según la herramienta: ofertas (por oferta), bases o
  // requerimiento. Se cobra al crear la evaluación.
  const modo = parsed.data.mode;
  const herramienta: Herramienta =
    modo === 'bases_audit'
      ? 'evaluacion_bases'
      : modo === 'tdr_audit'
        ? parsed.data.regimen === 'menor_8uit'
          ? 'evaluacion_requerimiento_menor'
          : 'evaluacion_requerimiento_seleccion'
        : 'evaluacion_ofertas';
  // Cada archivo es una oferta (una oferta = un solo PDF): el conteo y el
  // cobro son por archivo.
  const unidades = herramienta === 'evaluacion_ofertas' ? parsed.data.offer_files?.length ?? 1 : 1;

  // Los archivos tienen que estar en la carpeta del usuario: el servidor
  // los lee (y al terminar los borra) con permisos de servicio.
  const propio = (r: string) => r.startsWith(`${user.id}/`);
  const rutas = [
    parsed.data.bases_file_path,
    ...(parsed.data.bases_partes ?? []),
    ...(parsed.data.offer_files ?? []).flatMap((o) => [o.path, ...(o.partes ?? [])]),
  ];
  if (!rutas.every(propio)) {
    return NextResponse.json({ error: 'forbidden', detail: 'Documento fuera de tu carpeta.' }, { status: 403 });
  }

  const guard = await usarHerramienta(user.id, herramienta, {
    unidades,
    soloComprobar: true,
    // El tope de tamaño por oferta del plan (Profesional 60 MB,
    // Especialista 120 MB: César, 18/10/2026).
    ...(herramienta === 'evaluacion_ofertas' ? { bytesPorOferta: await pesoDeLasOfertas(parsed.data.offer_files ?? []) } : {}),
  });
  if (!guard.ok) return respuestaDeRechazo(guard);

  const { data, error } = await supabase
    .from('evaluations')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      status: 'pending',
      bases_file_path: parsed.data.bases_file_path,
      offer_files: parsed.data.offer_files as never,
      bases_partes: parsed.data.bases_partes?.length ? parsed.data.bases_partes : null,
      mode: parsed.data.mode,
    } as never)
    .select('id, title, status, created_at, mode')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await usarHerramienta(user.id, herramienta, { unidades, detalle: parsed.data.title.slice(0, 120) });
  return NextResponse.json({ evaluation: data });
}
