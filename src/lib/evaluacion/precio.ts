/**
 * El precio de la oferta (Anexo N° 6): cantidad × precio unitario, total en
 * números y total en letras, cuadrados por código.
 *
 * POR QUÉ
 *
 * César, documento 15 (17/10/2026), LP Abreviada N° 005-2026-MDK/OC-2:
 *   · EDDU CONTRATISTAS ofertó 7 095 m³ a S/ 46.00, que son S/ 326 370.00
 *     —eso dice la fila—, pero el TOTAL y las letras dicen S/ 346 370.00.
 *     A-LexIA la admitió. César: debió no admitirse. Las bases dicen que
 *     ante la discrepancia entre números y letras prevalecen las letras,
 *     «pero en este caso no se podría indicar ello, dado que si prevalece
 *     letras, se estaría modificando el precio unitario»; las letras solo
 *     prevalecen si el precio unitario no cambia.
 *   · POZO HCJ: se observó un «error material» en las letras que era de la
 *     transcripción del escaneo (ver `lectura-visual.ts`).
 * Las cuentas no las hace el modelo: él solo copia lo que se lee en el
 * anexo, de la imagen cuando la oferta es un escaneo.
 */
import { generateText } from 'ai';
import { fastModel } from '@/lib/ai/gemini';
import { parseJsonLoose } from '@/lib/ai/json-suelto';
import type { FichaRequisito } from './etapas';
import { paginasDonde, preguntarALasPaginas, type LectorDePaginas } from './lectura-visual';

// ───────────────────────── números en letras ─────────────────────────

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, trecientos: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const DECENA_FUNDIDA: Record<string, number> = {
  veinti: 20, treinti: 30, cuarenti: 40, cincuenti: 50, sesenti: 60, setenti: 70, ochenti: 80, noventi: 90,
};
/** Palabras que acompañan al monto y no lo cambian. */
const NEUTRAS = new Set(['y', 'con', 'soles', 'sol', 'nuevos', 'nuevo', 'de', 'en', 'pen', 's', 'son', 'exactos', 'cts', 'centimos']);

/**
 * «Trescientos cuarenta y seis mil trescientos setenta con 00/100» →
 * 346370. Admite las formas fundidas de las ofertas («sesentinueve»,
 * «treintidos»). Devuelve null si encuentra una palabra que no es un
 * número: mejor no saber el monto que inventarlo.
 */
export function numeroEnLetras(texto: string): number | null {
  let t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let centimos = 0;
  const fraccion = t.match(/(\d{1,2})\s*\/\s*100/);
  if (fraccion) {
    centimos = Number(fraccion[1]) / 100;
    t = t.slice(0, fraccion.index);
  }
  t = t.replace(/[^a-z\s]/g, ' ');
  const palabras: string[] = [];
  for (const w of t.split(/\s+/).filter(Boolean)) {
    const fundida = w.match(/^(veinti|treinti|cuarenti|cincuenti|sesenti|setenti|ochenti|noventi)(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)$/);
    if (fundida && !(w in UNIDADES)) palabras.push(String(DECENA_FUNDIDA[fundida[1]]), fundida[2]);
    else palabras.push(w);
  }
  let total = 0;
  let actual = 0;
  let algo = false;
  for (const w of palabras) {
    if (NEUTRAS.has(w)) continue;
    if (/^\d+$/.test(w)) {
      actual += Number(w);
      algo = true;
    } else if (w in UNIDADES) {
      actual += UNIDADES[w];
      algo = true;
    } else if (w in CENTENAS) {
      actual += CENTENAS[w];
      algo = true;
    } else if (w === 'mil') {
      actual = (actual || 1) * 1000;
      algo = true;
    } else if (w === 'millon' || w === 'millones') {
      total += (actual || 1) * 1_000_000;
      actual = 0;
      algo = true;
    } else {
      return null;
    }
    // «… mil» cierra un grupo: lo que siga son centenas sueltas.
    if (w === 'mil') {
      total += actual;
      actual = 0;
    }
  }
  if (!algo) return null;
  return Math.round((total + actual + centimos) * 100) / 100;
}

// ───────────────────────── el juicio ─────────────────────────

export interface ItemDePrecio {
  descripcion?: string;
  cantidad: number | null;
  precioUnitario: number | null;
  subtotal: number | null;
}

export interface AnexoDePrecio {
  pagina?: number;
  items: ItemDePrecio[];
  totalEnNumeros: number | null;
  /** Literal, tal como se lee: «Trescientos cuarenta y seis mil…». */
  totalEnLetras: string;
}

export type EstadoDelPrecio = 'conforme' | 'prevalecen_letras' | 'incongruente' | 'indeterminado';

