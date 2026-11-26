/**
 * Destino seguro para los `?next=` y `?redirect=` que llegan en la URL.
 *
 * Sin esto, `/auth/callback?next=@evil.com` armaba
 * `https://app.lexia.pe@evil.com` (el navegador lo lee como usuario
 * `app.lexia.pe` en el host `evil.com`) y el onboarding aceptaba
 * `next=https://evil.com`: tras iniciar sesión, la víctima terminaba en
 * una página ajena con apariencia de A-LexIA (auditoría del 26/11/2026,
 * S5). Solo se aceptan rutas internas.
 */
export function rutaInterna(destino: string | null | undefined, porDefecto = '/app'): string {
  if (!destino || typeof destino !== 'string') return porDefecto;
  // Una ruta propia empieza con una sola «/». «//host» y «/\host» son
  // URLs de otro sitio para el navegador; «@» o un esquema, también.
  if (!destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/\\')) return porDefecto;
  if (/[\u0000-\u001f\\@]/.test(destino)) return porDefecto;
  try {
    const url = new URL(destino, 'https://interno.invalid');
    if (url.origin !== 'https://interno.invalid') return porDefecto;
    return url.pathname + url.search + url.hash;
  } catch {
    return porDefecto;
  }
}
