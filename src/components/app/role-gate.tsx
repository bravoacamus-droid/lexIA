import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/navigation/menu-by-role';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  /** Roles permitidos. Si el rol del usuario no está, muestra el bloqueo. */
  allow: ProfileRole[];
  /** Rol actual del usuario (null si aún no completó onboarding). */
  userRole: ProfileRole | null;
  /** Nombre del módulo para el mensaje. */
  moduleName: string;
  /** Breve descripción de por qué este módulo es solo para ciertos roles. */
  reason?: string;
}

/**
 * Pantalla server-side que se muestra cuando un usuario intenta acceder a un
 * módulo restringido por rol. El sidebar ya oculta el item, pero esta es la
 * defensa de profundidad para acceso por URL directa.
 */
export function RoleGateBlocked({ allow, moduleName, reason }: Props) {
  const allowedLabels = allow.map((r) => ROLE_LABELS[r]).join(' o ');
  return (
    <div className="container max-w-2xl py-16">
      <Card className="p-10 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-5">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="font-serif text-3xl tracking-tight mb-2">
          {moduleName} no está disponible para tu perfil
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {reason ||
            `Esta herramienta está pensada para usuarios con perfil ${allowedLabels}.`}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Si elegiste el perfil equivocado durante el onboarding, puedes
          cambiarlo desde tu cuenta.
        </p>

        <div className="mt-7 flex items-center justify-center gap-2">
          <Button asChild variant="default">
            <Link href="/app">Volver al inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ajustes">Ir a ajustes</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function isRoleAllowed(
  userRole: ProfileRole | null,
  allow: ProfileRole[],
): boolean {
  if (!userRole) return false;
  return allow.includes(userRole);
}
