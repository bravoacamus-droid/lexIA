#!/usr/bin/env tsx
/**
 * Arma los actos normativos de la biblioteca y vincula cada texto con el
 * suyo (documento 11 de César, «Mejorando la biblioteca normativa»,
 * 30/09/2026).
 *
 * Fuente de verdad: el «Tablero normativo de contrataciones públicas» del
 * OECE, versión del 18/08/2026 (data/tablero-normativo-oece-2026-08-18.json,
 * leído por posición del PDF oficial). Da, para cada norma de la DGA, el
 * OECE y Perú Compras: número y título oficiales, resolución que la
 * aprueba, modificaciones y rectificaciones con fecha y enlace, vigencia y
 * si está derogada.
 *
 * Qué hace:
 *   1. Escribe normative_acts (upsert).
 *   2. Pone acto_clave a cada texto y rotula su parte (texto de la norma,
 *      resolución que la aprueba, modificación… con su fecha y enlace).
 *   3. Quita los textos repetidos dentro de un mismo acto (mismo md5),
 *      pasando antes favoritos y resaltados al que queda.
 *   4. Corrige el tipo de lo mal clasificado (un lineamiento entre las
 *      directivas, las preguntas frecuentes entre las guías, la RD de las
 *      bases estándar entre las resoluciones directorales).
 *   5. Oculta lo retirado (las preguntas frecuentes de la Ley 30225).
 *
 * Uso: npx tsx scripts/biblioteca-actos.ts            (solo muestra)
 *      npx tsx scripts/biblioteca-actos.ts --aplicar  (escribe)
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local'), override: true });
const APLICAR = process.argv.includes('--aplicar');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Tipos ──────────────────────────────────────────────────────────────

type Rol = 'aprueba' | 'modificacion' | 'rectificacion' | 'anexo' | 'otro';
interface DocDelActo {
  rol: Rol;
  nombre: string;
  fecha: string | null;
  url: string | null;
}
interface Acto {
  clave: string;
  tipo: string;
  entidad: string;
  numero: string;
  titulo: string | null;
  url: string | null;
  documentos: DocDelActo[];
  vigente_desde: string | null;
  vigente_hasta: string | null;
  derogada: boolean;
  nota: string | null;
  fuente_datos: string;
}
interface Fila {
  seccion: 'DGA' | 'OECE' | 'PERU_COMPRAS';
  n: string;
  instrumento: string;
  aprueba: string;
  vigencia: string;
  enlaces_instrumento: string[];
  enlaces_aprueba: string[];
}

const ENTIDAD = { DGA: 'DGA', OECE: 'OECE', PERU_COMPRAS: 'Perú Compras' } as const;
const PREFIJO = { DGA: 'DGA', OECE: 'OECE', PERU_COMPRAS: 'PC' } as const;
const TABLERO = 'Tablero normativo de contrataciones públicas (OECE), versión del 18/08/2026';

const limpio = (t: string) =>
  t
    .replace(/\s+/g, ' ')
    .replace(/N\s*[°º]\s*(?=\d)/g, 'N° ')
    .replace(/N\s*[°º]\s*D/g, 'N° D')
    .replace(/Nº/g, 'N°')
    // «OECE- CD», «PERÚ COMPRAS- JEFATURA»: guion pegado a la palabra de
    // antes y suelto de la de después. « - » (separador del título) queda.
    .replace(/(\S)-\s+(?=[A-Z0-9])/g, '$1-')
    .replace(/(\d)- (\d{4})/g, '$1-$2')
    .replace(/\bEF\/54\.0\b(?!\d)/g, 'EF/54.01')
    .replace(/\[\*+\]/g, '')
    .trim();

const fecha = (dmy: string) => {
  const [d, m, y] = dmy.split('/');
  return `${y}-${m}-${d}`;
};

/** «0010-2025», «D000033-2025», «00016-2026» → «10-2025». */
function numeroCorto(t: string): string | null {
  const m = /D?0*(\d{1,6})\s*-\s*(20\d{2})/.exec(t);
  return m ? `${Number(m[1])}-${m[2]}` : null;
}
function numeroDeUrl(u: string): string | null {
  const m = /\/\d+-d?0*(\d{1,6})-(20\d{2})-/.exec(u);
  return m ? `${Number(m[1])}-${m[2]}` : null;
}

