/**
 * El diagnóstico de una actuación: fases 1 a 6 del documento de César.
 *
 *   1. Comprensión     — qué quiere el usuario y qué actuación es.
 *   2. Reconstrucción  — la ficha maestra (ficha.ts).
 *   3. Clasificación   — tipo de contrato, régimen, órgano, documentos.
 *   4. Suficiencia     — requisitos aplicables contra lo que hay.
 *   5. Solicitud mínima — una pregunta decisiva, o nada.
 *   6. Diagnóstico     — figura, acreditado y declarado, riesgos.
 *
 * El modelo interpreta: entiende el caso, lee las condiciones de
 * procedencia contra los documentos y cita. Todo lo demás lo decide el
 * código: la matriz, los cálculos, la suficiencia, los semáforos y la
 * pregunta. Y lo que el modelo cita se comprueba en el documento que
 * dice citar; lo que no aparece deja de contar como acreditado.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ubicarCita } from '@/lib/evaluacion/mejora/texto';
import {
  ACTUACIONES,
  CLASES,
  ORDEN_ACTUACIONES,
  PERFILES,
  TIPOS_CONTRATACION,
  type Actuacion,
  type ClaseDocumental,
  type Perfil,
  type TipoContratacion,
} from './catalogo';
import { calcular, limiteDeAdicionales, aNumero, type Insumos } from './calculos';
import { reconstruirFicha } from './ficha';
import {
  MATRIZ,
  condicionesAplicables,
  documentoRecomendado,
  requisitosAplicables,
  type Contexto,
} from './matriz';
import { pedirJSON } from './modelo';
import { datosDeterminantes, siguientePregunta, tipoDesdeTexto } from './preguntas';
import { determinarRegimen, fechaISO, fechaLarga, hoyISO } from './regimen';
import { calcularSuficiencia, evaluarRequisitos, peor, type EvaluacionDeHecho } from './suficiencia';
import { articulosDeLaNorma, criteriosRelacionados } from './sustento';
import type {
  AnalisisDeActuacion,
  Calculo,
  CondicionEvaluada,
  DocumentoDelExpediente,
  EstadoCondicion,
  Ficha,
  HechoIdentificado,
  PasoDeLaCadena,
  PreguntaDecisiva,
  Respuesta,
  SemaforoProcedencia,
} from './tipos';

export const PEDIDO_DEL_USUARIO = 'Pedido del usuario';
export const RESPUESTA_DEL_USUARIO = 'Respuesta del usuario';

// ── Lo que se le da al modelo ────────────────────────────────────────

export interface Caso {
  perfil: Perfil;
  actuacion: Actuacion;
  actuacionPedida: Actuacion | null;
  pedido: string;
  documentos: DocumentoDelExpediente[];
  ficha: Ficha;
  contradiccionesDeFicha: ReturnType<typeof reconstruirFicha>['contradicciones'];
  respuestas: Record<string, string>;
  listaRespuestas: Respuesta[];
  tipo: TipoContratacion | null;
  regimen: ReturnType<typeof determinarRegimen>;
  contexto: Contexto;
  calculos: Calculo[];
  /** Lo que necesitan los cálculos, para rehacerlos con datos de los documentos. */
  insumos: Omit<Insumos, 'respuestas'>;
  hoy: string;
}

/** Lo que devuelve el modelo, antes de comprobarlo. */
export interface LecturaDelModelo {
  entendimiento?: string;
  actuacion_identificada?: string;
  figura?: { nombre?: string; corresponde?: boolean; razon?: string; alternativa?: string | null };
  hecho_generador?: string | null;
  condiciones?: Array<{ id?: string; estado?: string; sustento?: string; evidencia?: Array<{ documento?: string; cita?: string }> }>;
  requisitos_por_hecho?: Array<{ id?: string; estado?: string; documento?: string }>;
  hechos?: Array<{ hecho?: string; fecha?: string | null; estado?: string; documento?: string; cita?: string }>;
  contradicciones?: Array<{ descripcion?: string }>;
  riesgos?: Array<{ descripcion?: string; gravedad?: string }>;
  procedencia?: { semaforo?: string; razon?: string };
  pregunta?: { texto?: string; porQue?: string; cambia?: string[] } | null;
  datos?: Array<{ id?: string; valor?: string; documento?: string; cita?: string }>;
}

