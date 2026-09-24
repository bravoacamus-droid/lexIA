/**
 * La versión mejorada, sobre el Word del área usuaria, con control de
 * cambios.
 *
 * No se rehace el documento: se abre el .docx que subieron y se marcan
 * en él las correcciones como las marcaría una persona con «Control de
 * cambios» activado —lo borrado tachado, lo añadido subrayado— y con un
 * comentario al margen que dice por qué. El formato, las tablas, los
 * logos y los estilos quedan como estaban, y el área usuaria acepta o
 * rechaza cada cambio en su Word. Es su documento; A-LexIA propone.
 *
 * Se marca solo lo que cambia: el pasaje propuesto se compara palabra a
 * palabra con el original y se tachan e insertan las palabras que
 * difieren, no el párrafo entero.
 *
 * Lo que no se puede aplicar con seguridad no se aplica: un pasaje que
 * no aparece, que aparece varias veces, que cruza de un párrafo a otro
 * o que pasa por un campo o una imagen. Esos cambios quedan en el cuadro
 * de cambios, con su motivo, para que alguien los lleve a mano.
 */
import JSZip from 'jszip';
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { comparar, ubicar, apariciones } from './texto';

export interface CambioParaWord {
  id: string;
  textoOriginal: string;
  textoMejorado: string;
  /** Lo que dice el comentario al margen. */
  comentario: string;
}

export interface ResultadoWord {
  buffer: Buffer;
  aplicados: string[];
  noAplicados: Array<{ id: string; motivo: string }>;
}

export interface OpcionesWord {
  autor?: string;
  iniciales?: string;
  fecha?: Date;
}

type $ = cheerio.CheerioAPI;

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

const esElemento = (n: AnyNode): n is Element => n.type === 'tag';
const nombre = (n: AnyNode) => (esElemento(n) ? n.name : '');

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── El contenido de un run, en piezas con longitud ──────────────────

interface Pieza {
  nodo: Element;
  texto: string;
}

/** Lo que un run puede llevar sin que partirlo sea peligroso. */
const TEXTUALES = new Set(['w:t', 'w:tab', 'w:br', 'w:noBreakHyphen', 'w:softHyphen', 'w:lastRenderedPageBreak', 'w:rPr']);

function piezasDelRun(run: Element): Pieza[] | null {
  const piezas: Pieza[] = [];
  for (const h of run.children) {
    if (!esElemento(h)) continue;
    if (!TEXTUALES.has(h.name)) return null; // campo, imagen, nota al pie…
    if (h.name === 'w:rPr') continue;
    if (h.name === 'w:t') {
      piezas.push({ nodo: h, texto: textoDe(h) });
    } else if (h.name === 'w:tab') {
      piezas.push({ nodo: h, texto: '\t' });
    } else if (h.name === 'w:br') {
      // Un salto de página no es parte de una frase.
      if (h.attribs['w:type'] === 'page') return null;
      piezas.push({ nodo: h, texto: '\n' });
    } else if (h.name === 'w:noBreakHyphen') {
      piezas.push({ nodo: h, texto: '-' });
    } else {
      piezas.push({ nodo: h, texto: '' });
    }
  }
  return piezas;
}

function textoDe(n: Element): string {
  return n.children.map((c) => (c.type === 'text' ? (c as unknown as { data: string }).data : '')).join('');
}

interface RunDelParrafo {
  run: Element;
  /** null: el run lleva algo que no se puede partir. */
  piezas: Pieza[] | null;
  texto: string;
  inicio: number;
}

/** Los runs visibles de un párrafo, en orden, con su texto. */
function runsDe(p: Element): RunDelParrafo[] {
  const salida: RunDelParrafo[] = [];
  let pos = 0;
  const visitar = (padre: Element) => {
    for (const h of padre.children) {
      if (!esElemento(h)) continue;
      if (h.name === 'w:r') {
        const piezas = piezasDelRun(h);
        // Un run rígido cuenta como un carácter que no casa con nada, para
        // que ningún pasaje pueda atravesarlo sin que se note.
        const texto = piezas ? piezas.map((x) => x.texto).join('') : '￼';
        salida.push({ run: h, piezas, texto, inicio: pos });
        pos += texto.length;
      } else if (h.name === 'w:hyperlink' || h.name === 'w:smartTag' || h.name === 'w:ins') {
        visitar(h);
      }
    }
  };
  visitar(p);
  return salida;
}

