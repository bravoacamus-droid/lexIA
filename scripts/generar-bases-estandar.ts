#!/usr/bin/env tsx
/**
 * Convierte las 19 bases estándar del OECE en el patrón con que se
 * cotejan las bases de un procedimiento.
 *
 * POR QUÉ EXISTE
 *
 * La evaluación de bases que pide César tiene que detectar «omisiones»
 * y «modificaciones indebidas». Eso solo se puede decir comparando con
 * la bases estándar de ese procedimiento: lo que la norma obliga a
 * mantener y la Entidad quitó o cambió.
 *
 * Las bases estándar distinguen por el color, y es una señal fiable
 * (medida en las 19 el 23/09/2026):
 *
 *   · negro       — el texto de las bases: tiene que estar.
 *   · rojo        — las «Advertencias» para el postor: también se quedan.
 *   · azul 0070C0 — las instrucciones para la Entidad («Esta nota debe
 *                   ser eliminada una vez culminada la elaboración de
 *                   las bases»): se quitan. Son las que dicen cuándo un
 *                   párrafo es opcional —«En caso se haya determinado
 *                   hacer pública la cuantía, se añade el párrafo
 *                   siguiente»—, así que se guardan como condición del
 *                   texto que las sigue.
 *   · [ENTRE CORCHETES] — lo que llena la Entidad: se deja como hueco.
 *
 * Salida: `src/lib/evaluacion/bases/estandar.generado.json`. Para
 * cambiar algo se cambian los Word y se vuelve a generar.
 *
 * Uso: npx tsx scripts/generar-bases-estandar.ts
 */
import JSZip from 'jszip';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

const CARPETA =
  '2. DOCUMENTOS PARA PROCEDIMIENTOS DE SELECCIÓN/1. BASES ESTÁNDAR - Bases sin llenar (bienes, servicios, consultoría y obras)';
const DESTINO = 'src/lib/evaluacion/bases/estandar.generado.json';
const CAPITULOS = 'src/lib/evaluacion/bases/capitulos';

/** El título de cada una, como está en la biblioteca. */
const TITULOS: Record<string, string> = {
  '1': 'Licitación Pública para Bienes',
  '2': 'Licitación Pública Abreviada para Bienes',
  '3': 'Licitación Pública para el Suministro de Bienes para el Programa del Vaso de Leche',
  '4': 'Licitación Pública Abreviada para el Suministro de Bienes para el Programa del Vaso de Leche',
  '5': 'Licitación Pública de Obras',
  '6': 'Licitación Pública Abreviada de Obras',
  '7': 'Concurso de Proyectos Arquitectónicos y Urbanísticos',
  '8': 'Concurso Público de Servicios',
  '9': 'Concurso Público Abreviado de Servicios',
  '10': 'Concurso Público para Consultoría en General',
  '11': 'Concurso Público Abreviado para Consultoría en General',
  '12': 'Concurso Público para Consultoría de Obra',
  '13': 'Concurso Público Abreviado para Consultoría de Obra',
  '14': 'Concurso Público para Servicio de Mantenimiento Vial',
  '15': 'Concurso Público Abreviado para Servicio de Mantenimiento Vial',
  '16': 'Concurso Público Abreviado para la Contratación de Expertos y Gerentes de Proyectos',
  '17': 'Subasta Inversa Electrónica',
  '18': 'Comparación de Precios',
  '19': 'Procedimiento de Selección No Competitivo',
};

const AZULES = new Set(['0070C0', '0070BF', '2E74B5', '0066CC', '0000FF']);

export interface TextoFijo {
  /** El texto, con «[…]» donde la Entidad llena. */
  t: string;
  /** El apartado en que va: «2.2.1.1 Documentos para la admisión…». */
  a: string;
  /** La instrucción azul que lo precede, si la hay: dice cuándo va. */
  c?: string;
  /** Posición del párrafo, para agrupar lo que va seguido. */
  p: number;
  /**
   * La sección: la general «no debe ser modificada en ningún extremo,
   * bajo sanción de nulidad»; la específica la llena la Entidad; los
   * anexos son los formatos.
   */
  s: 'portada' | 'general' | 'especifica' | 'anexos';
  /** El capítulo de la sección específica o el anexo en que va. */
  k?: number;
}

