/**
 * Redactar de una vez todo lo que se pueda, desde el mismo relato.
 *
 * La entrevista resuelve los interruptores; esto resuelve los textos,
 * que son la otra mitad de lo que César llamó tedioso. En Bienes en
 * General son treinta y cinco apartados redactados y cuatro campos
 * largos: treinta y nueve cajas en blanco delante de una persona.
 *
 * NO ESCRIBE UN CAMINO NUEVO. Cada apartado se redacta con el mismo
 * `promptSistema` / `promptUsuario` del botón de un solo apartado, con
 * su instrucción, su método y su ejemplo, y con el mismo sustento
 * normativo. Lo único propio de aquí es a cuáles les toca y cuántos a
 * la vez.
 *
 * NO PISA NADA. Solo se redacta lo que está EN BLANCO y dentro de un
 * apartado encendido. Lo que ya escribió el área usuaria es suyo; para
 * mejorarlo está el botón de cada apartado, que sí le envía su texto.
 */
import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import type {
  BloqueCampo,
  BloqueRedactado,
  PlantillaRequerimiento,
  Seccion,
} from './plantilla-tipos';
import {
  apartadosOrdenados,
  bloqueVisible,
  type RespuestasRequerimiento,
  seccionVisible,
} from './ensamblador';
import {
  consultaNormativa,
  limpiarRedaccion,
  promptSistema,
  promptUsuario,
  redaccionUtil,
  type ContextoRedaccion,
} from './redactor';
import { sustentoNormativo } from './sustento';

/**
 * Un campo de texto largo se trata como un apartado redactable más.
 *
 * Cuando el campo es el hueco de un párrafo hay que decírselo al modelo
 * con la frase entera: si no, devuelve "Se consideran servicios
 * similares aquellos que…" para un párrafo que ya empieza con "Se
 * consideran servicios similares a los siguientes", y el documento sale
 * repitiendo la frase.
 */
export function adaptarCampo(
  c: { id: string; etiqueta: string; ayuda: string; metodo?: string },
  parrafo?: string,
): BloqueRedactado {
  const instruccion = parrafo
    ? `${c.ayuda}.

Tu texto se inserta en el hueco de esta frase del documento:
"${parrafo.replace(/\{\{[^}]+\}\}/g, '______')}"
Escribe SOLO lo que va en el hueco, sin repetir el resto de la frase y sin volver a introducir el tema.`
    : c.ayuda;
  return {
    clase: 'redactado',
    id: c.id,
    etiqueta: c.etiqueta,
    instruccion,
    metodo: c.metodo,
    extension: 'parrafo',
  };
}

/** Dónde se guarda el texto de cada apartado que se va a redactar. */
export interface PorRedactar {
  bloque: BloqueRedactado;
  destino: 'redacciones' | 'campos';
}

const vacio = (t?: string) => !(t ?? '').trim();

/**
 * Los apartados encendidos que están en blanco.
 *
 * La visibilidad se decide con las mismas piezas que usan el ensamblador
 * y el índice —`apartadosOrdenados` y `bloqueVisible`— y no con una
 * copia: un apartado que la pantalla esconde y esto redactara sería
 * texto pagado que no sale en el documento.
 */
export function apartadosPorRedactar(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
): PorRedactar[] {
  const salida: PorRedactar[] = [];

  const recorrerSeccion = (s: Seccion) => {
    if (!seccionVisible(s, respuestas)) return;
    for (const b of s.bloques) {
      if (!bloqueVisible(b, respuestas)) continue;
      if (b.clase === 'redactado') {
        if (vacio(respuestas.redacciones[b.id])) salida.push({ bloque: b, destino: 'redacciones' });
      } else if (b.clase === 'campo') {
        const c = b as BloqueCampo;
        if (c.tipo === 'texto_largo' && vacio(respuestas.campos[c.id])) {
          salida.push({ bloque: adaptarCampo(c), destino: 'campos' });
        }
      } else if (b.clase === 'parrafo') {
        for (const c of b.campos) {
          if (c.tipo === 'texto_largo' && vacio(respuestas.campos[c.id])) {
            salida.push({ bloque: adaptarCampo(c, b.texto), destino: 'campos' });
          }
        }
      }
    }
    for (const hija of s.subsecciones ?? []) recorrerSeccion(hija);
  };

  for (const apartado of apartadosOrdenados(plantilla, respuestas)) {
    if (apartado.tipo === 'extra') continue;
    recorrerSeccion(apartado.seccion);
  }
  return salida;
}

export interface TextoRedactado {
  bloque_id: string;
  etiqueta: string;
  destino: 'redacciones' | 'campos';
  texto: string;
  con_sustento: boolean;
  tokens: { entrada: number; salida: number };
}

export interface ResultadoLote {
  textos: TextoRedactado[];
  /** Los que el modelo no supo devolver. Se dicen, no se esconden. */
  fallidos: Array<{ bloque_id: string; etiqueta: string; motivo: string }>;
}

/**
 * Cuántos apartados se redactan a la vez.
 *
 * Cada uno son dos llamadas —el sustento y el modelo—. De cuatro en
 * cuatro, treinta y nueve apartados salen en algo menos de un minuto
 * sin que la cuota se queje; de uno en uno pasaban de cinco minutos y
 * la función se cortaba antes de terminar.
 */
const A_LA_VEZ = 4;

export async function redactarEnLote(
  plantilla: PlantillaRequerimiento,
  pendientes: PorRedactar[],
  contexto: ContextoRedaccion,
  alTerminarUno?: (hechos: number, total: number) => void,
): Promise<ResultadoLote> {
  const textos: TextoRedactado[] = [];
  const fallidos: ResultadoLote['fallidos'] = [];
  let hechos = 0;

  const uno = async ({ bloque, destino }: PorRedactar) => {
    try {
      const sustento = await sustentoNormativo(consultaNormativa(plantilla, bloque, contexto));
      const r = await generateText({
        model: chatModel,
        system: promptSistema(plantilla),
        prompt: promptUsuario(bloque, { ...contexto, contextoNormativo: sustento }),
        temperature: 0.3,
      });
      const texto = limpiarRedaccion(r.text ?? '', bloque);
      if (!redaccionUtil(texto)) {
        fallidos.push({ bloque_id: bloque.id, etiqueta: bloque.etiqueta, motivo: 'vacío' });
        return;
      }
      textos.push({
        bloque_id: bloque.id,
        etiqueta: bloque.etiqueta,
        destino,
        texto,
        con_sustento: sustento.length > 0,
        tokens: {
          entrada: r.usage?.promptTokens ?? 0,
          salida: r.usage?.completionTokens ?? 0,
        },
      });
    } catch (e) {
      fallidos.push({
        bloque_id: bloque.id,
        etiqueta: bloque.etiqueta,
        motivo: (e as Error).message.slice(0, 120),
      });
    } finally {
      hechos++;
      alTerminarUno?.(hechos, pendientes.length);
    }
  };

  const cola = [...pendientes];
  const obreros = Array.from({ length: Math.min(A_LA_VEZ, cola.length) }, async () => {
    for (;;) {
      const siguiente = cola.shift();
      if (!siguiente) return;
      await uno(siguiente);
    }
  });
  await Promise.all(obreros);

  // Se devuelven en el orden del documento, no en el que fueron
  // terminando: el usuario los va a leer de arriba abajo.
  const orden = new Map(pendientes.map((p, i) => [p.bloque.id, i]));
  textos.sort((a, b) => (orden.get(a.bloque_id) ?? 0) - (orden.get(b.bloque_id) ?? 0));
  return { textos, fallidos };
}
