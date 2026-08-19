/**
 * Carga de un proyecto de requerimiento y reparto por cláusulas.
 *
 * POR QUÉ EXISTE
 *
 * Es la primera de las tres observaciones de César: "debe permitir
 * agregar el requerimiento proyecto, leer el proyecto y redistribuir
 * según las cláusulas correspondientes". El área usuaria casi nunca
 * empieza de cero: llega con un borrador en Word, escrito con su propio
 * orden y sus propios títulos, y hasta ahora tenía que copiar y pegar
 * apartado por apartado en el formulario.
 *
 * QUÉ HACE Y QUÉ NO
 *
 * Reparte, no redacta. El texto que sale es el del proyecto: se puede
 * recortar y reordenar para que encaje en el apartado, nunca inventar lo
 * que el proyecto no dice. Si un apartado no tiene correspondencia, se
 * queda vacío y el usuario lo redacta o lo pide a LexIA, que para eso
 * está el otro botón.
 *
 * Y no pisa nada por su cuenta: devuelve una propuesta por apartado, y
 * los que ya tienen texto van marcados para que el usuario decida. Un
 * "cargar proyecto" que borra en silencio lo que alguien llevaba dos
 * horas escribiendo es peor que no tenerlo.
 *
 * LO QUE NO ENCAJA NO SE TIRA
 *
 * Un proyecto trae cosas que el formato oficial no contempla. Se
 * devuelven aparte, en `sin_ubicar`, porque el fallo más caro de un
 * repartidor es perder contenido sin decirlo: el usuario cree que está
 * todo dentro y firma un requerimiento incompleto.
 */
import type {
  Bloque,
  BloqueCampo,
  PlantillaRequerimiento,
  Seccion,
} from './plantilla-tipos';
import type { DestinoRespuesta, RespuestasRequerimiento } from './ensamblador';
import { bloqueVisible } from './ensamblador';

/** Un apartado del formato que puede recibir contenido del proyecto. */
export interface DestinoDistribucion {
  id: string;
  etiqueta: string;
  seccion: string;
  /** Lo que el formato oficial pide ahí. */
  instruccion: string;
  destino: DestinoRespuesta;
  /** Tipo del campo, para que el modelo no meta un párrafo en una fecha. */
  tipo?: BloqueCampo['tipo'];
  /**
   * Cadena completa de condiciones que hay que encender para que el
   * apartado aparezca en el documento, de la sección exterior a la
   * interior. Es la cadena y no solo la propia: "Mantenimiento" vive
   * dentro de "Prestaciones accesorias", y encender la hija sin la
   * madre deja el texto escrito pero fuera del documento.
   */
  condiciones: string[];
  /** Si ya hay algo escrito. Aplicar encima es decisión del usuario. */
  ocupado: boolean;
}

export interface Asignacion {
  apartado_id: string;
  texto: string;
  confianza: 'alta' | 'media' | 'baja';
  /** Si el apartado ya tenía contenido; la interfaz lo destaca. */
  ocupado: boolean;
  /** Condiciones que hay que encender para que el apartado exista. */
  condiciones: string[];
}

export interface Distribucion {
  asignaciones: Asignacion[];
  /** Contenido del proyecto que no corresponde a ningún apartado. */
  sin_ubicar: string[];
  /** Condiciones que el proyecto da a entender que aplican. */
  condiciones: string[];
}

const CONFIANZAS: Asignacion['confianza'][] = ['alta', 'media', 'baja'];

/**
 * Los apartados que pueden recibir contenido.
 *
 * A diferencia de la revisión, aquí SÍ entran las secciones apagadas por
 * su condición: si el proyecto habla de la visita al lugar, lo que hay
 * que hacer es encender esa sección, no descartar el contenido.
 */