// ── Partir un run en una posición ──────────────────────────────────

/**
 * Parte `run` en dos a `k` caracteres de su inicio y devuelve la segunda
 * mitad, ya insertada detrás. Las dos mitades conservan el formato.
 */
function partirRun($: $, run: Element, k: number): Element {
  const piezas = piezasDelRun(run)!;
  const rPr = run.children.find((h) => nombre(h) === 'w:rPr');
  const segunda = $(`<w:r>${rPr ? $.xml(rPr) : ''}</w:r>`)[0] as Element;
  // Copia los atributos (rsid) para que Word no lo trate como otro run.
  for (const [k2, v] of Object.entries(run.attribs)) segunda.attribs[k2] = v;
  let pos = 0;
  const aMover: AnyNode[] = [];
  for (const pz of piezas) {
    const fin = pos + pz.texto.length;
    if (fin <= k) {
      pos = fin;
      continue;
    }
    if (pos >= k) {
      aMover.push(pz.nodo);
    } else {
      // El corte cae dentro de este w:t.
      const corte = k - pos;
      const resto = pz.texto.slice(corte);
      $(pz.nodo).text(pz.texto.slice(0, corte));
      pz.nodo.attribs['xml:space'] = 'preserve';
      const nuevo = $(`<w:t xml:space="preserve">${escapar(resto)}</w:t>`)[0];
      aMover.push(nuevo);
    }
    pos = fin;
  }
  for (const n of aMover) {
    $(n).remove();
    $(segunda).append(n);
  }
  $(run).after(segunda);
  return segunda;
}

/** Deja un límite de run en `pos` del párrafo. */
function cortarEn($: $, p: Element, pos: number): void {
  for (const r of runsDe(p)) {
    const fin = r.inicio + r.texto.length;
    if (pos > r.inicio && pos < fin && r.piezas) {
      partirRun($, r.run, pos - r.inicio);
      return;
    }
  }
}

// ── El formato de lo insertado ─────────────────────────────────────

/** El orden que exige el esquema dentro de un w:rPr. */
const ORDEN_RPR = [
  'w:rStyle', 'w:rFonts', 'w:b', 'w:bCs', 'w:i', 'w:iCs', 'w:caps', 'w:smallCaps', 'w:strike',
  'w:dstrike', 'w:outline', 'w:shadow', 'w:emboss', 'w:imprint', 'w:noProof', 'w:snapToGrid',
  'w:vanish', 'w:webHidden', 'w:color', 'w:spacing', 'w:w', 'w:kern', 'w:position', 'w:sz',
  'w:szCs', 'w:highlight', 'w:u', 'w:effect', 'w:bdr', 'w:shd', 'w:fitText', 'w:vertAlign',
  'w:rtl', 'w:cs', 'w:em', 'w:lang', 'w:eastAsianLayout', 'w:specVanish', 'w:oMath',
];

/** El rPr de base con color y resaltado de hueco, en su sitio. */
function rPrDeHueco($: $, base: string): string {
  const r = $(`<w:rPr>${base.replace(/^<w:rPr[^>]*>|<\/w:rPr>$/g, '')}</w:rPr>`)[0] as Element;
  $(r)
    .children()
    .filter((_i, h) => nombre(h) === 'w:color' || nombre(h) === 'w:highlight')
    .remove();
  const nuevos = [
    { n: 'w:color', xml: '<w:color w:val="EE0000"/>' },
    { n: 'w:highlight', xml: '<w:highlight w:val="lightGray"/>' },
  ];
  for (const { n, xml } of nuevos) {
    const lugar = ORDEN_RPR.indexOf(n);
    const despues = (r.children.filter(esElemento) as Element[]).find((h) => ORDEN_RPR.indexOf(h.name) > lugar);
    if (despues) $(despues).before(xml);
    else $(r).append(xml);
  }
  return $.xml(r);
}

