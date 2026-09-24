/**
 * Lo común a las rutas del expediente: la sesión, el perfil permitido y
 * el estado que se devuelve al navegador.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PERFILES_POR_ROL, type Perfil, type RolDeUsuario } from './catalogo';
import { reconstruirFicha } from './ficha';
import { cargarExpediente, sinTexto } from './servicio';
import type { EstadoDelExpediente } from './estado';

export async function sesion() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) } as const;
  const { data: perfil } = await supabase.from('profiles').select('profile_role, full_name').eq('id', user.id).maybeSingle();
  const p = perfil as { profile_role: string | null; full_name: string | null } | null;
  const rol = (p?.profile_role ?? 'consultant') as RolDeUsuario;
  return {
    supabase,
    user,
    rol,
    nombre: p?.full_name?.trim() || user.email || 'Usuario',
    permitidos: PERFILES_POR_ROL[rol] ?? PERFILES_POR_ROL.consultant,
  } as const;
}

export function perfilPermitido(permitidos: Perfil[], perfil: string): perfil is Perfil {
  return (permitidos as string[]).includes(perfil);
}

/** Todo el expediente, listo para pintar. */
export async function estadoDelExpediente(supabase: ReturnType<typeof createClient>, id: string): Promise<EstadoDelExpediente | null> {
  const c = await cargarExpediente(supabase, id);
  if (!c) return null;
  const { ficha, contradicciones } = reconstruirFicha(c.documentos, c.expediente.ficha ?? {});
  return {
    expediente: c.expediente,
    ficha,
    contradicciones,
    documentos: c.documentos.map(sinTexto),
    actuaciones: c.actuaciones,
  };
}

export function fallo(e: unknown, status = 500) {
  const msg = (e as Error)?.message ?? 'Error';
  console.error('[expedientes]', msg);
  return NextResponse.json({ error: 'fallo', detail: msg }, { status });
}