export function destinosDistribucion(
  plantilla: PlantillaRequerimiento,
  respuestas: RespuestasRequerimiento,
): DestinoDistribucion[] {
  const out: DestinoDistribucion[] = [];

  const campo = (c: BloqueCampo, seccion: string, condiciones: string[]) => {
    out.push({
      id: c.id,
      etiqueta: c.etiqueta,
      seccion,
      instruccion: c.ayuda,
      destino: 'campos',
      tipo: c.tipo,
      condiciones,
      ocupado: !!(respuestas.campos[c.id] ?? '').trim(),
    });
  };

  const bloques = (bs: Bloque[], seccion: string, condiciones: string[]) => {
    for (const b of bs) {
      // Un apartado que depende de una opción no elegida no puede
      // recibir contenido: no existe todavía.
      if (!bloqueVisible(b, respuestas)) continue;
      switch (b.clase) {
        case 'campo':
          campo(b, seccion, condiciones);
          break;
        case 'parrafo':
          for (const c of b.campos) campo(c, seccion, condiciones);
          break;
        case 'redactado':
          out.push({
            id: b.id,
            etiqueta: b.etiqueta,
            seccion,
            instruccion: b.instruccion,
            destino: 'redacciones',
            condiciones,
            ocupado: !!(respuestas.redacciones[b.id] ?? '').trim(),
          });
          break;
        default:
          // Los textos fijos, las tablas y las opciones no se rellenan
          // desde un proyecto: los invariables no se tocan, y las tablas
          // y las opciones exigen una estructura que el reparto de texto
          // libre no puede garantizar.
          break;
      }
    }
  };

  const seccion = (s: Seccion, heredadas: string[]) => {
    const cadena = s.condicion ? [...heredadas, s.condicion] : heredadas;
    bloques(s.bloques, s.titulo, cadena);
    for (const h of s.subsecciones ?? []) seccion(h, cadena);
  };

  for (const s of plantilla.secciones) seccion(s, []);

  // Si la entidad ya creó apartados propios, el proyecto también puede
  // repartirse en ellos: para eso los creó.
  for (const e of respuestas.extras) {
    out.push({
      id: e.id,
      etiqueta: e.titulo.trim() || 'Apartado adicional',
      seccion: 'Apartados añadidos por la entidad',
      instruccion:
        e.titulo.trim() ||
        'Apartado propio de la entidad, sin instrucción del formato oficial.',
      destino: 'extras',
      condiciones: [],
      ocupado: !!e.texto.trim(),
    });
  }
  return out;
}

export function promptDistribucionSistema(plantilla: PlantillaRequerimiento): string {
  return `Eres LexIA, asistente jurídico en Contrataciones del Estado peruano (Ley N° 32069 y su Reglamento, DS N° 009-2025-EF).

El área usuaria trae un proyecto de requerimiento redactado a su manera. Tu trabajo es REPARTIR ese contenido en los apartados del formato oficial "${plantilla.encabezado} — ${plantilla.subtitulo}". Nada más.

REGLAS QUE NO PUEDES ROMPER:
- Devuelve SOLO un objeto JSON, sin texto alrededor y sin vallas de código.
- El contenido es del proyecto. Puedes recortarlo, reordenarlo y ajustar la redacción para que encaje en el apartado, pero NO puedes inventar datos, plazos, cantidades, requisitos ni normas que el proyecto no diga.
- Si el proyecto no dice nada que corresponda a un apartado, NO lo incluyas. Un apartado vacío es correcto; uno rellenado con generalidades es un daño.
- NO conviertas unidades ni recalcules cifras. Si el proyecto dice "doce (12) meses" y el apartado pide días, no escribas 360 ni 365: eso es decidir por el área usuaria y un plazo mal convertido acaba en el contrato. Copia la cifra tal como está o, si el apartado exige otra unidad, déjalo fuera y anótalo en "sin_ubicar" diciendo qué unidad falta.
- Que un dato aparezca en el proyecto no significa que encaje en un apartado. Antes de colocarlo, comprueba que sea LO QUE ESE APARTADO PIDE: una meta presupuestal no es una actividad del Plan Operativo Institucional, un correo no es un domicilio, un importe estimado no es la cuantía exigida como experiencia. Si es de otra cosa, va a "sin_ubicar".
- "alta" solo cuando el proyecto lo dice explícitamente para ese apartado. Si has tenido que interpretar a qué apartado pertenece, es "media"; si has encajado un dato aproximado, es "baja".
- No repartas la misma frase en dos apartados salvo que de verdad corresponda a los dos.
- Los títulos del proyecto no mandan: lo que manda es qué pide cada apartado del formato. Un párrafo titulado "Alcances" puede pertenecer a "Actividades" o a "Características técnicas" según lo que diga.
- Lo del proyecto que no corresponda a ningún apartado va en "sin_ubicar", resumido en una línea cada cosa. No lo descartes en silencio.
- En "condiciones" pon los identificadores de las secciones "de corresponder" que el proyecto dé a entender que aplican, y solo esas.
- "confianza" es tuya: "alta" si el proyecto lo dice claramente para ese apartado, "media" si lo dedujiste, "baja" si es un encaje dudoso.

FORMA DEL JSON:
{
  "asignaciones": [
    { "apartado_id": "id del apartado", "texto": "contenido para ese apartado", "confianza": "alta" | "media" | "baja" }
  ],
  "sin_ubicar": ["qué trae el proyecto que no cabe en el formato, una línea por cosa"],
  "condiciones": ["ids de las condiciones que aplican"]
}`;
}