/** Los runs de un texto insertado: saltos, tabuladores y huecos en rojo. */
function runsInsertados($: $, texto: string, rPr: string): string {
  const trozos = texto.split(/(\[[^\]\n]{2,200}\])/);
  let xml = '';
  for (const t of trozos) {
    if (!t) continue;
    const esHueco = /^\[[^\]]+\]$/.test(t) && !/^\[\d+\]$/.test(t);
    const props = esHueco ? rPrDeHueco($, rPr || '<w:rPr></w:rPr>') : rPr;
    const partes = t.split(/(\n|\t)/);
    let cuerpo = '';
    for (const pz of partes) {
      if (pz === '\n') cuerpo += '<w:br/>';
      else if (pz === '\t') cuerpo += '<w:tab/>';
      else if (pz) cuerpo += `<w:t xml:space="preserve">${escapar(pz)}</w:t>`;
    }
    xml += `<w:r>${props}${cuerpo}</w:r>`;
  }
  return xml;
}

// ── Aplicar un cambio en un párrafo ─────────────────────────────────

interface Marcas {
  siguienteId: () => number;
  autor: string;
  fecha: string;
}

type Edicion = { tipo: 'borra'; inicio: number; fin: number } | { tipo: 'inserta'; pos: number; texto: string };

function aplicarEnParrafo(
  $: $,
  p: Element,
  inicio: number,
  fin: number,
  mejorado: string,
  marcas: Marcas,
  idComentario: number,
): string | null {
  const runs = runsDe(p);
  const texto = runs.map((r) => r.texto).join('');
  // Ningún run rígido dentro del pasaje.
  if (texto.slice(inicio, fin).includes('￼')) return 'el pasaje pasa por un campo, una imagen o una nota al pie';

  const ops = comparar(texto.slice(inicio, fin), mejorado);
  if (!ops.some((o) => o.tipo !== 'igual')) return 'el texto propuesto es igual al original';

  const ediciones: Edicion[] = [];
  let pos = inicio;
  for (const o of ops) {
    if (o.tipo === 'igual') pos += o.texto.length;
    else if (o.tipo === 'borra') {
      ediciones.push({ tipo: 'borra', inicio: pos, fin: pos + o.texto.length });
      pos += o.texto.length;
    } else {
      ediciones.push({ tipo: 'inserta', pos, texto: o.texto });
    }
  }

  // Todos los cortes primero, de derecha a izquierda para no mover los
  // que faltan.
  const cortes = new Set<number>();
  for (const e of ediciones) {
    if (e.tipo === 'borra') {
      cortes.add(e.inicio);
      cortes.add(e.fin);
    } else cortes.add(e.pos);
  }
  for (const c of [...cortes].sort((a, b) => b - a)) cortarEn($, p, c);

  const trasCortes = runsDe(p);
  const rPrEn = (posicion: number): string => {
    const r =
      trasCortes.find((x) => x.inicio <= posicion && posicion < x.inicio + x.texto.length) ??
      trasCortes.filter((x) => x.inicio < posicion).pop() ??
      trasCortes[0];
    const rPr = r?.run.children.find((h) => nombre(h) === 'w:rPr');
    return rPr ? $.xml(rPr) : '';
  };

  const creados: Element[] = [];
  const envoltura = (r: RunDelParrafo) =>
    (r.run.parent as Element | undefined)?.name === 'w:del' ? (r.run.parent as Element) : r.run;

  // De derecha a izquierda: lo de la derecha ya está hecho y las
  // posiciones de la izquierda siguen valiendo.
  for (const e of [...ediciones].reverse()) {
    if (e.tipo === 'borra') {
      const dentro = trasCortes.filter(
        (r) => r.texto.length > 0 && r.inicio >= e.inicio && r.inicio + r.texto.length <= e.fin,
      );
      if (dentro.length === 0) continue;
      const del = $(
        `<w:del w:id="${marcas.siguienteId()}" w:author="${escapar(marcas.autor)}" w:date="${marcas.fecha}"></w:del>`,
      )[0] as Element;
      $(dentro[0].run).before(del);
      for (const r of dentro) {
        for (const h of r.run.children) if (esElemento(h) && h.name === 'w:t') h.name = 'w:delText';
        $(r.run).remove();
        $(del).append(r.run);
      }
      creados.push(del);
    } else {
      const ins = $(
        `<w:ins w:id="${marcas.siguienteId()}" w:author="${escapar(marcas.autor)}" w:date="${marcas.fecha}">${runsInsertados($, e.texto, rPrEn(e.pos === 0 ? 0 : e.pos - 1))}</w:ins>`,
      )[0] as Element;
      // Detrás del run que acaba justo aquí —así, tras un borrado, se lee
      // «~~viejo~~ nuevo»—; si no hay ninguno, delante del que empieza.
      const acaba = trasCortes.filter((r) => r.texto.length > 0 && r.inicio + r.texto.length === e.pos).pop();
      const empieza = trasCortes.find((r) => r.texto.length > 0 && r.inicio === e.pos);
      if (acaba) $(envoltura(acaba)).after(ins);
      else if (empieza) $(envoltura(empieza)).before(ins);
      else $(p).append(ins);
      creados.push(ins);
    }
  }

  // El comentario abarca desde el primer cambio de ESTE hallazgo hasta el
  // último, sin tocar los de otros hallazgos en el mismo párrafo.
  const orden = $(p).find('*').toArray();
  const enOrden = creados
    .map((n) => ({ n, i: orden.indexOf(n) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i);
  if (enOrden.length > 0) {
    $(enOrden[0].n).before(`<w:commentRangeStart w:id="${idComentario}"/>`);
    $(enOrden[enOrden.length - 1].n).after(
      `<w:commentRangeEnd w:id="${idComentario}"/><w:r><w:commentReference w:id="${idComentario}"/></w:r>`,
    );
  }
  return null;
}

// ── El documento ───────────────────────────────────────────────────

function parrafosDe($: $): Element[] {
  return $('*')
    .filter((_i, el) => nombre(el) === 'w:p')
    .toArray() as Element[];
}

const textoDeParrafo = (p: Element) =>
  runsDe(p)
    .map((r) => r.texto)
    .join('');

/** El texto del documento párrafo a párrafo, como lo lee el modelo. */
export async function textoDelWord(docx: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file('word/document.xml')!.async('string');
  const $ = cheerio.load(xml, { xml: true });
  return parrafosDe($)
    .map(textoDeParrafo)
    .map((t) => t.replace(/￼/g, ''))
    .filter((t) => t.trim())
    .join('\n\n');
}

function comentariosXml(
  existente: string | null,
  nuevos: Array<{ id: number; texto: string }>,
  o: { autor: string; iniciales: string; fecha: string },
): string {
  const cuerpo = nuevos
    .map(
      (c) =>
        `<w:comment w:id="${c.id}" w:author="${escapar(o.autor)}" w:date="${o.fecha}" w:initials="${escapar(o.iniciales)}">` +
        c.texto
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `<w:p><w:r><w:t xml:space="preserve">${escapar(l)}</w:t></w:r></w:p>`)
          .join('') +
        '</w:comment>',
    )
    .join('');
  if (existente) {
    // Los Word que arma la librería `docx` —los de nuestro propio
    // generador— traen la parte vacía y autocerrada: «<w:comments …/>».
    // Buscando solo «</w:comments>» los comentarios se perdían sin avisar.
    if (/<w:comments\b[^>]*\/>\s*$/.test(existente)) {
      return existente.replace(/<w:comments\b([^>]*?)\s*\/>\s*$/, `<w:comments$1>${cuerpo}</w:comments>`);
    }
    return existente.replace(/<\/w:comments>\s*$/, `${cuerpo}</w:comments>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:comments xmlns:w="${W}">${cuerpo}</w:comments>`;
}

export async function aplicarControlDeCambios(
  docx: Buffer,
  cambios: CambioParaWord[],
  opciones: OpcionesWord = {},
): Promise<ResultadoWord> {
  const autor = opciones.autor ?? 'A-LexIA';
  const iniciales = opciones.iniciales ?? 'AL';
  const fecha = (opciones.fecha ?? new Date()).toISOString().replace(/\.\d{3}Z$/, 'Z');

  const zip = await JSZip.loadAsync(docx);
  const archivo = zip.file('word/document.xml');
  if (!archivo) throw new Error('El archivo no es un Word (.docx) válido.');
  const xml = await archivo.async('string');
  const $ = cheerio.load(xml, { xml: true });

  // Ids libres para las marcas: por encima de todos los que ya hay.
  const usados = [...xml.matchAll(/w:id="(\d+)"/g)].map((m) => Number(m[1]));
  let id = Math.max(0, ...usados) + 1;
  const comentariosPrevios = await zip.file('word/comments.xml')?.async('string');
  const idsComentario = [...(comentariosPrevios ?? '').matchAll(/<w:comment\b[^>]*w:id="(\d+)"/g)].map((m) => Number(m[1]));
  let idComentario = Math.max(-1, ...idsComentario, ...usados) + 1;
  const marcas: Marcas = { siguienteId: () => id++, autor, fecha };

  const aplicados: string[] = [];
  const noAplicados: Array<{ id: string; motivo: string }> = [];
  const comentarios: Array<{ id: number; texto: string }> = [];

  for (const c of cambios) {
    const parrafos = parrafosDe($);
    const textos = parrafos.map(textoDeParrafo);
    const donde = textos
      .map((t, i) => ({ i, tramo: ubicar(t, c.textoOriginal), n: apariciones(t, c.textoOriginal) }))
      .filter((x) => x.tramo);
    const total = donde.reduce((a, x) => a + x.n, 0);
    if (donde.length === 0) {
      const enTodo = apariciones(textos.join('\n'), c.textoOriginal) > 0 || apariciones(textos.join(' '), c.textoOriginal) > 0;
      noAplicados.push({
        id: c.id,
        motivo: enTodo
          ? 'el pasaje abarca más de un párrafo'
          : 'el pasaje no se encontró tal cual en el documento',
      });
      continue;
    }
    if (total > 1) {
      noAplicados.push({ id: c.id, motivo: `el pasaje aparece ${total} veces en el documento` });
      continue;
    }
    const { i, tramo } = donde[0];
    const idC = idComentario++;
    const motivo = aplicarEnParrafo($, parrafos[i], tramo!.inicio, tramo!.fin, c.textoMejorado, marcas, idC);
    if (motivo) {
      noAplicados.push({ id: c.id, motivo });
      continue;
    }
    comentarios.push({ id: idC, texto: c.comentario });
    aplicados.push(c.id);
  }

  zip.file('word/document.xml', $.xml());

  if (comentarios.length > 0) {
    zip.file('word/comments.xml', comentariosXml(comentariosPrevios ?? null, comentarios, { autor, iniciales, fecha }));
    if (!comentariosPrevios) {
      const rutaRels = 'word/_rels/document.xml.rels';
      const rels = (await zip.file(rutaRels)?.async('string')) ?? '';
      const idsRel = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
      const rel = `<Relationship Id="rId${Math.max(0, ...idsRel) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`;
      zip.file(rutaRels, rels.replace(/<\/Relationships>\s*$/, `${rel}</Relationships>`));
      const tipos = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
      if (!tipos.includes('/word/comments.xml')) {
        zip.file(
          '[Content_Types].xml',
          tipos.replace(
            /<\/Types>\s*$/,
            '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>',
          ),
        );
      }
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buffer, aplicados, noAplicados };
}
