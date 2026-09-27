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
import { ACTUACIONES, CLASES, PERFILES, TIPOS_CONTRATACION, type Actuacion, type Perfil } from './catalogo';
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
import { NOMBRE_ACTUACION } from './matriz';

/** Los apartados de cada clase de documento, en su orden. */
export const APARTADOS: Partial<Record<TipoDeDocumento, string[]>> = {
  informe_tecnico: ['ANTECEDENTES', 'ANÁLISIS', 'CONCLUSIÓN', 'RECOMENDACIÓN'],
  informe_dec: ['ANTECEDENTES', 'BASE LEGAL', 'ANÁLISIS', 'CONCLUSIÓN', 'RECOMENDACIÓN'],
  informe_legal: ['BASE LEGAL', 'ANTECEDENTES', 'ANÁLISIS', 'CONCLUSIÓN', 'RECOMENDACIÓN'],
  informe_supervisor: ['ANTECEDENTES', 'VERIFICACIÓN TÉCNICA', 'OPINIÓN', 'RECOMENDACIONES'],
  informe_diagnostico: [
    'RESUMEN DEL CASO',
    'FIGURA CONTRACTUAL PRELIMINAR',
    'ANÁLISIS',
    'RIESGOS Y CONTRADICCIONES',
    'CONCLUSIONES Y PRÓXIMA ACTUACIÓN',
  ],
  memorandum: ['Antecedentes', 'Justificación del requerimiento', 'Pedido'],
  descargo: ['ANTECEDENTES', 'OBSERVACIÓN O REQUERIMIENTO', 'DESCARGO', 'CONCLUSIONES', 'DOCUMENTOS QUE SE ADJUNTAN'],
  carta: ['ANTECEDENTES', 'FUNDAMENTOS', 'PETITORIO'],
  acta: [
    'Antecedentes',
    'Sustento Normativo',
    'Objeto de la Modificación',
    'Detalle de la Modificación',
    'Declaración de No Afectación de la Finalidad del Contrato',
    'Vigencia de las Demás Cláusulas',
    'Perfeccionamiento de la Modificación',
  ],
  adenda: ['ANTECEDENTES', 'OBJETO DE LA ADENDA', 'MODIFICACIÓN', 'RATIFICACIÓN'],
};

/**
 * Los apartados según el documento y la actuación, como en los modelos de
 * César (27/09/2026): el informe de penalidad tiene tres (la base legal va
 * dentro del análisis); el de ampliación de plazo, sin base legal; el
 * memorándum del área usuaria para otras modificaciones, los seis puntos
 * que la DEC le observa; el acta de suspensión, los suyos.
 */
export function apartadosDe(tipo: TipoDeDocumento, actuacion: Actuacion | undefined): string[] {
  if (tipo === 'informe_dec' && actuacion === 'penalidad') return ['ANTECEDENTES', 'ANÁLISIS', 'CONCLUSIÓN'];
  if (tipo === 'informe_dec' && actuacion === 'ampliacion_plazo') return ['ANTECEDENTES', 'ANÁLISIS', 'CONCLUSIÓN', 'RECOMENDACIÓN'];
  if (tipo === 'memorandum' && actuacion === 'otra_modificacion')
    return [
      'Justificación de la necesidad y finalidad pública',
      'Identificación del contrato a modificar',
      'Periodo de vigencia de la modificación',
      'Plazo de implementación',
      'Sustento de inalterabilidad del objeto contractual',
      'Sustento de hechos sobrevinientes',
    ];
  if (tipo === 'memorandum' && actuacion === 'adicional')
    return ['Antecedentes', 'Justificación del requerimiento de prestación adicional', 'Ratificación de condiciones', 'Conclusión y pedido'];
  if (tipo === 'memorandum' && actuacion === 'reduccion') return ['Antecedentes', 'Sustento de la reducción de prestaciones', 'Pedido'];
  if (tipo === 'acta' && actuacion === 'suspension')
    return ['Antecedentes', 'Sustento Normativo', 'Objeto del Acta', 'Periodo de Suspensión', 'Efectos de la Suspensión', 'Vigencia de las Demás Cláusulas'];
  return APARTADOS[tipo] ?? [];
}

