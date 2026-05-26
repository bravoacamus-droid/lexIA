'use client';

import { motion } from 'framer-motion';
import {
  MessageCircleQuestion,
  Library,
  FileSearch,
  FilePen,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: MessageCircleQuestion,
    title: 'Chat con citaciones verificables',
    text:
      'Conversa con la normativa peruana. Cada afirmación incluye el artículo, opinión o resolución que la sustenta — verificable en un clic.',
    accent: 'from-brand-500/20 to-violet-500/10',
  },
  {
    icon: Library,
    title: 'Biblioteca normativa inteligente',
    text:
      'Búsqueda híbrida (semántica + textual). Highlights, anotaciones y carpetas personales por temática.',
    accent: 'from-sky-500/20 to-cyan-500/10',
  },
  {
    icon: FileSearch,
    title: 'Evaluador IA de ofertas',
    text:
      'Compara ofertas contra las Bases. Detecta omisiones subsanables y observaciones críticas con sustento normativo.',
    accent: 'from-emerald-500/20 to-teal-500/10',
  },
  {
    icon: FilePen,
    title: 'Generador de documentos',
    text:
      'Solicitudes de ampliación de plazo, descargos, cambios de personal. Editables, exportables a Word.',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  {
    icon: LayoutDashboard,
    title: 'Panel del suscriptor',
    text:
      'Dashboard moderno con tu actividad, documentos guardados y accesos rápidos a las herramientas.',
    accent: 'from-violet-500/20 to-fuchsia-500/10',
  },
  {
    icon: Sparkles,
    title: 'Roadmap continuo',
    text:
      'Próximamente: revisor de EETT/TDR, formulador de consultas, modo Área Usuaria y mucho más.',
    accent: 'from-rose-500/20 to-pink-500/10',
  },
];

export function Features() {
  return (
    <section id="funciones" className="py-20 sm:py-24 border-t border-border">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-brand-700 dark:text-brand-400 mb-3">
            Una plataforma, todo el proceso
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance">
            Diseñada para resolver el trabajo diario del{' '}
            <span className="italic gradient-text">especialista</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-balance">
            No es un chatbot genérico — es un sistema completo que entiende cómo se trabaja en
            Contrataciones del Estado.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="group relative rounded-2xl border border-border bg-card p-6 overflow-hidden hover:-translate-y-0.5 transition-transform"
            >
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <feat.icon className="h-7 w-7 text-brand-700 dark:text-brand-400 mb-4" strokeWidth={1.5} />
              <h3 className="font-semibold text-base mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
