/**
 * Matriz de planes (tiers) × features con sus cuotas mensuales.
 *
 * Las cuotas se aplican en ventanas calendario (mes natural). Cuando un
 * usuario consume una operación cuoteada, `feature-gate.recordUsage()`
 * incrementa el contador en `feature_usage` para el mes actual.
 *
 * Cambiar este archivo es seguro — no toca BD; solo redefine los límites.
 */
import type { SubscriptionTier } from '@/lib/auth/session';

export type FeatureKey =
  | 'chat_message'
  | 'generator_call'
  | 'evaluation_run'
  | 'scraping_admin'
  | 'voice_call_minute';

export interface TierDefinition {
  /** Slug interno (coincide con el enum SQL). */
  id: SubscriptionTier;
  /** Etiqueta visible al usuario. */
  label: string;
  /** Una línea de descripción. */
  tagline: string;
  /** Precio mensual en soles (0 para free_trial). */
  pricePerMonthPEN: number;
  /** Cuotas mensuales por feature. `Infinity` = ilimitado. 0 = deshabilitado. */
  quotas: Record<FeatureKey, number>;
  /** Bullets de marketing en la página de pricing. */
  highlights: string[];
  /** Marca el plan recomendado (badge visual). */
  recommended?: boolean;
  /** Se pinta en gris si el usuario no puede contratarlo desde la app. */
  contactSales?: boolean;
}

export const TIERS: TierDefinition[] = [
  {
    id: 'free_trial',
    label: 'Prueba gratuita',
    tagline: '30 días con acceso completo, sin tarjeta de crédito.',
    pricePerMonthPEN: 0,
    quotas: {
      chat_message: 200,
      generator_call: 25,
      evaluation_run: 5,
      scraping_admin: 0,
      voice_call_minute: 5,
    },
    highlights: [
      '30 días de prueba sin compromiso',
      'Acceso a todos los generadores',
      'Chat con sustento normativo',
      '5 minutos de llamada con el Abogado Virtual (prueba)',
      'No se solicita tarjeta de crédito',
    ],
  },
  {
    id: 'starter',
    label: 'Starter',
    tagline: 'Para profesionales independientes que hacen pocos procedimientos al mes.',
    pricePerMonthPEN: 99,
    quotas: {
      chat_message: 300,
      generator_call: 15,
      evaluation_run: 3,
      scraping_admin: 0,
      voice_call_minute: 0,
    },
    highlights: [
      '300 mensajes de chat al mes',
      '15 generaciones de documentos al mes',
      '3 evaluaciones de ofertas al mes',
      'Biblioteca normativa completa',
      'Sin Llamadas con el Abogado Virtual (disponible en Pro)',
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    tagline: 'Para equipos pequeños y consultoras que llevan procesos en paralelo.',
    pricePerMonthPEN: 249,
    quotas: {
      chat_message: 1500,
      generator_call: 80,
      evaluation_run: 15,
      scraping_admin: 0,
      voice_call_minute: 30,
    },
    highlights: [
      '1 500 mensajes de chat al mes',
      '80 generaciones de documentos al mes',
      '15 evaluaciones de ofertas al mes',
      '30 minutos de llamadas con el Abogado Virtual al mes',
      'Soporte prioritario por correo',
      'Historial completo y exportación',
    ],
    recommended: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    tagline: 'Para entidades y empresas con volumen alto y necesidades específicas.',
    pricePerMonthPEN: 0,
    quotas: {
      chat_message: Number.POSITIVE_INFINITY,
      generator_call: Number.POSITIVE_INFINITY,
      evaluation_run: Number.POSITIVE_INFINITY,
      scraping_admin: Number.POSITIVE_INFINITY,
      voice_call_minute: 120,
    },
    highlights: [
      'Uso ilimitado de chat, generadores y evaluador',
      '120 minutos de llamadas con el Abogado Virtual al mes',
      'Voces premium adicionales',
      'Múltiples usuarios bajo una sola cuenta',
      'Onboarding personalizado',
      'API de integración con sistemas internos',
      'SLA y soporte dedicado',
    ],
    contactSales: true,
  },
];

export function getTier(id: SubscriptionTier): TierDefinition {
  return TIERS.find((t) => t.id === id) || TIERS[0];
}

export function getQuota(tier: SubscriptionTier, feature: FeatureKey): number {
  return getTier(tier).quotas[feature] ?? 0;
}

/** Label legible de cada feature, útil en banners y errores. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  chat_message: 'mensajes de chat',
  generator_call: 'generaciones de documentos',
  evaluation_run: 'evaluaciones de ofertas',
  scraping_admin: 'corridas del bot de scraping',
  voice_call_minute: 'minutos de llamada con el Abogado Virtual',
};