export function prepararCaso(d: {
  perfil: Perfil;
  actuacion: Actuacion;
  actuacionPedida: Actuacion | null;
  pedido: string;
  documentos: DocumentoDelExpediente[];
  fichaUsuario: Ficha;
  respuestas: Respuesta[];
  hoy?: string;
}): Caso {
  const { ficha, contradicciones } = reconstruirFicha(d.documentos, d.fichaUsuario);
  const respuestas = Object.fromEntries(d.respuestas.map((r) => [r.preguntaId, r.respuesta]));
  const tipo = tipoDesdeTexto(ficha.tipo_contratacion?.valor) ?? tipoDesdeTexto(respuestas.tipo_contratacion);
  const regimen = determinarRegimen(ficha);
  const contexto: Contexto = {
    perfil: d.perfil,
    tipo,
    sistemaEntrega: ficha.sistema_entrega?.valor ?? null,
    supervisado: ficha.supervision?.valor ? !/^no\b|sin supervisi/i.test(ficha.supervision.valor) : null,
    regimen: regimen.clave,
    respuestas,
  };
  const hoy = d.hoy ?? hoyISO();
  const cargados = d.documentos.filter((x) => x.origen === 'cargado' && x.lectura === 'leido');
  const fechaDe = (clase: ClaseDocumental) =>
    cargados
      .filter((x) => x.clase === clase)
      .map((x) => x.datos.fecha)
      .filter((f): f is string => !!f)
      .sort()
      .pop() ?? null;
  // El régimen anterior tiene otros plazos y otros porcentajes: sus
  // cuentas no se hacen con los de la Ley N.° 32069.
  const insumos: Omit<Insumos, 'respuestas'> = {
    actuacion: d.actuacion,
    tipo,
    sistemaEntrega: contexto.sistemaEntrega,
    ficha,
    fechaSolicitud: fechaDe('solicitud_contratista'),
    fechaConformidad: fechaDe('conformidad') ?? fechaDe('acta_recepcion'),
    hayPronunciamiento: cargados.some((x) => x.clase === 'resolucion' && (x.datos.fecha ?? '') >= (fechaDe('solicitud_contratista') ?? '9999')),
    hoy,
  };
  const calculos = regimen.clave === 'ley_30225' ? [] : calcular({ ...insumos, respuestas });
  return {
    perfil: d.perfil,
    actuacion: d.actuacion,
    actuacionPedida: d.actuacionPedida,
    pedido: d.pedido,
    documentos: d.documentos,
    ficha,
    contradiccionesDeFicha: contradicciones,
    respuestas,
    listaRespuestas: d.respuestas,
    tipo,
    regimen,
    contexto,
    calculos,
    insumos,
    hoy,
  };
}

/** Cuánto texto de cada documento cabe en el diagnóstico. */
const PRESUPUESTO_TEXTO = 90_000;

function documentosParaElModelo(documentos: DocumentoDelExpediente[]): string {
  const leidos = documentos.filter((d) => d.origen === 'cargado' && d.lectura === 'leido');
  if (leidos.length === 0) return '(El expediente no tiene documentos cargados.)';
  const porDoc = Math.max(4000, Math.floor(PRESUPUESTO_TEXTO / leidos.length));
  return leidos
    .map((d) => {
      const texto = d.texto ?? '';
      const recorte = texto.length > porDoc ? `${texto.slice(0, porDoc)}\n[… documento recortado …]` : texto;
      return `### DOCUMENTO: «${d.nombre}»\nClase: ${d.clase ? CLASES[d.clase].nombre : 'sin clasificar'}${d.datos.fecha ? ` · Fecha: ${d.datos.fecha}` : ''}${d.datos.contiene?.length ? ` · Contiene: ${d.datos.contiene.map((c) => CLASES[c].nombre).join(', ')}` : ''}\nResumen: ${d.datos.resumen ?? ''}\nTexto:\n"""\n${recorte}\n"""`;
    })
    .join('\n\n');
}

export async function comprenderActuacion(
  d: { perfil: Perfil; pedido: string; documentos: DocumentoDelExpediente[] },
  usuario: string | null,
): Promise<{ actuacion: Actuacion; razon: string }> {
  const resumenes = d.documentos
    .filter((x) => x.lectura === 'leido')
    .map((x) => `- «${x.nombre}» (${x.clase ? CLASES[x.clase].nombre : 'sin clasificar'}): ${x.datos.resumen ?? ''}`)
    .join('\n');
  const r = await pedirJSON<{ actuacion?: string; razon?: string }>(
    `Eres A-LexIA, sistema experto en ejecución contractual del Estado peruano (Ley N.° 32069). Identifica qué actuación contractual plantea el caso.

PERFIL QUE EMITIRÁ EL DOCUMENTO: ${PERFILES[d.perfil].nombre}
PEDIDO DEL USUARIO: """${d.pedido}"""
DOCUMENTOS DEL EXPEDIENTE:
${resumenes || '(ninguno)'}

Actuaciones posibles: ${ORDEN_ACTUACIONES.map((a) => `"${a}" (${ACTUACIONES[a].nombre}: ${ACTUACIONES[a].descripcion})`).join('; ')}.

Elige la que realmente corresponde al caso, aunque el usuario la haya nombrado de otra manera. Si el caso no plantea una actuación concreta o pide entender la situación del contrato, elige "diagnostico". Devuelve SOLO JSON: {"actuacion": "...", "razon": "una oración"}`,
    { usuario, funcion: 'ejecucion_comprension' },
  );
  const actuacion = ORDEN_ACTUACIONES.includes(r.actuacion as Actuacion) ? (r.actuacion as Actuacion) : 'diagnostico';
  return { actuacion, razon: r.razon ?? '' };
}

