import Link from 'next/link';
import { Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubscriptionRow } from '@/lib/auth/session';

interface Props {
  subscription: SubscriptionRow | null;
}

/**
 * Banner persistente en el dashboard que cuenta los días restantes del trial.
 * Se oculta si el usuario ya tiene plan de pago activo o si no hay sub.
 */
export function TrialBanner({ subscription }: Props) {
  if (!subscription) return null;
  if (subscription.status !== 'trialing') return null;
  if (!subscription.trial_ends_at) return null;

  const now = new Date();
  const ends = new Date(subscription.trial_ends_at);
  const msLeft = ends.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const expired = daysLeft === 0;

  const tone = expired
    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
    : daysLeft <= 5
      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
      : 'bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900 text-foreground';

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-5 py-4',
        tone,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 dark:bg-white/10">
          {expired ? <Clock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <div>
          {expired ? (
            <p className="text-sm font-semibold">
              Tu prueba gratuita expiró
            </p>
          ) : (
            <p className="text-sm font-semibold">
              {daysLeft === 1
                ? 'Último día de tu prueba gratuita'
                : `Quedan ${daysLeft} días de prueba gratuita`}
            </p>
          )}
          <p className="text-xs opacity-80 mt-0.5">
            {expired
              ? 'Para seguir usando los generadores y el evaluador, elige un plan.'
              : 'Cuando termine, no se cobra automáticamente — tú decides si quieres continuar.'}
          </p>
        </div>
      </div>
      <Link
        href="/pricing"
        className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Ver planes
      </Link>
    </div>
  );
}