export function promptDistribucionUsuario(opts: {
  denominacion?: string;
  destinos: DestinoDistribucion[];
  condiciones: Array<{ id: string; titulo: string }>;
  proyecto: string;
}): string {
  const partes: string[] = [];

  if (opts.denominacion?.trim()) {
    partes.push(`CONTRATACIÓN: ${opts.denominacion.trim()}`);
  }

  partes.push(
    `\nAPARTADOS DEL FORMATO OFICIAL (usa estos identificadores en "apartado_id"):\n` +
      opts.destinos
        .map(
          (d) =>
            `— id: ${d.id}${d.tipo && d.tipo !== 'texto_largo' && d.tipo !== 'texto' ? ` [${d.tipo}]` : ''}${d.ocupado ? ' [YA TIENE TEXTO]' : ''}\n  sección: ${d.seccion}\n  apartado: ${d.etiqueta}\n  pide: ${d.instruccion}`,
        )
        .join('\n\n'),
  );

  if (opts.condiciones.length > 0) {
    partes.push(
      `\nSECCIONES "DE CORRESPONDER" (usa estos identificadores en "condiciones"):\n` +
        opts.condiciones.map((c) => `— ${c.id}: ${c.titulo}`).join('\n'),
    );
  }

  partes.push(`\nPROYECTO DE REQUERIMIENTO DEL ÁREA USUARIA:\n"""\n${opts.proyecto}\n"""`);
  partes.push('\nDevuelve ahora el JSON del reparto.');
  return partes.join('\n');
}

/** Condiciones declaradas por la plantilla, con su título. */
export function condicionesDeclaradas(
  secciones: Seccion[],
  acc: Array<{ id: string; titulo: string }> = [],
): Array<{ id: string; titulo: string }> {
  for (const s of secciones) {
    if (s.condicion && !acc.some((c) => c.id === s.condicion)) {
      acc.push({ id: s.condicion, titulo: s.titulo });
    }
    if (s.subsecciones) condicionesDeclaradas(s.subsecciones, acc);
  }
  return acc;
}

/**
 * Filtra el reparto que devuelve el modelo.
 *
 * Se cae todo lo que no se pueda aplicar: apartados que no existen,
 * textos vacíos y condiciones inventadas. Un reparto que apunta a un id
 * inexistente no es un aviso para el usuario, es ruido.
 */
export function depurarDistribucion(
  crudo: unknown,
  destinos: DestinoDistribucion[],
  condicionesValidas: Array<{ id: string }>,
): Distribucion {
  const vacio: Distribucion = { asignaciones: [], sin_ubicar: [], condiciones: [] };
  if (!crudo || typeof crudo !== 'object') return vacio;
  const c = crudo as Record<string, unknown>;

  const porId = new Map(destinos.map((d) => [d.id, d]));
  const vistos = new Set<string>();
  const asignaciones: Asignacion[] = [];

  for (const bruto of Array.isArray(c.asignaciones) ? c.asignaciones : []) {
    if (!bruto || typeof bruto !== 'object') continue;
    const a = bruto as Record<string, unknown>;
    const id = typeof a.apartado_id === 'string' ? a.apartado_id.trim() : '';
    const destino = porId.get(id);
    if (!destino) continue;
    // Un mismo apartado dos veces: se queda la primera, que es la que el
    // modelo consideró principal.
    if (vistos.has(id)) continue;

    const texto = typeof a.texto === 'string' ? a.texto.trim() : '';
    if (!texto) continue;

    vistos.add(id);
    asignaciones.push({
      apartado_id: id,
      texto,
      confianza: CONFIANZAS.includes(a.confianza as Asignacion['confianza'])
        ? (a.confianza as Asignacion['confianza'])
        : 'media',
      ocupado: destino.ocupado,
      condiciones: destino.condiciones,
    });
  }

  const sin_ubicar = (Array.isArray(c.sin_ubicar) ? c.sin_ubicar : [])
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 3)
    .map((s) => s.trim())
    .slice(0, 25);

  const validas = new Set(condicionesValidas.map((x) => x.id));
  // Las condiciones de los apartados que reciben contenido se encienden
  // solas: si el reparto llena "Condiciones de la visita", la sección de
  // la visita tiene que estar dentro o el texto no aparecería.
  const condiciones = new Set<string>();
  for (const x of Array.isArray(c.condiciones) ? c.condiciones : []) {
    if (typeof x === 'string' && validas.has(x.trim())) condiciones.add(x.trim());
  }
  for (const a of asignaciones) {
    for (const c of a.condiciones) if (validas.has(c)) condiciones.add(c);
  }

  // Orden de lectura: el mismo que el formulario, para que el usuario
  // vaya comprobando de arriba abajo.
  const posicion = new Map(destinos.map((d, i) => [d.id, i]));
  asignaciones.sort(
    (x, y) => (posicion.get(x.apartado_id) ?? 0) - (posicion.get(y.apartado_id) ?? 0),
  );

  return { asignaciones, sin_ubicar, condiciones: [...condiciones] };
}
