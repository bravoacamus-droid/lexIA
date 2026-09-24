/**
 * Lo que la biblioteca necesita de cada documento, sea quien sea que lo
 * traiga.
 *
 * La carga manual (scripts/ingest-resoluciones-tribunal.ts y
 * scripts/ingest-opiniones-pronunciamientos.ts) guarda número, título,
 * fecha, régimen, entidad, año y correlativo con reglas precisas: el
 * listado de la biblioteca ordena por año y correlativo, filtra por
 * entidad y por régimen, y el chat prioriza por fecha. El actualizador
 * automático guardaba solo el número tal como venía («000076-2026-OECE-
 * DTN») y nada más, y lo que traía quedaba fuera de orden y de los
 * filtros. Aquí están las reglas, una sola vez, para los dos.
 */
import { claveDeResolucion, fechaDeExpedicion, numeroDeResolucion } from './resoluciones';

/** Entrada en vigor de la Ley N.° 32069: lo anterior es de la N.° 30225. */
export const VIGENCIA_32069 = '2025-04-22';

export interface DocumentoNormalizado {
  number: string;
  title: string;
  date: string | null;
  applicable_law: string[];
  metadata: Record<string, unknown>;
}

/** Quita caracteres de control que rompen el texto guardado. */
export function limpiarTexto(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/**
 * Correlativo con ceros a la izquierda, para ordenar como texto:
 *   «Opinión N° D000079-2026-OECE-DTN»      → 0079
 *   «Pronunciamiento N° 452-2026/OECE-DSAT» → 0452
 *   «Directiva N.° 001-2026-OECE-CD»        → 0001
 */
export function correlativoDe(titulo: string): string | null {
  const m = titulo.match(/N\s*\.?\s*[°º]?\s*D?0*(\d+)\s*-\s*(20\d{2})/i);
  return m ? m[1].padStart(4, '0') : null;
}

export function anioDe(titulo: string, fecha: string | null): string | null {
  const m = titulo.match(/-\s*(20\d{2})\s*[-/]/);
  if (m) return m[1];
  return fecha ? fecha.slice(0, 4) : null;
}

/**
 * La entidad emisora, leída del título. Sin `\b`: gob.pe publica títulos
 * como «Pronunciamiento N° 404-2023OSCE-DGR». Sin nombre del organismo,
 * decide la fecha: el OECE reemplazó al OSCE con la Ley N.° 32069.
 */
export function entidadDe(titulo: string, fecha: string | null): string {
  if (/EF\s*\/?\s*54\.01/i.test(titulo)) return 'DGA';
  if (/OSCE/i.test(titulo)) return 'OSCE';
  if (/OECE/i.test(titulo)) return 'OECE';
  if (/per[uú]\s*compras/i.test(titulo)) return 'Perú Compras';
  if (fecha) return fecha < VIGENCIA_32069 ? 'OSCE' : 'OECE';
  return 'OECE';
}

/** Según la FECHA, no el año: enero a abril de 2025 es régimen anterior. */
export function regimenDe(fecha: string | null): string[] {
  if (!fecha) return ['ley_32069'];
  return fecha < VIGENCIA_32069 ? ['ley_30225'] : ['ley_32069'];
}

const MESES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

/** «22 de setiembre de 2026» → 2026-09-22. */
export function fechaDeTexto(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+de\s+([a-zñáéíóú]+)\s+de(?:l)?\s+(20\d{2})/i);
  const mes = m ? MESES[m[2].toLowerCase()] : null;
  return m && mes ? `${m[3]}-${mes}-${m[1].padStart(2, '0')}` : null;
}

export function normalizarDocumento(d: {
  tipo: string;
  /** El título de la ficha de gob.pe, si la hay: es el nombre oficial. */
  tituloFicha?: string | null;
  /** La fecha que muestra la ficha, en AAAA-MM-DD. */
  fechaFicha?: string | null;
  textoEnlace?: string | null;
  url: string;
  fichaUrl?: string | null;
  texto: string;
  paginas?: number;
}): DocumentoNormalizado {
  if (d.tipo === 'resolucion_tce') {
    const clave =
      claveDeResolucion(d.fichaUrl ?? '') ??
      claveDeResolucion(d.tituloFicha ?? '') ??
      claveDeResolucion(d.textoEnlace ?? '') ??
      claveDeResolucion(d.url);
    if (clave) {
      const number = numeroDeResolucion(clave);
      const firma = fechaDeExpedicion(d.texto, clave.anio);
      const fecha = firma ?? (d.fechaFicha?.startsWith(String(clave.anio)) ? d.fechaFicha : null);
      return {
        number,
        title: `${number} (Tribunal de Contrataciones)`,
        date: fecha ?? `${clave.anio}-01-01`,
        // El Tribunal aplica la ley vigente al momento del procedimiento.
        applicable_law: clave.anio >= 2025 ? ['ley_32069'] : ['ley_30225'],
        metadata: {
          entidad: 'OECE',
          anio: String(clave.anio),
          correlativo: clave.numero.padStart(4, '0'),
          sala: clave.sala,
          fecha_origen: firma ? 'firma del documento' : fecha ? 'publicación en gob.pe' : 'año del número',
          pages: d.paginas,
        },
      };
    }
  }
  const titulo = (d.tituloFicha || d.textoEnlace || nombreDeArchivo(d.url)).replace(/\s+/g, ' ').trim().slice(0, 240);
  const fechaTexto = fechaDeTexto(d.texto.slice(0, 4000)) ?? null;
  const anioNumero = anioDe(titulo, null);
  // Prioridad: la ficha; la suscripción que dice el texto (si es del año
  // del número); el año del número.
  const fecha =
    d.fechaFicha ??
    (fechaTexto && (!anioNumero || fechaTexto.startsWith(anioNumero)) ? fechaTexto : null) ??
    (anioNumero ? `${anioNumero}-01-01` : null);
  return {
    number: titulo,
    title: titulo,
    date: fecha,
    applicable_law: regimenDe(fecha),
    metadata: {
      entidad: entidadDe(titulo, fecha),
      anio: anioDe(titulo, fecha),
      correlativo: correlativoDe(titulo),
      pages: d.paginas,
      fecha_origen: d.fechaFicha ? 'publicación en gob.pe' : fecha === fechaTexto ? 'fecha del documento' : fecha ? 'año del número' : undefined,
    },
  };
}

function nombreDeArchivo(u: string): string {
  try {
    const last = new URL(u).pathname.split('/').filter(Boolean).pop() || u;
    return decodeURIComponent(last);
  } catch {
    return u;
  }
}
