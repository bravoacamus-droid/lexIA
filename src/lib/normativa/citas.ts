/**
 * Auditoría de las normas que A-LexIA cita en lo que redacta.
 *
 * POR QUÉ EXISTE ESTO
 *
 * A los prompts se les dice «cita solo normas que aparezcan en el
 * sustento». En la primera prueba del pliego, el 23/09/2026, el modelo
 * obedeció: las cuatro normas del Sustento Jurídico venían de la
 * biblioteca. Lo que sí falló fue otra cosa: atribuyó el principio de
 * libertad de concurrencia al «artículo 2 de la Ley de Contrataciones
 * del Estado», que es el régimen DEROGADO —está en el artículo 5 de la
 * Ley N° 32069—, porque la biblioteca está llena de resoluciones del
 * Tribunal que citan la ley vieja con toda propiedad, y el modelo las
 * copia. Eso no se arregla pidiéndolo mejor: hay que comprobarlo
 * después de redactar.
 *
 * QUÉ GARANTIZA Y QUÉ NO
 *
 * Garantiza que la norma citada exista: o la trajo el sustento, o está
 * en la biblioteca. No garantiza que diga lo que el escrito afirma, y
 * hay un motivo concreto para desconfiar: los pronunciamientos del
 * OECE transcriben los argumentos de los participantes, así que una
 * norma puede estar «en el sustento» porque alguien la invocó en su
 * escrito, no porque el OECE la respalde. El auditor no distingue las
 * dos cosas. Quien firma, sí.
 *
 * Nada se borra: lo dudoso se marca. Un escrito que se presenta a una
 * entidad no puede llevar una cita que un programa quitó por su
 * cuenta, ni una que nadie comprobó.
 *
 * Vive en `normativa` y no en `consultas` porque el problema no es del
 * pliego: es de todo lo que el modelo redacta con sustento —el
 * requerimiento, los generadores, la absolución—. Cualquiera de ellos
 * puede pasar su texto por aquí.
 */
import { createClient } from '@/lib/supabase/server';

export type ClaseDeCita =
  | 'ley'
  | 'reglamento'
  | 'directiva'
  | 'pronunciamiento'
  | 'opinion'
  | 'resolucion'
  | 'articulo';

export interface Cita {
  /** Tal como aparece en el escrito. */
  texto: string;
  /** El número, ya normalizado, con el que se busca en la biblioteca. */
  clave: string;
  clase: ClaseDeCita;
}

export interface Aviso {
  cita: string;
  motivo: string;
}

export interface Auditoria {
  citas: Cita[];
  avisos: Aviso[];
}

/**
 * El régimen derogado. Una resolución del Tribunal de 2024 habla del
 * TUO de la Ley N° 30225 con toda propiedad —resuelve un caso de
 * entonces—, y esas resoluciones están en la biblioteca, así que el
 * modelo las lee y arrastra el nombre viejo a un escrito de hoy. Un
 * escrito nuevo se rige por la Ley N° 32069.
 *
 * Este es el aviso que de verdad saltó en la primera prueba, y por eso
 * no depende del sustento ni de la biblioteca: es una cuestión de qué
 * norma está vigente hoy, no de qué documento existe.
 */
const REGIMEN_DEROGADO: Array<[RegExp, string]> = [
  [
    /\bLey\s+de\s+Contrataciones\s+del\s+Estado\b/i,
    'nombra el régimen derogado: hoy rige la Ley N° 32069, Ley General de Contrataciones Públicas',
  ],
  [
    /\bLey\s+N\.?°?\s*30225\b/i,
    'cita la Ley N° 30225, derogada por la Ley N° 32069',
  ],
  [
    /\bTUO\s+de\s+la\s+Ley\b/i,
    'cita el TUO de la Ley N° 30225, derogado por la Ley N° 32069',
  ],
  [
    /\bDecreto\s+Supremo\s+N\.?°?\s*344-2018-EF\b/i,
    'cita el reglamento derogado: hoy rige el Decreto Supremo N° 009-2025-EF',
  ],
  [
    // Sin el «(?<![-/])» esto marcaría el «Pronunciamiento N° 080-2025/OSCE-DGR»,
    // que es un documento real y se cita por su nombre. Lo que no vale es
    // hablar del OSCE como si siguiera siendo el organismo de hoy.
    /(?<![-/\w])OSCE\b/,
    'nombra al OSCE, sustituido por el OECE (Ley N° 32069, disposición vigésima tercera)',
  ],
];

