import Link from 'next/link';
import { UserCircle, CreditCard, BellRing, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Color de acento del ícono para hover. */
  color: string;
  bg: string;
}

const NAV: NavItem[] = [
  {
    label: 'Perfil',
    href: '/cuenta/perfil',
    icon: UserCircle,
    description: 'Datos personales y de tu organización.',
    color: 'text-brand-600 dark:text-brand-400',
    bg: 'bg-brand-50 dark:bg-brand-950/40',
  },
  {
    label: 'Suscripción',
    href: '/cuenta/suscripcion',
    icon: CreditCard,
    description: 'Plan vigente, consumo y facturación.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    label: 'Notificaciones',
    href: '/cuenta/notificaciones',
    icon: BellRing,
    description: 'Qué te avisamos por correo.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    label: 'Seguridad',
    href: '/cuenta/seguridad',
    icon: ShieldCheck,
    description: 'Sesiones activas y eliminar cuenta.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
  },
];

export default function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">
          Cuenta
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">Tu espacio personal</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Administra tu perfil, tu plan y tus preferencias en un solo lugar.
        </p>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside>
          <nav className="space-y-1.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-border hover:bg-card hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.bg} ${item.color} group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
