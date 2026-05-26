'use client';

import { motion } from 'framer-motion';
import { BookMarked, MapPin, RefreshCw } from 'lucide-react';

const ITEMS = [
  {
    icon: BookMarked,
    title: 'Sustentada en normativa real',
    text: 'Cada respuesta cita el artículo, opinión o resolución exacta. Sin alucinaciones.',
  },
  {
    icon: MapPin,
    title: 'Especializada en Perú',
    text: 'Ley N° 32069, Reglamento, OSCE y Tribunal. Construida para nuestro marco legal.',
  },
  {
    icon: RefreshCw,
    title: 'Siempre actualizada',
    text: 'Ingesta continua de nuevas opiniones, pronunciamientos y resoluciones del Tribunal.',
  },
];

export function Differentiators() {
  return (
    <section className="py-20 sm:py-24 border-t border-border">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-3">
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-xl border border-border bg-card p-6 hover:border-brand-400 transition-all hover:-translate-y-0.5"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
