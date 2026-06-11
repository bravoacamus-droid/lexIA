import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock } from 'lucide-react';
import { DeleteAccountButton } from '@/components/app/account/delete-account-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seguridad' };

export default async function SeguridadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Proveedor OAuth desde app_metadata
  const providers =
    ((user.app_metadata as { providers?: string[] } | null)?.providers || []) as string[];
  const primaryProvider = providers[0] || 'email';

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Seguridad de tu cuenta</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cómo accedes, qué proveedor usas para iniciar sesión y opciones
          permanentes.
        </p>
      </header>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-sm">Método de inicio de sesión</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usas <strong className="capitalize">{primaryProvider}</strong> para
              autenticarte. La gestión de contraseña se realiza en el proveedor.
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant="success">Activo</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-sm">Sesiones activas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu sesión actual.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
          Conectado como{' '}
          <span className="text-foreground font-medium">{user.email}</span>
        </div>
      </Card>

      <Card className="p-6 border-destructive/40 bg-destructive/5">
        <h3 className="font-semibold text-sm mb-1 text-destructive">
          Eliminar tu cuenta
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Esta acción es permanente: borra tu perfil, suscripción, conversaciones,
          documentos generados y evaluaciones. No se puede deshacer.
        </p>
        <DeleteAccountButton />
      </Card>
    </div>
  );
}
