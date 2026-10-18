import Link from 'next/link';
import { Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { planDelCatalogo, type IdDePlan } from '@/lib/billing/catalogo';

interface Props {
  creditos: {
    plan: IdDePlan;
    disponibles: number;
    renovacion: string;
    vencido: boolean;
  } | null;
}

/**
 * Aviso de la portada para la Prueba A-LexIA: 20 preguntas o 30 días, lo
 * que ocurra primero («PLANES DE A-LEXIA», 17/10/2026). Antes contaba
 * solo los días, pero con la prueba nueva lo que suele acabarse primero
 * son las preguntas.
 *
 * También avisa si un plan de pago venció o está suspendido; en un plan
 * vigente no se muestra (el saldo ya está en la tarjeta lateral).
 */
export function TrialBanner({ creditos }: Props) {
  if (!creditos) return null;
  const esPrueba = creditos.plan === 'prueba';
  if (!esPrueba && !creditos.vencido) return null;

  const vence = new Date(creditos.renovacion);
  const dias = Math.max(0, Math.ceil((vence.getTime() - Date.now()) / 86_400_000));
  const sinPreguntas = esPrueba && creditos.disponibles <= 0;
  const terminada = creditos.vencido || sinPreguntas;
  const apretada = !terminada && esPrueba && (creditos.disponibles <= 5 || dias <= 5);
  const fecha = vence.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });

  const tono = terminada
    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
    : apretada
      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
      : 'bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900 text-foreground';

  const titulo = !esPrueba
    ? `Tu plan ${planDelCatalogo(creditos.plan).nombre} no está vigente`
    : terminada
      ? 'Tu Prueba A-LexIA terminó'
      : `Prueba A-LexIA: te ${creditos.disponibles === 1 ? 'queda 1 pregunta' : `quedan ${creditos.disponibles} preguntas`} · vence el ${fecha}`;
  const detalle = !esPrueba
    ? 'Renuévalo por WhatsApp para seguir usando A-LexIA.'
    : terminada
      ? 'Elige un plan para seguir consultando y usar las demás herramientas.'
      : '20 preguntas por texto o 30 días, lo que ocurra primero. No se cobra nada al terminar.';

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-5 py-4', tono)}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-white/10">
          {terminada ? <Clock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="text-xs opacity-80 mt-0.5">{detalle}</p>
        </div>
      </div>
      <Link
        href="/cuenta/suscripcion#cambiar-de-plan"
        className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Ver planes
      </Link>
    </div>
  );
}
