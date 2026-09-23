'use client';

import { useEffect, useState } from 'react';
import { formatRelative } from '@/lib/utils';

/**
 * Una fecha relativa pintada SOLO en cliente.
 *
 * El servidor pinta el HTML en un instante y el navegador lo hidrata en
 * otro: basta para que uno diga «hace menos de un minuto» y el otro
 * «hace 1 minuto», y React lo denuncia como desajuste. Con la zona
 * horaria, igual. Por eso la etiqueta se calcula después de montar.
 *
 * El `title` deja la fecha exacta a mano, que es lo que se quiere mirar
 * cuando «hace 3 días» no basta.
 */
export function RelativeTime({
  date,
  className,
}: {
  date: string | Date | null | undefined;
  className?: string;
}) {
  const [label, setLabel] = useState<string>('');

  useEffect(() => {
    if (!date) return;
    setLabel(formatRelative(date));
    // Re-render cada 60s para mantener "hace 1 min", "hace 2 min", etc actualizado
    const id = setInterval(() => setLabel(formatRelative(date)), 60_000);
    return () => clearInterval(id);
  }, [date]);

  const d = date ? (typeof date === 'string' ? new Date(date) : date) : null;
  const exacta = d && !Number.isNaN(d.getTime()) ? d : null;

  return (
    <time
      dateTime={exacta?.toISOString()}
      title={exacta?.toLocaleString('es-PE')}
      className={className}
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}
