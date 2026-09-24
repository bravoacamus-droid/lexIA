/**
 * El número de cada observación.
 *
 * Aparte y sin dependencias porque lo usan la pantalla —que corre en el
 * navegador— y el cuadro de cambios —que arrastra la librería de Word—.
 * Los dos numeran igual, para que «la observación 3» sea la misma en
 * pantalla, en el comentario al margen del Word y en el cuadro.
 */
const ORDEN_SEVERIDAD = ['critico', 'alto', 'medio', 'bajo'];

/** De los críticos a los bajos y, dentro de cada severidad, como llegaron. */
export function numerarHallazgos<H extends { id: string; severidad: string }>(
  hallazgos: H[],
): Array<{ numero: number; hallazgo: H }> {
  const rango = (s: string) => {
    const i = ORDEN_SEVERIDAD.indexOf(s);
    return i < 0 ? ORDEN_SEVERIDAD.length : i;
  };
  return [...hallazgos]
    .map((h, i) => ({ h, i }))
    .sort((a, b) => rango(a.h.severidad) - rango(b.h.severidad) || a.i - b.i)
    .map(({ h }, k) => ({ numero: k + 1, hallazgo: h }));
}