function promptDiagnostico(caso: Caso, sustento: string): string {
  const perfil = PERFILES[caso.perfil];
  const condiciones = condicionesAplicables(caso.actuacion, caso.contexto);
  const porHecho = requisitosAplicables(caso.actuacion, caso.contexto).filter((r) => r.porHecho);
  const fichaTexto = Object.entries(caso.ficha)
    .map(([k, v]) => `- ${k}: ${v!.valor}${v!.delUsuario ? ' (declarado por el usuario)' : v!.documento ? ` (de «${v!.documento}»)` : ''}`)
    .join('\n');
  const respuestas = caso.listaRespuestas.map((r) => `- ${r.pregunta} → ${r.respuesta}`).join('\n');
  const regimen =
    caso.regimen.clave === 'ley_30225'
      ? `RÉGIMEN: el contrato se rige por el ${caso.regimen.texto} (${caso.regimen.razon}). La biblioteca de LexIA no contiene ese articulado: NO cites números de artículo de ninguna norma; describe la regla y escribe «[precisar artículo del régimen anterior]».`
      : caso.regimen.clave === 'por_determinar'
        ? `RÉGIMEN: por determinar (${caso.regimen.razon}). Analiza con la Ley N.° 32069 y su Reglamento, advirtiendo que el régimen debe confirmarse.`
        : `RÉGIMEN: ${caso.regimen.texto} (${caso.regimen.razon}).`;

  return `Actúa como un sistema experto de Gestión Contractual Inteligente de LexIA Contrataciones. Analiza primero el pedido y todas las fuentes disponibles; no pidas documentos de manera masiva.

PERFIL EMISOR: ${perfil.nombre} — ${perfil.enfoque}.
ACTUACIÓN A ANALIZAR: ${ACTUACIONES[caso.actuacion].nombre}${caso.actuacionPedida && caso.actuacionPedida !== caso.actuacion ? ` (el usuario eligió «${ACTUACIONES[caso.actuacionPedida].nombre}»)` : ''}.
TIPO DE CONTRATACIÓN: ${caso.tipo ? TIPOS_CONTRATACION[caso.tipo] : 'no determinado'}.
${regimen}
FECHA DE HOY: ${fechaLarga(caso.hoy)}.

PEDIDO DEL USUARIO (es una declaración, no un hecho acreditado):
"""${caso.pedido || '(sin descripción)'}"""

${respuestas ? `RESPUESTAS DEL USUARIO (declaraciones):\n${respuestas}\n` : ''}
FICHA DEL CONTRATO:
${fichaTexto || '(sin datos)'}

CÁLCULOS YA HECHOS POR EL SISTEMA (úsalos tal cual, no los rehagas):
${caso.calculos.map((c) => `- ${c.concepto}: ${c.resultado}. ${c.detalle} (${c.base})`).join('\n') || '(ninguno)'}

DOCUMENTOS DEL EXPEDIENTE:
${documentosParaElModelo(caso.documentos)}

SUSTENTO NORMATIVO (artículos de la Ley y su Reglamento, y criterios):
${sustento || '(sin sustento: no cites artículos)'}

CONDICIONES DE PROCEDENCIA QUE DEBES EVALUAR:
${condiciones.map((c) => `- id "${c.id}": ${c.texto} [${c.base}]`).join('\n') || '(ninguna fija: identifica tú las que apliquen en "riesgos")'}

DATOS QUE PUEDEN ESTAR EN LOS DOCUMENTOS (si un documento los dice, dalos con su cita; así no se le preguntan al usuario):
${datosDeterminantes(caso.actuacion).filter((x) => !caso.respuestas[x.id]).map((x) => `- id "${x.id}": ${x.texto} (${x.formato === 'fecha' ? 'AAAA-MM-DD' : x.formato === 'monto' ? 'número, sin S/ ni separadores' : 'número entero'})`).join('\n') || '(ninguno)'}

REQUISITOS QUE SE ACREDITAN CON UN HECHO PROBADO:
${porHecho.map((r) => `- id "${r.id}": ${r.texto}`).join('\n') || '(ninguno)'}

Devuelve SOLO un objeto JSON:
{
  "entendimiento": "el caso en 2-4 oraciones, empezando por los hechos (no escribas «LexIA entiende que»), distinguiendo lo acreditado de lo declarado",
  "actuacion_identificada": una de ${ORDEN_ACTUACIONES.map((a) => `"${a}"`).join(', ')},
  "figura": { "nombre": "la figura contractual que corresponde", "corresponde": true si la actuación analizada es la figura correcta para el caso, "razon": "...", "alternativa": id de la actuación que sí correspondería, o null },
  "hecho_generador": "el hecho concreto que origina el caso, o null si no se conoce",
  "condiciones": [ { "id": "...", "estado": "cumple" | "no_cumple" | "no_acreditado" | "declarado" | "no_aplica", "sustento": "por qué, citando el documento o la norma", "evidencia": [ { "documento": "nombre exacto del documento, o \\"${PEDIDO_DEL_USUARIO}\\" o \\"${RESPUESTA_DEL_USUARIO}\\"", "cita": "frase LITERAL de ese documento" } ] } ],
  "requisitos_por_hecho": [ { "id": "...", "estado": "acreditado" | "declarado" | "falta", "documento": "nombre del documento que lo acredita" } ],
  "hechos": [ { "hecho": "...", "fecha": "AAAA-MM-DD o null", "estado": "acreditado" | "declarado" | "no_acreditado", "documento": "...", "cita": "frase LITERAL" } ],
  "contradicciones": [ { "descripcion": "..." } ],
  "riesgos": [ { "descripcion": "...", "gravedad": "alta" | "media" | "baja" } ],
  "procedencia": { "semaforo": "verde" | "amarillo" | "naranja" | "rojo" | "negro", "razon": "..." },
  "pregunta": { "texto": "UNA pregunta decisiva", "porQue": "...", "cambia": ["figura" | "procedencia" | "documento" | "competencia" | "análisis"] } o null,
  "datos": [ { "id": "id del dato", "valor": "...", "documento": "nombre exacto del documento", "cita": "frase LITERAL que lo dice" } ]
}

REGLAS:
1. NO INVENCIÓN: nunca inventes hechos, documentos, fechas, montos, firmas, competencias, artículos, opiniones, informes ni antecedentes.
2. "cumple" y "acreditado" exigen una cita LITERAL de un documento del expediente. Lo que solo dice el usuario es "declarado". Lo que nadie prueba es "no_acreditado".
3. Semáforo: verde = procedente; amarillo = procedente con subsanaciones; naranja = riesgo técnico o jurídico relevante; rojo = no procedente; negro = la figura solicitada no corresponde. No confundas «podría ser procedente» con «ya hay evidencia para aprobarla».
4. "pregunta": solo si su respuesta puede cambiar la figura, la procedencia, el documento, la competencia o el análisis, y no se responde con los documentos. No preguntes el tipo de contrato ni la fecha de convocatoria. Si no hace falta, null.
5. Cita solo artículos que estén en el SUSTENTO NORMATIVO, con la parte que les corresponde (Ley o Reglamento). Los criterios (opiniones, directivas) no son norma.
6. Contradicciones: señala las que haya entre documentos, o entre lo declarado y lo documentado. Una afirmación sin prueba no es una contradicción: es un hecho no acreditado.
7. La carta o solicitud de una parte acredita que esa parte pidió algo, cuándo y en qué términos; NO acredita los hechos que alega. Los hechos que el contratista afirma en su solicitud son "declarado" (por el contratista) hasta que otro documento los pruebe; lo mismo vale para lo que afirme la Entidad en sus propias comunicaciones frente al contratista.
8. La falta de pronunciamiento de la Entidad dentro del plazo no vuelve improcedente el pedido: si la norma lo da por aprobado (aprobación por silencio), la procedencia se evalúa sobre el fondo y la consecuencia del vencimiento se reporta en "riesgos".
9. DEC significa «dependencia encargada de las contrataciones» (Reglamento, artículo 2). AGA es la autoridad de la gestión administrativa.`;
}

