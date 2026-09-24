/**
 * La redacción del documento (fase 7).
 *
 * El documento es el del perfil —el Área Usuaria escribe su informe
 * técnico, la AGA su resolución, el contratista su carta— y sale en uno
 * de los tres niveles de la sección 19:
 *
 *   · diagnóstico preliminar — con información incompleta, las
 *     limitaciones a la vista;
 *   · borrador condicionado  — el documento, con sus huecos y sus
 *     advertencias;
 *   · revisión final         — cuando lo esencial está acreditado.
 *
 * El modelo redacta con lo que el diagnóstico ya estableció: no vuelve a
 * decidir la figura, ni los montos, ni el órgano. Lo que no está
 * acreditado se escribe como tal —«según lo declarado por el usuario»,
 * «no se encuentra acreditado documentalmente»— y lo que falta queda
 * como hueco entre corchetes, que el Word pinta en rojo.
 */
import { ACTUACIONES, CLASES, PERFILES, TIPOS_CONTRATACION, type Perfil } from './catalogo';
import { pedirJSON } from './modelo';
import { fechaLarga, hoyISO } from './regimen';
import { TEXTO_NIVEL, TEXTO_PROCEDENCIA } from './suficiencia';
import type {
  AnalisisDeActuacion,
  BorradorDeDocumento,
  DocumentoDelExpediente,
  Ficha,
  NivelDeSalida,
  SeccionDeDocumento,
  TipoDeDocumento,
} from './tipos';

/** Los apartados de cada clase de documento, en su orden. */
export const APARTADOS: Partial<Record<TipoDeDocumento, string[]>> = {
  informe_tecnico: ['ANTECEDENTES', 'ANÁLISIS TÉCNICO', 'CONCLUSIONES', 'RECOMENDACIONES'],
  informe_dec: ['ANTECEDENTES', 'BASE LEGAL', 'ANÁLISIS', 'CONCLUSIONES', 'RECOMENDACIONES'],
  informe_legal: ['ANTECEDENTES', 'BASE LEGAL', 'ANÁLISIS JURÍDICO', 'CONCLUSIONES', 'RECOMENDACIONES'],
  informe_supervisor: ['ANTECEDENTES', 'VERIFICACIÓN TÉCNICA', 'OPINIÓN', 'RECOMENDACIONES'],
  informe_diagnostico: [
    'RESUMEN DEL CASO',
    'FIGURA CONTRACTUAL PRELIMINAR',
    'ANÁLISIS',
    'RIESGOS Y CONTRADICCIONES',
    'CONCLUSIONES Y PRÓXIMA ACTUACIÓN',
  ],
  descargo: ['ANTECEDENTES', 'OBSERVACIÓN O REQUERIMIENTO', 'DESCARGO', 'CONCLUSIONES', 'DOCUMENTOS QUE SE ADJUNTAN'],
  carta: ['ANTECEDENTES', 'FUNDAMENTOS', 'PETITORIO'],
  acta: ['ANTECEDENTES', 'ACUERDOS'],
  adenda: ['ANTECEDENTES', 'OBJETO DE LA ADENDA', 'MODIFICACIÓN', 'RATIFICACIÓN'],
};

/** A quién se dirige cada perfil, para el «A:» de su informe. */
export const DESTINATARIO: Record<Perfil, string> = {
  area_usuaria: 'Dependencia encargada de las contrataciones (DEC)',
  dec: 'Autoridad de la gestión administrativa',
  asesoria_juridica: 'Autoridad de la gestión administrativa',
  aga: 'Contratista',
  titular: 'Contratista',
  supervisor: 'Entidad contratante',
  defensa: 'Órgano de control',
  contratista: 'Entidad contratante',
};

function fichaEnTexto(f: Ficha): string {
  return (
    Object.entries(f)
      .map(([k, v]) => `- ${k}: ${v!.valor}${v!.delUsuario ? ' (declarado por el usuario)' : ''}`)
      .join('\n') || '(sin datos)'
  );
}

