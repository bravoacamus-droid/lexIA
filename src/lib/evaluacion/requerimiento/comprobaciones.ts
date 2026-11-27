/**
 * Lo que hay que comprobar en un requerimiento, tema por tema.
 *
 * POR QUÉ (Fase 1, reunión con César del 27/11/2026)
 *
 * «Si el área usuaria consignó una penalidad, quiero que me contraste si
 * hay un precedente dentro de la biblioteca» (César). Para eso cada tema
 * dice:
 *   · cómo reconocer sus cláusulas en el documento (`reconocer`);
 *   · con qué expresiones LITERALES lo nombran las resoluciones y los
 *     pronunciamientos (`expresiones`: cada grupo son palabras que un
 *     documento sobre el tema contiene todas a la vez, la misma búsqueda
 *     que la búsqueda avanzada);
 *   · qué debe revisar el especialista (`revisar`);
 *   · si su ausencia es una omisión (`obligatorio`).
 *
 * ES UN BORRADOR PARA QUE CÉSAR LO VALIDE: los temas, lo que se revisa en
 * cada uno y cuáles son obligatorios por régimen y objeto. Cuando
 * responda, se ajusta aquí y la regla lleva su fecha.
 */

export type ObjetoDeContratacion = 'bienes' | 'servicios' | 'consultoria_obras' | 'obras';
export type Regimen = 'menor_8uit' | 'seleccion';

export interface TemaDeComprobacion {
  id: string;
  nombre: string;
  /** La categoría con que sale el hallazgo (la de la auditoría). */
  categoria: string;
  reconocer: RegExp;
  expresiones: string[][];
  revisar: string[];
  /** Su ausencia es una omisión en estos casos. */
  obligatorio?: { regimen?: Regimen[]; objeto?: ObjetoDeContratacion[] };
  /** Solo aplica a estos objetos. */
  soloPara?: ObjetoDeContratacion[];
}

