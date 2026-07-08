/**
 * Estructura jerárquica de subtipos para el Generador de Requerimientos
 * — feedback César 02/07/2026.
 *
 * Dos regímenes principales:
 *   I. CONTRATACIONES MENORES A 8 UIT (3 subtipos)
 *  II. PROCEDIMIENTOS DE SELECCIÓN — 4 categorías × subcategorías (13 subtipos)
 *
 * Cada subtipo apunta a un ObjectoContractual base (bien | servicio | obra
 * | consultoria_obra) para reutilizar el catálogo de cláusulas existente,
 * pero recibe HINTS de IA específicos que reflejan las particularidades
 * de ese tipo de contratación.
 */

import type { ObjectoContractual } from './catalog';

export type RegimenRequerimiento = 'menor_8uit' | 'seleccion';

export type SubtipoRequerimiento =
  // I. Contrataciones menores a 8 UIT
  | 'menor_bienes_general'
  | 'menor_servicios_consultorias'
  | 'menor_locadores'
  // II.1. Procedimientos de Selección — Bienes
  | 'sel_bien_general'
  | 'sel_bien_estandarizado_sie'
  | 'sel_bien_vaso_leche'
  // II.2. Procedimientos de Selección — Servicios
  | 'sel_serv_general'
  | 'sel_serv_consultoria'
  | 'sel_serv_mantenimiento_vial'
  | 'sel_serv_expertos_gerentes'
  // II.3. Procedimientos de Selección — Consultoría de Obras
  | 'sel_cobra_supervision_obra'
  | 'sel_cobra_supervision_exp_tec'
  | 'sel_cobra_elab_exp_tec'
  | 'sel_cobra_elab_ficha_tec'
  // II.4. Procedimientos de Selección — Ejecución de obras
  | 'sel_obra_diseno_construccion'
  | 'sel_obra_solo_construccion';

interface SubtipoMeta {
  key: SubtipoRequerimiento;
  label: string;
  description: string;
  /** Objeto base para reutilizar el catálogo de cláusulas. */
  baseObjeto: ObjectoContractual;
  /** Hint corto para el prompt de IA sobre la particularidad del subtipo. */
  aiFocus: string;
}

