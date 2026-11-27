import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { esRol, rolTiene, type Permiso, type Rol } from './permisos';

/**
 * Comprobaciones de rol del lado del servidor (ver `permisos.ts`).
 *
 * El rol se lee de `permisos_de_usuario` (0092). Sirve el cliente del
 * usuario (la RLS le deja ver su propia fila) o el de servicio.
 */

export async function rolDe(db: SupabaseClient, userId: string): Promise<Rol> {
  const { data } = await db.from('permisos_de_usuario').select('rol').eq('user_id', userId).maybeSingle();
  const rol = (data as { rol?: string } | null)?.rol;
  if (esRol(rol)) return rol;
  // Sin fila: antes de la 0092 el único nivel era is_admin. La migración
  // pasa a esas cuentas a superadmin; esto cubre el rato entre el deploy y
  // la migración si se aplicaran en ese orden.
  const { data: perfil } = await db.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
  return (perfil as { is_admin?: boolean } | null)?.is_admin === true ? 'superadmin' : 'usuario';
}

export async function tienePermiso(db: SupabaseClient, userId: string, permiso: Permiso): Promise<boolean> {
  return rolTiene(await rolDe(db, userId), permiso);
}

/**
 * Para rutas API: el usuario de la sesión si tiene el permiso, o null.
 * Uso: `const yo = await usuarioConPermiso('usuarios'); if (!yo) return 403`.
 */
export async function usuarioConPermiso(
  permiso: Permiso,
): Promise<{ id: string; email: string | null; rol: Rol } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const rol = await rolDe(supabase, user.id);
  if (!rolTiene(rol, permiso)) return null;
  return { id: user.id, email: user.email ?? null, rol };
}
