import Link from 'next/link';
import { AlertTriangle, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verInvitacion } from '@/lib/billing/gestion';
import { bolsaDelUsuario } from '@/lib/billing/creditos';
import { AceptarInvitacion } from '@/components/app/cuenta/aceptar-invitacion';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Unirme a un equipo' };

/**
 * /equipo/unirse?token= — el enlace que el propietario de un equipo
 * comparte por WhatsApp (no hay correo saliente).
 *
 * Sin sesión, el middleware manda a /login con `redirect` = este enlace
 * con su token, y el callback de OAuth (o el onboarding, si la cuenta es
 * nueva) vuelve aquí. Antes de aceptar se dice a qué equipo se entra y,
 * si no se puede, por qué: venció, ya se usó, el equipo está lleno o el
 * usuario ya es de otro equipo.
 */
export default async function UnirsePage({ searchParams }: { searchParams: { token?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const token = (searchParams.token ?? '').trim();
  const info = token ? await verInvitacion(token) : null;
  const actual = await bolsaDelUsuario(user.id).catch(() => null);

  // Quien ya está en ese equipo (abrió el enlace dos veces) no ve error.
  const yaEsMiembro = !!(info && actual?.equipo && actual.equipo.id === info.equipoId);
  let problema: { titulo: string; detalle: string } | null = null;
  if (!info) {
    problema = {
      titulo: 'Esta invitación no existe',
      detalle: 'Revisa que el enlace esté completo o pide uno nuevo al propietario del equipo.',
    };
  } else if (yaEsMiembro) {
    problema = null;
  } else if (info.usada) {
    problema = {
      titulo: 'Esta invitación ya se usó',
      detalle: 'Cada enlace sirve para una sola persona. Pide uno nuevo al propietario del equipo.',
    };
  } else if (info.vencida) {
    problema = {
      titulo: 'Esta invitación venció',
      detalle: 'Los enlaces valen 14 días. Pide uno nuevo al propietario del equipo.',
    };
  } else if (info.lleno) {
    problema = {
      titulo: 'El equipo ya está completo',
      detalle: `«${info.equipo}» ya tiene todos sus usuarios. El propietario puede ampliar su plan para sumarte.`,
    };
  } else if (actual?.equipo) {
    problema = {
      titulo: 'Ya perteneces a otro equipo',
      detalle: `Eres parte de «${actual.equipo.nombre}». Para unirte a «${info.equipo}», primero sal de tu equipo desde Tu plan y créditos.`,
    };
  }

  return (
    <div className="container flex max-w-lg flex-col items-center py-16">
      <Card className="w-full p-8 text-center">
        <span
          className={
            problema
              ? 'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              : 'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
          }
        >
          {problema ? <AlertTriangle className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        </span>

        {problema ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{problema.titulo}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{problema.detalle}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/cuenta/suscripcion">Ver mi plan</Link>
              </Button>
              <Button asChild>
                <Link href="/app">Ir a A-LexIA</Link>
              </Button>
            </div>
          </>
        ) : yaEsMiembro ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Ya eres parte de «{info!.equipo}»</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Usas la bolsa de créditos del plan {info!.plan} de tu equipo.
            </p>
            <Button asChild className="mt-6">
              <Link href="/app">Ir a A-LexIA</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Invitación a un equipo</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">«{info!.equipo}»</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Te invitan a unirte con tu cuenta ({user.email}) al plan {info!.plan}. Usarás los créditos compartidos del
              equipo en lugar de los de tu plan individual.
            </p>
            <AceptarInvitacion token={token} equipo={info!.equipo} />
          </>
        )}
      </Card>
    </div>
  );
}