/** Los instrumentos que se saben reconocer, con su número. */
const PATRONES: Array<[ClaseDeCita, RegExp]> = [
  ['ley', /\bLey\s+N\.?\s*°?\s*(\d{4,5})\b/gi],
  ['reglamento', /\b(?:Decreto\s+Supremo|D\.?\s?S\.?)\s+N\.?\s*°?\s*(\d{3}-\d{4}-[A-ZÑ/.\-]{2,12})/gi],
  ['directiva', /\bDirectiva\s+N\.?\s*°?\s*(\d{3}-\d{4}-[A-ZÑ/.\-]{2,20})/gi],
  ['pronunciamiento', /\bPronunciamiento\s+N\.?\s*°?\s*(\d{3}-\d{4}[A-ZÑ/.\-]{0,20})/gi],
  ['opinion', /\bOpini[óo]n\s+N\.?\s*°?\s*(\d{3}-\d{4}[A-ZÑ/.\-]{0,20})/gi],
  ['resolucion', /\bResoluci[óo]n\s+N\.?\s*°?\s*(\d{3,4}-\d{4}[A-ZÑ/.\-]{0,20})/gi],
];

/** «artículo 46.3 de la Ley», «numeral 72.3 del artículo 72 del Reglamento». */
const ARTICULO = /\b(?:art[íi]culo|numeral)\s+(\d{1,3})(?:\.\d{1,2})*/gi;

/** «009-2025-EF.» y «009-2025-EF» son el mismo número. */
function sinPuntuacionFinal(s: string): string {
  return s.replace(/[.,;:)\]]+$/, '');
}

function normalizar(s: string): string {
  return s
    .toUpperCase()
    .replace(/[.\s]/g, '')
    .replace(/°/g, '');
}

/**
 * Saca del texto todas las normas que se citan. Es puro: no toca la
 * biblioteca, así que sirve igual en el servidor y en una prueba.
 */
export function extraerCitas(texto: string): Cita[] {
  const vistas = new Map<string, Cita>();

  for (const [clase, patron] of PATRONES) {
    for (const m of texto.matchAll(patron)) {
      const crudo = sinPuntuacionFinal(m[1].trim());
      const clave = normalizar(crudo);
      if (!vistas.has(clase + clave)) {
        vistas.set(clase + clave, {
          texto: sinPuntuacionFinal(m[0].trim()),
          clave: crudo,
          clase,
        });
      }
    }
  }

  for (const m of texto.matchAll(ARTICULO)) {
    const clave = m[1];
    if (!vistas.has('articulo' + clave)) {
      vistas.set('articulo' + clave, { texto: m[0].trim(), clave, clase: 'articulo' });
    }
  }

  return [...vistas.values()];
}

/**
 * Las normas que el sustento cita, por su clave.
 *
 * Se pasa el sustento por el mismo extractor en vez de buscar el
 * número suelto dentro del texto. Buscarlo suelto avalaba cualquier
 * cosa: con los puntos quitados, un importe de «S/ 29.990» queda en
 * «29990» y da por buena una «Ley N° 29990» que no existe, que es
 * justo lo que se coló en la primera prueba del pliego.
 *
 * Comparar por clave normalizada sí tolera las dos formas de
 * escribirlo: el sustento pone «Pronunciamiento N° 080-2025/OECE-DSAT»
 * y el modelo «Pronunciamiento N.° 080-2025/OECE-DSAT».
 */