export const SUBTIPO_META: Record<SubtipoRequerimiento, SubtipoMeta> = {
  // ══ I. Contrataciones menores a 8 UIT ══
  menor_bienes_general: {
    key: 'menor_bienes_general',
    label: 'Bienes en general',
    description:
      'Adquisiciones de bienes por montos iguales o menores a 8 UIT (contratos menores).',
    baseObjeto: 'bien',
    aiFocus:
      'Contratación menor a 8 UIT de bienes en general. La redacción es simplificada — no aplica RNP, no procedimiento formal. Prioriza claridad y economía procesal. Cláusulas breves pero completas.',
  },
  menor_servicios_consultorias: {
    key: 'menor_servicios_consultorias',
    label: 'Servicios en general y consultorías',
    description:
      'Contratación de servicios y consultorías por montos iguales o menores a 8 UIT.',
    baseObjeto: 'servicio',
    aiFocus:
      'Contratación menor a 8 UIT de servicios o consultorías. La redacción es simplificada — no aplica RNP, no procedimiento formal. Perfil profesional sí puede pedirse. Cláusulas breves pero completas.',
  },
  menor_locadores: {
    key: 'menor_locadores',
    label: 'Locadores y personas naturales',
    description:
      'Contratación de locadores de servicios y personas naturales por hasta 8 UIT.',
    baseObjeto: 'servicio',
    aiFocus:
      'Contratación menor a 8 UIT de LOCADORES / personas naturales bajo régimen de locación de servicios. No hay relación laboral. Perfil profesional obligatorio con acreditación. NO exigir RNP (la contratación es individual, no empresarial).',
  },

  // ══ II.1. Bienes ══
  sel_bien_general: {
    key: 'sel_bien_general',
    label: 'Bienes en general',
    description:
      'Adquisición de bienes por procedimiento de selección (LP, LPA, AS, CD según cuantía).',
    baseObjeto: 'bien',
    aiFocus:
      'Procedimiento de selección de BIENES en general. Aplica RNP, garantías, penalidades. Cláusulas técnicas detalladas: características, forma de entrega, cantidad, garantía comercial. Advierte direccionamiento si hay marca.',
  },
  sel_bien_estandarizado_sie: {
    key: 'sel_bien_estandarizado_sie',
    label: 'Bienes estandarizados (Subasta Inversa Electrónica)',
    description:
      'Bienes con ficha técnica estandarizada por Perú Compras — se aplica SIE.',
    baseObjeto: 'bien',
    aiFocus:
      'Subasta Inversa Electrónica (SIE) de bienes ESTANDARIZADOS. Las características se toman TEXTUALMENTE de la ficha técnica de Perú Compras — NO reformular ni añadir requisitos técnicos adicionales. Solo se compite por precio. Redactar en modo estricto para respetar la ficha.',
  },
  sel_bien_vaso_leche: {
    key: 'sel_bien_vaso_leche',
    label: 'Suministro de bienes para programa Vaso de Leche',
    description:
      'Suministro periódico de insumos para el Programa del Vaso de Leche (PVL).',
    baseObjeto: 'bien',
    aiFocus:
      'Suministro para el Programa del Vaso de Leche. Incluye cronograma de entregas periódicas (mensual), requisitos sanitarios (DIGESA / SENASA), transporte refrigerado si aplica, muestras para pruebas de laboratorio, cadena de custodia. Usa formato de Bases Estándar de PVL.',
  },

  // ══ II.2. Servicios ══
  sel_serv_general: {
    key: 'sel_serv_general',
    label: 'Servicios en general',
    description:
      'Prestación de servicios (mantenimiento, limpieza, vigilancia, etc.).',
    baseObjeto: 'servicio',
    aiFocus:
      'Procedimiento de selección de SERVICIOS en general. Cláusulas: perfil del personal clave con formación + experiencia + capacitación, entregables, cronograma, SCTR y protocolos de seguridad, garantías y penalidades por incumplimiento de personal.',
  },
  sel_serv_consultoria: {
    key: 'sel_serv_consultoria',
    label: 'Servicios de consultoría en general',
    description:
      'Consultoría profesional para asesoría técnica, jurídica o especializada (distinta a consultoría de obra).',
    baseObjeto: 'servicio',
    aiFocus:
      'Consultoría en general (no de obra). Enfoque en perfil profesional altamente calificado, experiencia específica, entregables como informes técnicos, propiedad intelectual del entregable, confidencialidad. Formación de posgrado usualmente requerida.',
  },
  sel_serv_mantenimiento_vial: {
    key: 'sel_serv_mantenimiento_vial',
    label: 'Servicios de mantenimiento vial',
    description:
      'Mantenimiento rutinario o periódico de carreteras (obligatorio sistema de entrega Gestión de Instalaciones).',
    baseObjeto: 'servicio',
    aiFocus:
      'Servicio de mantenimiento vial. OBLIGATORIO sistema de entrega "Gestión de Instalaciones" (Art. 129). Incluye elaboración del Plan de Gestión Vial, cuadrillas por tramo, cronograma de intervenciones, niveles de servicio (IRI, densidad de baches, etc.), operación de peajes si aplica, provisión de bienes complementarios.',
  },
  sel_serv_expertos_gerentes: {
    key: 'sel_serv_expertos_gerentes',
    label: 'Contratación de expertos y gerentes de proyectos',
    description:
      'Contratación de expertos técnicos y gerentes de proyectos para gestión especializada.',
    baseObjeto: 'servicio',
    aiFocus:
      'Contratación de EXPERTOS o GERENTES DE PROYECTOS. Uso del procedimiento Selección de Expertos (Art. XX). Perfil de alto nivel: título profesional + experiencia gerencial de X años en proyectos similares, formación de posgrado (Maestría/PMP/PRINCE2), rol de decisión ejecutiva sobre el proyecto. Entregables asociados al ciclo de vida del proyecto.',
  },

  // ══ II.3. Consultoría de Obras ══
  sel_cobra_supervision_obra: {
    key: 'sel_cobra_supervision_obra',
    label: 'Supervisión de obras',
    description:
      'Supervisión técnica de la ejecución de una obra pública.',
    baseObjeto: 'consultoria_obra',
    aiFocus:
      'Supervisión de OBRAS. Perfil: Ingeniero Supervisor colegiado con experiencia en obras similares (por especialidad y monto). Entregables: informes mensuales de avance físico y financiero, valorizaciones, control de calidad, seguimiento de cuaderno de obra, absolución de consultas del contratista. Cuadrilla mínima según monto.',
  },
  sel_cobra_supervision_exp_tec: {
    key: 'sel_cobra_supervision_exp_tec',
    label: 'Supervisión de la elaboración de expediente técnico',
    description:
      'Supervisión de la consultoría que elabora el expediente técnico de una obra.',
    baseObjeto: 'consultoria_obra',
    aiFocus:
      'Supervisión de la ELABORACIÓN del expediente técnico. Perfil: Supervisor con experiencia en revisión de estudios definitivos. Entregables: informes de supervisión por cada entregable del consultor de estudios (anteproyecto, expediente técnico), verificación de compatibilidad con normativa técnica sectorial, control de plazos y calidad del consultor.',
  },
  sel_cobra_elab_exp_tec: {
    key: 'sel_cobra_elab_exp_tec',
    label: 'Elaboración de expediente técnico',
    description:
      'Elaboración del expediente técnico definitivo para la ejecución de una obra.',
    baseObjeto: 'consultoria_obra',
    aiFocus:
      'ELABORACIÓN de expediente técnico. Perfil: Ingeniero Jefe de Proyecto colegiado + equipo multidisciplinario (estructuras, hidráulica, eléctrica, sanitaria, arquitectura según obra). Entregables: expediente técnico completo con memoria descriptiva, planos, especificaciones técnicas, metrados, presupuesto, cronograma, estudios de suelos, EIA si aplica.',
  },
  sel_cobra_elab_ficha_tec: {
    key: 'sel_cobra_elab_ficha_tec',
    label: 'Elaboración de ficha técnica y/o estudio de preinversión',
    description:
      'Formulación de fichas técnicas o estudios de preinversión (Invierte.pe).',
    baseObjeto: 'consultoria_obra',
    aiFocus:
      'Elaboración de FICHA TÉCNICA o estudio de PREINVERSIÓN bajo Invierte.pe (SNIP derogado). Perfil: Formulador registrado en Banco de Inversiones + equipo evaluador. Entregables: ficha técnica en formato aprobado por DGPMI, viabilidad social/técnica/ambiental, alineamiento con Programación Multianual de Inversiones (PMI).',
  },

  // ══ II.4. Ejecución de obras ══
  sel_obra_diseno_construccion: {
    key: 'sel_obra_diseno_construccion',
    label: 'Diseño y construcción',
    description:
      'Ejecución de obra con sistema de entrega llave en mano (diseño + construcción).',
    baseObjeto: 'obra',
    aiFocus:
      'Ejecución de OBRA con sistema DISEÑO Y CONSTRUCCIÓN (Art. 158). El contratista elabora expediente técnico + ejecuta la obra. Perfil: Contratista con RNP habilitado por especialidad y capacidad de contratación. Entregables: anteproyecto, expediente técnico aprobado, ejecución conforme al expediente aprobado. Riesgo asumido por el contratista (menos ampliaciones por errores de diseño).',
  },
  sel_obra_solo_construccion: {
    key: 'sel_obra_solo_construccion',
    label: 'Solo construcción',
    description:
      'Ejecución de obra con expediente técnico ya elaborado por un tercero.',
    baseObjeto: 'obra',
    aiFocus:
      'Ejecución de OBRA con sistema SOLO CONSTRUCCIÓN. Se contrata solo la ejecución física; el expediente técnico ya está aprobado. Perfil: Contratista con RNP habilitado. Entregables: obra ejecutada según expediente técnico aprobado + planos as built + memoria de fin de obra. Ampliaciones de plazo posibles por errores u omisiones del expediente (no imputable al contratista).',
  },
};