export async function interpretarConModelo(
  supabase: SupabaseClient,
  caso: Caso,
  usuario: string | null,
): Promise<{ lectura: LecturaDelModelo; sustento: string }> {
  let sustento = '';
  if (caso.regimen.clave !== 'ley_30225') {
    const pedidos = MATRIZ[caso.actuacion].articulos(caso.contexto);
    const [norma, criterios] = await Promise.all([
      articulosDeLaNorma(supabase, pedidos),
      criteriosRelacionados(supabase, `${ACTUACIONES[caso.actuacion].nombre} ${caso.tipo ? TIPOS_CONTRATACION[caso.tipo] : ''}. ${caso.pedido}`.slice(0, 600)),
    ]);
    sustento = [norma.texto, criterios].filter(Boolean).join('\n\n---\n\n');
  }
  const lectura = await pedirJSON<LecturaDelModelo>(promptDiagnostico(caso, sustento), {
    usuario,
    funcion: 'ejecucion_diagnostico',
  });
  return { lectura, sustento };
}

// ── La composición: pura, se prueba sin modelo ──────────────────────

/** Qué condición resuelve cada cálculo. */
const CALCULO_DE_CONDICION: Partial<Record<Actuacion, Record<string, string>>> = {
  ampliacion_plazo: { oportunidad: 'Oportunidad de la solicitud' },
  adicional: { limite: 'Porcentaje acumulado de adicionales' },
  reduccion: { limite: 'Porcentaje de la reducción' },
  complementario: { limite: 'Porcentaje del complementario', plazo: 'Plazo para la contratación complementaria' },
  penalidad: { formula: 'Penalidad por mora' },
};

