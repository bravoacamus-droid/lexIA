'use client';

import { toast } from 'sonner';

/**
 * El aviso que ve el usuario cuando una herramienta responde 402: no está
 * en su plan, se acabaron los créditos, llegó al límite del plan o el plan
 * venció (ver `usarHerramienta` en creditos.ts).
 *
 * Antes cada pantalla mostraba el código crudo («quota_exceeded») o un
 * «Error en el chat» genérico. Aquí se dice qué pasó y qué hacer: ver el
 * plan, o escribir por WhatsApp para recargar o cambiar de plan (la
 * activación es por WhatsApp; no hay cobro en línea).
 *
 * Devuelve true si la respuesta era de plan y ya se avisó.
 */
export function avisoDePlan(cuerpo: unknown): boolean {
  const b = (cuerpo ?? {}) as {
    error?: string;
    message?: string;
    whatsapp_url?: string;
  };
  const codigos = ['herramienta_no_incluida', 'sin_creditos', 'limite_del_plan', 'plan_vencido'];
  if (!b.error || !codigos.includes(b.error)) return false;
  const titulo =
    b.error === 'sin_creditos'
      ? 'Te quedaste sin créditos'
      : b.error === 'plan_vencido'
        ? 'Tu plan no está vigente'
        : b.error === 'limite_del_plan'
          ? 'Llegaste al límite de tu plan'
          : 'No está incluido en tu plan';
  toast.error(titulo, {
    description: b.message,
    duration: 12_000,
    action: b.whatsapp_url
      ? {
          label: b.error === 'sin_creditos' ? 'Recargar' : 'Mejorar plan',
          onClick: () => window.open(b.whatsapp_url, '_blank', 'noopener'),
        }
      : undefined,
    cancel: {
      label: 'Ver mi plan',
      onClick: () => {
        window.location.href = '/cuenta/suscripcion';
      },
    },
  });
  return true;
}

/** Atajo para `fetch`: si la respuesta es 402 de plan, avisa y devuelve true. */
export async function esRechazoDePlan(res: Response): Promise<boolean> {
  if (res.status !== 402) return false;
  const cuerpo = await res
    .clone()
    .json()
    .catch(() => null);
  return avisoDePlan(cuerpo);
}

/**
 * Para el chat y el generador libre, que usan `useChat`: cuando la
 * respuesta no es 2xx, el SDK lanza un Error cuyo mensaje es el cuerpo
 * tal cual (el JSON del 402). Sin esto el usuario veía «A-LexIA falló:
 * {"error":"sin_creditos",…}».
 */
export function avisoDesdeError(err: unknown): boolean {
  const texto = String((err as Error | null)?.message ?? '');
  if (!texto.trim().startsWith('{')) return false;
  try {
    return avisoDePlan(JSON.parse(texto));
  } catch {
    return false;
  }
}

/**
 * Error que se lanza cuando el aviso de plan ya se mostró: el `catch`
 * de la pantalla lo reconoce con `yaAvisado(e)` y no pinta un segundo
 * toast con el mensaje crudo.
 */
export class AvisoDePlanMostrado extends Error {
  constructor() {
    super('aviso_de_plan');
    this.name = 'AvisoDePlanMostrado';
  }
}
export const yaAvisado = (e: unknown) => e instanceof AvisoDePlanMostrado;

export { creditosCambiaron } from './resumen-de-tarjeta';
