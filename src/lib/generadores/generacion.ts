/**
 * Generar el requerimiento de una vez, desde lo que cuenta el área
 * usuaria.
 *
 * POR QUÉ EXISTE
 *
 * César, 23/09/2026: «el generador de requerimiento lo estaba revisando,
 * pero no vienen generando como lo esperado, no sé cómo podemos mejorar
 * a fin de que su generación sea sencilla y este sea generado conforme
 * lo regulado en la norma de contrataciones».
 *
 * Se probó como lo usaría él —un servicio de limpieza de doce meses con
 * seis operarios, pago mensual— y salieron cuatro cosas:
 *
 *   · Eran dos botones y un paso intermedio. «Proponer apartados» solo
 *     apagaba lo que no correspondía si además se pulsaba «Aplicar»; si
 *     no, «Redactar lo que esté en blanco» escribía también lo que la
 *     propuesta acababa de descartar.
 *   · Quedaban 48 apartados en blanco de 72. La redacción en lote solo
 *     escribe textos: el plazo, el lugar y el personal que venían en el
 *     relato no llegaban a sus campos ni a sus cuadros.
 *   · Los apartados que no correspondían salían en el Word con un
 *     párrafo explicando que no correspondían.
 *   · Se redactaban exigencias que nadie pidió —un registro sanitario de
 *     saneamiento ambiental para limpiar oficinas—: justo el tipo de
 *     restricción que la norma prohíbe y que César quiere evitar.
 *
 * QUÉ HACE, EN ORDEN
 *
 *   1. Decide los apartados con la entrevista. Lo que no corresponde se
 *      apaga, con su motivo. Lo que no se puede decidir se queda
 *      encendido —César: «todos los botones sin excepción dejar
 *      encendido, el área usuaria apagará en caso no corresponda»— pero
 *      SIN redactar: rellenarlo sería inventar una exigencia. Sale en el
 *      resumen como pregunta.
 *   2. Lleva los datos del relato a sus campos y cuadros, con el mismo
 *      repartidor de «Cargar un proyecto», que no inventa ni convierte
 *      cifras.
 *   3. Redacta lo que queda en blanco. Si el modelo dice que un apartado
 *      no corresponde, no se escribe: se apaga y se dice por qué.
 *
 * NO GUARDA NI PISA. Devuelve los cambios y la pantalla los coloca, como
 * el resto de botones. Solo se escribe lo que está en blanco.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { PlantillaRequerimiento, Seccion } from './plantilla-tipos';
import type { DestinoRespuesta, RespuestasRequerimiento } from './ensamblador';
import { interpretarNecesidad, type DecisionCondicion } from './entrevista';
import {
  condicionesDeclaradas,
  depurarDistribucion,
  destinosDistribucion,
  promptDistribucionSistema,
  promptDistribucionUsuario,
} from './distribuidor';
import { apartadosPorRedactar, motivoNoCorresponde, redactarEnLote } from './redaccion-masiva';

export interface CambioGenerado {
  destino: DestinoRespuesta;
  bloqueId: string;
  texto: string;
  filas?: string[][];
}

export interface ApartadoDecidido {
  id: string;
  titulo: string;
  razon: string;
}

export interface ResultadoGeneracion {
  /** Los interruptores que cambian. Lo que no viene se queda como estaba. */
  condiciones: Record<string, boolean>;
  cambios: CambioGenerado[];
  resumen: {
    apagados: ApartadoDecidido[];
    encendidos: ApartadoDecidido[];
    /** Encendidos y sin redactar: los decide el área usuaria. */
    porDecidir: ApartadoDecidido[];
    /** Campos y cuadros llenados con datos del relato. */
    datos: number;
    /** Textos redactados. */
    redactados: number;
    /** Lo que el modelo no supo devolver. */
    fallidos: number;
    /** Lo que traía el relato y no encaja en el formato. */
    sinUbicar: string[];
  };
  tokens: { entrada: number; salida: number };
}

/**
 * Las condiciones de las que depende cada bloque, de fuera hacia dentro.
 *
 * Incluye la del propio bloque cuando la tiene —el pago anticipado, la
 * conformidad de las accesorias—: son interruptores igual que los de una
 * sección.
 */
