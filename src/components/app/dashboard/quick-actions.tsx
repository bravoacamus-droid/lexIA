'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowUpRight,
  MessageSquare,
  Library,
  FileSearch,
  FilePen,
  HardHat,
  Briefcase,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { ProfileRole } from '@/lib/auth/session';

interface ActionItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  accent: string;
  iconBg: string;
}

const SHARED_ACTIONS: ActionItem[] = [
  {
    icon: MessageSquare,
    title: 'Chat con LexIA',
    desc: 'Consulta normativa con citaciones verificables.',
    href: '/chat',
    accent: 'from-brand-500/15 to-brand-700/10',
    iconBg: 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400',
  },
  {
    icon: Library,
    title: 'Buscar en la biblioteca',
    desc: 'Opiniones, pronunciamientos y resoluciones vigentes.',
    href: '/biblioteca',
    accent: 'from-sky-500/15 to-cyan-500/10',
    iconBg: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
  },
];

const ACTIONS_BY_ROLE: Record<ProfileRole, ActionItem[]> = {
  entity: [
    ...SHARED_ACTIONS,
    {
      icon: FileSearch,
      title: 'Evaluar ofertas',
      desc: 'Compara las ofertas presentadas contra las Bases Integradas.',
      href: '/evaluador/nuevo',
      accent: 'from-emerald-500/15 to-teal-500/10',
      iconBg:
        'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
    },
    {
      icon: FilePen,
      title: 'Generar documento',
      desc: 'TDR, Estrategia, Pliego de Absolución y más.',
      href: '/generador/nuevo',
      accent: 'from-amber-500/15 to-orange-500/10',
      iconBg:
        'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    },
  ],
  provider: [
    ...SHARED_ACTIONS,
    {
      icon: ShieldCheck,
      title: 'Audita tu oferta',
      desc: 'Antes de presentar, audita tu oferta contra las Bases del proceso.',
      href: '/revision-oferta/nuevo',
      accent: 'from-emerald-500/15 to-teal-500/10',
      iconBg:
        'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
    },
    {
      icon: FilePen,
      title: 'Generar documento',
      desc: 'Consultas, observaciones, apelaciones, ampliación de plazo.',
      href: '/generador/nuevo',
      accent: 'from-amber-500/15 to-orange-500/10',
      iconBg:
        'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    },
    {
      icon: HardHat,
      title: 'Trámites RNP',
      desc: 'Aumento de CMC, actualización financiera.',
      href: '/rnp',
      accent: 'from-purple-500/15 to-fuchsia-500/10',
      iconBg:
        'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
    },
  ],
  consultant: [
    ...SHARED_ACTIONS,
    {
      icon: Briefcase,
      title: 'Casos de estudio',
      desc: 'Análisis avanzado y modelos de litigio (pronto).',
      href: '/casos',
      accent: 'from-purple-500/15 to-fuchsia-500/10',
      iconBg:
        'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
    },
  ],
};

interface Props {
  role: ProfileRole | null;
}

export function DashboardQuickActions({ role }: Props) {
  const actions = role ? ACTIONS_BY_ROLE[role] : SHARED_ACTIONS;

  const title = role === 'entity'
    ? '¿En qué procedimiento estás trabajando?'
    : role === 'provider'
      ? '¿Qué necesitas preparar?'
      : role === 'consultant'
        ? 'Recursos rápidos'
        : '¿Qué quieres hacer hoy?';

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={action.href}
              className="group relative block overflow-hidden rounded-xl border border-border bg-card p-5 hover:border-brand-400 transition-all hover:-translate-y-0.5 hover:shadow-md h-full"
            >
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${action.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${action.iconBg}`}>
                  <action.icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-semibold text-[15px] mb-1">{action.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {action.desc}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
