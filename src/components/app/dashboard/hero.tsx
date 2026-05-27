'use client';

import { useEffect, useState } from 'react';
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
  const firstName = fullName.trim().split(/\s+/)[0];
  const [client, setClient] = useState<{ greeting: string; today: string } | null>(null);

  // Calculamos fecha/hora únicamente en cliente para evitar mismatch SSR/CSR
  // (la hora del server en Vercel es UTC; en cliente es local del usuario).
  useEffect(() => {
    const now = new Date();
    setClient({
      greeting: greetingFor(now),
      today: format(now, "EEEE, d 'de' MMMM", { locale: es }),
    });
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
    >
      <div>
        <p
          className="text-xs uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-2 min-h-[1em]"
          suppressHydrationWarning
        >
          {client?.today || ''}
        </p>
        <h1
          className="font-serif text-4xl sm:text-5xl tracking-tight text-balance"
          suppressHydrationWarning
        >
          {client?.greeting || 'Hola'},{' '}
          <span className="italic gradient-text">{firstName}</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          ¿En qué podemos ayudarte hoy con Contrataciones del Estado?
        </p>
      </div>
    </motion.section>
  );
}
