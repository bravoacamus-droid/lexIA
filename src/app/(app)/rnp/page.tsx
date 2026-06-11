import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RoleGateBlocked, isRoleAllowed } from '@/components/app/role-gate';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, TrendingUp, FileSpreadsheet, ListChecks } from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Trámites RNP' };

const TILES = [
  {
    icon: TrendingUp,
    title: 'Aumento de Capacidad Máxima',
    desc: 'Solicita el aumento de CMC ante el RNP con sustento de obras ejecutadas y mejora patrimonial. Incluye checklist de documentos.',
    href: '/rnp/aumento-cmc',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
    accent: 'from-emerald-500/15 to-teal-500/10',
  },
  {
    icon: FileSpreadsheet,
    title: 'Actualización Financiera (Anexo N° 06)',
    desc: 'Llena el Anexo oficial: balance general, estado de resultados, ratios y declaración jurada de veracidad.',
    href: '/rnp/actualizacion-financiera',
    iconBg: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
    accent: 'from-sky-500/15 to-blue-500/10',
  },
  {
    icon: ListChecks,
    title: 'Requisitos del trámite',
    desc: 'Consulta la Ficha Técnica oficial OECE para Ejecutor y Consultor de Obras (PJ/PN nacional).',
    href: '/rnp/requisitos',
    iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    accent: 'from-amber-500/15 to-orange-500/10',
  },
];

export default async function RnpHubPage() {
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
        moduleName="Trámites RNP"
        reason="El Registro Nacional de Proveedores es una herramienta para los proveedores del Estado."
      />
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <header>
        <h1 className="font-serif text-3xl tracking-tight">Trámites RNP</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Asistentes guiados para los trámites del Registro Nacional de
          Proveedores del OECE. Llenamos los formatos oficiales con tu
          información y los preparamos para presentación.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group relative block overflow-hidden rounded-xl border border-border bg-card p-6 hover:border-brand-400 transition-all hover:-translate-y-0.5 hover:shadow-md h-full"
          >
            <div
              className={`absolute inset-0 -z-10 bg-gradient-to-br ${t.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
            />
            <div className="flex items-start justify-between mb-3">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${t.iconBg}`}
              >
                <t.icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-[15px] mb-1">{t.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
          </Link>
        ))}
      </div>

      <Card className="p-5 bg-secondary/50">
        <div className="flex items-start gap-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">
              Estos trámites se presentan ante el OECE
            </p>
            LexIA arma los documentos con base en los formatos oficiales y los
            datos que cargues. La presentación final se realiza en la sede digital
            del OECE con el pago de la tasa correspondiente (S/ 364.00 para
            Aumento de CMC al 2025).
          </div>
        </div>
      </Card>
    </div>
  );
}