// ── 1. Actos desde el tablero ──────────────────────────────────────────

function actoDeFila(f: Fila): Acto {
  const derogada = /DEROGADA/.test(f.instrumento);
  const instrumento = limpio(f.instrumento.replace(/DEROGADA/, ''));

  // Documentos: «Resolución … Modificación: Resolución … Rectificación: …»
  const trozos = f.aprueba.split(/(?=Modificaci[óo]n:|Rectificaci[óo]n:)/);
  const fechas = (f.vigencia.match(/\d{2}\/\d{2}\/\d{4}/g) || []).map(fecha);
  const rango = / al /.test(f.vigencia);
  const docs: DocDelActo[] = trozos.map((t, i) => {
    const rol: Rol = /^Modificaci/.test(t) ? 'modificacion' : /^Rectificaci/.test(t) ? 'rectificacion' : 'aprueba';
    return {
      rol,
      nombre: limpio(t.replace(/^(Modificaci[óo]n|Rectificaci[óo]n):\s*/, '')),
      fecha: rango ? fechas[0] ?? null : fechas[i] ?? null,
      url: null,
    };
  });
  // Cada enlace va con la resolución cuyo número lleva en la URL; los que
  // no lo llevan (El Peruano) cubren los huecos en orden.
  const sueltos: string[] = [];
  for (const u of f.enlaces_aprueba) {
    const n = numeroDeUrl(u);
    const d = n ? docs.find((x) => !x.url && numeroCorto(x.nombre) === n) : undefined;
    if (d) d.url = u;
    else sueltos.push(u);
  }
  for (const d of docs) if (!d.url) d.url = sueltos.shift() ?? null;

  // Número y título: «Directiva N° 0002-2025-EF/54.01 - Disposiciones…»
  let numero = instrumento;
  let titulo: string | null = null;
  const corte = instrumento.search(/\s-\s/);
  if (/^(Directiva|Lineamiento|Resoluci)/.test(instrumento) && corte > 0) {
    numero = instrumento.slice(0, corte).trim();
    titulo = instrumento.slice(corte + 3).trim();
  }

  let tipo = 'directiva';
  let clave: string;
  const pre = PREFIJO[f.seccion];
  if (/^Lineamientos para el cumplimiento/.test(instrumento)) {
    // Perú Compras: los lineamientos no llevan número propio; se nombran
    // por la resolución que los aprueba (pedido de César).
    tipo = 'lineamiento';
    const rd = /0039/.test(instrumento) ? '39-2025' : '43-2025';
    clave = `${pre}:lineamiento:rd${rd}`;
    titulo = instrumento;
    numero = docs[0].nombre;
  } else if (/^Gu[íi]a de Actuaciones Preparatorias/.test(instrumento)) {
    tipo = 'guia';
    clave = `${pre}:guia:actuaciones-preparatorias`;
    numero = docs[0].nombre;
    titulo = 'Guía de Actuaciones Preparatorias';
    // Sus formatos se aprobaron aparte (RD N° 0013-2026-EF/54.01, 23/04/2026).
    const formatos = f.enlaces_instrumento.find((u) => /0013-2026/.test(u));
    if (formatos) {
      docs.push({
        rol: 'otro',
        nombre: 'Resolución Directoral N° 0013-2026-EF/54.01 (aprueba los formatos)',
        fecha: '2026-04-23',
        url: formatos,
      });
    }
  } else if (/^C[óo]digo de [ÉE]tica/.test(instrumento)) {
    tipo = 'codigo_etica';
    clave = `${pre}:codigo:arbitraje`;
    numero = docs[0].nombre;
    titulo = instrumento;
  } else if (/^Resoluci[óo]n Directoral/.test(instrumento)) {
    tipo = 'resolucion';
    clave = `${pre}:rd:${numeroCorto(numero)}`;
  } else if (/^Lineamiento/.test(instrumento)) {
    tipo = 'lineamiento';
    clave = `${pre}:lineamiento:${numeroCorto(numero)}`;
  } else {
    clave = `${pre}:directiva:${numeroCorto(numero)}`;
  }

  const hasta = rango ? fechas[1] ?? null : derogada ? fechas[1] ?? null : null;
  return {
    clave: clave!,
    tipo,
    entidad: ENTIDAD[f.seccion],
    numero,
    titulo,
    url: f.enlaces_instrumento[0] ?? docs[docs.length - 1]?.url ?? null,
    documentos: docs,
    vigente_desde: fechas[0] ?? null,
    vigente_hasta: hasta,
    derogada,
    nota: /Publicaci[óo]n:/.test(f.vigencia) ? 'Fecha de publicación de la versión actualizada.' : null,
    fuente_datos: TABLERO,
  };
}

