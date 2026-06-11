import { createClient } from '@/lib/supabase/server';
import { TdrAuditWizard } from '@/components/app/evaluator/tdr-audit-wizard';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nueva auditoría TDR' };

export default async function NuevoRevisorTdrPage() {
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

  if (!isRoleAllowed(userRole, ['entity', 'consultant'])) {
    return (
      <RoleGateBlocked
        allow={['entity', 'consultant']}
        userRole={userRole}
        moduleName="Revisor EETT / TDR"
        reason="Esta herramienta es para que el área usuaria audite su TDR o EETT antes de publicarlo."
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
              ¿Cómo funciona el revisor?
            </p>
            <p className="text-foreground/80 leading-relaxed">
              Sube el PDF de tu <strong>TDR</strong> (servicios/consultorías) o{' '}
              <strong>EETT</strong> (bienes/obras). LexIA va a auditar todo el documento
              buscando vicios: 🔴 direccionamiento a marca, 🟠 personal desproporcionado,
              🟡 ambigüedades, plazos insustentables, equipamiento restrictivo y más.
              Cada hallazgo viene con cita literal del texto, sustento normativo y
              recomendación concreta de corrección.
            </p>
          </div>
        </div>
      </Card>

      <TdrAuditWizard />
    </div>
  );
}