export interface JuicioDelPrecio {
  estado: EstadoDelPrecio;
  /** Σ cantidad × precio unitario, si hay ítems con ambos datos. */
  suma: number | null;
  letras: number | null;
  detalle: string;
}

const fmt = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const igual = (a: number, b: number) => Math.abs(a - b) <= 0.05;

export function juzgarPrecio(a: AnexoDePrecio): JuicioDelPrecio {
  const letras = a.totalEnLetras ? numeroEnLetras(a.totalEnLetras) : null;
  const conDatos = a.items.filter((i) => typeof i.cantidad === 'number' && typeof i.precioUnitario === 'number');
  const suma =
    conDatos.length > 0 && conDatos.length === a.items.length
      ? Math.round(conDatos.reduce((s, i) => s + i.cantidad! * i.precioUnitario!, 0) * 100) / 100
      : null;
  const numeros = a.totalEnNumeros;
  const donde = a.pagina ? ` (página ${a.pagina})` : '';

  if (letras === null) {
    return { estado: 'indeterminado', suma, letras, detalle: `No se pudo leer con certeza el total en letras del Anexo N° 6${donde}.` };
  }
  const filas = conDatos
    .map((i) => `${i.cantidad!.toLocaleString('es-PE')} × ${fmt(i.precioUnitario!)} = ${fmt(i.cantidad! * i.precioUnitario!)}`)
    .join('; ');

  if (suma !== null && !igual(letras, suma)) {
    return {
      estado: 'incongruente',
      suma,
      letras,
      detalle:
        `En el Anexo N° 6${donde}, cantidad por precio unitario da ${filas}${conDatos.length > 1 ? ` (suma ${fmt(suma)})` : ''}; ` +
        `el total en números dice ${numeros !== null ? fmt(numeros) : 'otro monto'} y en letras «${a.totalEnLetras.trim()}» (${fmt(letras)}). ` +
        `Hacer prevalecer las letras cambiaría el precio unitario ofertado, de modo que no es un error que se corrija aplicando esa regla: ` +
        `es una incongruencia en el precio que no permite saber cuál es la oferta, y corregirla alteraría su contenido esencial.`,
    };
  }
  if (numeros !== null && !igual(letras, numeros)) {
    return {
      estado: 'prevalecen_letras',
      suma,
      letras,
      detalle:
        `En el Anexo N° 6${donde} el total en números (${fmt(numeros)}) no coincide con el de letras (${fmt(letras)}); ` +
        `${suma !== null ? `las letras coinciden con cantidad por precio unitario (${filas}), así que ` : ''}prevalece el monto en letras sin cambiar el precio unitario.`,
    };
  }
  return {
    estado: 'conforme',
    suma,
    letras,
    detalle: `En el Anexo N° 6${donde} el total en letras «${a.totalEnLetras.trim()}» (${fmt(letras)}) coincide con el total en números${suma !== null ? ` y con cantidad por precio unitario (${filas})` : ''}.`,
  };
}

// ───────────────────────── la lectura ─────────────────────────

const LEER = `Lees el ANEXO N° 6 «PRECIO DE LA OFERTA» de una oferta en un procedimiento de selección del Estado peruano. Puede haber más de un Anexo N° 6 (por ejemplo, uno en la oferta técnica y otro en la económica): lista cada uno.
Copia EXACTAMENTE lo que se lee, sin corregir ni completar:
· "items": cada fila de la tabla con su cantidad, su precio unitario y su total (subtotal), en números sin separador de miles. Si una columna no existe, null.
· "totalEnNumeros": la fila TOTAL de la tabla (o el monto total ofertado en números).
· "totalEnLetras": la frase del monto en letras, literal («Trescientos cuarenta y seis mil trescientos setenta con 00/100»). Si una palabra no se distingue con certeza, escribe [ilegible] en su lugar.
Devuelve SOLO JSON: {"anexos": [{"pagina": 0, "items": [{"descripcion": "", "cantidad": 0, "precioUnitario": 0, "subtotal": 0}], "totalEnNumeros": 0, "totalEnLetras": ""}]}`;

const MARCA_ANEXO_6 = /ANEXO\s+N?[°º.]?\s*0?6\b[\s\S]{0,300}PRECIO\s+DE\s+LA\s+OFERTA|PRECIO\s+DE\s+LA\s+OFERTA|el\s+precio\s+de\s+(?:la|mi|nuestra)\s+oferta\s+(?:es|corresponde|asciende)/i;

