'use client';

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import {
  MessageCircleQuestion,
  Library,
  FileSearch,
  FilePen,
  LayoutDashboard,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: MessageCircleQuestion,
    title: 'Chat con citaciones verificables',
    text: 'Conversa con la normativa peruana. Cada afirmación incluye el artículo, opinión o resolución que la sustenta — verificable en un clic.',
    badge: 'Más usado',
    accent: 'from-brand-500/15 to-sky-400/5',
    iconBg: 'bg-brand-100 text-brand-700',
  },
  {
    icon: Library,
    title: 'Biblioteca normativa inteligente',
    text: 'Búsqueda híbrida (semántica + textual). Highlights, anotaciones y carpetas personales por temática.',
    accent: 'from-sky-500/15 to-cyan-400/5',
    iconBg: 'bg-sky-100 text-sky-700',
  },
  {
    icon: FileSearch,
    title: 'Evaluador IA de ofertas',
    text: 'Compara ofertas contra las Bases. Detecta omisiones subsanables y observaciones críticas con sustento normativo.',
    badge: 'Estrella',
    accent: 'from-emerald-500/15 to-teal-400/5',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: FilePen,
    title: '13 generadores de documentos',
    text: 'Consultas, Pliegos, Bases, Apelaciones, TDR, Ampliación de plazo, Cambio de bienes, Descargo de penalidades… exportables a Word.',
    accent: 'from-amber-500/15 to-orange-400/5',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard por perfil',
    text: 'Vistas diferenciadas para Entidad, Proveedor y Consultor. Cada uno ve lo que necesita, nada más.',
    accent: 'from-violet-500/15 to-fuchsia-400/5',
    iconBg: 'bg-violet-100 text-violet-700',
  },
  {
    icon: Sparkles,
    title: 'Roadmap continuo',
    text: 'Bot de scraping semanal, módulos de ejecución contractual y trámites RNP. Tu producto crece con tu trabajo.',
    accent: 'from-rose-500/15 to-pink-400/5',
    iconBg: 'bg-rose-100 text-rose-700',
  },
];

export function Features() {
  return (
    <section
      id="funciones"
      className="py-24 sm:py-28 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-14"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-brand-600 mb-3">
            Una plataforma, todo el proceso
          </p>
          <h2 className="font-semibold text-4xl sm:text-5xl tracking-[-0.025em] text-slate-900 text-balance">
            Diseñada para el{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
              especialista
            </span>{' '}
            que trabaja en serio
          </h2>
          <p className="mt-4 text-slate-600 text-balance">
            No es un chatbot genérico — es un sistema completo que entiende cómo se
            trabaja en Contrataciones del Estado.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, i) => (
            <FeatureCard key={feat.title} feat={feat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feat,
  index,
}: {
  feat: (typeof FEATURES)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: -200, y: -200 });

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setGlow({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setGlow({ x: -200, y: -200 })}
      className="group relative rounded-2xl border border-slate-200 bg-white p-6 overflow-hidden hover:border-slate-300 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Spotlight que sigue el cursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(280px circle at ${glow.x}px ${glow.y}px, rgba(5,131,242,0.08), transparent 60%)`,
        }}
      />
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      {feat.badge && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
          {feat.badge}
        </span>
      )}

      <div
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feat.iconBg} mb-4 group-hover:scale-110 transition-transform`}
      >
        <feat.icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <h3 className="font-semibold text-base mb-2 text-slate-900 flex items-center gap-1.5">
        {feat.title}
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{feat.text}</p>
    </motion.div>
  );
}