export interface CapituloEstandar {
  /** «CAPÍTULO III», «ANEXO Nº 6». */
  rotulo: string;
  /** El título que lo acompaña: «REQUERIMIENTO», «FACTORES DE EVALUACIÓN». */
  titulo: string;
  /**
   * El texto entero, con sus huecos entre corchetes —que dicen los
   * límites: «MONTO QUE NO PODRÁ SER MAYOR A TRES VECES LA CUANTÍA»— y
   * con las instrucciones para la Entidad marcadas como tales.
   */
  texto: string;
}

export interface BasesEstandar {
  id: string;
  titulo: string;
  archivo: string;
  fijos: TextoFijo[];
  /** La sección específica y los anexos, por capítulo. */
  capitulos: CapituloEstandar[];
}

const esElemento = (n: AnyNode): n is Element => n.type === 'tag';

function colorDe(run: Element): string {
  const rPr = run.children.find((h) => esElemento(h) && h.name === 'w:rPr') as Element | undefined;
  const c = rPr?.children.find((h) => esElemento(h) && h.name === 'w:color') as Element | undefined;
  return (c?.attribs['w:val'] ?? 'auto').toUpperCase();
}

function textoDelRun(run: Element): string {
  let t = '';
  for (const h of run.children) {
    if (!esElemento(h)) continue;
    if (h.name === 'w:t') t += h.children.map((x) => (x.type === 'text' ? (x as unknown as { data: string }).data : '')).join('');
    else if (h.name === 'w:tab') t += ' ';
    else if (h.name === 'w:br') t += ' ';
  }
  return t;
}

/** Los runs de un párrafo, sin entrar en párrafos anidados. */
function runsDe(p: Element): Element[] {
  const salida: Element[] = [];
  const visitar = (n: Element) => {
    for (const h of n.children) {
      if (!esElemento(h)) continue;
      if (h.name === 'w:r') salida.push(h);
      else if (h.name === 'w:hyperlink' || h.name === 'w:smartTag' || h.name === 'w:ins' || h.name === 'w:fldSimple') visitar(h);
    }
  };
  visitar(p);
  return salida;
}

const APARTADO = /^(?:CAP[IÍ]TULO\s+[IVX]+|SECCI[OÓ]N\s+\w+|ANEXO\s+N|\d{1,2}(?:\.\d{1,2}){0,4}\.?\s+[A-ZÁÉÍÓÚÑ])/;

