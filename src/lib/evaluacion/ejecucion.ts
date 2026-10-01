/**
 * La evaluación por etapas, hecha por pasos que se guardan.
 *
 * POR QUÉ
 *
 * César subió dos ofertas escaneadas de 140 páginas (30/09/2026). Cada
 * una son diez tramos de transcripción, y la ruta los hacía uno tras otro
 * y oferta tras oferta: pasaba de los trece minutos que puede durar una
 * función, Vercel la cortaba y la fila se quedaba en «processing» para
 * siempre. Al recargar, nada que retomar: había que empezar de cero.
 *
 * CÓMO
 *
 * El trabajo se parte en unidades —leer una parte de un documento,
 * transcribir un tramo de quince páginas, leer qué exigen las Bases,
 * evaluar una etapa de un postor— que corren en paralelo y se guardan en
 * `evaluations.progreso` en cuanto terminan. Cada vuelta trabaja hasta un
 * plazo y devuelve el turno; la siguiente sigue donde quedó. Si una vuelta
 * muere a la mitad, se pierde solo lo que estaba en el aire.
 *
 * El resultado es el mismo de antes (`version: 'etapas-1'`), así que la
 * pantalla del resultado y el acta no cambian.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { paginasSinTexto, textoPorPagina } from '@/lib/ai/pdf';
import { textoAprovechable } from '@/lib/ai/texto-documento';
import { deleteGeminiFile, uploadFileToGemini } from '@/lib/ai/gemini-files';
import {
  MAX_PAGINAS_OCR,
  PAGINAS_POR_TRAMO,
  transcribirPaginaPorPagina,
  transcribirPaginasSueltas,
  transcribirTramo,
} from '@/lib/ai/ocr-pdf';
import { cerrarPostor, evaluarEtapa, leerBases, type LecturaBases } from './motor';
import { ETAPAS, NOMBRE_ETAPA, avanza, ordenarPorPuntaje, type Etapa, type ResultadoEtapa } from './etapas';
import { construirActa } from './acta';
import { razonSocialDeLaOferta } from './postor';

/** Cuántas unidades corren a la vez. */
const PARALELO = 8;
/** Intentos de una unidad antes de darla por perdida. */
const INTENTOS = 3;
/** Vueltas antes de rendirse: una evaluación que no termina no puede girar sin fin. */
const MAX_VUELTAS = 25;
/** Gemini borra los archivos a las 48 h; pasado esto, se vuelve a subir. */
const VIDA_ARCHIVO_MS = 40 * 3600_000;
/** Lo que dura el turno sin renovarse. */
export const TURNO_SEGUNDOS = 300;

type LecturaParte =
  | { tipo: 'texto'; texto: string; paginas: number }
  | {
      tipo: 'ocr';
      paginas: number;
      /** Las páginas a transcribir, en tramos [desde, hasta]. */
      rangos: Array<[number, number]>;
      /**
       * Solo en un PDF mixto —con texto, salvo algunas páginas
       * escaneadas—: el texto de cada página. Las de `rangos` se
       * reemplazan por su transcripción.
       */
      textoPaginas?: string[];
      /** El PDF entero subido a Gemini, cuando es un escaneo completo. */
      uri?: string;
      archivo?: string;
      subido?: string;
      /** Texto de cada tramo, por su primera página. '' = tramo sin texto. */
      tramos: Record<string, string>;
    };

interface Documento {
  rol: 'bases' | 'oferta';
  nombre: string;
  partes: string[];
  lecturas: Array<LecturaParte | null>;
  estado: 'leyendo' | 'listo' | 'ilegible';
  texto?: string;
  transcrito?: boolean;
  motivo?: string;
  postor?: string;
}

export interface LineaResumen {
  texto: string;
  estado: 'hecho' | 'en_curso' | 'pendiente' | 'error';
}

/** Lo que ve la pantalla mientras se evalúa. */
export interface ResumenProgreso {
  paso: string;
  porcentaje: number;
  lineas: LineaResumen[];
  actualizado: string;
}

