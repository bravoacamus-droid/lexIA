/**
 * Límites propios de algunos planes, además de los créditos. Viven aquí,
 * sin nada de servidor, porque los usan las dos puntas: el servidor
 * (`creditos.ts`, que cobra y rechaza) y la pantalla (el asistente del
 * evaluador y el consumo estimado, que avisan antes de subir o pulsar).
 *
 *   · Consulta: hasta 3 operaciones combinadas al mes de requerimientos
 *     de contratos menores (generar, evaluar o ambas), no 3 por cada tipo.
 *   · Profesional: hasta 3 análisis de ofertas al mes, de 3 ofertas como
 *     máximo cada uno (César, 18/10/2026; antes eran 2).
 *
 * Tamaño de cada oferta (César, 18/10/2026: «el plan profesional debe
 * aceptar cada oferta hasta 60 megas […] y en el plan Especialista […]
 * hasta 120 megas»). Equipos y Organizaciones tienen las funciones de
 * Especialista, así que su tope es el mismo. Es por archivo de oferta
 * ORIGINAL: que el navegador lo parta en piezas para subirlo no cambia
 * cuánto pesa la oferta.
 */
import { planDelCatalogo, type IdDePlan } from './catalogo';
import type { Herramienta } from './creditos';

export const LIMITES = {
  consulta: { herramientas: ['requerimiento_menor', 'evaluacion_requerimiento_menor'] as Herramienta[], porMes: 3 },
  profesional: { herramientas: ['evaluacion_ofertas'] as Herramienta[], porMes: 3, ofertasPorAnalisis: 3 },
};

/** Ofertas por análisis cuando el plan no fija otro tope (lo que admite el asistente). */
export const MAX_OFERTAS_POR_ANALISIS = 5;

export function ofertasPorAnalisis(plan: IdDePlan): number {
  return plan === 'profesional' ? LIMITES.profesional.ofertasPorAnalisis : MAX_OFERTAS_POR_ANALISIS;
}

/** Megabytes por archivo de oferta. Sin entrada: el plan no tiene evaluación de ofertas. */
export const MB_POR_OFERTA: Partial<Record<IdDePlan, number>> = {
  profesional: 60,
  especialista: 120,
  equipos: 120,
  organizaciones: 120,
};

export const MB = 1024 * 1024;

/** Bytes por archivo de oferta del plan, o null si el plan no evalúa ofertas. */
export function bytesPorOferta(plan: IdDePlan): number | null {
  const mb = MB_POR_OFERTA[plan];
  return mb ? mb * MB : null;
}

/** «La oferta X pesa 75 MB y tu plan Profesional acepta hasta 60 MB por oferta…». */
export function mensajeDeTamano(plan: IdDePlan, nombre: string, bytes: number): string {
  const tope = MB_POR_OFERTA[plan] ?? 0;
  const pesa = (bytes / MB).toLocaleString('es-PE', { maximumFractionDigits: 1 });
  const base = `La oferta «${nombre}» pesa ${pesa} MB y tu plan ${planDelCatalogo(plan).nombre} acepta hasta ${tope} MB por oferta.`;
  return plan === 'profesional'
    ? `${base} Comprímela o pasa al plan Especialista, que acepta hasta ${MB_POR_OFERTA.especialista} MB por oferta.`
    : `${base} Comprímela (por ejemplo, en ilovepdf.com/es/comprimir_pdf) y vuelve a subirla.`;
}

/** Días calendario que dura una recarga desde que se activa (César, 18/10/2026). */
export const DIAS_DE_RECARGA = 30;
