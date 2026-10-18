/**
 * El procedimiento de evaluación que corresponde a CADA bases: qué etapas
 * tiene, cómo se evalúa la oferta económica, qué mínimo técnico, qué
 * coeficientes, qué bonificaciones.
 *
 * POR QUÉ
 *
 * César, «PROCEDIMIENTOS DE EVALUACIÓN» (17/10/2026): el acta debe
 * redactarse «según la particularidad de cada bases». El evaluador trataba
 * igual una licitación de bienes (técnica y económica simultáneas, la
 * económica hasta 40 puntos) que un concurso de servicios (económica
 * posterior, solo con 70 puntos técnicos), una obra con oferta limitada
 * (fuera del 95 %–110 % se descalifica) o una comparación de precios (solo
 * precio, mínimo dos calificadas).
 *
 * DE DÓNDE SALE CADA REGLA (verificado el 17/10/2026)
 *
 *   · Reglamento (DS 009-2025-EF, texto de la biblioteca):
 *     art. 74 (simultánea, posterior, lances; fórmula Po = Mb × Pmax / Mo;
 *     sin fórmula en subasta inversa ni comparación de precios), 75.1 (la
 *     económica no supera 40 puntos; 70 en bienes homologados), 75.3 (PTP =
 *     C1 × Pt + C2 × Pe), 75.5 (bonificación MYPE en modalidad abreviada),
 *     75.6 (10 % por domicilio en la provincia o colindantes: servicios y
 *     consultorías hasta S/ 200 000, obras hasta S/ 900 000, fuera de Lima y
 *     Callao), 81 (empate), 82 (consentimiento), 84 (desierto), 96.3–96.5
 *     (subasta inversa), 132 (negociación y rechazo en bienes y servicios),
 *     133 (mantenimiento vial: limitada 95 %–110 % o fija al 100 %), 134
 *     (expertos: oferta fija).
 *   · Bases estándar (capítulos en bases/capitulos/be-N.json): mínimo de 70
 *     puntos técnicos y coeficientes por objeto (servicios y obras 0,60–0,70;
 *     consultoría en general 0,70–0,80; consultoría de obra 0,80–0,90),
 *     límites del 95 % y 110 % en obras, 90 % en consultoría de obra y en el
 *     diseño, bonificación del 5 % MYPE (Anexo de solicitud), comparación de
 *     precios con al menos dos ofertas calificadas (numeral 98.1).
 *
 * Lo que el documento de César dice distinto, y por qué aquí manda la norma:
 *   · Empate: él escribe «sorteo electrónico automático»; el art. 81 pone
 *     antes el mejor puntaje técnico y la condición de MYPE.
 *   · Subasta inversa: él escribe «los tres primeros lugares»; el 96.5 dice
 *     que se revisan sucesivamente hasta identificar tres que cumplan.
 *   · Rechazo: él lo extiende a obras; el 132.5 lo prevé para bienes y
 *     servicios.
 */
import type { LecturaBases } from './motor';

export type ClaseDeProcedimiento =
  | 'bienes'
  | 'servicios'
  | 'consultoria'
  | 'consultoria_obra'
  | 'obra'
  | 'mantenimiento_vial'
  | 'expertos'
  | 'proyectos'
  | 'subasta_inversa'
  | 'comparacion_precios'
  | 'no_competitivo';

export type TipoEconomica = 'simultanea' | 'posterior' | 'limitada' | 'fija' | 'lances' | 'menor_precio' | 'no_aplica';