function analisisEnTexto(a: AnalisisDeActuacion): string {
  const cond = a.condiciones
    .map((c) => `- [${c.estado}] ${c.texto} (${c.base}). ${c.sustento}${c.evidencia.length ? ` Evidencia: ${c.evidencia.map((e) => `«${e.cita}» (${e.documento})`).join('; ')}` : ''}`)
    .join('\n');
  const hechos = a.hechos.map((h) => `- [${h.estado}] ${h.fecha ? `${h.fecha}: ` : ''}${h.hecho}${h.documento ? ` (${h.documento})` : ''}`).join('\n');
  const req = a.requisitos.map((r) => `- [${r.estado}] ${r.texto}${r.documento ? ` — ${r.documento}` : ''}`).join('\n');
  return `ENTENDIMIENTO: ${a.entendimiento}
FIGURA: ${a.figura.nombre} — ${a.figura.corresponde ? 'corresponde' : 'NO corresponde'}. ${a.figura.razon}
RÉGIMEN: ${a.regimen.texto}
PROCEDENCIA: ${TEXTO_PROCEDENCIA[a.procedencia.semaforo]}. ${a.procedencia.razon}
SUFICIENCIA: ${a.suficiencia} %.
COMPETENCIA: ${a.competencia.organo} (${a.competencia.base}). Verificar: ${a.competencia.verificar}
CONDICIONES:
${cond || '(ninguna)'}
HECHOS:
${hechos || '(ninguno)'}
REQUISITOS DOCUMENTALES:
${req}
CÁLCULOS (del sistema; cópialos tal cual):
${a.calculos.map((c) => `- ${c.concepto}: ${c.resultado}. ${c.detalle} (${c.base})`).join('\n') || '(ninguno)'}
RIESGOS: ${a.riesgos.map((r) => `${r.descripcion} (${r.gravedad})`).join('; ') || 'ninguno'}
CONTRADICCIONES: ${a.contradicciones.map((c) => c.descripcion).join('; ') || 'ninguna'}
CADENA DOCUMENTAL: ${a.cadena.map((p) => `${PERFILES[p.perfil as Perfil]?.nombre ?? p.perfil}: ${p.documento}${p.condicion ? ` (${p.condicion})` : ''}${p.hecho ? ' [ya en el expediente]' : ''}`).join(' → ')}`;
}

function instruccionesDelTipo(tipo: TipoDeDocumento): string {
  switch (tipo) {
    case 'resolucion':
      return `Es una RESOLUCIÓN. Devuelve "vistos" (los documentos que se tienen a la vista, cada uno en un elemento), "considerandos" (cada uno empieza con «Que,»: hechos, base legal, análisis de la procedencia, competencia) y "resuelve" (cada artículo sin el rótulo «Artículo N.-», que lo pone el sistema: decisión, efectos en monto o plazo, notificación y publicación en la Pladicop, y lo demás que corresponda ordenar). "secciones" va vacío.`;
    case 'carta':
      return `Es una CARTA. "secciones" con los apartados ${APARTADOS.carta!.map((t) => `«${t}»`).join(', ')} (puedes titularlos con más precisión, p. ej. «Del incumplimiento», «Del requerimiento»). Redacta en primera persona de quien firma, formal y directo. Añade "destinatario": {"nombre": "...", "cargo": "...", "entidad": "..."} con los datos del expediente o huecos.`;
    case 'acta':
      return `Es un ACTA. "secciones": ${APARTADOS.acta!.map((t) => `«${t}»`).join(', ')}. Los acuerdos, numerados dentro de los párrafos («1. ...»). Redacta en tercera persona: «En la ciudad de [●], siendo las [●] horas del [●], se reunieron...».`;
    case 'adenda':
      return `Es una ADENDA. "secciones" con las cláusulas ${APARTADOS.adenda!.map((t) => `«${t}»`).join(', ')}. El sistema las numera como PRIMERA, SEGUNDA...`;
    default:
      return `"secciones" con los apartados, en este orden y con estos títulos: ${(APARTADOS[tipo] ?? []).map((t) => `«${t}»`).join(', ')}.`;
  }
}