function clavesDelSustento(sustento: string): Set<string> {
  return new Set(
    extraerCitas(sustento)
      .filter((c) => c.clase !== 'articulo')
      .map((c) => normalizar(c.clave)),
  );
}

/**
 * Comprueba contra la biblioteca las normas que el modelo citó.
 *
 * `sustento` es el mismo bloque de texto que se le pasó al redactar: una
 * norma que venía ahí está respaldada por definición. Lo que no venía se
 * busca en la biblioteca, y lo que tampoco esté ahí se marca.
 */
export type BuscarEnBiblioteca = (clave: string) => Promise<boolean>;

/**
 * La búsqueda de verdad: contra `normative_documents`.
 *
 * Si la consulta falla, revienta en vez de responder `false`. Decir
 * «no está en la biblioteca» cuando lo que pasó es que la biblioteca
 * no contestó manda a revisar una cita buena y, peor, deja creer que
 * lo demás sí se comprobó.
 */
const enLaBiblioteca: BuscarEnBiblioteca = async (clave) => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('normative_documents')
    .select('id')
    .or(`number.ilike.%${clave}%,title.ilike.%${clave}%`)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
};

export async function auditarCitas(
  texto: string,
  sustento: string,
  buscar: BuscarEnBiblioteca = enLaBiblioteca,
): Promise<Auditoria> {
  const citas = extraerCitas(texto);
  const avisos: Aviso[] = [];

  for (const [patron, motivo] of REGIMEN_DEROGADO) {
    const m = texto.match(patron);
    if (m) avisos.push({ cita: m[0], motivo });
  }

  const respaldadas = clavesDelSustento(sustento);
  const instrumentos = citas.filter((c) => c.clase !== 'articulo');
  const porComprobar = instrumentos.filter(
    (c) => !respaldadas.has(normalizar(c.clave)),
  );

  if (porComprobar.length > 0) {
    try {
      for (const c of porComprobar) {
        if (!(await buscar(c.clave))) {
          avisos.push({
            cita: c.texto,
            motivo: 'no está en la biblioteca ni en el sustento consultado',
          });
        }
      }
    } catch (e) {
      // Callarse aquí sería lo peor de los dos mundos: el escrito saldría
      // sin marcar y con aspecto de comprobado. Si la biblioteca no
      // responde, se dice.
      console.error('[citas] no se pudo comprobar:', (e as Error).message);
      avisos.push({
        cita: porComprobar.map((c) => c.texto).join(', '),
        motivo: 'no se pudieron comprobar contra la biblioteca: compruébalas a mano',
      });
    }
  }

  // Los artículos se comprueban solo contra el sustento: la biblioteca
  // guarda la Ley entera en trozos y buscar «artículo 5» ahí daría por
  // bueno cualquier número.
  for (const c of citas) {
    if (c.clase !== 'articulo') continue;
    if (!sustento.trim()) continue;
    // Buscarlo como número suelto no sirve: el sustento numera sus
    // extractos «[1]», «[5]», y cualquier artículo de una cifra daría por
    // bueno. Tiene que aparecer como artículo o numeral.
    const comoArticulo = new RegExp(
      `(?:art[íi]culo|numeral)s?\\s+${c.clave}(?:\\.\\d+)*\\b`,
      'i',
    );
    if (!comoArticulo.test(sustento)) {
      avisos.push({
        cita: c.texto,
        motivo: 'ese artículo no aparece en el sustento que se consultó',
      });
    }
  }

  return { citas, avisos };
}

/** Una línea para enseñarle a quien redacta qué hay que mirar. */
export function resumirAvisos(avisos: Aviso[]): string {
  if (avisos.length === 0) return '';
  if (avisos.length === 1) return `Revisa «${avisos[0].cita}»: ${avisos[0].motivo}.`;
  return `Revisa ${avisos.length} citas antes de presentar el escrito.`;
}
