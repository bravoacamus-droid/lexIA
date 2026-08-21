/**
 * Índice del documento: qué apartados hay y cuáles están completos.
 *
 * POR QUÉ EXISTE
 *
 * El panel de la derecha listaba solo lo que faltaba, sin decir qué
 * estaba hecho y sin llevar a ninguna parte. César pidió tres cosas
 * (18/08/2026): una X roja en lo que falta y una palomita verde en lo
 * completado, que sea un índice donde al pulsar te lleve al apartado, y
 * que se pueda subir y bajar por su cuenta.
 *
 * UNA SOLA VERDAD
 *
 * Lo que aquí se marca como pendiente tiene que ser EXACTAMENTE lo que
 * el ensamblador anota como falta al armar el Word. Dos listas de
 * pendientes que no coinciden son peores que ninguna: el usuario ve
 * todo en verde y el documento sale con huecos. La prueba
 * `scripts/probar-indice.ts` compara las dos listas y se cae si se
 * separan.
 */
import type {
  Bloque,
  BloqueCampo,
  PlantillaRequerimiento,
  Seccion,
} from './plantilla-tipos';
import {
  OPCION_PROPIA,
  apartadosOrdenados,
  bloqueVisible,
  campoOpcionPropia,
  type RespuestasRequerimiento,
} from './ensamblador';

/** Estado de un apartado en el índice. */
export type EstadoEntrada = 'completo' | 'pendiente' | 'opcional';

export interface EntradaIndice {
  /** Id del bloque; también identifica la entrada. */
  id: string;
  etiqueta: string;
  estado: EstadoEntrada;
  /** Id del elemento del formulario al que hay que llevar al usuario. */
  ancla: string;
}

export interface GrupoIndice {
  id: string;
  /** Numeración que le toca en el documento: 1, 1.1, 1.1.1… */
  numero: string;
  titulo: string;
  /** Profundidad, para sangrar el índice como el documento. */
  nivel: number;
  /**
   * Apartado de primer nivel al que pertenece.
   *
   * Lo necesita el índice para desplegar el apartado antes de saltar:
   * un enlace que lleva a algo plegado no lleva a ninguna parte.
   */
  raiz: string;
  ancla: string;
  entradas: EntradaIndice[];
  completas: number;
  pendientes: number;
}

/** Id del elemento del formulario que envuelve a un bloque. */
export const anclaBloque = (id: string) => `bloque-${id}`;
/** Id del elemento del formulario que envuelve a un apartado entero. */
export const anclaApartado = (id: string) => `apartado-${id}`;

/** Un párrafo no tiene id propio: se ancla por su primer hueco. */
function idDeBloque(b: Bloque): string | null {
  if (b.clase === 'parrafo') return b.campos[0]?.id ?? null;
  return 'id' in b && typeof b.id === 'string' ? b.id : null;
}

