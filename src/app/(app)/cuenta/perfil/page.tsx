import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileEditForm } from '@/components/app/account/profile-edit-form';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil' };

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, profile_role, organization_name, ruc, position_title, avatar_url',
    )
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.profile_role as ProfileRole | null) || null;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center text-lg font-semibold text-muted-foreground">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile?.full_name?.[0] || user.email?.[0] || '·').toUpperCase()
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{profile?.full_name || user.email}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {user.email}
            {role && <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>}
          </p>
        </div>
      </header>

      <Card className="p-6">
        <ProfileEditForm
          initial={{
            full_name: profile?.full_name || '',
            organization_name: profile?.organization_name || '',
            ruc: profile?.ruc || '',
            position_title: profile?.position_title || '',
            profile_role: role,
          }}
        />
      </Card>
    </div>
  );
}
