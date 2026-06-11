import Link from 'next/link';
import { UserCircle, CreditCard, BellRing, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

const NAV: NavItem[] = [
  {
    label: 'Perfil',
    href: '/cuenta/perfil',
    icon: UserCircle,
    description: 'Datos personales y de tu organización.',
  },
  {
    label: 'Suscripción',
    href: '/cuenta/suscripcion',
    icon: CreditCard,
    description: 'Plan vigente, consumo y facturación.',
  },
  {
    label: 'Notificaciones',
    href: '/cuenta/notificaciones',
    icon: BellRing,
    description: 'Qué te avisamos por correo.',
  },
  {
    label: 'Seguridad',
    href: '/cuenta/seguridad',
    icon: ShieldCheck,
    description: 'Sesiones activas y eliminar cuenta.',
  },
];

export default function CuentaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
          Cuenta
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Tu espacio personal</h1>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr] gap-8">
        <aside>
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                    {item.description}
                  </p>
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