function prompt(d: {
  perfil: Perfil;
  tipo: TipoDeDocumento;
  titulo: string;
  nivel: NivelDeSalida;
  analisis: AnalisisDeActuacion;
  ficha: Ficha;
  documentos: DocumentoDelExpediente[];
  pedido: string;
  respuestas: string;
}): string {
  const p = PERFILES[d.perfil];
  const a = d.analisis;
  const docs = d.documentos
    .filter((x) => x.origen === 'cargado' && x.lectura === 'leido')
    .map((x) => `- «${x.nombre}» — ${x.datos.titulo ?? (x.clase ? CLASES[x.clase].nombre : '')}${x.datos.fecha ? `, ${x.datos.fecha}` : ''}: ${x.datos.resumen ?? ''}`)
    .join('\n');
  const nivel =
    d.nivel === 'diagnostico'
      ? 'DIAGNÓSTICO PRELIMINAR: la información está incompleta. Explica qué se entiende, qué figura podría corresponder, qué está acreditado, qué falta y qué riesgos hay. Las limitaciones deben quedar visibles.'
      : d.nivel === 'borrador_condicionado'
        ? 'BORRADOR CONDICIONADO: redacta el documento completo, pero todo lo no acreditado se dice como tal y todo dato faltante queda como hueco entre corchetes.'
        : 'DOCUMENTO PARA REVISIÓN FINAL: lo esencial está acreditado. Redacta el documento completo; los datos que igual falten (número, firmante) quedan como hueco.';

  return `Actúa como un sistema experto de Gestión Contractual Inteligente de LexIA Contrataciones y redacta un documento profesional de la administración pública peruana.

DOCUMENTO: ${d.titulo}
PERFIL QUE LO EMITE: ${p.nombre} — ${p.enfoque}. Debe responder: ${p.responde.join(' ')}
NIVEL: ${nivel}
ACTUACIÓN: ${ACTUACIONES[a.actuacion].nombre}. Tipo de contratación: ${a.tipo ? TIPOS_CONTRATACION[a.tipo] : '[precisar]'}.
FECHA DE HOY: ${fechaLarga(hoyISO())}.

PEDIDO DEL USUARIO (declaración): """${d.pedido}"""
${d.respuestas ? `RESPUESTAS DEL USUARIO (declaraciones):\n${d.respuestas}\n` : ''}
FICHA DEL CONTRATO:
${fichaEnTexto(d.ficha)}

DOCUMENTOS DEL EXPEDIENTE:
${docs || '(ninguno)'}

DIAGNÓSTICO YA ESTABLECIDO (no lo cambies):
${analisisEnTexto(a)}

SUSTENTO NORMATIVO:
${a.sustento || '(sin sustento: no cites números de artículo; escribe «[precisar artículo]»)'}

FORMA:
${instruccionesDelTipo(d.tipo)}

Devuelve SOLO JSON:
{
  "asunto": "una línea",
  "referencias": ["cada documento de la referencia, con su número y fecha si constan"],
  "secciones": [ { "titulo": "...", "parrafos": ["..."] } ],
  "vistos": [], "considerandos": [], "resuelve": [],
  "destinatario": null,
  "pendientes": ["cada dato que quedó como hueco, dicho en una línea"]
}

REGLAS DE REDACCIÓN:
1. NO INVENCIÓN: nunca inventes hechos, documentos, números, fechas, montos, firmas, cargos, competencias, artículos, opiniones ni antecedentes. Lo que falte va entre corchetes: «[número del informe]», «[fecha de notificación]», «[●]».
2. Distingue siempre: lo acreditado se afirma citando el documento; lo declarado se escribe «según lo declarado por el usuario» o «según lo manifestado por [quien corresponda]»; lo no probado, «no se encuentra acreditado documentalmente» o «de la documentación proporcionada no se advierte evidencia suficiente».
3. Cita la norma con precisión y con su parte: «numeral 142.3 del artículo 142 del Reglamento de la Ley N.° 32069, aprobado por Decreto Supremo N.° 009-2025-EF»; la primera vez completa y después «el Reglamento» o «la Ley». Cita solo artículos que estén en el SUSTENTO NORMATIVO.
4. Los montos, porcentajes, plazos y fechas de CÁLCULOS se usan con esos valores exactos, redactados en prosa (no copies el rótulo del cálculo).
5. Coherencia: las conclusiones se siguen del análisis, las recomendaciones de las conclusiones y la parte resolutiva de los considerandos. Si la procedencia es «no procedente» o «la figura no corresponde», el documento no aprueba: deniega, observa o recomienda la figura correcta.
6. Lenguaje de la administración pública peruana: formal, impersonal en informes, claro, sin adjetivos innecesarios. Párrafos de 3 a 6 oraciones. Nada de viñetas con emojis, ni markdown salvo **negrita** puntual. Las listas, con «a)», «b)».
7. No menciones a «LexIA», «el sistema» ni «el modelo» dentro del documento.
8. No escribas encabezados («INFORME N.°», «A:», «DE:», «ASUNTO:», fecha, firma): los pone el sistema.
9. No copies las etiquetas internas del diagnóstico —«cumple», «no_cumple», «declarado», «acreditado»— ni el porcentaje de suficiencia: el documento habla de hechos, pruebas y norma. Los corchetes son SOLO para datos concretos que alguien va a escribir en ese lugar (un número, una fecha, un nombre, un monto); lo que falta acreditar o los documentos que faltan se dicen en prosa, sin corchetes.
10. DEC significa «dependencia encargada de las contrataciones»; AGA, «autoridad de la gestión administrativa». Escríbelas completas la primera vez.
11. La carta o solicitud de una parte prueba que pidió algo y en qué términos, no los hechos que alega. Si la Entidad no se pronunció en plazo y la norma da el pedido por aprobado, dilo así y señala la consecuencia.`;
}