const ORDINAL_SUPUESTO = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];

/**
 * Cómo se escriben los párrafos: el sistema numera, el modelo marca. Un
 * subtítulo con «## », una cita con «> », un cuadro en Markdown.
 */
const MARCAS_DEL_CUERPO = `CÓMO SE ESCRIBEN LOS PÁRRAFOS DE "secciones": cada elemento de "parrafos" es un párrafo. Un subtítulo va solo, precedido de «## » (no se numera). Una cita textual —de un artículo que está en el SUSTENTO, de las bases, del contrato o de un documento del expediente— va precedida de «> », entre comillas y con «(…)» si se recorta. Un cuadro va en un solo elemento, en tabla Markdown («| Concepto | Dato |» y una fila por renglón). Una enumeración, un elemento por renglón con «a) », «b) » o «- ». No escribas números al inicio de los párrafos: los pone el sistema.`;

function instruccionesDelTipo(tipo: TipoDeDocumento, a: AnalisisDeActuacion): string {
  const apartados = apartadosDe(tipo, a.actuacion);
  const lista = apartados.map((t) => `«${t}»`).join(', ');
  const figura = NOMBRE_ACTUACION[a.actuacion];
  const supuestos = a.condiciones
    .map(
      (c, i) =>
        `«## ${i % 2 === 0 ? 'Respecto al' : 'Sobre el'} cumplimiento del ${ORDINAL_SUPUESTO[i] ?? `${i + 1}.°`} supuesto – [rótulo breve de: ${c.texto.slice(0, 90)}]»`,
    )
    .join('; ');
  switch (tipo) {
    case 'resolucion':
      return `Es una RESOLUCIÓN. Devuelve:
- "vistos": los documentos que se tienen a la vista, del más reciente al más antiguo, cada uno en un elemento con su número y fecha si constan («el Informe N.° … de fecha …»); el informe legal y el contrato, al final.
- "considerandos": cada uno empieza con «Que,» y termina en «;». El primero, la competencia del órgano que resuelve («Que, de acuerdo con [norma de organización de la entidad]…», con hueco si no consta). Luego el contrato, los hechos por documento, la norma aplicable (el artículo citado textualmente entre comillas si está en el SUSTENTO), el análisis de cada condición y la delegación de facultades. El último: «Que, estando a las consideraciones expuestas y con la opinión … corresponde …».
- "visto": una línea «Con el visto de …» con los órganos cuyos informes están en el expediente (solo esos).
- "atribuciones": una línea «En uso de las atribuciones conferidas por [norma o resolución de delegación] …».
- "resuelve": cada artículo sin el rótulo «ARTÍCULO N.-» (lo pone el sistema). El texto empieza con el verbo en mayúsculas y negrita: «**APROBAR** …», «**DISPONER** que …», «**NOTIFICAR** …». Normalmente: la decisión (con monto en cifras y letras, porcentaje o plazo), su ejecución (quién la gestiona y la publicación en la Pladicop) y la notificación al contratista con conocimiento de las áreas.
- "epigrafes": el epígrafe de cada artículo, en el mismo orden, en mayúsculas: «APROBACIÓN DE LA PRESTACIÓN ADICIONAL», «EJECUCIÓN», «NOTIFICACIÓN».
"secciones" va vacío.`;
    case 'carta':
      return `Es una CARTA. "secciones" con los apartados ${lista} (puedes titularlos con más precisión, p. ej. «Del incumplimiento», «Del requerimiento»). Redacta en primera persona de quien firma, formal y directo. Añade "destinatario": {"nombre": "...", "cargo": "...", "entidad": "..."} con los datos del expediente o huecos.`;
    case 'acta':
      return `Es un ACTA bilateral que suscriben la Entidad y el contratista. "secciones" con los apartados ${lista}, en ese orden y con esos títulos (el de detalle puedes precisarlo: «Detalle de las Prestaciones y Variación del Monto», «Detalle del Nuevo Plazo de Ejecución»). El título, la apertura («En la ciudad de …, reunidos los representantes de las partes:»), la identificación de las partes, «EXPONEN:», el cierre y las firmas los pone el sistema: NO los escribas.
- Antecedentes: un párrafo por hecho, en orden, cada uno con su documento, número y fecha (el contrato con monto en cifras y letras, plazo y fechas; las modificaciones previas; lo que motiva esta; el informe que la sustenta).
- Sustento Normativo: enumeración con «- », solo normas del SUSTENTO o del régimen del contrato.
- Si hay cantidades o montos que cambian, un cuadro Markdown (| Descripción | Unidad | Cantidad original | Variación | Cantidad final | Precio unitario | Subtotal |) y después los renglones «**Monto total de la reducción:** S/ …» y «**Nuevo monto contractual:** S/ …». Si cambia el plazo: «- **Plazo original:** …», «- **Ampliación concedida:** …», «- **Plazo total vigente:** …» y la nueva fecha de término.
- Declaración de no afectación: por qué la finalidad pública del contrato, dicha en concreto, no se afecta.
- Vigencia de las demás cláusulas: qué no cambia (montos, plazos, garantías, obligaciones), salvo lo modificado.${
        a.actuacion === 'suspension'
          ? ''
          : '\n- Perfeccionamiento: la modificación se perfecciona con la suscripción del acta por ambas partes y su registro en la Pladicop, por el funcionario facultado según la delegación que conste (hueco si no consta).'
      }
Redacta en tercera persona, sin «ACUERDOS».`;
    case 'adenda':
      return `Es una ADENDA. "secciones" con las cláusulas ${lista}. El sistema las numera como PRIMERA, SEGUNDA...`;
    case 'memorandum':
      return `Es un MEMORÁNDUM del Área Usuaria, dirigido a la dependencia encargada de las contrataciones. "secciones" con los puntos ${lista}, en ese orden y con esos títulos (el sistema los numera 1., 2.… y les pone dos puntos). Prosa directa y concreta, con los datos en **negrita** (contrato, contratista, montos, plazos, fechas); dentro de cada punto, enumeraciones con «- » cuando haya varios elementos. El último punto dice con precisión qué se solicita. Sin base legal extensa: el análisis normativo es de la DEC. "apertura": una oración «Es grato dirigirme a usted …» que diga en atención a qué documento se escribe.`;
    case 'informe_legal':
      return `Es el INFORME LEGAL. "secciones" con los apartados ${lista}, en ese orden (la BASE LEGAL va primero).
- BASE LEGAL: enumeración con «- », solo normas del SUSTENTO o del régimen del contrato.
- ANTECEDENTES: párrafos que empiezan «Mediante …», «Con …», «Asimismo, …», cada uno con su documento; puedes agruparlos con subtítulos «## Sobre el requerimiento del área usuaria», «## Sobre la evaluación de la dependencia encargada de las contrataciones».
- ANÁLISIS: «## Sobre la competencia y el alcance de la opinión legal», «## Sobre la normativa aplicable» (con la cita textual del artículo si está en el SUSTENTO) y un subtítulo «## Sobre …» por cada condición de CONDICIONES, revisando lo que dice el informe técnico de cada una. Cierra con la viabilidad del acto: «resulta viable que su despacho, mediante …, …».
- CONCLUSIÓN: primer elemento «De la revisión de los documentos alcanzados y del análisis normativo realizado, esta oficina concluye lo siguiente:» y luego elementos con «- ».
- RECOMENDACIÓN: elementos con «- » que empiezan con el verbo en negrita («- **Emitir** …», «- **Notificar** …»). Si no hay nada que recomendar además de la conclusión, omite el apartado.
Añade "remiteProyecto": "resolución" (o «contrato complementario», «adenda») si la cadena sigue con un acto que firma la autoridad y el informe lo remite como proyecto; si no, null.`;
    case 'informe_dec': {
      if (a.actuacion === 'penalidad')
        return `Es el INFORME DE CÁLCULO DE PENALIDAD. "secciones" con los apartados ${lista} (la base legal va dentro del análisis). "asunto": «Cálculo de penalidad – [objeto del contrato]», con el periodo si es un servicio periódico.
- ANTECEDENTES: el contrato u orden (fecha, contratista, objeto, monto en cifras y letras, plazo con sus fechas), sus modificaciones, la entrega o prestación, las observaciones y la conformidad del área usuaria que deja constancia del supuesto de penalidad.
- ANÁLISIS: el régimen aplicable al contrato; que, perfeccionado el contrato, las partes quedan obligadas a cumplir y la Entidad facultada y obligada a aplicar las penalidades ante el incumplimiento injustificado; la cita textual del artículo de penalidades (si está en el SUSTENTO) y de la cláusula o numeral de las bases que la fija. Distingue si es «## Penalidad por mora» (fórmula y datos) o «## Verificación de infracción sujeta a otras penalidades» (cada infracción con su título «Infracción N.° 01: …», la fecha límite, la fecha real y los días de retraso). Luego «## Cálculo de la penalidad» con un cuadro Markdown (| Concepto | Dato |: monto del contrato vigente, penalidad máxima (10 %), factor F, plazo, días de retraso, penalidad diaria, penalidad total) usando SOLO los valores de CÁLCULOS. En otras penalidades, el cuadro va por infracción (| N° | Descripción - incumplimiento | Penalidad a aplicar | Cálculo | Monto total de la penalidad |, con la fila PENALIDAD TOTAL), con los montos de «Otras penalidades» de CÁLCULOS. Después «## Registro histórico de penalidades»: un cuadro con lo aplicado antes, la penalidad actual, el acumulado y la penalidad máxima (10 %), con los valores de «Tope de penalidades» (o «Tope de otras penalidades» en el régimen anterior, donde cada tipo tiene su propio tope), y la conclusión de si corresponde cobrar el íntegro o solo hasta el tope.
- CONCLUSIÓN: el importe en cifras y letras y su concepto («penalidad por mora» u «otras penalidades»), con la cláusula o numeral que la establece, y que se deduce de los pagos o de la liquidación. Solo si el contrato o las bases del expediente prevén que el cálculo se notifique al contratista para sus descargos, dilo citando esa cláusula y su plazo; si no consta que lo prevean, no menciones los descargos (ni afirmes que el contrato no los prevé): la penalidad se aplica automáticamente.
"apertura": «Tengo el agrado de dirigirme a usted en atención a los documentos de la referencia, a fin de determinar el importe de la penalidad en que incurrió el contratista **[razón social]**.»`;
      const base =
        a.actuacion === 'ampliacion_plazo'
          ? ''
          : `\n- BASE LEGAL: enumeración con «- »: primero la Ley de Presupuesto del Sector Público para el Año Fiscal en curso (con «Ley N.° [●]» si no está en el SUSTENTO), luego la ley y el reglamento del régimen del contrato, y las opiniones o directivas del SUSTENTO.`;
      return `Es el INFORME DE LA DEPENDENCIA ENCARGADA DE LAS CONTRATACIONES. "secciones" con los apartados ${lista}, en ese orden.
- ANTECEDENTES: el primer párrafo es el contrato: «El [fecha], la Entidad suscribió con **[contratista]** (en adelante, el Contratista), el **Contrato N.° …**, cuyo objeto es «…», por el monto de **S/ … (… con 00/100 soles)** y un plazo de ejecución de **[n] días calendario**, del … al …». Luego un párrafo por documento, en orden, con su número y fecha en negrita, y al final el pedido que origina el informe.${base}
- ANÁLISIS: primero el régimen («El Contrato N.° … fue perfeccionado bajo la vigencia de …; en adelante, "la Ley" y "el Reglamento"»). Luego «## Ejecución y posibles modificaciones contractuales» (una vez perfeccionado el contrato las partes quedan obligadas a ejecutar lo pactado; durante la ejecución pueden presentarse circunstancias que hagan necesario modificarlo; la regla general y la cita textual del artículo de ${figura} si está en el SUSTENTO). Luego «## Condiciones para la procedencia de ${figura}», con la enumeración de las condiciones de CONDICIONES, cada una con un rótulo breve en negrita tomado de la propia condición («1. **[rótulo]**: …»). Después un subtítulo por condición, en el orden de CONDICIONES: ${supuestos || '«## Respecto al cumplimiento del primer supuesto – …»'}. Cada uno verifica la condición con el documento que la acredita (cita entre comillas lo que dijo el área usuaria o el contratista) y cierra con «En consecuencia, …». Los montos y porcentajes, con los valores de CÁLCULOS, en renglones «- Monto del contrato original: **S/ …**». Termina con «## Competencia para la aprobación»: quién aprueba y con qué instrumento, con la delegación si consta.
- CONCLUSIÓN: los hallazgos en orden; el último empieza «En consecuencia, corresponde …».
- RECOMENDACIÓN: cada párrafo empieza con un verbo en infinitivo («Remitir …», «Emitir …», «Notificar …», «Registrar en la Pladicop …», «Encargar al área usuaria …»).
"apertura": una oración «Tengo el agrado de dirigirme a usted para remitir el informe técnico que sustenta …» o «Tengo a bien dirigirme a usted en atención al asunto y a los documentos de la referencia, …».`;
    }
    case 'informe_tecnico':
      return `Es el INFORME TÉCNICO del Área Usuaria. "secciones" con los apartados ${lista}, en ese orden. ANTECEDENTES en orden, cada documento con su número y fecha; ANÁLISIS con un subtítulo «## …» por cada aspecto que sustenta el área usuaria; CONCLUSIÓN; RECOMENDACIÓN con verbos en infinitivo. "apertura": una oración «Tengo el agrado de dirigirme a usted …».`;
    default:
      return `"secciones" con los apartados, en este orden y con estos títulos: ${lista}.`;
  }
}

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
  // La autoridad no decide sin sustento: el proyecto se puede preparar,
  // pero no se presenta como listo para firmar (César, 27/09/2026: «el
  // bloqueo recae sobre la decisión lista para emisión, no sobre la
  // posibilidad de analizar el caso o preparar un proyecto claramente
  // condicionado»).
  const decide = d.perfil === 'aga' || d.perfil === 'titular';
  const proyecto =
    decide && d.nivel === 'borrador_condicionado'
      ? `\nPROYECTO DE DECISIÓN CONDICIONADO: el expediente todavía no permite recomendar su emisión. Redacta el acto como proyecto: en los considerandos, cada fundamento que depende de un informe, opinión o requisito que no está en el expediente se escribe en prosa como pendiente («queda pendiente el informe técnico del Área Usuaria que sustente…»). NUNCA afirmes que el expediente está completo o listo para aprobar, NUNCA atribuyas a la DEC, al Área Usuaria o a Asesoría Jurídica una opinión favorable que no está en los documentos, y en la parte resolutiva no ordenes una aprobación sin condicionarla a que se incorpore lo que falta.`
      : '';

  return `Actúa como un sistema experto de Gestión Contractual Inteligente de LexIA Contrataciones y redacta un documento profesional de la administración pública peruana.

DOCUMENTO: ${d.titulo}
PERFIL QUE LO EMITE: ${p.nombre} — ${p.enfoque}. Debe responder: ${p.responde.join(' ')}
NIVEL: ${nivel}${proyecto}${
    a.condiciones.some((c) => c.id === 'enriquecimiento')
      ? `\nENRIQUECIMIENTO SIN CAUSA: funda el análisis en el artículo 1954 del Código Civil y en las opiniones del OSCE/OECE de 2020 en adelante que están en el SUSTENTO: cita al menos una por su número exacto (p. ej. «Opinión N.° 065-2022/DTN») y di qué criterio recoge. Evalúa por separado cada uno de los cuatro elementos. Las opiniones o resoluciones anteriores a 2020 que el sustento menciona como citadas por el especialista van solo como referencia, sin afirmar su contenido literal.`
      : ''
  }
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
${instruccionesDelTipo(d.tipo, a)}
${d.tipo === 'resolucion' ? '' : `${MARCAS_DEL_CUERPO}
`}
Devuelve SOLO JSON:
{
  "asunto": "una línea",
  "referencias": ["cada documento de la referencia, con su número y fecha si constan, del más reciente al más antiguo"],
  "apertura": "la oración de cortesía que abre el documento, o null",
  "secciones": [ { "titulo": "...", "parrafos": ["..."] } ],
  "vistos": [], "considerandos": [], "resuelve": [], "epigrafes": [], "visto": null, "atribuciones": null,
  "remiteProyecto": null,
  "destinatario": null,
  "pendientes": ["cada dato que quedó como hueco, dicho en una línea"]
}

REGLAS DE REDACCIÓN:
1. NO INVENCIÓN: nunca inventes hechos, documentos, números, fechas, montos, firmas, cargos, competencias, artículos, opiniones ni antecedentes. Lo que falte va entre corchetes: «[número del informe]», «[fecha de notificación]», «[●]».
2. Distingue siempre: lo acreditado se afirma citando el documento; lo declarado se escribe «según lo declarado por el usuario» o «según lo manifestado por [quien corresponda]»; lo no probado, «no se encuentra acreditado documentalmente» o «de la documentación proporcionada no se advierte evidencia suficiente».
${
    a.regimen.clave === 'ley_30225'
      ? `3. El contrato se rige por el régimen anterior (${a.regimen.texto}), cuyo articulado no está en el sustento: NO cites ningún número de artículo ni numeral, ni la Ley N.° 32069 ni su Reglamento. Describe la regla y escribe «[precisar artículo del régimen anterior]» donde iría la cita.`
      : `3. Cita la norma con precisión y con su parte: «numeral 142.3 del artículo 142 del Reglamento de la Ley N.° 32069, aprobado por Decreto Supremo N.° 009-2025-EF»; la primera vez completa y después «el Reglamento» o «la Ley». Cita solo artículos que estén en el SUSTENTO NORMATIVO.`
  }
4. Los montos, porcentajes, plazos y fechas de CÁLCULOS se usan con esos valores exactos, redactados en prosa (no copies el rótulo del cálculo).
5. Coherencia: las conclusiones se siguen del análisis, las recomendaciones de las conclusiones y la parte resolutiva de los considerandos. Si la procedencia es «no procedente» o «la figura no corresponde», el documento no aprueba: deniega, observa o recomienda la figura correcta.
6. Lenguaje de la administración pública peruana: formal, impersonal en informes, claro, sin adjetivos innecesarios. Párrafos de 2 a 5 oraciones. Los datos clave —número de contrato o documento, contratista, montos en cifras y letras, plazos y fechas decisivas— en **negrita**. Nada de emojis ni otro markdown que el indicado en CÓMO SE ESCRIBEN LOS PÁRRAFOS.
7. No menciones a «LexIA», «el sistema» ni «el modelo» dentro del documento.
8. No escribas encabezados («INFORME N.°», «PARA:», «A:», «ASUNTO:», fecha, firma), ni la fórmula de cierre («Es todo cuanto informo…»): los pone el sistema.
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
  /** Descartar motivadamente la figura pedida (no corresponde). */
  enfoque?: 'descarte';
}): Promise<BorradorDeDocumento> {
  const a = d.analisis;
  const descarte = d.enfoque === 'descarte';
  // Con su artículo: «la prestación adicional», «la ampliación de plazo».
  const pedida = NOMBRE_ACTUACION[a.actuacionPedida ?? a.actuacion];
  const decide = d.perfil === 'aga' || d.perfil === 'titular';
  // El descarte es un informe (o, para la autoridad, la resolución que
  // declara improcedente lo pedido); un acta o una adenda no descartan.
  const tipo: TipoDeDocumento =
    d.nivel === 'diagnostico'
      ? 'informe_diagnostico'
      : descarte
        ? decide
          ? 'resolucion'
          : a.documento.tipo === 'acta' || a.documento.tipo === 'adenda'
            ? 'informe_dec'
            : a.documento.tipo
        : a.documento.tipo;
  const titulo =
    d.nivel === 'diagnostico'
      ? `Diagnóstico preliminar: ${ACTUACIONES[a.actuacion].nombre.toLowerCase()}`
      : descarte
        ? decide
          ? `Resolución que declara improcedente ${pedida} solicitada`
          : `Informe que evalúa y descarta motivadamente ${pedida}`
        : a.documento.titulo;
  const enfoque = descarte
    ? `\nENFOQUE — DESCARTE MOTIVADO: el documento evalúa la figura solicitada («${pedida}») y la DESCARTA de forma motivada. Explica qué exige esa figura, por qué los hechos del expediente no la configuran (${a.figura.razon}), qué figura correspondería${a.figura.alternativa ? ` («${ACTUACIONES[a.figura.alternativa].nombre.toLowerCase()}»)` : ''} y qué falta para tramitarla. No aprueba ni autoriza nada; si es una resolución, declara improcedente lo pedido y dispone lo que corresponde.`
    : '';
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
    }) + enfoque,
    { usuario: d.usuario, funcion: 'ejecucion_redaccion', temperatura: 0.2 },
  );
  return depurarBorrador(crudo, { tipo, titulo, nivel: d.nivel, version: d.version, actuacion: a.actuacion });
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

const linea = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() && !/^null$/i.test(v.trim()) ? limpiarTexto(v.trim()) : undefined;

/** Lo que devolvió el modelo, en la forma del borrador. Puro. */
export function depurarBorrador(
  crudo: Record<string, unknown>,
  m: { tipo: TipoDeDocumento; titulo: string; nivel: NivelDeSalida; version: number; actuacion?: Actuacion },
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
    resuelve:
      m.tipo === 'resolucion'
        ? textos(crudo.resuelve).map((x) => x.replace(/^\**\s*Art[íi]culo\s+\d+\s*°?\s*\.?-?\s*\**\s*/i, ''))
        : undefined,
    epigrafes: m.tipo === 'resolucion' ? textos(crudo.epigrafes) : undefined,
    visto: m.tipo === 'resolucion' ? linea(crudo.visto) : undefined,
    atribuciones: m.tipo === 'resolucion' ? linea(crudo.atribuciones) : undefined,
    remiteProyecto: m.tipo === 'informe_legal' ? linea(crudo.remiteProyecto) : undefined,
    apertura: linea(crudo.apertura),
    actuacion: m.actuacion,
    destinatario:
      dest && typeof dest.nombre === 'string'
        ? { nombre: dest.nombre, cargo: typeof dest.cargo === 'string' ? dest.cargo : undefined, entidad: typeof dest.entidad === 'string' ? dest.entidad : undefined }
        : undefined,
    pendientes: textos(crudo.pendientes),
  };
}

export { TEXTO_NIVEL };
