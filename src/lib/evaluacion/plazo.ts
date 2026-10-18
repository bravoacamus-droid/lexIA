/**
 * El factor «plazo de entrega» (o de ejecución): el plazo ofertado debe
 * respetar el inicio del cómputo que fijan las Bases.
 *
 * POR QUÉ
 *
 * César, documento 15 (17/10/2026), LP Abreviada N° 005-2026-MDK/OC-2. Las
 * Bases: «plazo contractual total máximo de ochenta (80) días calendario,
 * computado a partir del día siguiente de la suscripción del contrato». El
 * Anexo N° 12 de POZO HCJ: «10 (DIEZ) DIAS CALENDARIOS (PARA LA PRIMERA
 * ENTREGA), contados desde el día siguiente del perfeccionamiento del
 * contrato o notificación de la orden de compra según corresponda». A-LexIA
 * le dio los 25 puntos sin advertir el evento alternativo.
 *
 * El Tribunal tiene dos posiciones (las cuatro resoluciones están en la
 * biblioteca):
 *   · No otorgar el puntaje (N° 7895-2026-TCP-S3 y N° 5768-2026-TCP-S2):
 *     el puntaje exige cumplir el hito de cómputo de las Bases; un evento
 *     alternativo o diferido no acredita la mejora.
 *   · No admitir la oferta (N° 6259-2025-TCP-S1 y N° 8674-2026-TCP-S4):
 *     si la condición altera el plazo obligatorio del requerimiento o
 *     genera incertidumbre, el defecto es esencial y no subsanable; quitar
 *     solo el puntaje mantendría en competencia una oferta ajena a las
 *     Bases.
 * En las dos, el factor no da puntaje: eso lo decide el código. Si además
 * corresponde no admitir depende de si la frase altera el plazo
 * obligatorio, y eso lo decide el comité: «la presencia de esa frase, por
 * sí sola, no permite elegir automáticamente una consecuencia».
 */
import type { FichaRequisito } from './etapas';

/** Eventos de inicio que el postor agrega y que las Bases no prevén. */
const ALTERNATIVO =
  /\b(?:o|y\/o|u)\s+(?:desde\s+|a\s+partir\s+de\s+)?(?:la\s+|el\s+)?(?:notificaci[óo]n|recepci[óo]n|emisi[óo]n|entrega)\s+de\s+(?:la\s+)?orden\s+de\s+(?:compra|servicio)(?:\s+seg[úu]n\s+corresponda)?|a\s+partir\s+de\s+la\s+(?:recepci[óo]n|entrega)\s+del?\s+(?:adelanto|terreno|orden)/i;

/** El compromiso del Anexo de plazo: «me comprometo a entregar … en el plazo de …». */
export function compromisoDePlazo(texto: string): { frase: string; pagina: number | null } | null {
  const principal = texto.split(/^=== TOMO \d+/m)[0];
  let pagina: number | null = null;
  const plano = principal.replace(/\r/g, '');
  const rx = /me\s+comprometo\s+a\s+(?:entregar|ejecutar|prestar|realizar)[\s\S]{0,700}?en\s+el\s+plazo\s+de[\s\S]{0,700}?(?:\.\s|\n\n|$)/gi;
  for (const m of plano.matchAll(rx)) {
    const antes = plano.slice(0, m.index);
    const n = [...antes.matchAll(/=== P[áa]gina (\d+) ===/g)].pop()?.[1];
    pagina = n ? Number(n) : null;
    // El del anexo de PLAZO, no el del Anexo N° 3 ni el de la garantía.
    const contexto = plano.slice(Math.max(0, m.index! - 1500), m.index!);
    if (/PLAZO\s+DE\s+(?:ENTREGA|EJECUCI|PRESTACI)/i.test(contexto)) {
      return { frase: m[0].replace(/\s+/g, ' ').trim(), pagina };
    }
  }
  return null;
}

