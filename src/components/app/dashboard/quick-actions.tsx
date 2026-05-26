'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight, MessageSquare, Library, FileSearch, FilePen } from 'lucide-react';

const ACTIONS = [
  {
    icon: MessageSquare,
    title: 'Chat con LexIA',
    desc: 'Consulta normativa en lenguaje natural con citaciones verificables',
    href: '/chat',
    accent: 'from-brand-500/15 to-violet-500/10',
    iconBg: 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400',
  },
  {
    icon: Library,
    title: 'Buscar normativa',
    desc: 'Explora opiniones, pronunciamientos y resoluciones del Tribunal',
    href: '/biblioteca',
    accent: 'from-sky-500/15 to-cyan-500/10',
    iconBg: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
  },
  {
    icon: FileSearch,
    title: 'Evaluar oferta',
    desc: 'Compara propuestas contra las Bases del proceso',
    href: '/evaluador/nuevo',
    accent: 'from-emerald-500/15 to-teal-500/10',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  },
  {
    icon: FilePen,
    title: 'Generar documento',
    desc: 'Redacta solicitudes formales con sustento normativo',
    href: '/generador/nuevo',
    accent: 'from-amber-500/15 to-orange-500/10',
    iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  },
];

export function DashboardQuickActions() {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">¿Qué quieres hacer hoy?</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACTIONS.map((action, i) => (
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