function anexos(o: Record<string, unknown> | null): AnexoDePrecio[] {
  const lista = Array.isArray(o?.anexos) ? (o!.anexos as Array<Record<string, unknown>>) : [];
  const num = (v: unknown) => {
    const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return lista
    .map((a) => ({
      pagina: num(a.pagina) ?? undefined,
      items: (Array.isArray(a.items) ? (a.items as Array<Record<string, unknown>>) : []).map((i) => ({
        descripcion: i.descripcion ? String(i.descripcion) : undefined,
        cantidad: num(i.cantidad),
        precioUnitario: num(i.precioUnitario),
        subtotal: num(i.subtotal),
      })),
      totalEnNumeros: num(a.totalEnNumeros),
      totalEnLetras: String(a.totalEnLetras ?? '').trim(),
    }))
    .filter((a) => a.totalEnLetras || a.totalEnNumeros !== null);
}

/**
 * Lee los Anexos N° 6 de la oferta: de la imagen si hay lector (oferta
 * escaneada) y, si no, del texto, que en un PDF con texto es fiel.
 */
export async function leerAnexosDePrecio(texto: string, lector?: LectorDePaginas, nombre?: string): Promise<AnexoDePrecio[]> {
  const paginas = paginasDonde(texto, MARCA_ANEXO_6, 4);
  if (lector && paginas.length) {
    const o = await preguntarALasPaginas({
      lector,
      paginas,
      sistema: `${LEER}\nLee la IMAGEN de cada página, no supongas. "pagina" es el número de página que se te indica para esa hoja.`,
      pregunta: 'Lista los Anexos N° 6 que haya en estas páginas.',
      nombre,
    });
    const r = anexos(o);
    if (r.length) return r;
  }
  if (paginas.length === 0) return [];
  // Del texto: las páginas del anexo.
  const trozos = texto
    .split(/^=== TOMO \d+/m)[0]
    .split(/(?==== P[áa]gina \d+ ===)/)
    .filter((t) => paginas.includes(Number(t.match(/^=== P[áa]gina (\d+) ===/)?.[1])));
  try {
    const { text } = await generateText({
      model: fastModel,
      system: LEER,
      prompt: trozos.join('\n\n').slice(0, 40_000),
      temperature: 0,
      maxTokens: 2500,
      abortSignal: AbortSignal.timeout(60_000),
    });
    return anexos(parseJsonLoose(text) as Record<string, unknown> | null);
  } catch {
    return [];
  }
}

/** La ficha de admisión que trata la oferta económica. */
export function esFichaDePrecio(f: FichaRequisito): boolean {
  return /oferta\s+econ[óo]mica|precio\s+de\s+la\s+oferta|anexo\s+n\S*\s*0?6\b/i.test(`${f.requisito} ${f.documentoPresentado ?? ''}`);
}

/**
 * Corrige la ficha de la oferta económica con las cuentas del anexo.
 *   · Incongruente (las letras no cuadran con cantidad × precio unitario):
 *     no admitida, aunque el modelo la haya dado por buena.
 *   · Conforme o prevalecen las letras: si la ficha observaba las letras o
 *     el monto, la observación cae; si observaba otra cosa, se respeta.
 */
export async function revisarPrecio(ficha: FichaRequisito, texto: string, lector?: LectorDePaginas, nombre?: string): Promise<FichaRequisito> {
  const leidos = await leerAnexosDePrecio(texto, lector, nombre);
  if (leidos.length === 0) return ficha;
  const juicios = leidos.map((a) => ({ a, j: juzgarPrecio(a) }));
  const malo = juicios.find((x) => x.j.estado === 'incongruente');
  if (malo) {
    return {
      ...ficha,
      resultado: 'no_cumple',
      subsanable: false,
      naturalezaDefecto: 'sustancial',
      confianza: 'alta',
      verificada: true,
      hallazgo: `${malo.j.detalle} La oferta no se admite. (Verificado por cálculo sobre el anexo${lector ? ', leído de la imagen de la página' : ''}.)`,
      evidencia: [
        { documento: 'Anexo N° 6 — Precio de la oferta', ubicacion: malo.a.pagina ? `Página ${malo.a.pagina}` : undefined, cita: malo.a.totalEnLetras },
        ...(ficha.evidencia ?? []),
      ],
    };
  }
  const observabaElMonto = /letra|literal|error material|transcrip|redacci|monto|precio|incongruen|discrepan/i.test(ficha.hallazgo ?? '');
  const todos = juicios.every((x) => x.j.estado === 'conforme' || x.j.estado === 'prevalecen_letras');
  if (ficha.resultado !== 'cumple' && observabaElMonto && todos) {
    const detalle = juicios.map((x) => x.j.detalle).join(' ');
    return {
      ...ficha,
      resultado: 'cumple',
      subsanable: undefined,
      naturalezaDefecto: 'ninguno',
      confianza: 'alta',
      verificada: true,
      hallazgo: `${detalle} ${lector ? 'Leído de la imagen del anexo: la observación anterior provenía de la transcripción del escaneo, no del documento.' : 'La observación anterior no se confirma con las cuentas del anexo.'}`,
    };
  }
  return ficha;
}
