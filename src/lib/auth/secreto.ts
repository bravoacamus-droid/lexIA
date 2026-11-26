import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compara un secreto recibido con el esperado sin filtrar por el tiempo
 * de respuesta cuántos caracteres coinciden (`===` corta en el primer
 * carácter distinto). Se comparan los hash para que ambos lados midan lo
 * mismo aunque las longitudes difieran.
 */
export function secretoValido(recibido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!recibido || !esperado) return false;
  const a = createHash('sha256').update(recibido).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

/** Autorización de Vercel Cron: `Authorization: Bearer ${CRON_SECRET}`. */
export function esCronAutorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET?.trim();
  const cabecera = req.headers.get('authorization');
  return secretoValido(cabecera, secreto ? `Bearer ${secreto}` : null);
}