export interface Progreso {
  version: 1;
  vueltas: number;
  documentos: Documento[];
  lectura?: LecturaBases;
  /** Etapas de cada oferta, en el orden de `documentos.slice(1)`. */
  etapas: ResultadoEtapa[][];
  fallos: Record<string, number>;
  errores: Record<string, string>;
  resumen?: ResumenProgreso;
}

interface Fila {
  bases_file_path: string | null;
  bases_partes: string[] | null;
  offer_files: Array<{ name: string; path: string; partes?: string[] }> | null;
  progreso: Progreso | null;
}

export type Desenlace =
  | { estado: 'done' }
  | { estado: 'failed'; motivo: string }
  | { estado: 'continuar'; paso: string };

function inicial(f: Fila): Progreso {
  const doc = (rol: Documento['rol'], nombre: string, partes: string[]): Documento => ({
    rol,
    nombre,
    partes,
    lecturas: partes.map(() => null),
    estado: 'leyendo',
  });
  const ofertas = f.offer_files ?? [];
  return {
    version: 1,
    vueltas: 0,
    documentos: [
      doc('bases', 'Bases Integradas', f.bases_partes?.length ? f.bases_partes : [f.bases_file_path ?? '']),
      ...ofertas.map((o) => doc('oferta', o.name, o.partes?.length ? o.partes : [o.path])),
    ],
    etapas: ofertas.map(() => []),
    fallos: {},
    errores: {},
  };
}

function nombreDesdeArchivo(nombre: string): string {
  return (
    nombre
      .replace(/\.(pdf|docx?|txt)$/i, '')
      .replace(/^oferta[_\s-]+/i, '')
      .replace(/^[A-Z0-9]{1,2}[_\s-]+/i, '')
      .replace(/_/g, ' ')
      .trim()
      .slice(0, 80) || nombre
  );
}

type LecturaOcr = Extract<LecturaParte, { tipo: 'ocr' }>;

/** Tramos de hasta quince páginas sobre una lista de páginas (ordenada). */
function enTramos(paginas: number[]): Array<[number, number]> {
  const rangos: Array<[number, number]> = [];
  for (const n of paginas.slice(0, MAX_PAGINAS_OCR)) {
    const ultimo = rangos[rangos.length - 1];
    if (ultimo && n === ultimo[1] + 1 && n - ultimo[0] < PAGINAS_POR_TRAMO) ultimo[1] = n;
    else rangos.push([n, n]);
  }
  return rangos;
}

const desdesDe = (l: LecturaOcr) => l.rangos.map((r) => r[0]);
const finDe = (l: LecturaOcr, desde: number) => l.rangos.find((r) => r[0] === desde)?.[1] ?? desde;
const paginasDe = (l: LecturaOcr) => l.rangos.reduce((s, [a, b]) => s + b - a + 1, 0);

