'use client';

import { useEffect, useState } from 'react';
import { formatRelative } from '@/lib/utils';

/**
 * Renderiza una fecha relativa SOLO en cliente, evitando hydration mismatch
 * causado por diferencias de zona horaria entre el server (UTC) y el cliente.
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

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}