const filas: Fila[] = JSON.parse(readFileSync(join(process.cwd(), 'data/tablero-normativo-oece-2026-08-18.json'), 'utf8'));
const actos = new Map<string, Acto>();
for (const f of filas) {
  const a = actoDeFila(f);
  actos.set(a.clave, a);
}

// Lo que el tablero no trae.
actos.set('DGA:directiva:7-2025', {
  clave: 'DGA:directiva:7-2025',
  tipo: 'directiva',
  entidad: 'DGA',
  numero: 'Directiva N° 0007-2025-EF/54.01',
  titulo: 'Programación multianual de bienes, servicios y obras',
  url: null, // se toma del texto al vincular
  documentos: [],
  vigente_desde: '2025-06-12',
  vigente_hasta: null,
  derogada: false,
  nota: null,
  fuente_datos: 'Ficha oficial en gob.pe',
});
actos.set('DGA:bases:1-2026', {
  clave: 'DGA:bases:1-2026',
  tipo: 'bases_estandar',
  entidad: 'DGA',
  numero: 'Resolución Directoral N° 001-2026-EF/54.01',
  titulo: 'Bases estándar para los procedimientos de selección en el marco de la Ley N° 32069 (versión actualizada)',
  url: 'https://www.gob.pe/institucion/mef/normas-legales/7614342-001-2026-ef-54-01',
  documentos: [
    {
      rol: 'aprueba',
      nombre: 'Resolución Directoral N° 001-2026-EF/54.01',
      fecha: '2026-01-14',
      url: 'https://www.gob.pe/institucion/mef/normas-legales/7614342-001-2026-ef-54-01',
    },
  ],
  vigente_desde: '2026-01-14',
  vigente_hasta: null,
  derogada: false,
  nota: 'Modifica la Directiva N° 0005-2025-EF/54.01; sus bases estándar se publican como anexos.',
  fuente_datos: TABLERO,
});