const ESTADOS_CONDICION: EstadoCondicion[] = ['cumple', 'no_cumple', 'no_acreditado', 'declarado', 'no_aplica'];
const SEMAFOROS: SemaforoProcedencia[] = ['verde', 'amarillo', 'naranja', 'rojo', 'negro'];

/** ¿La cita está en el documento que se nombra? */
function citaVerificada(caso: Caso, documento: string | undefined, cita: string | undefined): 'documento' | 'usuario' | null {
  if (!documento || !cita || cita.trim().length < 6) return null;
  if (documento === PEDIDO_DEL_USUARIO) return ubicarCita(caso.pedido, cita) || caso.pedido.includes(cita) ? 'usuario' : null;
  if (documento === RESPUESTA_DEL_USUARIO) return 'usuario';
  const doc = caso.documentos.find((d) => d.nombre === documento && d.origen === 'cargado') ??
    caso.documentos.find((d) => d.origen === 'cargado' && documento.includes(d.nombre));
  if (!doc?.texto) return null;
  return ubicarCita(doc.texto, cita) || doc.texto.toLowerCase().includes(cita.trim().toLowerCase()) ? 'documento' : null;
}

const PERFIL_DE_CLASE: Partial<Record<string, ClaseDocumental[]>> = {
  contratista: ['solicitud_contratista'],
  supervisor: ['informe_supervisor'],
  area_usuaria: ['informe_area_usuaria'],
  dec: ['informe_dec'],
  asesoria_juridica: ['informe_legal'],
  aga: ['resolucion'],
  titular: ['resolucion'],
};