async function leer(archivo: string): Promise<BasesEstandar> {
  const n = archivo.match(/^7614342-(\d+)-/)?.[1] ?? '?';
  const zip = await JSZip.loadAsync(readFileSync(`${CARPETA}/${archivo}`));
  const $ = cheerio.load(await zip.file('word/document.xml')!.async('string'), { xml: true });
  const parrafos = $('*')
    .filter((_i, el) => esElemento(el) && el.name === 'w:p')
    .toArray() as Element[];

  const fijos: TextoFijo[] = [];
  const capitulos: CapituloEstandar[] = [];
  let esperandoTitulo = false;
  let apartado = '';
  let seccion: TextoFijo['s'] = 'portada';
  let instruccion = '';
  let desdeInstruccion = 99;

  parrafos.forEach((p, i) => {
    let fijo = '';
    let azul = '';
    for (const r of runsDe(p)) {
      const t = textoDelRun(r);
      if (!t) continue;
      if (AZULES.has(colorDe(r))) azul += t;
      else fijo += t;
    }
    fijo = fijo.replace(/\s+/g, ' ').trim();
    azul = azul.replace(/\s+/g, ' ').trim();

    if (azul) {
      instruccion = azul;
      desdeInstruccion = 0;
    } else {
      desdeInstruccion++;
    }
    // La sección específica y los anexos, enteros y por capítulo: son la
    // referencia con que se revisa lo que la Entidad llenó.
    const entero = [fijo, azul ? `⟦Instrucción para la Entidad: ${azul}⟧` : ''].filter(Boolean).join(' ');
    const esEspecifica = seccion === 'especifica' || seccion === 'anexos';
    const rotuloCap = fijo.match(/^(CAP[IÍ]TULO\s+[IVX]+|ANEXO\s+N[°º.]*\s*\d+)\s*(.*)$/i);
    if (esEspecifica && rotuloCap && fijo.length < 140) {
      capitulos.push({ rotulo: rotuloCap[1].replace(/\s+/g, ' '), titulo: rotuloCap[2].trim(), texto: '' });
      esperandoTitulo = !rotuloCap[2].trim();
    } else if (esEspecifica && capitulos.length > 0 && entero) {
      const cap = capitulos[capitulos.length - 1];
      if (esperandoTitulo && fijo && fijo.length < 140 && fijo === fijo.toUpperCase()) {
        cap.titulo = fijo;
        esperandoTitulo = false;
      } else {
        cap.texto += (cap.texto ? '\n' : '') + entero;
      }
    }

    if (!fijo) return;
    if (APARTADO.test(fijo) && fijo.length < 140) apartado = fijo;
    if (/^SECCI[OÓ]N\s+ESPEC[IÍ]FICA/i.test(fijo)) seccion = 'especifica';
    else if (/^SECCI[OÓ]N\s+GENERAL/i.test(fijo)) seccion = 'general';
    else if (/^ANEXO\s+N/i.test(fijo) && seccion === 'especifica') seccion = 'anexos';

    // Los huecos se marcan con «[…]» para cotejar solo lo fijo.
    const t = fijo.replace(/\[[^\]]*\]/g, '[…]').replace(/_{3,}|\.{4,}|…{2,}/g, '[…]');
    if (t.replace(/\[…\]/g, '').split(/\s+/).filter(Boolean).length < 6) return;
    fijos.push({
      t,
      a: apartado,
      // La instrucción manda sobre el bloque que la sigue, no sobre todo
      // lo que viene después.
      ...(instruccion && desdeInstruccion <= 3 ? { c: instruccion.slice(0, 400) } : {}),
      p: i,
      s: seccion,
      ...(esEspecifica && capitulos.length > 0 ? { k: capitulos.length - 1 } : {}),
    });
  });

  return { id: `be-${n}`, titulo: TITULOS[n] ?? archivo, archivo, fijos, capitulos };
}

void (async () => {
  const archivos = readdirSync(CARPETA)
    .filter((x) => x.endsWith('.docx') && !x.startsWith('~$'))
    .sort((a, b) => Number(a.match(/-(\d+)-/)?.[1]) - Number(b.match(/-(\d+)-/)?.[1]));
  const todas: BasesEstandar[] = [];
  for (const a of archivos) {
    const b = await leer(a);
    const condicionados = b.fijos.filter((f) => f.c).length;
    const porSeccion = ['general', 'especifica', 'anexos'].map((x) => b.fijos.filter((f) => f.s === x).length).join('/');
    console.log(`${b.id.padEnd(6)} ${b.titulo.slice(0, 60).padEnd(60)} ${String(b.fijos.length).padStart(4)} textos fijos (general/específica/anexos ${porSeccion}) · ${condicionados} con condición · ${b.capitulos.length} capítulos`);
    todas.push(b);
  }
  // Dos salidas: los textos fijos de las diecinueve —hacen falta todos
  // para saber cuál corresponde— y los capítulos de cada una por
  // separado, que solo se cargan para la que toca.
  mkdirSync(CAPITULOS, { recursive: true });
  const json = JSON.stringify(todas.map(({ capitulos: _c, ...resto }) => resto));
  writeFileSync(DESTINO, json);
  let pesoCapitulos = 0;
  for (const b of todas) {
    const c = JSON.stringify(b.capitulos);
    pesoCapitulos += c.length;
    writeFileSync(`${CAPITULOS}/${b.id}.json`, c);
  }
  console.log(
    `\n${todas.length} bases estándar → ${DESTINO} (${(json.length / 1024).toFixed(0)} KB) y ${CAPITULOS}/ (${(pesoCapitulos / 1024).toFixed(0)} KB)`,
  );
})();
