import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from '@/components/app/onboarding/onboarding-wizard';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { next?: string };
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'profile_role, onboarding_completed, organization_name, ruc, position_title, full_name',
    )
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect(searchParams.next || '/app');
  }

  return (
    <OnboardingWizard
      next={searchParams.next || '/app'}
      defaultFullName={profile?.full_name || ''}
    />
  );
}
