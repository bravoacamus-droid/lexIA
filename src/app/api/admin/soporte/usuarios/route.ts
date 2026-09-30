import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clienteDeServicio, esAdmin } from '@/lib/soporte/servidor';
import type { UsuarioDeSoporte } from '@/lib/soporte/tipos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/soporte/usuarios?q=texto — los usuarios de la
 * plataforma, para que el equipo vea quiénes son y les escriba primero.
 * Busca por nombre, correo u organización.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await esAdmin(supabase, user.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  const servicio = clienteDeServicio();

  const [perfiles, suscripciones, tickets, cuentas] = await Promise.all([
    servicio
      .from('profiles')
      .select('id, full_name, profile_role, organization_name, position_title, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    servicio.from('subscriptions').select('user_id, tier'),
    servicio.from('soporte_tickets').select('user_id'),
    servicio.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const correo = new Map((cuentas.data?.users || []).map((u) => [u.id, u.email ?? null]));
  const ultimoAcceso = new Map((cuentas.data?.users || []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  const plan = new Map((suscripciones.data || []).map((s) => [s.user_id as string, s.tier as string]));
  const conteo = new Map<string, number>();
  for (const t of tickets.data || []) conteo.set(t.user_id as string, (conteo.get(t.user_id as string) || 0) + 1);

  let usuarios = (perfiles.data || [])
    .filter((p) => p.id !== user.id)
    .map((p) => ({
      id: p.id as string,
      nombre: (p.full_name as string | null) ?? null,
      email: correo.get(p.id as string) ?? null,
      perfil: (p.profile_role as UsuarioDeSoporte['perfil']) ?? null,
      organizacion: (p.organization_name as string | null) ?? null,
      cargo: (p.position_title as string | null) ?? null,
      plan: plan.get(p.id as string) ?? null,
      registrado: (p.created_at as string | null) ?? null,
      tickets: conteo.get(p.id as string) || 0,
      ultimo_acceso: ultimoAcceso.get(p.id as string) ?? null,
    }));

  if (q) {
    usuarios = usuarios.filter((u) =>
      [u.nombre, u.email, u.organizacion].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }
  return NextResponse.json({ usuarios: usuarios.slice(0, 200), total: usuarios.length });
}