export function construirIndice(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
): GrupoIndice[] {
  const grupos: GrupoIndice[] = [];

  const campo = (c: BloqueCampo, ancla: string, entradas: EntradaIndice[]) => {
    const lleno = !!(respuestas.campos[c.id] ?? '').trim();
    entradas.push({
      id: c.id,
      etiqueta: c.etiqueta,
      estado: lleno ? 'completo' : c.obligatorio ? 'pendiente' : 'opcional',
      ancla,
    });
  };

  const bloques = (bs: Bloque[], entradas: EntradaIndice[]) => {
    for (const b of bs) {
      // Lo que no está en el documento no se cuenta como pendiente.
      if (!bloqueVisible(b, respuestas)) continue;
      const idBloque = idDeBloque(b);
      const ancla = idBloque ? anclaBloque(idBloque) : '';
      switch (b.clase) {
        case 'campo':
          campo(b, ancla, entradas);
          break;

        case 'parrafo':
          for (const c of b.campos) campo(c, ancla, entradas);
          break;

        case 'redactado':
          entradas.push({
            id: b.id,
            etiqueta: b.etiqueta,
            estado: (respuestas.redacciones[b.id] ?? '').trim() ? 'completo' : 'pendiente',
            ancla,
          });
          break;

        case 'tabla': {
          const minimo = b.minimo ?? 0;
          const conContenido = (respuestas.tablas[b.id] ?? []).filter((f) =>
            f.some((c) => c.trim()),
          ).length;
          entradas.push({
            id: b.id,
            etiqueta: b.etiqueta,
            estado:
              conContenido >= Math.max(minimo, 1)
                ? 'completo'
                : minimo > 0
                  ? 'pendiente'
                  : 'opcional',
            ancla,
          });
          break;
        }

        case 'opcion': {
          const elegida = respuestas.opciones[b.id] ?? '';
          const propiaEscrita = !!(respuestas.campos[campoOpcionPropia(b.id)] ?? '').trim();
          const completa =
            !!elegida && (elegida !== OPCION_PROPIA || propiaEscrita);
          entradas.push({
            id: b.id,
            etiqueta: b.etiqueta,
            estado: completa ? 'completo' : 'pendiente',
            ancla,
          });
          break;
        }

        default:
          // Fijos, notas y títulos no se rellenan: no son del índice.
          break;
      }
    }
  };

  /**
   * Un grupo por sección y otro por cada subsección.
   *
   * El índice se lee como el documento —6, 6.1, 6.2— en vez de colgar
   * treinta campos de un solo numeral. Una sección que solo trae texto
   * invariable no tiene entradas, pero sigue en el índice: sirve para
   * llegar hasta ella.
   */
  const recorrer = (s: Seccion, numero: string, nivel: number, raiz: string) => {
    if (s.condicion && !respuestas.condiciones[s.condicion]) return;
    const entradas: EntradaIndice[] = [];
    bloques(s.bloques, entradas);
    grupos.push({
      id: s.id,
      numero,
      titulo: s.titulo,
      nivel,
      raiz,
      ancla: anclaApartado(s.id),
      entradas,
      completas: entradas.filter((e) => e.estado === 'completo').length,
      pendientes: entradas.filter((e) => e.estado === 'pendiente').length,
    });
    let sub = 0;
    for (const h of s.subsecciones ?? []) {
      if (h.condicion && !respuestas.condiciones[h.condicion]) continue;
      sub++;
      recorrer(h, `${numero}.${sub}`, nivel + 1, raiz);
    }

    // Y los que añadió la entidad dentro de esta sección.
    for (const extra of respuestas.extras) {
      if (extra.dentroDe !== s.id) continue;
      sub++;
      const titulo = extra.titulo.trim() || 'Apartado adicional';
      const completo = !!extra.texto.trim();
      grupos.push({
        id: extra.id,
        numero: `${numero}.${sub}`,
        titulo,
        nivel: nivel + 1,
        raiz,
        ancla: anclaApartado(extra.id),
        entradas: [
          {
            id: extra.id,
            etiqueta: titulo,
            estado: completo ? 'completo' : 'pendiente',
            ancla: anclaApartado(extra.id),
          },
        ],
        completas: completo ? 1 : 0,
        pendientes: completo ? 0 : 1,
      });
    }
  };

  let n = 0;
  for (const apartado of apartadosOrdenados(plantilla, respuestas)) {
    if (apartado.tipo === 'extra') {
      const { extra } = apartado;
      n++;
      const titulo = extra.titulo.trim() || 'Apartado adicional';
      const completo = !!extra.texto.trim();
      grupos.push({
        id: extra.id,
        numero: String(n),
        titulo,
        nivel: 1,
        raiz: extra.id,
        ancla: anclaApartado(extra.id),
        entradas: [
          {
            id: extra.id,
            etiqueta: titulo,
            estado: completo ? 'completo' : 'pendiente',
            ancla: anclaApartado(extra.id),
          },
        ],
        completas: completo ? 1 : 0,
        pendientes: completo ? 0 : 1,
      });
      continue;
    }

    const s = apartado.seccion;
    if (s.condicion && !respuestas.condiciones[s.condicion]) continue;
    n++;
    recorrer(s, String(n), 1, s.id);
  }

  return grupos;
}

/** Cuentas del documento entero, para la cabecera del índice. */
export function resumenIndice(grupos: GrupoIndice[]) {
  const entradas = grupos.flatMap((g) => g.entradas);
  return {
    total: entradas.length,
    completas: entradas.filter((e) => e.estado === 'completo').length,
    pendientes: entradas.filter((e) => e.estado === 'pendiente').length,
    opcionales: entradas.filter((e) => e.estado === 'opcional').length,
  };
}
