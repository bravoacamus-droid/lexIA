/**
 * Qué tiene que subsanar un postor, requisito a requisito.
 *
 * Vivía dentro de `carta.ts`, y la pantalla necesita saberlo para
 * ofrecer la carta solo a quien tiene algo que subsanar. Importar
 * `carta.ts` desde el navegador arrastraba la librería de Word entera;
 * esto es puro y no pesa nada.
 */
import type { Etapa, ResultadoPostor } from './etapas';

/**
 * Lo que hay que subsanar, etapa por etapa.
 *
 * Cada requisito observado da UNA fila, con dos cosas distintas: qué se
 * le encontró y qué tiene que presentar. Venían por separado —la ficha
 * dice lo primero y `subsanaciones` lo segundo— y listarlas sueltas
 * repetía el mismo defecto dos veces con otras palabras, que en una
 * carta que se notifica queda como si fueran dos observaciones.
 */
export interface Observado {
  etapa: Etapa;
  requisito: string;
  hallazgo: string;
  quePresentar: string;
}

/** Palabras con las que decidir si dos textos hablan de lo mismo. */
function significativas(t: string): Set<string> {
  return new Set(
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .match(/[a-z]{5,}/g) ?? [],
  );
}

export function loObservado(p: ResultadoPostor): Observado[] {
  const fuera: Observado[] = [];
  for (const e of p.etapas) {
    if (e.omitida) continue;
    const sueltas = [...(e.subsanaciones ?? [])];

    for (const f of e.fichas) {
      if (f.resultado !== 'subsanable') continue;
      // De las subsanaciones pendientes, la que más palabras comparte
      // con este requisito es la que le corresponde.
      const clave = significativas(`${f.requisito} ${f.hallazgo ?? ''}`);
      let mejor = -1;
      let mejorPuntos = 0;
      sueltas.forEach((s, i) => {
        const puntos = [...significativas(s)].filter((w) => clave.has(w)).length;
        if (puntos > mejorPuntos) {
          mejorPuntos = puntos;
          mejor = i;
        }
      });
      const quePresentar = mejorPuntos >= 2 ? sueltas.splice(mejor, 1)[0] : '';
      fuera.push({
        etapa: e.etapa,
        requisito: f.requisito,
        hallazgo: (f.hallazgo ?? '').trim(),
        quePresentar: quePresentar.trim(),
      });
    }

    // Lo que se pidió sin quedar atado a una ficha se lista igual: es
    // preferible una fila de más que dejar de pedir algo.
    for (const s of sueltas) {
      fuera.push({ etapa: e.etapa, requisito: 'Subsanación requerida', hallazgo: '', quePresentar: s.trim() });
    }
  }
  return fuera;
}

/** ¿Hay algo que notificar? Si no, no se genera carta. */
export function tieneQueSubsanar(p: ResultadoPostor): boolean {
  return loObservado(p).length > 0;
}
