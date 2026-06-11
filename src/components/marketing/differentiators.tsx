'use client';

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { BookMarked, MapPin, RefreshCw } from 'lucide-react';

const ITEMS = [
  {
    icon: BookMarked,
    title: 'Sustentada en normativa real',
    text: 'Cada respuesta cita el artículo, opinión o resolución exacta. Sin alucinaciones, con trazabilidad completa.',
    stat: '0%',
    statLabel: 'tasa de alucinación',
    accent: 'from-brand-500/30 to-sky-400/10',
    iconBg: 'bg-brand-100 text-brand-700',
  },
  {
    icon: MapPin,
    title: 'Especializada en Perú',
    text: 'Ley N° 32069, su Reglamento, OECE y Tribunal. Construida exclusivamente para nuestro marco legal.',
    stat: '100%',
    statLabel: 'corpus peruano',
    accent: 'from-emerald-500/30 to-teal-400/10',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: RefreshCw,
    title: 'Siempre actualizada',
    text: 'Ingesta semanal automática de nuevas opiniones, pronunciamientos y resoluciones del Tribunal.',
    stat: '< 7d',
    statLabel: 'lag normativa',
    accent: 'from-amber-500/30 to-orange-400/10',
    iconBg: 'bg-amber-100 text-amber-700',
  },
];

export function Differentiators() {
  return (
    <section className="py-24 sm:py-28 border-t border-slate-200 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-14"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-brand-600 mb-3">
            Por qué LexIA
          </p>
          <h2 className="font-semibold text-4xl sm:text-5xl tracking-[-0.025em] text-slate-900 text-balance">
            Tres razones que la diferencian de cualquier{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-brand-600">chatbot genérico</span>
              <span className="absolute inset-x-0 bottom-1 h-2 bg-brand-200/60 -z-0" />
            </span>
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-3">
          {ITEMS.map((item, i) => (
            <TiltCard key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TiltCard({
  item,
  index,
}: {
  item: (typeof ITEMS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
      className="group relative rounded-2xl border border-slate-200 bg-white p-7 overflow-hidden hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5 transition-shadow"
    >
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${item.accent} opacity-0 group-hover:opacity-100 transition-opacity`}
      />
      <div
        className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform`}
      >
        <item.icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-lg mb-2 text-slate-900">{item.title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed mb-5">{item.text}</p>
      <div className="pt-4 border-t border-slate-200/70 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
          {item.stat}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-slate-500">
          {item.statLabel}
        </span>
      </div>
    </motion.div>
  );
}