function cadenas(plantilla: PlantillaRequerimiento): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  const seccion = (s: Seccion, heredadas: string[]) => {
    const propias = s.condicion ? [...heredadas, s.condicion] : heredadas;
    for (const b of s.bloques) {
      const suya =
        'visibleSi' in b && b.visibleSi?.condicion ? [...propias, b.visibleSi.condicion] : propias;
      if ('id' in b && typeof b.id === 'string') mapa.set(b.id, suya);
      if (b.clase === 'parrafo') for (const c of b.campos) mapa.set(c.id, suya);
    }
    for (const h of s.subsecciones ?? []) seccion(h, propias);
  };
  plantilla.secciones.forEach((s) => seccion(s, []));
  return mapa;
}

const vacio = (t?: string) => !(t ?? '').trim();

export async function generarRequerimiento(
  plantilla: PlantillaRequerimiento,
  respuestasIniciales: RespuestasRequerimiento,
  opts: {
    relato: string;
    denominacion: string;
    organo?: string;
    /**
     * Interruptores que el área usuaria ya confirmó desde el resumen
     * («¿corresponde? Sí»). Mandan sobre lo que diga la entrevista: la
     * duda ya está resuelta, y lo que se espera es que se redacten.
     */
    confirmados?: string[];
    /** Y los que contestó que no: tampoco se le discuten. */
    descartados?: string[];
  },
): Promise<ResultadoGeneracion> {
  const tokens = { entrada: 0, salida: 0 };
  const r: RespuestasRequerimiento = {
    ...respuestasIniciales,
    condiciones: { ...respuestasIniciales.condiciones },
    campos: { ...respuestasIniciales.campos },
    redacciones: { ...respuestasIniciales.redacciones },
    tablas: { ...respuestasIniciales.tablas },
  };
  const condiciones: Record<string, boolean> = {};
  const cambios: CambioGenerado[] = [];
  const cadena = cadenas(plantilla);

  // ── 1. Qué apartados van ──
  const entrevista = await interpretarNecesidad(plantilla, opts.relato);
  const titulo = new Map(entrevista.decisiones.map((d) => [d.id, d.titulo]));
  const apagados: ApartadoDecidido[] = [];
  const encendidos: ApartadoDecidido[] = [];
  const porDecidir: ApartadoDecidido[] = [];
  const decidido = new Map<string, DecisionCondicion['estado']>();
  const confirmados = new Set(opts.confirmados ?? []);
  const descartados = new Set(opts.descartados ?? []);
  for (const d0 of entrevista.decisiones) {
    const d = confirmados.has(d0.id)
      ? { ...d0, estado: 'corresponde' as const, razon: 'Lo confirmaste tú.' }
      : descartados.has(d0.id)
        ? { ...d0, estado: 'no_corresponde' as const, razon: 'Lo descartaste tú.' }
        : d0;
    decidido.set(d.id, d.estado);
    const fila = { id: d.id, titulo: d.titulo, razon: d.razon };
    if (d.estado === 'no_corresponde') {
      condiciones[d.id] = false;
      apagados.push(fila);
    } else if (d.estado === 'corresponde') {
      condiciones[d.id] = true;
      encendidos.push(fila);
    } else if (r.condiciones[d.id] !== false) {
      // Se queda encendido, como pidió César, pero no se redacta.
      porDecidir.push(fila);
    }
  }
  Object.assign(r.condiciones, condiciones);

  const apagado = (id: string) => (cadena.get(id) ?? []).some((c) => r.condiciones[c] === false);
  const pendienteDeDecidir = (id: string) =>
    (cadena.get(id) ?? []).some((c) => decidido.get(c) === 'no_se_sabe');

  // ── 2. Los datos del relato, a sus campos y cuadros ──
  const destinos = destinosDistribucion(plantilla, r).filter(
    (d) => (d.destino === 'campos' || d.destino === 'tablas') && !d.ocupado && !apagado(d.id),
  );
  let sinUbicar: string[] = [];
  /** Interruptores cuyo apartado recibió datos del relato: ya no están en duda. */
  const conDatos = new Set<string>();
  if (destinos.length > 0) {
    try {
      const declaradas = condicionesDeclaradas(plantilla.secciones);
      const res = await generateText({
        model: chatModel,
        system: promptDistribucionSistema(plantilla),
        prompt: promptDistribucionUsuario({
          denominacion: opts.denominacion,
          destinos,
          condiciones: declaradas,
          proyecto: opts.relato,
        }),
        temperature: 0.1,
      });
      tokens.entrada += res.usage?.promptTokens ?? 0;
      tokens.salida += res.usage?.completionTokens ?? 0;
      const reparto = depurarDistribucion(parseJsonLoose(res.text ?? ''), destinos, declaradas);
      for (const a of reparto.asignaciones) {
        const d = destinos.find((x) => x.id === a.apartado_id);
        if (!d) continue;
        if (d.destino === 'tablas' && a.filas?.length) {
          cambios.push({ destino: 'tablas', bloqueId: d.id, texto: '', filas: a.filas });
          r.tablas[d.id] = a.filas;
        } else if (d.destino === 'campos' && a.texto) {
          cambios.push({ destino: 'campos', bloqueId: d.id, texto: a.texto });
          r.campos[d.id] = a.texto;
        } else continue;
        // Un dato colocado enciende su apartado, salvo que la entrevista
        // lo haya descartado: entre las dos manda la que decidió por la
        // naturaleza de la contratación.
        for (const c of a.condiciones) {
          conDatos.add(c);
          if (decidido.get(c) !== 'no_corresponde' && r.condiciones[c] !== true) {
            condiciones[c] = true;
            r.condiciones[c] = true;
          }
        }
      }
      sinUbicar = reparto.sin_ubicar;
    } catch (e) {
      // Sin datos repartidos se sigue: los textos todavía sirven.
      console.error('[generar] reparto fallido:', (e as Error).message.slice(0, 120));
    }
  }

  // ── 3. Los textos que quedan en blanco ──
  const pendientes = apartadosPorRedactar(plantilla, r).filter(
    (p) =>
      !pendienteDeDecidir(p.bloque.id) &&
      vacio(p.destino === 'campos' ? r.campos[p.bloque.id] : r.redacciones[p.bloque.id]),
  );
  const lote = await redactarEnLote(plantilla, pendientes, {
    denominacion: opts.denominacion,
    organo: r.campos.organo || opts.organo,
    aporteUsuario: opts.relato,
  });
  for (const t of lote.textos) {
    tokens.entrada += t.tokens.entrada;
    tokens.salida += t.tokens.salida;
    const motivo = motivoNoCorresponde(t.texto);
    if (motivo) {
      // Se apaga el interruptor más cercano, salvo que la entrevista lo
      // haya dado por necesario: entonces el «no corresponde» contradice
      // lo decidido y el apartado se deja en blanco para el área usuaria.
      const propia = (cadena.get(t.bloque_id) ?? []).at(-1);
      if (propia && decidido.get(propia) !== 'corresponde') {
        condiciones[propia] = false;
        r.condiciones[propia] = false;
        if (!apagados.some((a) => a.id === propia)) {
          apagados.push({ id: propia, titulo: titulo.get(propia) ?? t.etiqueta, razon: motivo });
        }
      }
      continue;
    }
    cambios.push({ destino: t.destino, bloqueId: t.bloque_id, texto: t.texto });
  }
  const redactadosIds = new Set(lote.textos.map((t) => t.bloque_id));

  // Un texto redactado dentro de un apartado que después se apagó no
  // aparecería en el documento: no se manda.
  const utiles = cambios.filter((c) => !apagado(c.bloqueId));

  return {
    condiciones,
    cambios: utiles,
    resumen: {
      apagados,
      encendidos,
      porDecidir: porDecidir.filter((p) => r.condiciones[p.id] !== false && !conDatos.has(p.id)),
      datos: utiles.filter((c) => !redactadosIds.has(c.bloqueId)).length,
      redactados: utiles.filter((c) => redactadosIds.has(c.bloqueId)).length,
      fallidos: lote.fallidos.length,
      sinUbicar,
    },
    tokens,
  };
}
