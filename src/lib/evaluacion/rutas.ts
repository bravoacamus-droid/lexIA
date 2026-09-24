/**
 * A qué pantalla va cada evaluación, según su modo.
 *
 * Las cuatro evaluaciones se guardan en la misma tabla. Cuando una lista
 * las mezcla —el inicio, las últimas de «Evaluar»—, cada una tiene que
 * abrir la suya: una evaluación de bases abierta en el evaluador de
 * ofertas es una página rota.
 */
export type ModoDeEvaluacion = 'committee' | 'self_review' | 'tdr_audit' | 'bases_audit';

const RUTAS: Record<ModoDeEvaluacion, string> = {
  committee: '/evaluador',
  self_review: '/revision-oferta',
  tdr_audit: '/revisor-tdr',
  bases_audit: '/evaluar/bases',
};

export function rutaDeEvaluacion(modo: string | null | undefined, id: string): string {
  return `${RUTAS[(modo as ModoDeEvaluacion) ?? 'committee'] ?? RUTAS.committee}/${id}`;
}
