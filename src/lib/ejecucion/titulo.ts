import type { Ficha } from './tipos';

/**
 * El nombre del expediente, en cuanto se sabe de qué contrato es: el
 * número de contrato y el objeto, como en el ejemplo de César
 * («EXPEDIENTE CONTRACTUAL — Contrato N.° 015-2026»). Solo reemplaza el
 * nombre provisional; si el usuario lo renombró, no se toca.
 */
export function tituloDelExpediente(actual: string, ficha: Ficha): string | null {
  if (!actual.startsWith('Nuevo expediente')) return null;
  const numero = ficha.numero_contrato?.valor?.trim();
  const objeto = ficha.objeto?.valor?.trim();
  if (!numero && !objeto) return null;
  const n = numero ? (/^contrato/i.test(numero) ? numero.replace(/^CONTRATO/, 'Contrato') : `Contrato ${numero}`) : '';
  const o = objeto ? objeto.charAt(0).toUpperCase() + objeto.slice(1) : '';
  const t = [n, o].filter(Boolean).join(' — ');
  return t.length > 180 ? `${t.slice(0, 177)}…` : t;
}