export const TEMAS: TemaDeComprobacion[] = [
  {
    id: 'penalidades',
    nombre: 'Penalidades (mora y otras penalidades)',
    categoria: 'penalidades',
    reconocer: /penalidad|penalizaci[óo]n|\bpenalidades\b/i,
    expresiones: [['otras penalidades'], ['penalidad por mora']],
    revisar: [
      'La penalidad por mora sigue la fórmula del Reglamento, no un monto fijo ni una fórmula propia.',
      'Cada otra penalidad tiene un supuesto objetivo, razonable y congruente con el objeto.',
      'Cada otra penalidad tiene forma de cálculo y procedimiento de verificación.',
      'Las otras penalidades no castigan lo mismo que la mora.',
      'En conjunto las otras penalidades no exceden el 10 % del monto del contrato.',
      'El monto de cada penalidad es proporcional a la falta.',
    ],
    obligatorio: {},
  },
  {
    id: 'conformidad',
    nombre: 'Conformidad de la prestación',
    categoria: 'conformidad',
    reconocer: /conformidad/i,
    expresiones: [['conformidad', 'área usuaria'], ['otorgamiento de la conformidad']],
    revisar: [
      'Dice quién otorga la conformidad.',
      'Dice en qué plazo se otorga y con qué procedimiento.',
      'Dice qué pasa si hay observaciones y en qué plazo se subsanan.',
      'No exige para la conformidad requisitos que no estén en el requerimiento.',
    ],
    obligatorio: {},
  },
  {
    id: 'forma_de_pago',
    nombre: 'Forma de pago',
    categoria: 'forma_de_pago',
    reconocer: /forma de pago|condiciones de pago|\bpagos?\s+(?:[úu]nico|parcial|parciales|a cuenta|mensual)|se pagar[áa]|el pago se/i,
    expresiones: [['forma de pago'], ['pagos parciales']],
    revisar: [
      'Dice la oportunidad del pago (único o parciales) y su relación con los entregables.',
      'Dice qué documentos se exigen para pagar.',
      'Los documentos exigidos para pagar son razonables y no condicionan el pago a algo ajeno al contrato.',
    ],
    obligatorio: {},
  },
  {
    id: 'garantias',
    nombre: 'Garantías y responsabilidad',
    categoria: 'garantias',
    reconocer: /garant[íi]a|vicios ocultos|responsabilidad del contratista/i,
    expresiones: [['garantía de fiel cumplimiento'], ['garantía comercial'], ['vicios ocultos']],
    revisar: [
      'Si exige garantía de fiel cumplimiento, corresponde según el régimen y el monto.',
      'En bienes, la garantía comercial tiene plazo, alcance y desde cuándo corre.',
      'El plazo de responsabilidad por vicios ocultos es razonable.',
    ],
  },
  {
    id: 'experiencia',
    nombre: 'Experiencia del proveedor',
    categoria: 'experiencia_restrictiva',
    reconocer: /experiencia (?:del|en la especialidad|m[íi]nima)|monto facturado|servicios similares|bienes similares|obras similares|contrataciones similares/i,
    expresiones: [['experiencia del postor', 'monto facturado'], ['servicios similares'], ['bienes similares'], ['obras similares']],
    revisar: [
      'El monto o la cantidad de experiencia exigida es proporcional al valor y al objeto.',
      'La definición de similares no restringe a pocos proveedores ni admite prestaciones de otra naturaleza (p. ej., obras como servicios similares).',
      'La forma de acreditar la experiencia es razonable (contratos con conformidad, comprobantes de pago).',
    ],
  },
  {
    id: 'personal',
    nombre: 'Personal y su perfil',
    categoria: 'personal_desproporcionado',
    reconocer: /personal (?:clave|propuesto|m[íi]nimo|requerido)|perfil (?:del|profesional)|formaci[óo]n acad[ée]mica|a[ñn]os de experiencia|colegiado y habilitado/i,
    expresiones: [['personal clave', 'formación académica'], ['personal clave', 'experiencia']],
    revisar: [
      'El personal exigido es necesario para ejecutar el objeto.',
      'Los años de experiencia, grados y capacitaciones son proporcionales al objeto.',
      'No se exige que un mismo profesional cumpla perfiles incompatibles o en simultáneo sin necesidad.',
    ],
  },
  {
    id: 'equipamiento',
    nombre: 'Equipamiento',
    categoria: 'equipamiento_restrictivo',
    reconocer: /equipamiento|equipo m[íi]nimo|maquinaria|antig[üu]edad (?:m[áa]xima|no mayor)|a[ñn]o de fabricaci[óo]n/i,
    expresiones: [['equipamiento estratégico'], ['antigüedad', 'equipamiento']],
    revisar: [
      'El equipamiento exigido es necesario para el objeto.',
      'No se exige que todo sea propio: se admite alquiler o compromiso de alquiler.',
      'La antigüedad máxima exigida tiene sustento técnico.',
    ],
    soloPara: ['servicios', 'consultoria_obras', 'obras'],
  },
  {
    id: 'marca',
    nombre: 'Marcas, modelos y especificaciones dirigidas',
    categoria: 'direccionamiento_marca',
    reconocer: /\bmarca\b|\bmodelo\b|fabricante|o equivalente|original de f[áa]brica|procedencia/i,
    expresiones: [['marca', 'o equivalente'], ['características técnicas', 'marca']],
    revisar: [
      'No se exige una marca, modelo o fabricante sin "o equivalente".',
      'Las características no coinciden con las de un solo producto del mercado.',
    ],
  },
  {
    id: 'certificaciones',
    nombre: 'Certificaciones y homologaciones',
    categoria: 'otro',
    reconocer: /\bISO\b|certificaci[óo]n|certificado de|homologaci[óo]n|acreditaci[óo]n/i,
    expresiones: [['certificación ISO'], ['certificado', 'homologación']],
    revisar: [
      'Las certificaciones exigidas guardan relación con el objeto y no restringen la concurrencia.',
      'Si se exigen, se dice en qué momento se acreditan (oferta, contrato, ejecución).',
    ],
  },
  {
    id: 'ubicacion',
    nombre: 'Ubicación del proveedor, taller o almacén',
    categoria: 'otro',
    reconocer: /taller|almac[ée]n|local (?:propio|en la ciudad)|radio de|kil[óo]metros|\bkm\b|domicilio en|ubicad[oa] en la (?:ciudad|provincia|regi[óo]n)/i,
    expresiones: [['taller', 'kilómetros'], ['local', 'radio'], ['ubicación del taller']],
    revisar: [
      'Exigir que el proveedor tenga taller, local o almacén en un lugar o a cierta distancia tiene sustento y no restringe la concurrencia.',
      'Si es necesario, se exige para la ejecución y no como requisito para presentar oferta.',
    ],
  },
  {
    id: 'subcontratacion',
    nombre: 'Subcontratación',
    categoria: 'otro',
    reconocer: /subcontrat/i,
    expresiones: [['subcontratación']],
    revisar: ['Lo que se dice de la subcontratación se ajusta a la normativa (qué se puede subcontratar, autorización de la Entidad).'],
  },
];

/** Los temas que aplican a este objeto. */
export function temasPara(objeto: ObjetoDeContratacion | null | undefined): TemaDeComprobacion[] {
  return TEMAS.filter((t) => !t.soloPara || !objeto || t.soloPara.includes(objeto));
}

/** ¿Su ausencia es una omisión en esta contratación? */
export function esObligatorio(t: TemaDeComprobacion, regimen: Regimen | null | undefined, objeto: ObjetoDeContratacion | null | undefined): boolean {
  if (!t.obligatorio) return false;
  if (t.obligatorio.regimen && (!regimen || !t.obligatorio.regimen.includes(regimen))) return false;
  if (t.obligatorio.objeto && (!objeto || !t.obligatorio.objeto.includes(objeto))) return false;
  return true;
}
