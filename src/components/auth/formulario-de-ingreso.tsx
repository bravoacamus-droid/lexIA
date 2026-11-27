'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { rutaInterna } from '@/lib/auth/redireccion';

/**
 * Ingreso con correo y contraseña para las cuentas que crea el equipo
 * (reunión con César, 27/11/2026). No hay registro: quien no tiene cuenta
 * la pide por WhatsApp. Tampoco hay «olvidé mi contraseña» por correo
 * (Supabase sin SMTP propio): la restablece un administrador.
 */
export function FormularioDeIngreso() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = rutaInterna(params.get('redirect'));
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: clave });
    if (error) {
      setEnviando(false);
      setError(
        /banned/i.test(error.message)
          ? 'Tu cuenta está suspendida. Escríbenos por WhatsApp si crees que es un error.'
          : /rate|too many/i.test(error.message)
            ? 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'
            : 'Correo o contraseña incorrectos.',
      );
      return;
    }
    // El middleware lo lleva a cambiar la contraseña si es temporal.
    router.replace(destino);
    router.refresh();
  }

  return (
    <form onSubmit={ingresar} className="space-y-3" noValidate>
      <div className="space-y-1.5 text-left">
        <Label htmlFor="ingreso-email">Correo</Label>
        <Input
          id="ingreso-email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@entidad.gob.pe"
        />
      </div>
      <div className="space-y-1.5 text-left">
        <Label htmlFor="ingreso-clave">Contraseña</Label>
        <div className="relative">
          <Input
            id="ingreso-clave"
            type={ver ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-800"
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-left text-xs text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={enviando || !email || !clave} aria-busy={enviando}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        Ingresar
      </Button>
      <p className="text-center text-[11px] text-slate-500">
        ¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.
      </p>
    </form>
  );
}