/**
 * Árbol jerárquico usado por el selector del formulario. Cada nodo tiene
 * label descriptivo y sus subtipos hijos con SUBTIPO_META completo.
 */
export interface CategoriaNode {
  key: string;
  regimen: RegimenRequerimiento;
  label: string;
  description: string;
  children: SubtipoMeta[];
}

export const CATEGORIA_TREE: Array<{
  regimen: RegimenRequerimiento;
  label: string;
  description: string;
  categorias: CategoriaNode[];
}> = [
  {
    regimen: 'menor_8uit',
    label: 'I. Contrataciones menores a 8 UIT',
    description:
      'Contratos menores (sin procedimiento formal de selección). Redacción simplificada.',
    categorias: [
      {
        key: 'menor_directo',
        regimen: 'menor_8uit',
        label: 'Tipos de contratación menor',
        description: 'Elige el tipo específico',
        children: [
          SUBTIPO_META.menor_bienes_general,
          SUBTIPO_META.menor_servicios_consultorias,
          SUBTIPO_META.menor_locadores,
        ],
      },
    ],
  },
  {
    regimen: 'seleccion',
    label: 'II. Procedimientos de Selección',
    description:
      'Licitación, Concurso, Adjudicación Simplificada, Comparación de Precios, etc. Redacción con estructura formal completa.',
    categorias: [
      {
        key: 'sel_bienes',
        regimen: 'seleccion',
        label: '1. Bienes',
        description: 'Adquisición de bienes.',
        children: [
          SUBTIPO_META.sel_bien_general,
          SUBTIPO_META.sel_bien_estandarizado_sie,
          SUBTIPO_META.sel_bien_vaso_leche,
        ],
      },
      {
        key: 'sel_servicios',
        regimen: 'seleccion',
        label: '2. Servicios',
        description: 'Contratación de servicios y consultorías (no de obra).',
        children: [
          SUBTIPO_META.sel_serv_general,
          SUBTIPO_META.sel_serv_consultoria,
          SUBTIPO_META.sel_serv_mantenimiento_vial,
          SUBTIPO_META.sel_serv_expertos_gerentes,
        ],
      },
      {
        key: 'sel_consultoria_obra',
        regimen: 'seleccion',
        label: '3. Consultoría de Obras',
        description:
          'Elaboración y supervisión de estudios y ejecución de obras.',
        children: [
          SUBTIPO_META.sel_cobra_supervision_obra,
          SUBTIPO_META.sel_cobra_supervision_exp_tec,
          SUBTIPO_META.sel_cobra_elab_exp_tec,
          SUBTIPO_META.sel_cobra_elab_ficha_tec,
        ],
      },
      {
        key: 'sel_obra',
        regimen: 'seleccion',
        label: '4. Ejecución de obras',
        description: 'Ejecución física de obras públicas.',
        children: [
          SUBTIPO_META.sel_obra_diseno_construccion,
          SUBTIPO_META.sel_obra_solo_construccion,
        ],
      },
    ],
  },
];

/**
 * Devuelve el ObjectoContractual base a partir del subtipo — sirve para
 * enrutar al catálogo correcto de cláusulas existente.
 */
export function getBaseObjeto(subtipo: SubtipoRequerimiento): ObjectoContractual {
  return SUBTIPO_META[subtipo].baseObjeto;
}

/**
 * Devuelve el hint focalizado para el prompt de IA según el subtipo.
 * Se antepone al AI_PREAMBLE común para que la IA entienda el contexto
 * específico de esta contratación.
 */
export function getAiFocus(subtipo: SubtipoRequerimiento): string {
  return SUBTIPO_META[subtipo].aiFocus;
}
