/**
 * La forma de lo que redacta el Generador libre, según quién escribe.
 *
 * El chat devuelve Markdown y `desde-markdown.ts` lo vuelve piezas. Aquí
 * esas piezas toman la forma de los modelos de César (27/09/2026):
 *
 *   · Los renglones «**PARA:** …», «**ASUNTO:** …», «**REFERENCIA:**» y
 *     sus literales se vuelven el rótulo con los dos puntos en columna, y
 *     debajo va la raya.
 *   · En el escrito del postor, el rótulo «Expediente N.° / Escrito N.° /
 *     Sumilla» y el párrafo del recurrente («…, a usted respetuosamente
 *     digo:») se corren a 5,5 cm, y la nomenclatura del procedimiento va
 *     en un cuadro con la etiqueta sobre gris.
 *   · La letra, la de la unidad: Verdana 9 en Abastecimiento, Arial en
 *     Asesoría Jurídica y la resolución, Arial 11 en el memorándum, Tw Cen
 *     MT 12 en el escrito.
 *
 * No toca el texto: solo su forma.
 */
import type { Pieza, PiezaCuadro } from './piezas';
import { markdownAPiezas } from './desde-markdown';
import {
  FORMATO_ACTA_MODIFICACION,
  FORMATO_DOCUMENTO,
  FORMATO_ESCRITO,
  FORMATO_INFORME_DEC,
  FORMATO_INFORME_LEGAL,
  FORMATO_MEMORANDUM,
  FORMATO_RESOLUCION,
  type Formato,
} from './word';

const ROTULO_OFICIO = /^\*\*(PARA|A|DE|V[ÍI]A|ASUNTO|REFERENCIAS?|FECHA)\s*:?\s*\*\*\s*:?\s*(.*)$/i;
const ROTULO_ESCRITO = /^\*\*((?:Expediente|Escrito|Decreto)\s+N\.?\s*[°º]?|Sumilla)\s*:?\s*\*\*\s*:?\s*(.*)$/i;
const RECURRENTE = /(respetuosamente\s+digo|me\s+presento\s+y\s+expongo|ante\s+usted\s+(?:respetuosamente\s+)?digo)\s*:\s*$/i;
const NOMENCLATURA = /^(ENTIDAD|TIPO\b|OBJETO|CUANT[ÍI]A|NOMENCLATURA|PROCEDIMIENTO|VALOR (ESTIMADO|REFERENCIAL))/i;

const letra = (i: number) => String.fromCharCode(97 + (i % 26));
const escritoDelPostor = (perfil: string) => perfil === 'postor';

/** El formato de cada perfil del Generador libre. */
export function formatoDelChat(perfil: string, markdown: string): Formato {
  switch (perfil) {
    case 'dec':
      return FORMATO_INFORME_DEC;
    case 'area_legal':
      return FORMATO_INFORME_LEGAL;
    case 'area_usuaria':
      return FORMATO_MEMORANDUM;
    case 'titular_entidad':
      return FORMATO_RESOLUCION;
    case 'aga':
      return /^\s*#?\s*\**\s*ACTA\b/im.test(markdown.slice(0, 400)) ? FORMATO_ACTA_MODIFICACION : FORMATO_RESOLUCION;
    case 'postor':
      return FORMATO_ESCRITO;
    default:
      return FORMATO_DOCUMENTO;
  }
}

