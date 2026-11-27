'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/**
 * Fijar la propia contraseña: la primera vez (contraseña temporal que dio
 * el administrador), quien entró con Google y quiere también correo, o un
 * cambio normal (pide la actual). Las reglas las repite el servidor
 * (`claveValida` en src/lib/usuarios/gestion.ts).
 */
export function FormularioDeClave({ pideActual, siguiente }: { pideActual: boolean; siguiente?: string }) {
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problema =
    nueva.length > 0 && nueva.length < 10
      ? 'Al menos 10 caracteres.'
      : nueva && (!/[A-Za-z]/.test(nueva) || !/[0-9]/.test(nueva))
        ? 'Combina letras y números.'
        : repetida && repetida !== nueva
          ? 'Las contraseñas no coinciden.'
          : null;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (problema || !nueva || nueva !== repetida) return;
    setEnviando(true);
    setError(null);
    const res = await fetch('/api/cuenta/clave', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actual: pideActual ? actual : undefined, nueva }),
    });
    const r = (await res.json().catch(() => ({}))) as { message?: string };
    setEnviando(false);
    if (!res.ok) {
      setError(r.message ?? 'No se pudo cambiar la contraseña.');
      return;
    }
    toast.success('Contraseña guardada');
    setActual('');
    setNueva('');
    setRepetida('');
    if (siguiente) {
      router.replace(siguiente);
    }
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="space-y-3 max-w-sm" noValidate>
      {pideActual && (
        <div className="space-y-1.5">
          <Label htmlFor="clave-actual">Contraseña actual</Label>
          <Input
            id="clave-actual"
            type="password"
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="clave-nueva">Nueva contraseña</Label>
        <Input
          id="clave-nueva"
          type="password"
          autoComplete="new-password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          aria-describedby="clave-ayuda"
          required
        />
        <p id="clave-ayuda" className="text-[11px] text-muted-foreground">
          Mínimo 10 caracteres, con letras y números.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="clave-repetida">Repite la nueva contraseña</Label>
        <Input
          id="clave-repetida"
          type="password"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          required
        />
      </div>
      {(problema || error) && (
        <p role="alert" className="text-xs text-red-600">
          {error ?? problema}
        </p>
      )}
      <Button
        type="submit"
        disabled={enviando || !!problema || !nueva || nueva !== repetida || (pideActual && !actual)}
        aria-busy={enviando}
      >
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar contraseña
      </Button>
    </form>
  );
}