export interface PerfilProcedimiento {
  clase: ClaseDeProcedimiento;
  /** Cómo se nombra en el acta: «Licitación Pública Abreviada para Bienes». */
  nombre: string;
  abreviada: boolean;
  /** Las etapas en orden, como las nombra el acta. */
  secuencia: string[];
  /** Si hay evaluación técnica con factores. */
  conTecnica: boolean;
  economica: {
    tipo: TipoEconomica;
    /** Puntaje máximo de la económica (40 / 70 / 100); 0 si no se asigna. */
    puntajeMaximo: number;
    /** Oferta limitada: fuera de este rango (fracción de la cuantía) se descalifica. */
    rango?: { minimo: number; maximo?: number };
  };
  puntajeTecnicoMinimo: number | null;
  /** Los rangos que admiten las bases estándar para C1 y C2. */
  coeficientes?: { c1: [number, number]; c2: [number, number] };
  /** Rechazo por oferta por debajo de la cuantía (art. 132.5): bienes y servicios, no subasta. */
  rechazo: boolean;
  bonificaciones: { mype: boolean; provincia: boolean };
  /** Comparación de precios: mínimo de ofertas calificadas para evaluar (numeral 98.1). */
  minimoCalificadas?: number;
  /** Cada regla con su fuente, para el acta. */
  reglas: Array<{ etapa: string; regla: string; fuente: string }>;
  /** Lo que no se pudo determinar de las Bases. */
  avisos: string[];
}

const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

/** El tipo de procedimiento, por el título que llevan las propias Bases. */
export function claseDeLasBases(textoBases: string, lectura?: LecturaBases): ClaseDeProcedimiento {
  const cabeza = plano(
    `${lectura?.procedimiento.numero ?? ''} ${lectura?.procedimiento.objeto ?? ''} ${textoBases.slice(0, 25_000)}`,
  );
  if (/subasta inversa electronica/.test(cabeza)) return 'subasta_inversa';
  if (/comparacion de precios/.test(cabeza)) return 'comparacion_precios';
  if (/no competitivo/.test(cabeza)) return 'no_competitivo';
  if (/proyectos arquitectonicos/.test(cabeza)) return 'proyectos';
  if (/expertos y gerentes|gerentes? de proyectos?|contratacion de expertos/.test(cabeza)) return 'expertos';
  if (/mantenimiento vial/.test(cabeza) && /concurso publico/.test(cabeza)) return 'mantenimiento_vial';
  if (/consultoria de obras?/.test(cabeza) && /concurso publico/.test(cabeza)) return 'consultoria_obra';
  if (/consultoria en general/.test(cabeza)) return 'consultoria';
  if (/licitacion publica (?:abreviada )?(?:de|para) (?:la ejecucion de )?obras?|ejecucion de (?:la )?obra/.test(cabeza)) return 'obra';
  if (/concurso publico (?:abreviado )?(?:de|para) servicios|contratacion de servicios|servicio de/.test(cabeza) && !/para bienes/.test(cabeza)) return 'servicios';
  if (/licitacion publica (?:abreviada )?(?:para|de) (?:el suministro de )?bienes|adquisicion de|suministro de bienes/.test(cabeza)) return 'bienes';
  return /servicio/.test(cabeza) ? 'servicios' : 'bienes';
}

/**
 * Si las Bases optan por oferta fija al 100 % o limitada (obras,
 * mantenimiento vial). La sección general de las bases de obras describe
 * LAS DOS («a. Oferta económica limitada… b. Oferta económica fija al
 * 100%»); la elegida está en el Capítulo IV, tras «EVALUACIÓN ECONÓMICA
 * (Puntaje Máximo…» (LP de Obras 001-2026-MDP/J, Pucacolpa). Se mira ahí.
 */
