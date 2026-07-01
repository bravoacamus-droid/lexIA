import { createClient } from '@/lib/supabase/server';
import { SmartSearchView } from '@/components/app/search/smart-search-view';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Buscador inteligente' };

/**
 * Módulo dedicado al buscador multi-tag inteligente. Antes esta
 * funcionalidad estaba enterrada dentro de /biblioteca. El usuario
 * la solicitó como módulo propio del menú lateral el 30/06/2026 para
 * que sea protagonista y no un feature oculto.
 *
 * Diferencia con /biblioteca:
 * - Biblioteca es para BROWSE (navegar todo el corpus con filtros)
 * - Buscador es para SEARCH (encontrar por concepto usando multi-tag)
 */
export default async function BuscadorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile as { profile_role: ProfileRole | null } | null)?.profile_role || null;

  return <SmartSearchView role={role} />;
}