export async function redactarDocumento(d: {
  perfil: Perfil;
  nivel: NivelDeSalida;
  analisis: AnalisisDeActuacion;
  ficha: Ficha;
  documentos: DocumentoDelExpediente[];
  pedido: string;
  respuestas: Array<{ pregunta: string; respuesta: string }>;
  version: number;
  usuario: string | null;
}): Promise<BorradorDeDocumento> {
  const a = d.analisis;
  const tipo: TipoDeDocumento = d.nivel === 'diagnostico' ? 'informe_diagnostico' : a.documento.tipo;
  const titulo = d.nivel === 'diagnostico' ? `Diagnóstico preliminar: ${ACTUACIONES[a.actuacion].nombre.toLowerCase()}` : a.documento.titulo;
  const crudo = await pedirJSON<Record<string, unknown>>(
    prompt({
      perfil: d.perfil,
      tipo,
      titulo,
      nivel: d.nivel,
      analisis: a,
      ficha: d.ficha,
      documentos: d.documentos,
      pedido: d.pedido,
      respuestas: d.respuestas.map((r) => `- ${r.pregunta} → ${r.respuesta}`).join('\n'),
    }),
    { usuario: d.usuario, funcion: 'ejecucion_redaccion', temperatura: 0.2 },
  );
  return depurarBorrador(crudo, { tipo, titulo, nivel: d.nivel, version: d.version });
}

/**
 * Lo que no puede quedar en un documento oficial aunque el modelo lo
 * escriba: las etiquetas internas del diagnóstico, que además saldrían
 * en rojo como si fueran huecos, y la sigla DEC mal desarrollada (se
 * vio «Dirección de Ejecución Contractual» en la primera prueba).
 */
export function limpiarTexto(x: string): string {
  return x
    .replace(/\[(?:cumple|no[_ ]cumple|no[_ ]acreditado|declarado|acreditado|falta|no[_ ]aplica)\]\s*/gi, '')
    .replace(/Direcci[oó]n\s+de\s+Ejecuci[oó]n\s+Contractual/g, 'Dependencia encargada de las contrataciones')
    .replace(/\bA?-?LexIA\b/g, 'la Entidad');
}

const textos = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [])
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .map(limpiarTexto);

/** Lo que devolvió el modelo, en la forma del borrador. Puro. */
export function depurarBorrador(
  crudo: Record<string, unknown>,
  m: { tipo: TipoDeDocumento; titulo: string; nivel: NivelDeSalida; version: number },
): BorradorDeDocumento {
  const secciones: SeccionDeDocumento[] = (Array.isArray(crudo.secciones) ? crudo.secciones : [])
    .map((s) => s as Record<string, unknown>)
    .map((s) => ({
      titulo: typeof s.titulo === 'string' ? s.titulo.trim().replace(/^[IVXLC]+\.\s*|^\d+\.\s*/, '') : '',
      parrafos: textos(s.parrafos),
    }))
    .filter((s) => s.titulo && s.parrafos.length);
  const dest = crudo.destinatario as Record<string, unknown> | null;
  return {
    generadoEn: new Date().toISOString(),
    version: m.version,
    nivel: m.nivel,
    tipo: m.tipo,
    titulo: m.titulo,
    asunto: typeof crudo.asunto === 'string' && crudo.asunto.trim() ? limpiarTexto(crudo.asunto.trim()) : m.titulo,
    referencias: textos(crudo.referencias),
    secciones,
    vistos: m.tipo === 'resolucion' ? textos(crudo.vistos) : undefined,
    considerandos: m.tipo === 'resolucion' ? textos(crudo.considerandos) : undefined,
    resuelve: m.tipo === 'resolucion' ? textos(crudo.resuelve).map((x) => x.replace(/^Art[íi]culo\s+\d+\s*\.?-?\s*/i, '')) : undefined,
    destinatario:
      dest && typeof dest.nombre === 'string'
        ? { nombre: dest.nombre, cargo: typeof dest.cargo === 'string' ? dest.cargo : undefined, entidad: typeof dest.entidad === 'string' ? dest.entidad : undefined }
        : undefined,
    pendientes: textos(crudo.pendientes),
  };
}

export { TEXTO_NIVEL };