// Normas que César pidió agregar en el documento 11 (no están en el tablero).
const NUEVOS = 'Documento 11 de César (30/09/2026)';
actos.set('DGA:guia:emergencia', {
  clave: 'DGA:guia:emergencia',
  tipo: 'guia',
  entidad: 'DGA',
  numero: 'Guía para el abastecimiento en situación de emergencia',
  titulo: null,
  url: 'https://cdn.www.gob.pe/uploads/document/file/10253388/143382-guia-para-el-abastecimiento-en-situacion-de-emergencia.pdf',
  documentos: [],
  vigente_desde: '2026-07-02',
  vigente_hasta: null,
  derogada: false,
  nota: null,
  fuente_datos: NUEVOS,
});
actos.set('CGR:directiva:17-2023', {
  clave: 'CGR:directiva:17-2023',
  tipo: 'directiva',
  entidad: 'Contraloría',
  numero: 'Directiva N° 017-2023-CG/GMPL',
  titulo: 'Ejecución de obras públicas por administración directa',
  url: 'https://cdn.www.gob.pe/uploads/document/file/5623613/4984570-directiva-n-017-2023-cg-gmpl.pdf?v=1703890234',
  documentos: [
    {
      rol: 'aprueba',
      nombre: 'Resolución de Contraloría N° 432-2023-CG',
      fecha: '2023-12-22',
      url: 'https://cdn.www.gob.pe/uploads/document/file/5623613/4984570-directiva-n-017-2023-cg-gmpl.pdf?v=1703890234',
    },
  ],
  vigente_desde: '2023-12-22',
  vigente_hasta: null,
  derogada: false,
  nota: null,
  fuente_datos: NUEVOS,
});
actos.set('DGPP:directiva:1-2024', {
  clave: 'DGPP:directiva:1-2024',
  tipo: 'directiva',
  entidad: 'DGPP',
  numero: 'Directiva N° 0001-2024-EF/50.01',
  titulo: 'Directiva para la Ejecución Presupuestaria',
  url: 'https://cdn.www.gob.pe/uploads/document/file/7525012/6397562-directiva-para-la-ejecucion-presupuestaria.pdf?v=1737564088',
  documentos: [
    {
      rol: 'aprueba',
      nombre: 'Resolución Directoral N° 0009-2024-EF/50.01',
      fecha: '2024-02-09',
      url: 'https://cdn.www.gob.pe/uploads/document/file/7525012/6397562-directiva-para-la-ejecucion-presupuestaria.pdf?v=1737564088',
    },
  ],
  vigente_desde: '2024-02-09',
  vigente_hasta: null,
  derogada: false,
  nota: null,
  fuente_datos: NUEVOS,
});
actos.set('DGPMI:nota:7-2025', {
  clave: 'DGPMI:nota:7-2025',
  tipo: 'nota_tecnica',
  entidad: 'DGPMI',
  numero: 'Resolución Directoral N° 0007-2025-EF/63.01',
  titulo: 'Nota Técnica: Características de software, hardware, entorno de datos comunes y otros recursos tecnológicos necesarios para la adopción de BIM',
  url: 'https://www.gob.pe/institucion/mef/normas-legales/7037100-0007-2025-ef-63-01',
  documentos: [
    {
      rol: 'aprueba',
      nombre: 'Resolución Directoral N° 0007-2025-EF/63.01',
      fecha: '2025-08-13',
      url: 'https://www.gob.pe/institucion/mef/normas-legales/7037100-0007-2025-ef-63-01',
    },
  ],
  vigente_desde: '2025-08-13',
  vigente_hasta: null,
  derogada: false,
  nota: null,
  fuente_datos: NUEVOS,
});
actos.set('DGPMI:lineamiento:ioarr', {
  clave: 'DGPMI:lineamiento:ioarr',
  tipo: 'lineamiento',
  entidad: 'DGPMI',
  numero: 'Lineamientos IOARR (novena versión, junio de 2025)',
  titulo: 'Identificación y registro de las Inversiones de Optimización, de Ampliación Marginal, de Rehabilitación y de Reposición',
  url: 'https://www.mef.gob.pe/contenidos/inv_publica/docs/Metodologias_Generales_PI/Lineamientos_IOARR.pdf',
  documentos: [],
  vigente_desde: '2025-06-01',
  vigente_hasta: null,
  derogada: false,
  nota: null,
  fuente_datos: NUEVOS,
});

// ── 2. Qué acto es cada texto ──────────────────────────────────────────

interface Doc {
  id: string;
  type: string;
  number: string | null;
  title: string;
  date: string | null;
  source_url: string | null;
  raw_text: string;
  metadata: Record<string, unknown>;
}