/** Las piezas del chat con la forma de los modelos. */
export function piezasDelChat(markdown: string, perfil: string): Pieza[] {
  // Los renglones del rótulo suelen venir seguidos, sin línea en blanco, y
  // el Markdown los juntaría en un solo párrafo.
  const separado = (markdown ?? '').replace(
    /\n(?=\*\*(?:PARA|A|DE|V[ÍI]A|ASUNTO|REFERENCIAS?|FECHA|Expediente|Escrito|Decreto|Sumilla)\b[^*\n]{0,24}\*\*)/gi,
    '\n\n',
  );
  const entrada = markdownAPiezas(separado);
  // Los escritos de César no llevan título arriba: empiezan por el rótulo.
  // El modelo lo pone igual («# RECURSO DE APELACIÓN…») aunque se le pida
  // que no; en el Word se omite si va antes del rótulo.
  if (escritoDelPostor(perfil)) {
    const primero = entrada[0];
    const siguiente = entrada[1];
    if (
      primero?.clase === 'titulo' &&
      primero.rol &&
      /^(RECURSO|ESCRITO|SUBSANACI|ABSOLUCI|DESCARGO|APELACI)/i.test(primero.texto) &&
      siguiente?.clase === 'parrafo' &&
      ROTULO_ESCRITO.test(siguiente.texto)
    )
      entrada.shift();
  }
  const escrito = escritoDelPostor(perfil);
  const salida: Pieza[] = [];
  let enRotulo = false;

  const cerrarRotulo = () => {
    if (enRotulo && !escrito) salida.push({ clase: 'raya' });
    enRotulo = false;
  };

  for (let i = 0; i < entrada.length; i++) {
    const p = entrada[i];
    if (p.clase === 'parrafo') {
      const e = escrito ? p.texto.match(ROTULO_ESCRITO) : null;
      if (e) {
        salida.push({ clase: 'rotulo', etiqueta: `${e[1].replace(/\s+/g, ' ').trim()}`, lineas: [e[2].trim()], desplazado: true });
        enRotulo = true;
        continue;
      }
      const o = p.texto.match(ROTULO_OFICIO);
      if (o) {
        const etiqueta = o[1].toUpperCase().replace(/^VIA$/, 'VÍA').replace(/^REFERENCIAS$/, 'REFERENCIA');
        let lineas = o[2].trim() ? [o[2].trim()] : [];
        // «**REFERENCIA:**» y debajo sus literales: van dentro del rótulo.
        const siguiente = entrada[i + 1];
        if (siguiente?.clase === 'lista' && (etiqueta === 'REFERENCIA' || !lineas.length)) {
          lineas = [...lineas, ...siguiente.elementos.map((x, j) => (siguiente.marca === 'vineta' ? x : `**${letra(j)})** ${x}`))];
          i++;
        }
        salida.push({ clase: 'rotulo', etiqueta, lineas: lineas.length ? lineas : [''] });
        enRotulo = true;
        continue;
      }
      if (escrito && RECURRENTE.test(p.texto)) {
        cerrarRotulo();
        salida.push({ ...p, desplazado: true });
        continue;
      }
    }
    if (p.clase === 'tabla' && escrito && p.columnas.length === 2) {
      const etiqueta = (f: string[]) => (f[0] ?? '').replace(/\*/g, '').trim();
      // Se reconoce el cuadro por sus etiquetas, pero no se descarta
      // ninguna fila: el modelo escribe «TIPO Y NÚMERO DE PROCEDIMIENTO» y
      // cosas así. La cabecera entra como fila si es una etiqueta más (el
      // modelo usó la primera fila de datos como cabecera).
      const esNomenclatura = [p.columnas, ...p.filas].filter((f) => NOMENCLATURA.test(etiqueta(f))).length >= 2;
      const filas = NOMENCLATURA.test(etiqueta(p.columnas)) ? [p.columnas, ...p.filas] : p.filas;
      if (esNomenclatura && filas.length) {
        cerrarRotulo();
        const cuadro: PiezaCuadro = {
          clase: 'cuadro',
          proporciones: [45, 55],
          filas: filas.map((f) => [
            { texto: (f[0] ?? '').replace(/\*/g, '').toUpperCase(), gris: true },
            { texto: f[1] ?? '' },
          ]),
        };
        salida.push(cuadro);
        continue;
      }
    }
    cerrarRotulo();
    // «3.1 Con fecha …»: el numeral cuelga y el texto se alinea detrás.
    const numerado = p.clase === 'parrafo' && !p.numero && !p.cita ? p.texto.match(/^(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(.+)$/s) : null;
    if (numerado && p.clase === 'parrafo') salida.push({ ...p, numero: numerado[1], texto: numerado[2] });
    else salida.push(p);
  }
  cerrarRotulo();
  return salida;
}
