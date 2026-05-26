'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  fullName: string;
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardHero({ fullName }: Props) {
  const now = new Date();
  const greeting = greetingFor(now);
  const firstName = fullName.trim().split(/\s+/)[0];
  const todayLabel = format(now, "EEEE, d 'de' MMMM", { locale: es });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-2">
          {todayLabel}
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance">
          {greeting},{' '}
          <span className="italic gradient-text">{firstName}</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          ¿En qué podemos ayudarte hoy con Contrataciones del Estado?
        </p>
      </div>
    </motion.section>
  );
}