function claveDe(d: Doc): string | null {
  const t = d.title;
  const ent = String(d.metadata.entidad || '');
  // Las normas agregadas con el documento 11.
  if (d.type === 'directiva' && ent === 'Contraloría') return 'CGR:directiva:17-2023';
  if (d.type === 'directiva' && ent === 'DGPP') return 'DGPP:directiva:1-2024';
  if (d.type === 'nota_tecnica') return 'DGPMI:nota:7-2025';
  if (d.type === 'lineamiento' && ent === 'DGPMI') return 'DGPMI:lineamiento:ioarr';
  if (d.type === 'guia' && /situaci[óo]n de emergencia/i.test(t)) return 'DGA:guia:emergencia';
  if (d.type === 'resolucion' && /0006-2025-EF/.test(t)) return 'DGA:rd:6-2025';
  if (d.type === 'directiva' && ent === 'DGA') {
    const m = /(\d{4})-(20\d{2})-EF/.exec(t);
    return m ? `DGA:directiva:${Number(m[1])}-${m[2]}` : null;
  }
  if ((d.type === 'directiva' || d.type === 'lineamiento') && ent === 'OECE') {
    const m = /(?:Directiva|Lineamiento)[^0-9]*(\d{3})-(20\d{2})/.exec(t);
    if (!m) return null;
    return `OECE:${/^Lineamiento/.test(t) ? 'lineamiento' : 'directiva'}:${Number(m[1])}-${m[2]}`;
  }
  if (d.type === 'directiva' && ent === 'Perú Compras') {
    const m = /(\d{3})-(20\d{2})-PER/.exec(t);
    return m ? `PC:directiva:${Number(m[1])}-${m[2]}` : null;
  }
  if (d.type === 'lineamiento') {
    if (/[úu]tiles/i.test(t)) return 'PC:lineamiento:rd39-2025';
    if (/Computadoras/i.test(t)) return 'PC:lineamiento:rd43-2025';
  }
  if (d.type === 'resolucion') {
    if (/^3\. Resoluci/.test(t)) return 'DGA:rd:39-2025';
    if (/^4\. Resoluci/.test(t)) return 'DGA:rd:43-2025';
    if (/contratos estandarizados/i.test(d.number || '')) return 'DGA:rd:11-2025';
    if (/tipolog/i.test(d.number || '')) return 'DGA:rd:16-2025';
    if (/001-2026-EF/.test(t)) return 'DGA:bases:1-2026';
  }
  if (d.type === 'bases_estandar' && /7614342/.test(d.source_url || '')) return 'DGA:bases:1-2026';
  if (d.type === 'guia' && /ACTUACIONES PREPARATORIAS/i.test(t)) return 'DGA:guia:actuaciones-preparatorias';
  if (d.type === 'codigo_etica') return 'OECE:codigo:arbitraje';
  return null;
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * La resolución que ES este texto (no las que menciona): su encabezado
 * va en mayúsculas («RESOLUCIÓN DIRECTORAL Nº 0041-2025-EF/54.01»).
 * Si no hay encabezado, la primera mención.
 */
function resolucionPropia(texto: string): string | null {
  const cabeza = texto.slice(0, 4000);
  const mayus = /RESOLUCI[ÓO]N\s+(?:DIRECTORAL|JEFATURAL|DE\s+PRESIDENCIA(?:\s+EJECUTIVA)?)?\s*N[°ºo.]*\s*(D?\d{1,6}\s*-\s*20\d{2})/.exec(cabeza);
  if (mayus) return numeroCorto(mayus[1]);
  const cualquiera = /Resoluci[óo]n\s+(?:Directoral|Jefatural)?\s*N[°ºo.]*\s*(D?\d{1,6}\s*-\s*20\d{2})/i.exec(cabeza);
  return cualquiera ? numeroCorto(cualquiera[1]) : null;
}

const ETIQUETA_DE_ROL: Record<Rol, string> = {
  aprueba: 'Resolución que la aprueba',
  modificacion: 'Modificación',
  rectificacion: 'Rectificación',
  anexo: 'Anexo',
  otro: 'Documento relacionado',
};

interface Parte {
  rol: 'norma' | Rol;
  etiqueta: string;
  fecha: string | null;
  url: string | null;
}

/**
 * Qué resolución del acto es este texto. Primero el número del nombre de
 * archivo («resolucion-000050-2025-pre…»); si no lo trae, la pista del
 * nombre (aprueba / primera o segunda modificación / rectifica) entre las
 * resoluciones que el tablero lista; y si aún hay duda, el encabezado del
 * texto. El texto de El Peruano empieza a veces con la norma anterior de
 * la misma página, por eso el texto va al final.
 */
function docDelActo(d: Doc, a: Acto, n: string): DocDelActo | null {
  const delNombre = /resoluci/.test(n) ? numeroCorto(d.number || '') : null;
  if (delNombre) {
    const x = a.documentos.find((y) => numeroCorto(y.nombre) === delNombre);
    if (x) return x;
  }
  const rol: Rol = /corrig|rectific/.test(n) ? 'rectificacion' : /modific/.test(n) ? 'modificacion' : 'aprueba';
  const candidatos = a.documentos.filter((y) => y.rol === rol);
  if (candidatos.length === 1) return candidatos[0];
  if (candidatos.length > 1) {
    const orden = /segunda/.test(n) ? 1 : /tercera/.test(n) ? 2 : /primera/.test(n) ? 0 : -1;
    if (orden >= 0 && candidatos[orden]) return candidatos[orden];
  }
  const propia = resolucionPropia(d.raw_text);
  return a.documentos.find((y) => numeroCorto(y.nombre) === propia) ?? null;
}

function parteDe(d: Doc, a: Acto, partesDelActo: Doc[]): Parte {
  // «Directiva Nº 0006-2025-EF54.01 · 1. Resolución…»: cuenta lo de después del punto.
  const n = sinTildes(`${(d.number || '').split('·').pop()}`)
    .trim()
    .toLowerCase();
  // Anexos: conservan su nombre.
  if (/anexo|detalle de los bienes|^\d+\.\s*anexo/.test(n) || (a.tipo === 'bases_estandar' && d.type === 'bases_estandar')) {
    const nombre = a.tipo === 'bases_estandar' ? d.title : (d.number || 'Anexo').split('·').pop()!.trim().replace(/_/g, ' ');
    return { rol: 'anexo', etiqueta: nombre.charAt(0).toUpperCase() + nombre.slice(1), fecha: a.vigente_desde, url: d.source_url };
  }
  // En una resolución directoral, la resolución ES la norma.
  if (a.tipo === 'resolucion') {
    const doc = a.documentos[0];
    return { rol: 'norma', etiqueta: 'Texto de la resolución', fecha: doc?.fecha ?? a.vigente_desde, url: doc?.url ?? a.url };
  }
  const esResolucion =
    /resoluci|norma que aprueba|que aprueba|aprobacion/.test(n) && !/^texto|^lineamientos para el cumplimiento|^directiva\b/.test(n);
  if (esResolucion || (a.tipo === 'bases_estandar' && d.type !== 'bases_estandar')) {
    const doc = docDelActo(d, a, n);
    // Un solo PDF con la resolución y la directiva (Perú Compras): es el texto.
    const unico = partesDelActo.filter((x) => !/anexo/i.test(x.number || '')).length === 1;
    if (doc) {
      if (unico && doc.rol === 'aprueba' && a.tipo !== 'bases_estandar') {
        return { rol: 'norma', etiqueta: `Texto de la norma, con la ${doc.nombre} que la aprueba`, fecha: doc.fecha, url: doc.url };
      }
      const etiqueta = doc.rol === 'aprueba' ? `${doc.nombre}` : `${ETIQUETA_DE_ROL[doc.rol]}: ${doc.nombre}`;
      return { rol: doc.rol, etiqueta, fecha: doc.fecha, url: doc.url };
    }
    // Una resolución que el tablero no lista (p. ej. una fe de erratas):
    // conserva el nombre con que la entregó César.
    const rol: Rol = /corrig|rectific/.test(n) ? 'rectificacion' : /modific/.test(n) ? 'modificacion' : 'aprueba';
    const nombre = (d.number || ETIQUETA_DE_ROL[rol]).split('·').pop()!.trim();
    return { rol, etiqueta: nombre.charAt(0).toUpperCase() + nombre.slice(1), fecha: null, url: d.source_url };
  }
  // El texto de la norma: el original o una versión actualizada. La carpeta
  // de César trae el original; lo bajado de la ficha «-v-2», el actualizado.
  const actualizada =
    /modific|vigente a|v\.?\s*2|actualizad/.test(n) ||
    (/-v-2\b/.test(d.source_url || '') && d.metadata.ingested_by !== 'cliente_docs_script') ||
    /\(v\.2\)/.test(d.title);
  if (actualizada) {
    const detalle = /primera modific/.test(n)
      ? 'con la primera modificación'
      : /segunda modific/.test(n)
        ? 'con la segunda modificación'
        : /vigente a/.test(n)
          ? (d.number || '').replace(/^Texto\s+/i, '')
          : 'con sus modificaciones';
    const mods = a.documentos.filter((x) => x.rol === 'modificacion');
    const cual = /primera modific/.test(n) ? mods[0] : /segunda modific/.test(n) ? mods[1] : mods[mods.length - 1];
    return { rol: 'norma', etiqueta: `Texto actualizado (${detalle})`, fecha: cual?.fecha ?? d.date, url: d.source_url ?? cual?.url ?? a.url };
  }
  return { rol: 'norma', etiqueta: 'Texto de la norma', fecha: a.vigente_desde, url: d.source_url ?? a.url };
}

// ── 3. Correr ──────────────────────────────────────────────────────────

void (async () => {
  const tipos = ['directiva', 'lineamiento', 'resolucion', 'guia', 'codigo_etica', 'bases_estandar', 'nota_tecnica'];
  const todos: Doc[] = [];
  for (const t of tipos) {
    const { data, error } = await db
      .from('normative_documents')
      .select('id, type, number, title, date, source_url, raw_text, metadata')
      .eq('type', t);
    if (error) throw error;
    todos.push(...((data || []) as Doc[]));
  }

  const porActo = new Map<string, Doc[]>();
  const sinActo: Doc[] = [];
  for (const d of todos) {
    const c = claveDe(d);
    if (c && actos.has(c)) porActo.set(c, [...(porActo.get(c) || []), d]);
    else sinActo.push(d);
  }

  // La Directiva 0007-2025-EF/54.01 toma su enlace del texto.
  const d7 = porActo.get('DGA:directiva:7-2025')?.find((d) => d.source_url);
  if (d7) actos.get('DGA:directiva:7-2025')!.url = d7.source_url;

  const crypto = await import('node:crypto');
  const md5 = (t: string) => crypto.createHash('md5').update(t).digest('hex');

  const borrar: Array<{ id: string; queda: string }> = [];
  const cambios: Array<{ id: string; patch: Record<string, unknown> }> = [];

  for (const [clave, docs] of Array.from(porActo.entries()).sort()) {
    const a = actos.get(clave)!;
    console.log(`\n■ ${a.numero}${a.titulo ? ` — ${a.titulo.slice(0, 80)}` : ''}  [${clave}]${a.derogada ? ' DEROGADA' : ''}`);
    // Repetidos: mismo texto dentro del acto. Queda el que el actualizador
    // reconoce (con URL y fecha) y, a igualdad, el más antiguo en la base.
    const grupos = new Map<string, Doc[]>();
    for (const d of docs) grupos.set(md5(d.raw_text), [...(grupos.get(md5(d.raw_text)) || []), d]);
    const quedan: Doc[] = [];
    for (const g of Array.from(grupos.values())) {
      const orden = [...g].sort((x, y) => {
        const px = (x.metadata.ingested_by === 'scraping_bot' ? 4 : 0) + (x.source_url ? 2 : 0) + (x.date && !/-01-01$/.test(x.date) ? 1 : 0);
        const py = (y.metadata.ingested_by === 'scraping_bot' ? 4 : 0) + (y.source_url ? 2 : 0) + (y.date && !/-01-01$/.test(y.date) ? 1 : 0);
        return py - px;
      });
      quedan.push(orden[0]);
      for (const x of orden.slice(1)) {
        borrar.push({ id: x.id, queda: orden[0].id });
        console.log(`   ✗ repetido: «${x.number}» = «${orden[0].number}»`);
      }
    }
    for (const d of quedan) {
      const p = parteDe(d, a, quedan);
      const tipo =
        clave === 'OECE:lineamiento:2-2025' || clave === 'OECE:lineamiento:1-2025'
          ? 'lineamiento'
          : clave === 'DGA:bases:1-2026'
            ? 'bases_estandar'
            : d.type;
      const fechaReal = p.fecha ?? a.vigente_desde;
      const entidad = a.entidad;
      const patch: Record<string, unknown> = {
        acto_clave: clave,
        type: tipo,
        metadata: {
          ...d.metadata,
          entidad,
          parte_rol: p.rol,
          parte_etiqueta: p.etiqueta,
          parte_fecha: p.fecha,
          parte_url: p.url,
          ...(fechaReal ? { anio: fechaReal.slice(0, 4) } : {}),
        },
      };
      // Las fechas «1 de enero» salieron del año del número: se cambian por la real.
      if (fechaReal && (!d.date || /-01-01$/.test(d.date))) patch.date = fechaReal;
      cambios.push({ id: d.id, patch });
      console.log(`   · ${p.etiqueta.padEnd(64).slice(0, 64)} ${p.fecha ?? '—'}  ${p.url ? '🔗' : '  '}  (${(d.number || '').slice(0, 40)})${tipo !== d.type ? `  tipo ${d.type}→${tipo}` : ''}`);
    }
  }

  console.log(`\nSin acto (${sinActo.length}):`);
  for (const d of sinActo) console.log(`   ${d.type.padEnd(14)} ${d.title.slice(0, 70)}  (${(d.number || '').slice(0, 30)})`);

  // Guías → preguntas frecuentes; la de la Ley 30225 se oculta.
  const faqs = todos.filter((d) => d.type === 'guia' && /^Preguntas Frecuentes/i.test(d.title));
  console.log(`\nPreguntas frecuentes (${faqs.length}): pasan a su propia categoría.`);
  for (const f of faqs) {
    const retirar = /30225/.test(f.title);
    console.log(`   ${retirar ? '✗ OCULTA' : '→'} ${f.title.slice(0, 90)}`);
    cambios.push({
      id: f.id,
      patch: {
        type: 'preguntas_frecuentes',
        ...(retirar
          ? { oculto: true, metadata: { ...f.metadata, motivo_oculto: 'Ley N° 30225 derogada: retirada a pedido de César (30/09/2026).' } }
          : {}),
      },
    });
  }

  console.log(`\nActos: ${actos.size} · textos vinculados: ${cambios.length - faqs.length} · repetidos a quitar: ${borrar.length}`);
  if (!APLICAR) {
    console.log('\n(Solo se mostró. Para escribir: --aplicar)');
    return;
  }

  // Escribir
  const { error: e1 } = await db.from('normative_acts').upsert(
    Array.from(actos.values()).map((a) => ({ ...a, updated_at: new Date().toISOString() })),
  );
  if (e1) throw e1;
  for (const { id, queda } of borrar) {
    // Favoritos y resaltados pasan al texto que queda.
    const { data: guardados } = await db.from('user_saved_documents').select('id, user_id').eq('document_id', id);
    for (const g of guardados || []) {
      const { data: ya } = await db.from('user_saved_documents').select('id').eq('document_id', queda).eq('user_id', g.user_id).maybeSingle();
      if (ya) await db.from('user_saved_documents').delete().eq('id', g.id);
      else await db.from('user_saved_documents').update({ document_id: queda }).eq('id', g.id);
    }
    await db.from('user_annotations').update({ document_id: queda }).eq('document_id', id);
    const { error } = await db.from('normative_documents').delete().eq('id', id);
    if (error) throw error;
  }
  for (const { id, patch } of cambios) {
    const { error } = await db.from('normative_documents').update(patch).eq('id', id);
    if (error) throw new Error(`${id}: ${error.message}`);
  }
  console.log('✓ Escrito.');
})();
