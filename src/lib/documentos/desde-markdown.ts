/**
 * De Markdown a piezas, para lo que el modelo escribe a su manera.
 *
 * El requerimiento, el acta y las cartas se arman ya como piezas. El chat
 * generador no: el modelo devuelve un informe, una carta o unos términos
 * de referencia en Markdown, con su propia numeración. Antes ese
 * Markdown iba directo a `docx-from-markdown.ts`, que lo pintaba con el
 * estilo de la aplicación —todas las tablas iguales, sin sangría francesa
 * y con «Generado con A-LexIA» encima—. Ahora se traduce a piezas y lo
 * compone el mismo `word.ts` que los modelos de César.
 *
 * Lo que se reconoce, medido sobre las respuestas guardadas del chat:
 *
 *   · `#` es el título del documento y el primer `##` sin número, su
 *     subtítulo; los dos van centrados.
 *   · `## I. ANTECEDENTES`, `### 4.1. Alcance`: apartados con su numeral,
 *     que se separa del texto para colgarlo con sangría francesa. El
 *     numeral no se inventa: si el modelo no numeró, no se numera.
 *   · Listas con guion, con número o con letra; cuadros con barras;
 *     citas (`>`); los separadores `---`, que en un documento sobran.
 *
 * No toca el contenido. Lo que no reconoce sale como párrafo.
 */
import { normalizarMarkdownModelo } from '@/lib/markdown/normalizar-modelo';
import type { MarcaDePieza, Pieza, PiezaLista } from './piezas';

/** «I.», «IV.», «4.1.», «4.1», «a)», «A.» al principio de un título. */
const NUMERAL = /^((?:[IVXLC]{1,6}|\d{1,2}(?:\.\d{1,2}){0,3}|[A-Za-z])[.)])\s+(.+)$|^(\d{1,2}(?:\.\d{1,2}){1,3})\s+(.+)$/;

/** Quita el par de negritas que envuelve un título entero. */
const sinNegritaEnvolvente = (t: string) => t.replace(/^\*\*(.+)\*\*:?$/, '$1').trim();

/** Las celdas de una fila de cuadro, respetando la barra escapada. */
function celdas(linea: string): string[] {
  const interior = linea.trim().replace(/^\|/, '').replace(/\|$/, '');
  return interior.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
}

function marcaDeLinea(linea: string): { marca: MarcaDePieza; texto: string } | null {
  let m = linea.match(/^[-*•]\s+(.+)$/);
  if (m) return { marca: 'vineta', texto: m[1] };
  m = linea.match(/^\d{1,3}[.)]\s+(.+)$/);
  if (m) return { marca: 'numero', texto: m[1] };
  m = linea.match(/^[a-z][)]\s+(.+)$/i);
  if (m) return { marca: 'literal', texto: m[1] };
  return null;
}

/**
 * Las marcas de fuente del chat —«[9]», «[1], [4]»— remiten a la lista
 * de fuentes que se ve en la pantalla de la conversación. En el Word esa
 * lista no está y la marca no lleva a ninguna parte: sale como un número
 * suelto entre corchetes. Se quitan del documento, con el espacio que
 * las precede.
 */
const MARCA_DE_FUENTE = /\s?\[\d{1,3}\](?:\s*,\s*\[\d{1,3}\])*/g;

export function markdownAPiezas(markdown: string): Pieza[] {
  const lineas = normalizarMarkdownModelo(markdown ?? '')
    .replace(MARCA_DE_FUENTE, '')
    .split('\n');
  const piezas: Pieza[] = [];
  let parrafo: string[] = [];
  let lista: PiezaLista | null = null;
  let hayApartado = false;
  let hayEncabezado = false;

  const cerrarParrafo = () => {
    const t = parrafo.join(' ').replace(/\s+/g, ' ').trim();
    if (t) piezas.push({ clase: 'parrafo', texto: t });
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista && lista.elementos.length > 0) piezas.push(lista);
    lista = null;
  };
  const cerrarTodo = () => {
    cerrarParrafo();
    cerrarLista();
  };

  for (let i = 0; i < lineas.length; i++) {
    const cruda = lineas[i];
    const linea = cruda.trim();

    if (!linea) {
      cerrarTodo();
      continue;
    }
    // Los separadores del chat no son parte del documento.
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(linea)) {
      cerrarTodo();
      continue;
    }

    const titulo = linea.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (titulo) {
      cerrarTodo();
      const nivelMd = titulo[1].length;
      const texto = sinNegritaEnvolvente(titulo[2]);
      const num = texto.match(NUMERAL);
      if (nivelMd === 1 && !hayEncabezado && !num) {
        piezas.push({ clase: 'titulo', rol: 'encabezado', nivel: 0, texto });
        hayEncabezado = true;
        continue;
      }
      if (nivelMd === 2 && !hayApartado && !num && hayEncabezado) {
        piezas.push({ clase: 'titulo', rol: 'subtitulo', nivel: 0, texto });
        continue;
      }
      hayApartado = true;
      const nivel = Math.max(1, Math.min(nivelMd - 1, 4));
      if (num) {
        piezas.push({
          clase: 'titulo',
          nivel,
          numero: (num[1] ?? num[3]).trim(),
          texto: sinNegritaEnvolvente(num[2] ?? num[4]),
        });
      } else {
        piezas.push({ clase: 'titulo', nivel, texto });
      }
      continue;
    }

    // Un cuadro: la línea con barras y, detrás, la de guiones.
    if (linea.startsWith('|') && /^\|?\s*:?-{3,}/.test((lineas[i + 1] ?? '').trim())) {
      cerrarTodo();
      const columnas = celdas(linea);
      const filas: string[][] = [];
      i += 2;
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        const f = celdas(lineas[i]);
        filas.push(columnas.map((_c, j) => f[j] ?? ''));
        i++;
      }
      i--;
      piezas.push({
        clase: 'tabla',
        columnas,
        filas,
        conContenido: filas.filter((f) => f.some((c) => c)).length,
      });
      continue;
    }

    if (linea.startsWith('>')) {
      cerrarTodo();
      const t = linea.replace(/^>\s?/, '').trim();
      if (t) piezas.push({ clase: 'parrafo', texto: t });
      continue;
    }

    // Una lista; lo que va sangrado debajo de un elemento es parte de él.
    const elemento = marcaDeLinea(linea);
    if (elemento) {
      cerrarParrafo();
      if (!lista || lista.marca !== elemento.marca) {
        cerrarLista();
        lista = { clase: 'lista', marca: elemento.marca, elementos: [] };
      }
      lista.elementos.push(elemento.texto);
      continue;
    }
    if (lista && /^\s{2,}/.test(cruda)) {
      lista.elementos[lista.elementos.length - 1] += ` ${linea}`;
      continue;
    }

    cerrarLista();
    parrafo.push(linea);
  }
  cerrarTodo();
  return piezas;
}
