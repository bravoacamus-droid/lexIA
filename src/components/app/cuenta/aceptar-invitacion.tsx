'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** El botón de /equipo/unirse: acepta la invitación y entra a A-LexIA. */
export function AceptarInvitacion({ token, equipo }: { token: string; equipo: string }) {
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unirme() {
    setYendo(true);
    setError(null);
    try {
      const res = await fetch('/api/equipo/unirse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || 'No se pudo aceptar la invitación');
      toast.success(`Ya eres parte de «${equipo}»`);
      // Carga completa y no `router.push`: el plan de la tarjeta lateral
      // lo pinta el layout, que no se vuelve a leer al navegar.
      window.location.href = '/app';
    } catch (e) {
      setError((e as Error).message);
      setYendo(false);
    }
  }

  return (
    <div className="mt-6">
      <Button size="lg" variant="glow" onClick={unirme} loading={yendo}>
        <Users className="h-4 w-4" />
        Unirme al equipo
      </Button>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
