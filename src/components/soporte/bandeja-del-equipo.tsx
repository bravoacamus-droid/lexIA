'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * El acceso del equipo a la bandeja de soporte, en la barra superior,
 * con cuántas conversaciones esperan respuesta. Comparte la consulta
 * con el botón «Ayuda» (misma clave), así que no pide dos veces.
 */
export function BandejaDelEquipo() {
  const { data } = useQuery({
    queryKey: ['soporte', 'resumen'],
    queryFn: async (): Promise<{ sin_leer: number; por_atender: number | null }> => {
      const r = await fetch('/api/soporte/tickets?resumen=1', { cache: 'no-store' });
      if (!r.ok) return { sin_leer: 0, por_atender: null };
      return r.json();
    },
    refetchInterval: 45_000,
    staleTime: 5_000,
  });
  const n = data?.por_atender ?? 0;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      asChild
      aria-label={n > 0 ? `Bandeja de soporte: ${n} por responder` : 'Bandeja de soporte'}
      title={n > 0 ? `${n} conversación(es) por responder` : 'Bandeja de soporte'}
    >
      <Link href="/admin/soporte" className="relative">
        <Inbox className="h-4 w-4" />
        {n > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {n > 99 ? '99+' : n}
          </span>
        )}
      </Link>
    </Button>
  );
}
