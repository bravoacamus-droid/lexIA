import type { ProfileRole } from '@/lib/auth/session';

/**
 * Definiciones de las encuestas segmentadas que aparecen tras el onboarding.
 * Hay una encuesta por perfil. Cada pregunta puede ser:
 *   - single: una sola opción (radio)
 *   - multi: varias opciones (checkboxes)
 *   - text: texto libre corto
 *
 * El usuario puede saltarla; se registra como "skipped" igual.
 */

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  optional?: boolean;
}

export interface SurveyDefinition {
  slug: ProfileRole;
  title: string;
  subtitle: string;
  questions: SurveyQuestion[];
}

export const SURVEYS: Record<ProfileRole, SurveyDefinition> = {
  provider: {
    slug: 'provider',
    title: 'Cuéntanos un poco sobre tu trabajo como proveedor',
    subtitle:
      'Tus respuestas nos ayudan a priorizar funciones y a entrenar la IA en los casos reales que enfrentas. 1 minuto.',
    questions: [
      {
        id: 'tipo',
        prompt: '¿En qué te especializas?',
        type: 'multi',
        options: [
          'Bienes',
          'Servicios',
          'Obras',
          'Consultoría de obras',
          'Consultoría en general',
        ],
      },
      {
        id: 'procesos_mensuales',
        prompt: '¿Cuántos procesos de selección participas por mes en promedio?',
        type: 'single',
        options: ['1 a 3', '4 a 7', '8 a 15', 'Más de 15'],
      },
      {
        id: 'dolor_principal',
        prompt: '¿Cuál es tu mayor dolor en estos procesos?',
        type: 'single',
        options: [
          'Identificar vicios en las Bases',
          'Cumplir requisitos de calificación',
          'Formular consultas y observaciones',
          'Preparar apelaciones',
          'Cumplir plazos en ejecución contractual',
          'Otro',
        ],
      },
      {
        id: 'otros_problemas',
        prompt: '¿Algo más que quieras contarnos? (opcional)',
        type: 'text',
        optional: true,
      },
    ],
  },
  entity: {
    slug: 'entity',
    title: 'Cuéntanos sobre tu rol en la entidad',
    subtitle:
      'Tus respuestas nos ayudan a priorizar funciones y a entrenar la IA en los casos reales que enfrentas. 1 minuto.',
    questions: [
      {
        id: 'rol_interno',
        prompt: '¿Cuál es tu rol dentro de la entidad?',
        type: 'single',
        options: [
          'Área usuaria',
          'Logística / Abastecimiento',
          'Asesor legal',
          'Comité de Selección',
          'Administrador / Gerente / Titular',
          'Otro',
        ],
      },
      {
        id: 'volumen',
        prompt: '¿Cuántos procedimientos de selección conduces o gestionas al mes?',
        type: 'single',
        options: ['1 a 3', '4 a 7', '8 a 15', 'Más de 15'],
      },
      {
        id: 'dolor_principal',
        prompt: '¿Cuál es tu mayor dolor hoy?',
        type: 'single',
        options: [
          'Redactar TDR / EETT sin direccionamiento',
          'Llenar la Estrategia de Contratación con sustento',
          'Absolver consultas y observaciones',
          'Evaluar ofertas con sustento normativo',
          'Manejar ejecución contractual y modificaciones',
          'Otro',
        ],
      },
      {
        id: 'objetos',
        prompt: '¿Qué tipo de contrataciones manejas más?',
        type: 'multi',
        options: [
          'Bienes',
          'Servicios',
          'Obras',
          'Consultoría de obras',
          'Consultoría general',
        ],
      },
      {
        id: 'otros_problemas',
        prompt: '¿Algo más que quieras contarnos? (opcional)',
        type: 'text',
        optional: true,
      },
    ],
  },
  consultant: {
    slug: 'consultant',
    title: 'Cuéntanos sobre tu práctica como consultor',
    subtitle:
      'Tus respuestas nos ayudan a priorizar funciones y a entrenar la IA en los casos reales que enfrentas. 1 minuto.',
    questions: [
      {
        id: 'modalidad',
        prompt: '¿Cómo trabajas?',
        type: 'single',
        options: [
          'Asesor independiente',
          'Estudio o consultora pequeña',
          'Estudio o consultora mediana',
          'Estudio grande',
          'Capacitador / formador',
        ],
      },
      {
        id: 'clientes',
        prompt: '¿A quién asesoras principalmente?',
        type: 'multi',
        options: ['Entidades públicas', 'Proveedores', 'Ambos por igual'],
      },
      {
        id: 'casos_mensuales',
        prompt: '¿Cuántos casos atiendes por mes?',
        type: 'single',
        options: ['1 a 3', '4 a 10', '11 a 25', 'Más de 25'],
      },
      {
        id: 'que_pagarias',
        prompt: '¿Qué función ahorraría más horas a tu equipo si funcionara muy bien?',
        type: 'single',
        options: [
          'Chat con citas verificables',
          'Generación de escritos (consultas, apelaciones, descargos)',
          'Evaluación automatizada de ofertas',
          'Generación de TDR / Bases',
          'Otro',
        ],
      },
      {
        id: 'otros_problemas',
        prompt: '¿Algo más que quieras contarnos? (opcional)',
        type: 'text',
        optional: true,
      },
    ],
  },
};