function metodoDeObra(textoBases: string, formula?: string): 'fija' | 'limitada' | null {
  const t = plano(textoBases);
  const encabezados = [...t.matchAll(/evaluacion economica \(puntaje maximo/g)];
  const capitulo = encabezados.length ? t.slice(encabezados.at(-1)!.index!, encabezados.at(-1)!.index! + 2500) : '';
  const fija = /fija al 100|oferta economica fija|no hay asignacion de puntaje|no se asigna puntaje/;
  const limitada = /oferta economica limitada|limite inferior|entre el 95 ?% y 110 ?%|95 ?% y (?:el )?110 ?%/;
  for (const zona of [capitulo, plano(formula ?? '')]) {
    const f = zona.search(fija);
    const l = zona.search(limitada);
    if (f >= 0 && (l < 0 || f < l)) return 'fija';
    if (l >= 0) return 'limitada';
  }
  return null;
}

export function perfilDelProcedimiento(lectura: LecturaBases, textoBases: string): PerfilProcedimiento {
  const clase = claseDeLasBases(textoBases, lectura);
  const cabeza = plano(`${lectura.procedimiento.numero ?? ''} ${textoBases.slice(0, 25_000)}`);
  const abreviada = /abreviad[ao]/.test(cabeza);
  const t = plano(textoBases);
  const pideMype = /bonificacion del cinco por ciento|bonificacion del 5 ?%/.test(t);
  const pideProvincia = /bonificacion del diez por ciento|bonificacion del 10 ?%/.test(t);
  const eco = lectura.evaluacionEconomica;
  const avisos: string[] = [];
  const reglas: PerfilProcedimiento['reglas'] = [
    { etapa: 'Admisión', regla: 'Se verifica que la oferta contenga los documentos para la admisión; si no, la oferta no es admitida.', fuente: 'Bases, Capítulo II' },
    { etapa: 'Calificación', regla: 'Se verifica la capacidad legal, la capacidad técnica y profesional y la experiencia del postor; si no las cumple, la oferta es descalificada.', fuente: 'Bases, Capítulo III; art. 72 del Reglamento' },
  ];

  const base = (p: Omit<PerfilProcedimiento, 'clase' | 'abreviada' | 'reglas' | 'avisos' | 'bonificaciones'> & { bonificaciones?: PerfilProcedimiento['bonificaciones'] }): PerfilProcedimiento => ({
    clase,
    abreviada,
    reglas,
    avisos,
    bonificaciones: p.bonificaciones ?? { mype: abreviada && pideMype, provincia: pideProvincia },
    ...p,
  });

  const posterior = (nombre: string, c1: [number, number], c2: [number, number]): PerfilProcedimiento => {
    reglas.push(
      { etapa: 'Evaluación técnica', regla: 'Factores de evaluación sobre 100 puntos; para acceder a la evaluación económica se requiere un puntaje técnico mínimo de 70 puntos.', fuente: 'Bases estándar, Capítulo IV; art. 74.1 b) del Reglamento' },
      { etapa: 'Evaluación económica', regla: 'Posterior a la técnica, sobre 100 puntos: Po = Mb × Pmax / Mo.', fuente: 'Art. 74.2 y 75.2 del Reglamento' },
      { etapa: 'Puntaje total', regla: `PTP = C1 × Pt + C2 × Pe, con ${c1[0].toFixed(2)} ≤ C1 ≤ ${c1[1].toFixed(2)} y ${c2[0].toFixed(2)} ≤ C2 ≤ ${c2[1].toFixed(2)}.`, fuente: 'Art. 75.3 y 75.4 del Reglamento; bases estándar' },
    );
    return base({
      nombre,
      secuencia: ['Admisión', 'Calificación', 'Evaluación técnica', 'Evaluación económica (posterior)'],
      conTecnica: true,
      economica: { tipo: 'posterior', puntajeMaximo: 100 },
      puntajeTecnicoMinimo: lectura.puntajeTecnicoMinimo ?? 70,
      coeficientes: { c1, c2 },
      // Las consultorías son servicios (art. 132: «bienes y servicios»); en
      // obras y mantenimiento vial se apaga más abajo: allí manda el rango.
      rechazo: true,
    });
  };

  let perfil: PerfilProcedimiento;
  switch (clase) {
    case 'bienes': {
      const pmax = eco?.puntajeMaximo && eco.puntajeMaximo <= 70 ? eco.puntajeMaximo : 40;
      reglas.push(
        { etapa: 'Evaluación técnica y económica', regla: `Simultáneas: la oferta económica es un factor de evaluación de hasta ${pmax} puntos (hasta 70 en bienes homologados); los factores técnicos completan 100.`, fuente: 'Art. 74.1 a) y 75.1 del Reglamento' },
        { etapa: 'Puntaje total', regla: 'Suma de los puntajes de todos los factores (técnicos + económico).', fuente: 'Art. 75.1 del Reglamento' },
      );
      perfil = base({
        nombre: abreviada ? 'Licitación Pública Abreviada para Bienes' : 'Licitación Pública para Bienes',
        secuencia: ['Admisión', 'Calificación', 'Evaluación técnica y económica (simultáneas)'],
        conTecnica: true,
        economica: { tipo: 'simultanea', puntajeMaximo: pmax },
        puntajeTecnicoMinimo: null,
        rechazo: true,
      });
      break;
    }
    case 'servicios':
      perfil = posterior(abreviada ? 'Concurso Público Abreviado de Servicios' : 'Concurso Público de Servicios', [0.6, 0.7], [0.3, 0.4]);
      break;
    case 'consultoria':
      perfil = posterior(abreviada ? 'Concurso Público Abreviado para Consultoría en General' : 'Concurso Público para Consultoría en General', [0.7, 0.8], [0.2, 0.3]);
      break;
    case 'consultoria_obra':
      perfil = posterior(abreviada ? 'Concurso Público Abreviado para Consultoría de Obra' : 'Concurso Público para Consultoría de Obra', [0.8, 0.9], [0.1, 0.2]);
      perfil.economica = { tipo: 'limitada', puntajeMaximo: 100, rango: { minimo: 0.9 } };
      reglas.push({ etapa: 'Evaluación económica', regla: 'Oferta económica limitada: no puede ser menor al 90 % de la cuantía; la que no cumpla se descalifica.', fuente: 'Bases estándar de consultoría de obra' });
      break;
    case 'proyectos':
      perfil = posterior('Concurso de Proyectos Arquitectónicos y Urbanísticos', [0.6, 0.7], [0.3, 0.4]);
      perfil.economica = { tipo: 'limitada', puntajeMaximo: 100, rango: { minimo: 0.9 } };
      reglas.push({ etapa: 'Evaluación técnica', regla: 'A cargo de un jurado; factor obligatorio: la propuesta arquitectónica.', fuente: 'Art. 135 del Reglamento; bases estándar' }, { etapa: 'Evaluación económica', regla: 'El componente de diseño no puede ser menor al 90 % de su cuantía; en diseño y construcción, el componente de obra es fijo al 100 %.', fuente: 'Bases estándar de proyectos arquitectónicos' });
      break;
    case 'obra':
    case 'mantenimiento_vial': {
      const nombre =
        clase === 'obra'
          ? abreviada ? 'Licitación Pública Abreviada de Obras' : 'Licitación Pública de Obras'
          : abreviada ? 'Concurso Público Abreviado para Servicio de Mantenimiento Vial' : 'Concurso Público para Servicio de Mantenimiento Vial';
      perfil = posterior(nombre, [0.6, 0.7], [0.3, 0.4]);
      perfil.rechazo = false;
      const metodo = metodoDeObra(textoBases, eco?.formula) ?? (eco?.puntajeMaximo === 0 ? 'fija' : null);
      const fuente = clase === 'obra' ? 'Bases estándar de obras' : 'Art. 133 del Reglamento; bases estándar de mantenimiento vial';
      if (metodo === 'fija') {
        perfil.economica = { tipo: 'fija', puntajeMaximo: 0 };
        perfil.secuencia = ['Admisión', 'Calificación', 'Evaluación técnica (la económica es fija)'];
        reglas.splice(2, reglas.length - 2, { etapa: 'Evaluación técnica', regla: 'Sobre 100 puntos.', fuente }, { etapa: 'Evaluación económica', regla: 'Oferta fija al 100 % de la cuantía: no se asigna puntaje económico y el puntaje total es el técnico. La oferta distinta del 100 % se descalifica.', fuente });
      } else {
        perfil.economica = { tipo: 'limitada', puntajeMaximo: 100, rango: { minimo: 0.95, maximo: 1.1 } };
        reglas.push({ etapa: 'Evaluación económica', regla: 'Oferta limitada: debe estar entre el 95 % y el 110 % de la cuantía; fuera de ese rango se descalifica.', fuente });
        if (!metodo) avisos.push('Las Bases leídas no dicen con claridad si la oferta económica es limitada o fija: se aplicó la limitada (95 %–110 %). El comité debe confirmarlo.');
      }
      break;
    }
    case 'expertos':
      reglas.push({ etapa: 'Evaluación técnica', regla: 'Sobre 100 puntos, con los factores obligatorios de las bases estándar (casos prácticos, entrevista, experiencia).', fuente: 'Art. 134.2 del Reglamento' }, { etapa: 'Evaluación económica', regla: 'Oferta fija igual a la cuantía; la que no corresponda a la cuantía se descalifica. El puntaje total es el técnico.', fuente: 'Art. 134.1 del Reglamento' });
      perfil = base({
        nombre: 'Concurso Público Abreviado para la Contratación de Expertos y Gerentes de Proyectos',
        secuencia: ['Admisión', 'Calificación', 'Evaluación técnica (la económica es fija)'],
        conTecnica: true,
        economica: { tipo: 'fija', puntajeMaximo: 0 },
        puntajeTecnicoMinimo: lectura.puntajeTecnicoMinimo,
        rechazo: false,
      });
      break;
    case 'subasta_inversa':
      reglas.splice(0, reglas.length,
        { etapa: 'Evaluación económica', regla: 'Por lances en línea en la Pladicop; el orden de prelación es del menor al mayor último lance. No hay evaluación técnica.', fuente: 'Art. 74.1 c), 96.3 y 96.4 del Reglamento' },
        { etapa: 'Admisión y calificación', regla: 'Posteriores a los lances: se revisan los postores en el orden de prelación, sucesivamente, hasta identificar tres que cumplan (si solo participaron dos, ambos).', fuente: 'Art. 96.5 del Reglamento' },
      );
      perfil = base({
        nombre: 'Subasta Inversa Electrónica',
        secuencia: ['Evaluación económica (lances)', 'Admisión', 'Calificación'],
        conTecnica: false,
        economica: { tipo: 'lances', puntajeMaximo: 0 },
        puntajeTecnicoMinimo: null,
        rechazo: false,
        bonificaciones: { mype: false, provincia: false },
      });
      break;
    case 'comparacion_precios':
      reglas.push({ etapa: 'Evaluación económica', regla: 'Único factor: el menor precio ofertado; el orden de prelación va del menor al mayor monto. Se requieren al menos dos ofertas que cumplan los requisitos de calificación; si no, el procedimiento se declara desierto.', fuente: 'Art. 74.3 del Reglamento; bases estándar (numeral 98.1)' });
      perfil = base({
        nombre: 'Comparación de Precios',
        secuencia: ['Admisión', 'Calificación', 'Evaluación económica (menor precio)'],
        conTecnica: false,
        economica: { tipo: 'menor_precio', puntajeMaximo: 0 },
        puntajeTecnicoMinimo: null,
        rechazo: true,
        minimoCalificadas: 2,
      });
      break;
    case 'no_competitivo':
      reglas.push({ etapa: 'Verificación', regla: 'Se verifica el cumplimiento integral de las especificaciones técnicas o términos de referencia; no hay competencia ni puntaje.', fuente: 'Bases estándar del procedimiento no competitivo' });
      perfil = base({
        nombre: 'Procedimiento de Selección No Competitivo',
        secuencia: ['Admisión', 'Calificación (verificación)'],
        conTecnica: false,
        economica: { tipo: 'no_aplica', puntajeMaximo: 0 },
        puntajeTecnicoMinimo: null,
        rechazo: false,
        bonificaciones: { mype: false, provincia: false },
      });
      break;
  }

  // El 10 % por provincia tiene tope de cuantía (art. 75.6): servicios y
  // consultorías hasta S/ 200 000, obras hasta S/ 900 000. El anexo de
  // solicitud puede quedar en las bases aunque no aplique (LP de Obras
  // 001-2026-MDP/J: cuantía de S/ 7 014 178,41).
  const cuantia = lectura.procedimiento.cuantiaMonto;
  const tope = clase === 'obra' ? 900_000 : clase === 'bienes' ? 0 : 200_000;
  if (perfil.bonificaciones.provincia && (clase === 'bienes' || (cuantia && cuantia > tope))) {
    perfil.bonificaciones.provincia = false;
    avisos.push(
      clase === 'bienes'
        ? 'Las Bases traen la solicitud de bonificación del 10 %, pero el art. 75.6 la prevé solo para servicios, consultorías y obras: no se aplica.'
        : `Las Bases traen la solicitud de bonificación del 10 %, pero la cuantía (S/ ${cuantia!.toLocaleString('es-PE')}) supera el tope del art. 75.6 (S/ ${tope.toLocaleString('es-PE')}): no se aplica.`,
    );
  }

  // Lo que dicen ESTAS bases prevalece sobre el patrón del estándar.
  if (lectura.puntajeTecnicoMinimo != null && perfil.economica.tipo !== 'simultanea') perfil.puntajeTecnicoMinimo = lectura.puntajeTecnicoMinimo;
  if (perfil.coeficientes && eco?.coeficienteTecnico && eco?.coeficienteEconomico) {
    const [a, b] = perfil.coeficientes.c1;
    if (eco.coeficienteTecnico < a - 1e-9 || eco.coeficienteTecnico > b + 1e-9) {
      avisos.push(`Las Bases fijan C1 = ${eco.coeficienteTecnico}, fuera del rango ${a.toFixed(2)}–${b.toFixed(2)} que permiten las bases estándar para este objeto.`);
    }
    if (Math.abs(eco.coeficienteTecnico + eco.coeficienteEconomico - 1) > 0.001) {
      avisos.push(`Los coeficientes de las Bases no suman 1 (C1 = ${eco.coeficienteTecnico}, C2 = ${eco.coeficienteEconomico}).`);
    }
  }
  if (perfil.bonificaciones.mype) {
    reglas.push({ etapa: 'Bonificación', regla: 'Cinco por ciento (5 %) sobre el puntaje total a la micro y pequeña empresa que lo solicita con el anexo correspondiente y está acreditada en el REMYPE (en consorcio, todos sus integrantes).', fuente: 'Art. 75.5 del Reglamento; bases estándar' });
  }
  if (perfil.bonificaciones.provincia) {
    reglas.push({ etapa: 'Bonificación', regla: 'Diez por ciento (10 %) sobre el puntaje total al postor con domicilio (según su constancia del RNP) en la provincia donde se ejecuta la prestación o en una colindante.', fuente: 'Art. 75.6 del Reglamento' });
  }
  if (perfil.conTecnica || perfil.economica.tipo !== 'no_aplica') {
    reglas.push(
      { etapa: 'Empate', regla: 'a) mejor puntaje técnico; b) MYPE integrada por personas con discapacidad; c) MYPE; d) sorteo.', fuente: 'Art. 81 del Reglamento' },
    );
  }
  if (perfil.rechazo) {
    reglas.push({ etapa: 'Rechazo', regla: 'Una oferta por debajo de la cuantía puede rechazarse si, pedido el detalle de su composición (plazo mínimo de dos días hábiles), hay razones objetivas de un probable incumplimiento.', fuente: 'Art. 132.5 y 132.6 del Reglamento' });
  }
  if (perfil.economica.tipo !== 'fija' && perfil.economica.tipo !== 'no_aplica' && clase !== 'subasta_inversa') {
    reglas.push({ etapa: 'Negociación', regla: 'Si la oferta del mejor puntaje total supera la cuantía, la DEC gestiona la ampliación presupuestal; si no hay recursos, se negocia la reducción de la oferta y luego de prestaciones, y si no acepta, con los siguientes en el orden de prelación.', fuente: 'Art. 132.1 a 132.3 del Reglamento' });
  }
  reglas.push(
    { etapa: 'Buena pro', regla: 'Se publica en la Pladicop con los documentos que sustentan la calificación y la evaluación.', fuente: 'Art. 80 del Reglamento' },
    { etapa: 'Consentimiento', regla: 'Con dos o más ofertas, al día siguiente de vencido el plazo de apelación sin que se haya apelado; con una sola oferta, el mismo día de la notificación (se registra al día siguiente).', fuente: 'Art. 82 del Reglamento' },
  );
  return perfil;
}