/** Cómo computan las Bases el plazo: «computado a partir del día siguiente de la suscripción del contrato». */
export function hitoDeLasBases(textoBases: string): string | null {
  // El del apartado de plazo del requerimiento, no el de la garantía o el
  // de los pagos, que también se «computan a partir de».
  const hito = /(?:comput\w+|contad\w+)\s+(?:a\s+partir|desde)\s+(?:del?\s+)?(?:d[íi]a\s+siguiente\s+)?(?:de\s+)?(?:la|el)\s+[^.;\n]{3,120}/i;
  for (const m of textoBases.matchAll(/plazo\s+(?:contractual\s+|total\s+)*(?:de\s+)?(?:entrega|ejecuci[óo]n|prestaci[óo]n)|plazo\s+contractual/gi)) {
    const h = textoBases.slice(m.index!, m.index! + 1200).match(hito);
    if (h) return h[0].replace(/\s+/g, ' ').trim();
  }
  return null;
}

export function esFichaDePlazo(f: FichaRequisito): boolean {
  return /plazo\s+de\s+(?:entrega|ejecuci[óo]n|prestaci[óo]n)/i.test(f.requisito);
}

/**
 * Revisa la ficha del factor de plazo. Si el compromiso agrega un inicio
 * del cómputo que las Bases no prevén, el factor no da puntaje y la ficha
 * pasa al comité con las dos posiciones del Tribunal.
 */
export function revisarPlazo(ficha: FichaRequisito, textoOferta: string, textoBases: string): FichaRequisito {
  if (!esFichaDePlazo(ficha)) return ficha;
  const compromiso = compromisoDePlazo(textoOferta);
  if (!compromiso) return ficha;
  const hito = hitoDeLasBases(textoBases);
  const extra = compromiso.frase.match(ALTERNATIVO)?.[0];
  // Si las Bases mismas prevén la orden como inicio, no hay alteración.
  if (!extra || (hito && /orden\s+de\s+(?:compra|servicio)/i.test(hito) && /orden/i.test(extra))) return ficha;

  const donde = compromiso.pagina ? ` (página ${compromiso.pagina})` : '';
  const hallazgo =
    `El Anexo de plazo${donde} dice: «${compromiso.frase.slice(0, 420)}». ` +
    `${hito ? `Las Bases computan el plazo ${hito.replace(/^\w+\s+/, '')}. ` : ''}` +
    `El postor agrega un inicio del cómputo que las Bases no prevén («${extra}»). ` +
    `Primera posición del Tribunal (Resoluciones N° 7895-2026-TCP-S3 y N° 5768-2026-TCP-S2): el puntaje del plazo exige cumplir el hito de cómputo fijado en las Bases; ` +
    `el postor no puede introducir eventos alternativos o diferidos, y al modificar esa regla no acredita la mejora: no corresponde otorgar el puntaje. ` +
    `Segunda posición (Resoluciones N° 6259-2025-TCP-S1 y N° 8674-2026-TCP-S4): si la condición altera el plazo obligatorio del requerimiento o genera incertidumbre sobre su cumplimiento, ` +
    `el defecto afecta un aspecto esencial de la oferta, no es subsanable y corresponde NO ADMITIRLA; limitarse a quitar el puntaje mantendría en competencia una oferta que obliga a la Entidad a condiciones ajenas a las Bases. ` +
    `En ambas posiciones el factor no otorga puntaje (0 puntos). El comité debe decidir si la frase altera el plazo obligatorio —y entonces no se admite la oferta— o solo afecta la mejora evaluada; la frase, por sí sola, no permite elegir la consecuencia.`;
  return {
    ...ficha,
    resultado: 'revision_humana',
    puntaje: 0,
    naturalezaDefecto: 'sustancial',
    confianza: 'alta',
    verificada: true,
    conflicto:
      'No otorgar puntaje (7895-2026-TCP-S3, 5768-2026-TCP-S2) o no admitir la oferta (6259-2025-TCP-S1, 8674-2026-TCP-S4), según si la condición altera el plazo obligatorio.',
    hallazgo,
    evidencia: [{ documento: 'Declaración jurada de plazo', ubicacion: compromiso.pagina ? `Página ${compromiso.pagina}` : undefined, cita: compromiso.frase.slice(0, 400) }, ...(ficha.evidencia ?? [])],
  };
}
