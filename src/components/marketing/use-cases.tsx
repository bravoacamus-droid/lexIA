'use client';

import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Building2, Briefcase, GraduationCap } from 'lucide-react';

const CASES = {
  postores: {
    title: 'Para Proveedores y Postores',
    icon: Briefcase,
    color: 'emerald',
    summary:
      'Tu equipo legal en la nube: detecta riesgos en las Bases antes de presentar y construye apelaciones sólidas en horas, no semanas.',
    bullets: [
      'Detecta requisitos críticos en las Bases antes de presentar',
      'Identifica observaciones subsanables y cómo levantarlas',
      'Redacta consultas, apelaciones y descargos con sustento normativo',
      'Encuentra precedentes del Tribunal aplicables a tu caso',
      'Trámites RNP guiados (aumento de capacidad, actualización financiera)',
      'Cambio de bienes equivalentes con justificación técnico-legal',
    ],
  },
  funcionarios: {
    title: 'Para Entidades Públicas',
    icon: Building2,
    color: 'brand',
    summary:
      'Acelera Actuaciones Preparatorias, Selección y Ejecución. Genera Bases, TDR, pliegos de absolución y resoluciones contractuales con sustento.',
    bullets: [
      'Genera TDR/EETT detectando direccionamiento a marca',
      'Bases estándar por tipo de procedimiento y objeto contractual',
      'Pliego de absolución de consultas con respuesta razonada',
      'Evaluador IA de ofertas con dictamen por requisito',
      'Resolución de contrato con plantillas oficiales actualizadas',
      'Estrategia de contratación con justificación normativa',
    ],
  },
  consultores: {
    title: 'Para Consultores Legales',
    icon: GraduationCap,
    color: 'amber',
    summary:
      'Una biblioteca jurídica viva con búsqueda semántica y herramientas de generación. Multiplica tu capacidad sin perder rigor.',
    bullets: [
      'Búsqueda semántica + textual en toda la normativa peruana',
      'Construye expedientes de defensa con citas verificables',
      'Genera documentos formales en minutos, no horas',
      'Biblioteca personal con highlights y carpetas por cliente',
      'Capacitación interna con un asistente experto siempre disponible',
      'Investigación normativa 10x más rápida',
    ],
  },
};

const COLOR_MAP = {
  brand: {
    bg: 'bg-brand-100',
    text: 'text-brand-700',
    border: 'border-brand-200',
    accent: 'from-brand-500 to-brand-600',
  },
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    accent: 'from-emerald-500 to-emerald-600',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    accent: 'from-amber-500 to-amber-600',
  },
} as const;

export function UseCases() {
  return (
    <section
      id="casos"
      className="py-24 sm:py-28 border-t border-slate-200 bg-slate-50"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-12"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-brand-600 mb-3">
            Casos de uso
          </p>
          <h2 className="font-semibold text-4xl sm:text-5xl tracking-[-0.025em] text-slate-900 text-balance">
            Pensada para cada{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
              actor
            </span>{' '}
            del sistema
          </h2>
        </motion.div>

        <Tabs defaultValue="postores" className="max-w-4xl mx-auto">
          <TabsList className="w-full grid grid-cols-3 h-auto p-1.5 bg-white border border-slate-200">
            {(Object.keys(CASES) as Array<keyof typeof CASES>).map((key) => {
              const c = CASES[key];
              const Icon = c.icon;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="py-2.5 gap-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs sm:text-sm font-semibold">
                    {key === 'postores'
                      ? 'Proveedores'
                      : key === 'funcionarios'
                        ? 'Entidades'
                        : 'Consultores'}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(CASES) as Array<keyof typeof CASES>).map((key) => {
            const c = CASES[key];
            const Icon = c.icon;
            const colors = COLOR_MAP[c.color as keyof typeof COLOR_MAP];
            return (
              <TabsContent key={key} value={key} className="mt-8">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm"
                >
                  <div className="flex items-start gap-4 mb-7">
                    <div
                      className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colors.bg} ${colors.text}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-2xl tracking-tight text-slate-900 mb-1.5">
                        {c.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                        {c.summary}
                      </p>
                    </div>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2 pt-5 border-t border-slate-200/70">
                    {c.bullets.map((b, i) => (
                      <motion.li
                        key={b}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.text}`}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="text-sm text-slate-700 leading-relaxed">
                          {b}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
}
