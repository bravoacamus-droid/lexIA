import { createClient } from '@/lib/supabase/server';
import { EvaluatorWizard } from '@/components/app/evaluator/evaluator-wizard';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva auto-revisión' };

export default async function NuevaRevisionPage() {
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
  const userRole = (profile?.profile_role as ProfileRole | null) || null;

  if (!isRoleAllowed(userRole, ['provider', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['provider', 'consultant']}
        userRole={userRole}
        moduleName="Auto-revisión de oferta"
        reason="Esta herramienta es para que el postor audite su propia oferta antes de presentarla."
      />
    );
  }

  return (
    <div className="container max-w-3xl py-8 space-y-5">
      <Card className="p-5 bg-brand-50/50 dark:bg-brand-950/30 border-brand-100 dark:border-brand-900">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
          <div className="space-y-1 text-[13px]">
            <p className="font-semibold text-foreground">
              ¿Cómo funciona la auto-revisión?
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Sube las <strong>Bases del proceso</strong> y <strong>tu oferta</strong> tal
              y como la presentarías. LexIA va a auditar cada requisito y te va a decir:
              ✅ qué está bien, 🟡 qué riesgos formales podrías subsanar y 🔴 qué te
              puede sacar del proceso si lo presentas así.
            </p>
          </div>
        </div>
      </Card>

      <EvaluatorWizard mode="self_review" resultPathPrefix="/revision-oferta" />
    </div>
  );
}