async function descargar(cliente: SupabaseClient, path: string): Promise<Buffer> {
  const { data, error } = await cliente.storage.from('uploads').download(path);
  if (error || !data) throw new Error(`No se pudo descargar el archivo: ${error?.message ?? 'sin datos'}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Lee una parte: su texto si lo tiene; si es un escaneo, la deja lista para transcribir. */
async function leerParte(cliente: SupabaseClient, d: Documento, k: number): Promise<LecturaParte> {
  const path = d.partes[k];
  const buffer = await descargar(cliente, path);

  if (/\.docx$/i.test(path)) {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    const texto = (value || '').trim();
    if (!texto) throw new Error('El Word no contiene texto extraíble.');
    return { tipo: 'texto', texto, paginas: 0 };
  }

  // pdf.js se queda con el búfer que recibe: cada lectura, su copia.
  const textos = await textoPorPagina(Buffer.from(buffer));
  const paginas = textos.length;
  const todo = textos.join('\n\n').trim();
  const sinTexto = paginasSinTexto(textos);

  // Con texto en (casi) todas las páginas, y legible —una fuente rota da
  // un amasijo que también hay que transcribir—, se usa tal cual.
  if (sinTexto.length === 0 && todo.length >= 100 && textoAprovechable(todo)) {
    return { tipo: 'texto', texto: todo, paginas };
  }

  // Mixto: se transcriben solo las páginas escaneadas.
  const conTexto = textos
    .filter((_, i) => !sinTexto.includes(i + 1))
    .join('\n\n');
  if (sinTexto.length < paginas * 0.7 && textoAprovechable(conTexto)) {
    return { tipo: 'ocr', paginas, rangos: enTramos(sinTexto), textoPaginas: textos, tramos: {} };
  }

  // Escaneo completo: se sube una vez y se transcribe por tramos.
  const archivo = await uploadFileToGemini(buffer, 'application/pdf', d.nombre);
  return {
    tipo: 'ocr',
    paginas,
    rangos: enTramos(Array.from({ length: paginas }, (_, i) => i + 1)),
    uri: archivo.uri,
    archivo: archivo.name,
    subido: new Date().toISOString(),
    tramos: {},
  };
}

/** ¿Ya se resolvió esta parte? Leída, y si es escaneo, con todos sus tramos hechos o perdidos. */
function parteResuelta(p: Progreso, di: number, k: number): boolean {
  const l = p.documentos[di].lecturas[k];
  if (!l) return (p.fallos[`leer:${di}:${k}`] ?? 0) >= INTENTOS;
  if (l.tipo === 'texto') return true;
  return desdesDe(l).every(
    (d) => l.tramos[d] !== undefined || (p.fallos[`tramo:${di}:${k}:${d}`] ?? 0) >= INTENTOS,
  );
}

/** Cierra los documentos que ya tienen todas sus partes: arma su texto o los da por ilegibles. */
function cerrarDocumentos(p: Progreso): Documento[] {
  const cerrados: Documento[] = [];
  p.documentos.forEach((d, di) => {
    if (d.estado !== 'leyendo') return;
    if (!d.partes.every((_, k) => parteResuelta(p, di, k))) return;
    cerrados.push(d);

    const perdidaLectura = d.partes.findIndex((_, k) => !d.lecturas[k]);
    if (perdidaLectura >= 0) {
      d.estado = 'ilegible';
      d.motivo = p.errores[`leer:${di}:${perdidaLectura}`] ?? 'No se pudo leer el archivo.';
      return;
    }

    let perdidos = 0;
    let intentadas = 0;
    let transcrito = false;
    let desplazamiento = 0;
    const trozos: string[] = [];
    d.lecturas.forEach((l, k) => {
      if (!l) return;
      if (l.tipo === 'texto') {
        trozos.push(l.texto);
      } else {
        transcrito = true;
        intentadas += paginasDe(l);
        perdidos += desdesDe(l).filter((desde) => l.tramos[desde] === undefined).length;
        // Cuando el PDF se partió para subirlo, cada parte numera
        // desde 1: se devuelve la numeración del documento original.
        const renumerar = (t: string) =>
          desplazamiento
            ? t.replace(/=== Página (\d+) ===/g, (_, n) => `=== Página ${Number(n) + desplazamiento} ===`)
            : t;
        if (!l.textoPaginas) {
          for (const desde of desdesDe(l)) {
            const t = l.tramos[desde];
            if (t) trozos.push(renumerar(t));
          }
        } else {
          // Mixto: página por página, la transcripción en el lugar de
          // las escaneadas y el texto en las demás.
          const textoPaginas = l.textoPaginas;
          for (let n = 1; n <= l.paginas; n++) {
            const rango = l.rangos.find(([a, b]) => n >= a && n <= b);
            if (rango) {
              const t = n === rango[0] ? l.tramos[rango[0]] : '';
              if (t) trozos.push(renumerar(t));
              continue;
            }
            const t = textoPaginas[n - 1]?.trim();
            if (t) trozos.push(renumerar(`=== Página ${n} ===\n${t}`));
          }
        }
      }
      desplazamiento += l.paginas;
    });

    // Una transcripción incompleta NO es el documento: media oferta se
    // dictaminaría como ausencia de la propuesta (ver texto-documento.ts).
    if (perdidos > 0) {
      d.estado = 'ilegible';
      d.motivo =
        `El PDF está escaneado y la transcripción quedó incompleta: ${perdidos} tramo(s) de páginas no se pudieron leer, de ${intentadas} página(s) intentadas. ` +
        'Vuelve a subirlo, o sube el Word original si lo tienes: evaluar sobre una transcripción parcial descarta ofertas que sí cumplen.';
      return;
    }
    const texto = trozos.join('\n\n').trim();
    // Lo transcrito lo escribió el modelo: no tiene el problema de la
    // fuente rota que mide `textoAprovechable`, y esa medida rechazaba
    // ofertas con muchas tablas, montos y números de documento (la de
    // VICCRIS CLEAN SERVICE pasó en una prueba y no en la siguiente). Lo
    // que sí indica un fallo es que salga casi nada por página.
    if (!texto || (transcrito && texto.length < 30 * Math.max(1, intentadas))) {
      d.estado = 'ilegible';
      d.motivo = transcrito
        ? 'El PDF está escaneado y no se obtuvo texto legible al transcribirlo.'
        : 'El documento no tiene texto legible.';
      return;
    }
    d.texto = texto;
    d.transcrito = transcrito;
    d.estado = 'listo';
    console.info(`[evaluacion] ${d.nombre}: ${texto.length} caracteres${transcrito ? `, ${intentadas} página(s) transcritas` : ''}`);
    if (d.rol === 'oferta') {
      const razon = razonSocialDeLaOferta(texto);
      if (!razon) console.warn('[evaluador] sin razón social en la oferta, se usa el archivo', { archivo: d.nombre });
      d.postor = razon ?? nombreDesdeArchivo(d.nombre);
    }
  });
  return cerrados;
}

interface Unidad {
  clave: string;
  correr: () => Promise<void>;
}

function exigenciasDe(lectura: LecturaBases, etapa: Etapa) {
  return etapa === 'admision' ? lectura.admision : etapa === 'calificacion' ? lectura.calificacion : lectura.factores;
}

/** Lo que se puede hacer ahora, en orden de prioridad. */
function unidades(p: Progreso, cliente: SupabaseClient): Unidad[] {
  const lista: Unidad[] = [];
  const agotada = (clave: string) => (p.fallos[clave] ?? 0) >= INTENTOS;
  const bases = p.documentos[0];

  // Las Bases primero: sin ellas no hay nada que evaluar.
  if (bases.estado === 'listo' && !p.lectura && !agotada('lectura')) {
    lista.push({
      clave: 'lectura',
      correr: async () => {
        p.lectura = await leerBases(bases.texto!);
      },
    });
  }

  p.documentos.forEach((d, di) => {
    if (d.estado !== 'leyendo') return;
    d.partes.forEach((_, k) => {
      const l = d.lecturas[k];
      if (!l) {
        const clave = `leer:${di}:${k}`;
        if (!agotada(clave)) {
          lista.push({
            clave,
            correr: async () => {
              d.lecturas[k] = await leerParte(cliente, d, k);
            },
          });
        }
        return;
      }
      if (l.tipo !== 'ocr') return;
      for (const desde of desdesDe(l)) {
        const clave = `tramo:${di}:${k}:${desde}`;
        if (l.tramos[desde] !== undefined || agotada(clave)) continue;
        lista.push({
          clave,
          correr: async () => {
            const fin = finDe(l, desde);
            if (!l.uri) {
              // Mixto: solo esas páginas, en un PDF propio.
              l.tramos[desde] = await transcribirPaginasSueltas(
                await descargar(cliente, d.partes[k]),
                desde,
                fin,
                d.nombre,
              );
              return;
            }
            if (!l.subido || Date.now() - Date.parse(l.subido) > VIDA_ARCHIVO_MS) {
              const nuevo = await uploadFileToGemini(await descargar(cliente, d.partes[k]), 'application/pdf', d.nombre);
              Object.assign(l, { uri: nuevo.uri, archivo: nuevo.name, subido: new Date().toISOString() });
            }
            const r = await transcribirTramo(l.uri, desde, fin);
            if (r.texto) {
              l.tramos[desde] = r.texto;
            } else if (r.filtrado) {
              // El filtro de recitación corta el tramo entero; hoja por
              // hoja suele pasar (ver ocr-pdf.ts).
              const hojas = await transcribirPaginaPorPagina(await descargar(cliente, d.partes[k]), desde, fin, d.nombre);
              if (hojas.fallidas > 0) throw new Error(`${hojas.fallidas} página(s) bloqueadas por el filtro`);
              l.tramos[desde] = hojas.texto;
            } else {
              // El modelo respondió y no había nada: una carátula en blanco.
              l.tramos[desde] = '';
            }
          },
        });
      }
    });
  });

  // Cada postor recorre sus etapas en orden; los postores, a la vez.
  if (p.lectura) {
    const lectura = p.lectura;
    p.documentos.slice(1).forEach((d, i) => {
      if (d.estado !== 'listo') return;
      const hechas = (p.etapas[i] ??= []);
      if (hechas.length >= ETAPAS.length) return;
      const etapa = ETAPAS[hechas.length];
      const clave = `etapa:${i}:${etapa}`;
      if (agotada(clave)) {
        // La API no pudo con esta etapa: queda para el comité, como
        // cuando el modelo devuelve un JSON roto (motor.ts).
        hechas.push({
          etapa,
          fichas: [],
          resultado: 'revision_humana',
          puntaje: etapa === 'evaluacion' ? 0 : undefined,
          subsanaciones: [],
          fundamento: 'El análisis automático no pudo completarse para esta etapa. Queda pendiente de revisión del comité.',
        });
        return;
      }
      lista.push({
        clave,
        correr: async () => {
          const r = await evaluarEtapa({
            etapa,
            exigencias: exigenciasDe(lectura, etapa),
            textoOferta: d.texto!,
            nombrePostor: d.postor!,
            textoBases: bases.texto!,
          });
          if (hechas.length !== ETAPAS.indexOf(etapa)) return;
          hechas.push(r);
          if (!avanza(r.resultado)) {
            const motivo = `No se evalúa: la oferta no superó la etapa de ${etapa}.`;
            for (const siguiente of ETAPAS.slice(hechas.length)) {
              hechas.push({
                etapa: siguiente,
                omitida: true,
                motivoOmision: motivo,
                fichas: [],
                resultado: 'no_cumple',
                subsanaciones: [],
                fundamento: motivo,
              });
            }
          }
        },
      });
    });
  }

  // Primero lo que destraba más: leer las Bases y evaluar a un postor
  // cuya oferta ya está lista (así su evaluación corre mientras se
  // transcriben las demás); después, leer y transcribir.
  const orden = (u: Unidad) =>
    u.clave === 'lectura' ? 0 : u.clave.startsWith('etapa:') ? 1 : u.clave.startsWith('leer:') ? 2 : 3;
  return lista.sort((x, y) => orden(x) - orden(y));
}

function terminado(p: Progreso): boolean {
  if (!p.lectura) return false;
  return p.documentos.slice(1).every(
    (d, i) => d.estado === 'ilegible' || (d.estado === 'listo' && (p.etapas[i]?.length ?? 0) >= ETAPAS.length),
  );
}

function resumir(p: Progreso, enCurso: Set<string>): ResumenProgreso {
  const lineas: LineaResumen[] = [];
  let paso = '';
  // Peso de cada parte del trabajo en la barra: leer documentos (que es
  // casi todo cuando hay escaneos), leer las Bases y evaluar.
  let avanceDocs = 0;

  p.documentos.forEach((d, di) => {
    let hechos = 0;
    let total = 0;
    let paginasTotales = 0;
    let paginasLeidas = 0;
    d.partes.forEach((_, k) => {
      const l = d.lecturas[k];
      total += 1;
      if (!l) return;
      hechos += 1;
      if (l.tipo === 'ocr') {
        const desdes = desdesDe(l);
        total += desdes.length;
        for (const desde of desdes) {
          paginasTotales += finDe(l, desde) - desde + 1;
          if (l.tramos[desde] !== undefined) {
            hechos += 1;
            paginasLeidas += finDe(l, desde) - desde + 1;
          }
        }
      }
    });
    const fraccion = d.estado === 'leyendo' ? hechos / Math.max(1, total) : 1;
    avanceDocs += fraccion;
    const titulo = d.rol === 'bases' ? 'Bases Integradas' : `Oferta ${di}: ${d.postor ?? nombreDesdeArchivo(d.nombre)}`;
    if (d.estado === 'listo') {
      lineas.push({ texto: `${titulo}${d.transcrito ? ' — escaneo transcrito' : ' — leída'}`, estado: 'hecho' });
    } else if (d.estado === 'ilegible') {
      lineas.push({ texto: `${titulo} — no se pudo leer`, estado: 'error' });
    } else {
      const texto = paginasTotales
        ? `${titulo} — transcribiendo las páginas escaneadas: ${paginasLeidas} de ${paginasTotales}`
        : `${titulo} — leyendo`;
      lineas.push({ texto, estado: hechos > 0 || [...enCurso].some((c) => c.startsWith(`leer:${di}:`)) ? 'en_curso' : 'pendiente' });
      if (!paso) paso = texto;
    }
  });

  const bases = p.documentos[0];
  if (p.lectura) {
    lineas.push({
      texto: `Requisitos de las Bases — ${p.lectura.admision.length} de admisión, ${p.lectura.calificacion.length} de calificación, ${p.lectura.factores.length} factores`,
      estado: 'hecho',
    });
  } else {
    lineas.push({
      texto: 'Requisitos de las Bases — identificando admisión, calificación y factores',
      estado: enCurso.has('lectura') ? 'en_curso' : bases.estado === 'ilegible' ? 'error' : 'pendiente',
    });
    if (enCurso.has('lectura') && !paso) paso = 'Identificando los requisitos de las Bases';
  }

  let etapasHechas = 0;
  let etapasTotales = 0;
  p.documentos.slice(1).forEach((d, i) => {
    if (d.estado === 'ilegible') return;
    const hechas = p.etapas[i] ?? [];
    etapasTotales += ETAPAS.length;
    etapasHechas += hechas.length;
    const nombre = d.postor ?? nombreDesdeArchivo(d.nombre);
    if (hechas.length >= ETAPAS.length) {
      const final = cerrarPostor(nombre, hechas);
      lineas.push({ texto: `Postor ${nombre} — ${final.resultadoFinal.toLowerCase()}`, estado: 'hecho' });
    } else if (hechas.length > 0 || enCurso.has(`etapa:${i}:${ETAPAS[0]}`)) {
      const etapa = ETAPAS[hechas.length];
      const texto = `Postor ${nombre} — evaluando ${NOMBRE_ETAPA[etapa].toLowerCase()}`;
      lineas.push({ texto, estado: 'en_curso' });
      if (!paso) paso = texto;
    } else {
      lineas.push({ texto: `Postor ${nombre} — admisión, calificación y evaluación`, estado: 'pendiente' });
    }
  });

  const porcentaje = Math.round(
    100 *
      (0.6 * (avanceDocs / Math.max(1, p.documentos.length)) +
        0.1 * (p.lectura ? 1 : 0) +
        0.3 * (etapasTotales ? etapasHechas / etapasTotales : 0)),
  );
  return {
    paso: paso || 'Armando el resultado',
    porcentaje: Math.min(99, porcentaje),
    lineas,
    actualizado: new Date().toISOString(),
  };
}

function borrarArchivosGemini(d: Documento) {
  for (const l of d.lecturas) {
    if (l?.tipo === 'ocr' && l.archivo) void deleteGeminiFile(l.archivo).catch(() => {});
  }
}

/** Una espera que se puede cancelar: si no, cada vuelta del bucle deja un temporizador vivo. */
function dormir(ms: number): { promesa: Promise<void>; cancelar: () => void } {
  let t: ReturnType<typeof setTimeout> | undefined;
  const promesa = new Promise<void>((r) => {
    t = setTimeout(r, Math.max(0, ms));
  });
  return { promesa, cancelar: () => clearTimeout(t) };
}

/**
 * Una vuelta: trabaja hasta `plazoMs` y guarda. Quien llama tiene que
 * tener el turno (`tomar_turno_evaluacion`).
 *
 * `plazoMs` es hasta cuándo se empiezan unidades nuevas; `cierreMs`,
 * hasta cuándo se espera a las que están en el aire. Lo que no termine
 * para entonces se rehace en la vuelta siguiente.
 */
export async function avanzarEvaluacion(
  cliente: SupabaseClient,
  id: string,
  { plazoMs, cierreMs }: { plazoMs: number; cierreMs: number },
): Promise<Desenlace> {
  const inicio = Date.now();
  const { data, error } = await cliente
    .from('evaluations')
    .select('bases_file_path, bases_partes, offer_files, progreso')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error(`No se encontró la evaluación: ${error?.message ?? id}`);
  const fila = data as Fila;
  // Al terminar, el progreso se reduce a su resumen: sin documentos, se
  // empieza de nuevo.
  const p: Progreso =
    fila.progreso?.version === 1 && Array.isArray(fila.progreso.documentos) ? fila.progreso : inicial(fila);
  p.vueltas += 1;

  const enCurso = new Map<string, Promise<void>>();
  let cola = Promise.resolve();
  const guardar = (extra: Record<string, unknown> = {}) => {
    p.resumen = resumir(p, new Set(enCurso.keys()));
    // Copia en el momento: lo que se guarda es este estado, aunque una
    // unidad lo cambie mientras la escritura viaja.
    const foto = JSON.parse(JSON.stringify(p));
    cola = cola.then(async () => {
      const { error: e } = await cliente
        .from('evaluations')
        .update({
          progreso: foto,
          corriendo_hasta: new Date(Date.now() + TURNO_SEGUNDOS * 1000).toISOString(),
          ...extra,
        })
        .eq('id', id);
      if (e) console.error('[evaluacion] no se pudo guardar el avance', e.message);
    });
    return cola;
  };

  const fallar = async (motivo: string, codigo: string): Promise<Desenlace> => {
    await Promise.allSettled([...enCurso.values()]);
    p.documentos.forEach(borrarArchivosGemini);
    await guardar({
      status: 'failed',
      result: { error: motivo, error_code: codigo, failed_at: new Date().toISOString() },
    });
    return { estado: 'failed', motivo };
  };

  if (p.vueltas > MAX_VUELTAS) {
    return fallar('La evaluación no pudo completarse tras varios intentos. Vuelve a intentarlo.', 'sin_terminar');
  }
  await guardar({ status: 'processing' });

  let vueltasEnVacio = 0;
  for (;;) {
    for (const d of cerrarDocumentos(p)) {
      if (d.estado !== 'leyendo') borrarArchivosGemini(d);
    }
    const bases = p.documentos[0];
    if (bases.estado === 'ilegible') {
      return fallar(`No se pudieron leer las Bases Integradas. ${bases.motivo ?? ''}`.trim(), 'bases_ilegibles');
    }
    if (!p.lectura && (p.fallos.lectura ?? 0) >= INTENTOS) {
      return fallar(`No se pudo identificar qué exigen las Bases. ${p.errores.lectura ?? ''}`.trim(), 'lectura_bases');
    }
    const ofertas = p.documentos.slice(1);
    if (ofertas.length > 0 && ofertas.every((d) => d.estado === 'ilegible')) {
      return fallar(ofertas.map((d) => `${d.nombre}: ${d.motivo}`).join(' · '), 'ofertas_ilegibles');
    }
    if (terminado(p)) break;

    const ahora = Date.now();
    if (ahora - inicio < plazoMs) {
      for (const u of unidades(p, cliente)) {
        if (enCurso.size >= PARALELO) break;
        if (enCurso.has(u.clave)) continue;
        const promesa = u
          .correr()
          .catch((e) => {
            p.fallos[u.clave] = (p.fallos[u.clave] ?? 0) + 1;
            p.errores[u.clave] = (e as Error).message.slice(0, 300);
            console.error(`[evaluacion] ${u.clave} falló (intento ${p.fallos[u.clave]}):`, (e as Error).message.slice(0, 200));
          })
          .finally(() => enCurso.delete(u.clave));
        enCurso.set(u.clave, promesa);
      }
    }
    if (enCurso.size === 0) {
      // Nada en el aire y nada que empezar: o se acabó el plazo, o no
      // queda trabajo posible. Antes de darlo por fallido se mira otra
      // vez: armar la lista también avanza el estado (una etapa agotada
      // se anota para revisión del comité sin lanzar nada).
      if (Date.now() - inicio >= plazoMs) break;
      if (++vueltasEnVacio <= 2) continue;
      return fallar('La evaluación se detuvo sin poder continuar.', 'sin_trabajo');
    }
    vueltasEnVacio = 0;
    const restante = cierreMs - (Date.now() - inicio);
    if (restante <= 0) break;
    // Se despierta al menos cada minuto para guardar y renovar el turno:
    // una llamada larga al modelo, sola, lo dejaría vencer y otra vuelta
    // entraría a trabajar a la vez.
    const espera = dormir(Math.min(restante, 60_000));
    await Promise.race([...enCurso.values(), espera.promesa]);
    espera.cancelar();
    await guardar();
  }

  if (!terminado(p)) {
    await guardar();
    await cola;
    return { estado: 'continuar', paso: p.resumen?.paso ?? '' };
  }

  const lectura = p.lectura!;
  const ofertas = p.documentos.slice(1);
  const postores = ofertas
    .map((d, i) => (d.estado === 'listo' ? cerrarPostor(d.postor!, p.etapas[i]) : null))
    .filter((x): x is NonNullable<typeof x> => x !== null);
  ordenarPorPuntaje(postores);
  const acta = construirActa({ bases: lectura, postores });
  const resultado = {
    version: 'etapas-1',
    generado: new Date().toISOString(),
    bases: lectura,
    postores,
    acta,
    transcritas: ofertas.filter((d) => d.estado === 'listo' && d.transcrito).map((d) => d.postor!),
    ilegibles: ofertas.filter((d) => d.estado === 'ilegible').map((d) => ({ nombre: d.nombre, motivo: d.motivo ?? '' })),
  };

  // El progreso pesa (lleva los textos completos); hecho el resultado, se
  // queda solo el resumen.
  p.documentos.forEach(borrarArchivosGemini);
  const resumen = { ...resumir(p, new Set()), porcentaje: 100, paso: 'Evaluación terminada' };
  await cola;
  const { error: e } = await cliente
    .from('evaluations')
    .update({
      status: 'done',
      result: resultado,
      completed_at: new Date().toISOString(),
      progreso: { version: 1, resumen },
      corriendo_hasta: null,
    })
    .eq('id', id);
  if (e) throw new Error(`No se pudo guardar el resultado: ${e.message}`);
  return { estado: 'done' };
}