export function componerAnalisis(caso: Caso, lectura: LecturaDelModelo, sustento: string): AnalisisDeActuacion {
  const def = MATRIZ[caso.actuacion];
  const c = caso.contexto;
  const advertencias: string[] = [];

  // Los datos decisivos que ya dicen los documentos no se preguntan: se
  // toman de ahí, con su cita, y los cálculos se rehacen con ellos.
  const deducidos = datosDeLosDocumentos(caso, lectura);
  const respuestas: Record<string, string> = { ...Object.fromEntries(deducidos.map((d) => [d.id, d.valor])), ...caso.respuestas };
  const calculos =
    deducidos.length && caso.regimen.clave !== 'ley_30225' ? calcular({ ...caso.insumos, respuestas }) : caso.calculos;

  // Condiciones, con su evidencia comprobada.
  const reglasCond = condicionesAplicables(caso.actuacion, c);
  const delModelo = new Map((lectura.condiciones ?? []).map((x) => [x.id, x]));
  let citasFalsas = 0;
  const condiciones: CondicionEvaluada[] = reglasCond.map((r) => {
    const m = delModelo.get(r.id);
    let estado: EstadoCondicion = ESTADOS_CONDICION.includes(m?.estado as EstadoCondicion) ? (m!.estado as EstadoCondicion) : 'no_acreditado';
    const evidencia: CondicionEvaluada['evidencia'] = [];
    let soloUsuario = true;
    for (const e of m?.evidencia ?? []) {
      const v = citaVerificada(caso, e.documento, e.cita);
      if (!v) {
        citasFalsas++;
        continue;
      }
      evidencia.push({ documento: e.documento!, cita: e.cita!.trim() });
      if (v === 'documento') soloUsuario = false;
    }
    let sustentoCond = m?.sustento?.trim() ?? '';
    if (estado === 'cumple' && (evidencia.length === 0 || soloUsuario)) {
      estado = evidencia.length ? 'declarado' : 'no_acreditado';
      sustentoCond = `${sustentoCond}${sustentoCond ? ' ' : ''}(Sin evidencia documental verificable en el expediente.)`;
    }
    return {
      id: r.id,
      texto: r.texto,
      base: caso.regimen.clave === 'ley_30225' ? 'Régimen anterior: precisar el artículo' : r.base,
      estado,
      sustento: sustentoCond,
      evidencia,
    };
  });

  // Los cálculos mandan sobre lo que diga el modelo.
  const mapa = CALCULO_DE_CONDICION[caso.actuacion] ?? {};
  for (const cond of condiciones) {
    const concepto = mapa[cond.id];
    const calc = concepto ? calculos.find((x) => x.concepto === concepto) : undefined;
    if (!calc) continue;
    cond.estado = calc.impide ? 'no_cumple' : 'cumple';
    cond.sustento = `${calc.resultado}. ${calc.detalle}`;
    cond.calculada = true;
  }

  // Hechos.
  const hechos: HechoIdentificado[] = (lectura.hechos ?? [])
    .filter((h) => h.hecho?.trim())
    .map((h) => {
      const v = citaVerificada(caso, h.documento, h.cita);
      // La solicitud del contratista prueba que pidió y en qué términos,
      // no los hechos que alega: esos quedan como declarados por él.
      const esAlegato =
        v === 'documento' &&
        caso.documentos.some((d) => d.nombre === h.documento && d.clase === 'solicitud_contratista') &&
        !/solicit|present|ped[ií]|requi(?:ere|ri[óo])|formul/i.test(h.hecho ?? '');
      const estado: HechoIdentificado['estado'] =
        v === 'documento' && !esAlegato
          ? 'acreditado'
          : esAlegato || v === 'usuario' || h.estado === 'declarado'
            ? 'declarado'
            : 'no_acreditado';
      return {
        hecho: h.hecho!.trim(),
        fecha: h.fecha ?? null,
        estado,
        documento: v === 'documento' ? h.documento : v === 'usuario' ? h.documento : undefined,
        cita: v ? h.cita?.trim() : undefined,
      };
    });

  // Requisitos que se acreditan con un hecho.
  const porHecho: Record<string, EvaluacionDeHecho> = {};
  for (const r of lectura.requisitos_por_hecho ?? []) {
    if (!r.id) continue;
    const doc = r.documento ? caso.documentos.find((d) => d.origen === 'cargado' && (d.nombre === r.documento || r.documento!.includes(d.nombre))) : undefined;
    if (r.estado === 'acreditado' && doc) porHecho[r.id] = { estado: 'acreditado', documento: doc.nombre };
    else if (r.estado === 'acreditado' || r.estado === 'declarado') porHecho[r.id] = { estado: 'declarado', declaracion: 'Declarado por el usuario; no se encuentra acreditado documentalmente.' };
  }
  if (/^no\b/i.test(caso.respuestas.evidencia ?? '') && !porHecho.acredita_hecho) {
    porHecho.acredita_hecho = {
      estado: 'declarado',
      declaracion: 'El hecho ha sido declarado, pero no se encuentra acreditado documentalmente. El diagnóstico será preliminar y el informe advertirá esta limitación.',
    };
  }

  const requisitos = evaluarRequisitos(requisitosAplicables(caso.actuacion, c), c, caso.documentos, caso.ficha, porHecho);

  // La figura.
  const noCorresponde = def.noCorresponde?.(c) ?? null;
  const alternativaModelo = ORDEN_ACTUACIONES.includes(lectura.figura?.alternativa as Actuacion)
    ? (lectura.figura!.alternativa as Actuacion)
    : null;
  const figura = noCorresponde
    ? { nombre: ACTUACIONES[caso.actuacion].nombre, corresponde: false, razon: noCorresponde.razon, alternativa: noCorresponde.alternativa }
    : {
        nombre: lectura.figura?.nombre?.trim() || ACTUACIONES[caso.actuacion].nombre,
        corresponde: lectura.figura?.corresponde !== false,
        razon: lectura.figura?.razon?.trim() ?? '',
        alternativa: lectura.figura?.corresponde === false ? alternativaModelo : null,
      };

  // La procedencia: la del modelo, y encima lo que el código sabe.
  let semaforo: SemaforoProcedencia = SEMAFOROS.includes(lectura.procedencia?.semaforo as SemaforoProcedencia)
    ? (lectura.procedencia!.semaforo as SemaforoProcedencia)
    : 'amarillo';
  const razones: string[] = [lectura.procedencia?.razon?.trim() ?? ''].filter(Boolean);
  if (!figura.corresponde) {
    semaforo = 'negro';
    if (noCorresponde) razones.unshift(noCorresponde.razon);
  }
  const impide = calculos.filter((x) => x.impide);
  if (impide.length && semaforo !== 'negro') {
    semaforo = 'rojo';
    razones.unshift(...impide.map((x) => `${x.concepto}: ${x.resultado}.`));
  }
  if (condiciones.some((x) => x.estado === 'no_cumple') && semaforo !== 'negro') semaforo = peor(semaforo, 'rojo');
  if (semaforo === 'verde' && condiciones.some((x) => x.estado === 'no_acreditado' || x.estado === 'declarado')) {
    semaforo = 'amarillo';
    razones.push('Hay condiciones que todavía no están acreditadas con documentos.');
  }
  const riesgos = (lectura.riesgos ?? [])
    .filter((r) => r.descripcion?.trim())
    .map((r) => ({
      descripcion: r.descripcion!.trim(),
      gravedad: (['alta', 'media', 'baja'].includes(r.gravedad ?? '') ? r.gravedad : 'media') as 'alta' | 'media' | 'baja',
    }));
  if (riesgos.some((r) => r.gravedad === 'alta') && (semaforo === 'verde' || semaforo === 'amarillo')) semaforo = 'naranja';
  for (const x of impide) riesgos.unshift({ descripcion: `${x.concepto}: ${x.resultado}. ${x.detalle}`, gravedad: 'alta' });

  // La competencia: la de la matriz, o la del porcentaje si se calculó.
  let competencia = def.organo(c);
  if (caso.actuacion === 'adicional') {
    const calc = calculos.find((x) => x.concepto === 'Porcentaje acumulado de adicionales');
    const pct = calc ? aNumero(calc.resultado.split('%')[0]) : null;
    if (pct !== null) {
      const lim = limiteDeAdicionales(caso.tipo, c.sistemaEntrega, pct);
      competencia = { organo: lim.organo, base: lim.base, verificar: competencia.verificar };
    }
  }

  // En el régimen anterior no se cita el articulado de la Ley N.° 32069.
  if (caso.regimen.clave === 'ley_30225') competencia = { ...competencia, base: 'Régimen anterior: precisar el artículo' };

  // La cadena documental, marcando lo que ya está en el expediente.
  const cargados = caso.documentos.filter((d) => d.origen === 'cargado');
  const cadena: PasoDeLaCadena[] = def.cadena(c).map((p) => ({
    ...p,
    base: caso.regimen.clave === 'ley_30225' ? undefined : p.base,
    hecho: (PERFIL_DE_CLASE[p.perfil] ?? []).some((cl) => cargados.some((d) => d.clase === cl || (d.datos.contiene ?? []).includes(cl))),
  }));

  const doc = documentoRecomendado(caso.perfil, caso.actuacion, c);
  const miPaso = cadena.findIndex((p) => p.perfil === caso.perfil || (caso.perfil === 'titular' && p.perfil === 'aga'));
  const previosFaltan = (miPaso > 0 ? cadena.slice(0, miPaso) : []).filter((p) => !p.hecho && !p.condicion && p.perfil !== caso.perfil);
  const advertenciaDoc = previosFaltan.length
    ? `El documento corresponde al perfil ${PERFILES[caso.perfil].nombre}; sin embargo, para una actuación completa se requiere contar antes con: ${previosFaltan.map((p) => p.documento.charAt(0).toLowerCase() + p.documento.slice(1)).join('; ')}.`
    : undefined;

  // La siguiente pregunta.
  const clasesPresentes = new Set<string>();
  for (const d of cargados) {
    if (d.clase) clasesPresentes.add(d.clase);
    for (const x of d.datos.contiene ?? []) clasesPresentes.add(x);
  }
  const montos = cargados.flatMap((d) => d.datos.montos ?? []);
  const preguntaModelo: PreguntaDecisiva | null = lectura.pregunta?.texto?.trim()
    ? {
        id: `modelo_${caso.listaRespuestas.length + 1}`,
        texto: lectura.pregunta.texto.trim(),
        porQue: lectura.pregunta.porQue?.trim() ?? '',
        cambia: lectura.pregunta.cambia ?? ['análisis'],
      }
    : null;
  const pregunta = siguientePregunta(
    {
      actuacion: caso.actuacion,
      perfil: caso.perfil,
      tipo: caso.tipo,
      regimen: caso.regimen.clave,
      ficha: caso.ficha,
      respuestas,
      clases: clasesPresentes,
      hechoIdentificado: !!lectura.hecho_generador?.trim(),
      hechoAcreditado: requisitos.some((r) => r.id === 'acredita_hecho' && r.estado === 'acreditado'),
      montos,
      hayFechaSolicitud: clasesPresentes.has('solicitud_contratista') && cargados.some((d) => d.clase === 'solicitud_contratista' && !!d.datos.fecha),
    },
    preguntaModelo,
  );

  const suf = calcularSuficiencia(requisitos, semaforo);

  // Advertencias para la revisión humana.
  if (caso.regimen.clave === 'ley_30225')
    advertencias.push(
      `${caso.regimen.razon} Se rige por el ${caso.regimen.texto}. La biblioteca de LexIA no contiene ese articulado: los artículos quedan por precisar y los plazos y porcentajes deben verificarse en esa norma.`,
    );
  if (caso.regimen.clave === 'ley_30225' && def.cadena(c).length)
    advertencias.push('La cadena documental y los plazos se muestran según la Ley N.° 32069: verifica su equivalente en el régimen anterior (por ejemplo, las notificaciones por el SEACE en lugar de la Pladicop).');
  if (caso.regimen.clave === 'por_determinar')
    advertencias.push(`${caso.regimen.razon} Mientras tanto se analiza con la Ley N.° 32069; si la convocatoria fue anterior al 22 de abril de 2025, el análisis cambia.`);
  if (citasFalsas > 0)
    advertencias.push(
      `${citasFalsas === 1 ? 'Una cita del análisis no se encontró' : `${citasFalsas} citas del análisis no se encontraron`} en el documento que decía citar y no se ${citasFalsas === 1 ? 'tomó' : 'tomaron'} como evidencia.`,
    );
  for (const aviso of new Set(calculos.map((x) => x.aviso).filter((x): x is string => !!x))) advertencias.push(aviso);
  if (caso.actuacion === 'reconocimiento_pago' && /sin contrato|fuera/i.test(caso.respuestas.origen_obligacion ?? ''))
    advertencias.push(
      'Una prestación ejecutada sin contrato o fuera de él no se paga por las reglas del contrato. La biblioteca de LexIA no contiene la norma aplicable a ese reconocimiento: el documento deja su base legal por precisar. Si deriva de adicionales no aprobados, las pretensiones de enriquecimiento sin causa son de competencia del Poder Judicial (numeral 76.3 del artículo 76 de la Ley).',
    );
  for (const r of requisitos) if (r.declaracion && r.estado === 'falta' && r.declaracion.startsWith('Existe el borrador')) advertencias.push(r.declaracion);
  if (figura.alternativa && !figura.corresponde)
    advertencias.push(`La figura que correspondería es «${ACTUACIONES[figura.alternativa].nombre}»: puedes analizar el caso con esa actuación.`);

  const contradicciones = [
    ...caso.contradiccionesDeFicha,
    ...(lectura.contradicciones ?? []).filter((x) => x.descripcion?.trim()).map((x) => ({ descripcion: x.descripcion!.trim() })),
  ];
  if (contradicciones.length && semaforo === 'verde') semaforo = 'amarillo';

  return {
    generadoEn: new Date().toISOString(),
    actuacion: caso.actuacion,
    actuacionPedida: caso.actuacionPedida,
    tipo: caso.tipo,
    regimen: { clave: caso.regimen.clave, texto: caso.regimen.texto, base: caso.regimen.base },
    entendimiento: lectura.entendimiento?.trim() ?? '',
    figura,
    requisitos,
    condiciones,
    hechos,
    contradicciones,
    riesgos,
    calculos: calculos,
    competencia,
    cadena,
    explicacionCadena: def.explicacion(c),
    documento: { tipo: doc.tipo, titulo: doc.titulo, advertencia: advertenciaDoc },
    suficiencia: suf.porcentaje,
    semaforoInformacion: suf.semaforo,
    procedencia: { semaforo, razon: razones.filter(Boolean).join(' ') },
    nivelesPermitidos: suf.niveles,
    mensajeSuficiencia: suf.mensaje,
    pregunta,
    faltantes: suf.faltantes,
    advertencias,
    sustento,
    datosDeLosDocumentos: deducidos,
  };
}

/** Los datos decisivos que el modelo encontró en un documento, comprobados. */
function datosDeLosDocumentos(caso: Caso, lectura: LecturaDelModelo) {
  const posibles = new Map(datosDeterminantes(caso.actuacion).map((x) => [x.id, x]));
  const out: NonNullable<AnalisisDeActuacion['datosDeLosDocumentos']> = [];
  for (const d of lectura.datos ?? []) {
    const def = d.id ? posibles.get(d.id) : undefined;
    if (!def || !d.valor || caso.respuestas[def.id] || out.some((x) => x.id === def.id)) continue;
    if (citaVerificada(caso, d.documento, d.cita) !== 'documento') continue;
    let valor: string | null = String(d.valor).trim();
    if (def.formato === 'fecha') valor = fechaISO(valor);
    else {
      const n = aNumero(valor);
      valor = n === null ? null : String(n);
    }
    if (!valor) continue;
    out.push({ id: def.id, pregunta: def.texto, valor, documento: d.documento!, cita: d.cita!.trim() });
  }
  return out;
}
