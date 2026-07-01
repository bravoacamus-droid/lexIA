'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileSearch,
  ScanSearch,
  FilePen,
  ShieldCheck,
  HardHat,
  Briefcase,
  Sparkles,
  ArrowRight,
  Building2,
  BookOpen,
  MessageSquare,
  PhoneCall,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getRoleTheme } from '@/lib/navigation/role-theme';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  role: ProfileRole | null;
  /** Data del usuario para personalizar el widget. */
  data: {
    generatedDocsCount: number;
    savedDocsCount: number;
    evaluationsCount: number;
    voiceCallsCount: number;
  };
}

/**
 * Widget grande "Mi trabajo en LexIA" que muestra contenido específico
 * del rol activo. Rediseñado 30/06/2026 tras feedback del usuario que
 * dijo que los widgets anteriores eran genéricos y sin diferencia real
 * por perfil.
 *
 * Contenido por rol:
 * - ENTITY: acciones típicas del área usuaria / logística / evaluador
 * - PROVIDER: preparación de ofertas, apelaciones, trámites RNP
 * - CONSULTANT: análisis, jurisprudencia, casos
 *
 * Cada card interna incluye:
 * - Título de la acción
 * - Descripción específica
 * - Contador de items relacionados del usuario (si aplica)
 * - CTA claro
 */
export function RoleWidget({ role, data }: Props) {
  const theme = getRoleTheme(role);

  if (!role || !theme) {
    return null;
  }

  const sections = getWorkSections(role, data);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${theme.classes.softBg} ${theme.classes.text}`}
          >
            <theme.icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h2 className="font-semibold text-base tracking-tight leading-none">
              Mi trabajo como {theme.label.toLowerCase()}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Herramientas y accesos rápidos configurados para tu perfil
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map((section, i) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Link href={section.href} className="block h-full group">
              <Card
                className={`p-4 h-full border transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  section.primary
                    ? `${theme.classes.softBorder} ${theme.classes.softBg}`
                    : 'hover:border-brand-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                      section.primary
                        ? `${theme.classes.solidBg} text-white`
                        : 'bg-secondary text-foreground'
                    } group-hover:scale-105 transition-transform shrink-0`}
                  >
                    <section.icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {typeof section.count === 'number' && section.count > 0 && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums ${
                        section.primary
                          ? `${theme.classes.softBg} ${theme.classes.text} border ${theme.classes.softBorder}`
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {section.count}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-[14px] leading-tight mb-0.5">
                  {section.title}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {section.desc}
                </p>
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/60">
                  <span
                    className={`text-[11px] font-semibold ${
                      section.primary ? theme.classes.text : 'text-muted-foreground'
                    } group-hover:translate-x-0.5 transition-transform`}
                  >
                    {section.cta}
                  </span>
                  <ArrowRight
                    className={`h-3 w-3 ${
                      section.primary ? theme.classes.text : 'text-muted-foreground'
                    } group-hover:translate-x-0.5 transition-transform`}
                  />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

interface WorkSection {
  title: string;
  desc: string;
  href: string;
  cta: string;
  icon: typeof FileSearch;
  primary?: boolean;
  count?: number;
}

function getWorkSections(role: ProfileRole, data: Props['data']): WorkSection[] {
  const commonAsk: WorkSection = {
    title: 'Preguntar a LexIA',
    desc: 'Chat con citas verificables sobre la Ley 32069.',
    href: '/chat?new=1',
    cta: 'Iniciar conversación',
    icon: MessageSquare,
    count: undefined,
  };

  const commonCall: WorkSection = {
    title: 'Llamar al Abogado Virtual',
    desc: 'Consulta por voz con respuestas sustentadas.',
    href: '/llamadas/nueva',
    cta: 'Iniciar llamada',
    icon: PhoneCall,
    count: data.voiceCallsCount,
  };

  const commonLibrary: WorkSection = {
    title: 'Biblioteca normativa',
    desc: '371 documentos vigentes con resumen IA.',
    href: '/biblioteca',
    cta: `Ver ${data.savedDocsCount > 0 ? `${data.savedDocsCount} guardados` : 'biblioteca'}`,
    icon: BookOpen,
    count: data.savedDocsCount || undefined,
  };

  if (role === 'entity') {
    return [
      {
        title: 'Evaluar ofertas',
        desc: 'Compara las Bases Integradas con las ofertas y dictamina por requisito.',
        href: '/evaluador',
        cta: 'Nueva evaluación',
        icon: FileSearch,
        primary: true,
        count: data.evaluationsCount,
      },
      {
        title: 'Auditar TDR / EETT',
        desc: 'Detecta vicios de direccionamiento y violaciones a la libre concurrencia antes de publicar.',
        href: '/revisor-tdr',
        cta: 'Nuevo TDR',
        icon: ScanSearch,
        primary: true,
      },
      {
        title: 'Generar documento',
        desc: 'TDR, Estrategia de Contratación, Pliego de Absolución, Bases Estándar.',
        href: '/generador',
        cta: `Ver ${data.generatedDocsCount || 'generador'}`,
        icon: FilePen,
        count: data.generatedDocsCount || undefined,
      },
      commonAsk,
      commonLibrary,
      commonCall,
    ];
  }

  if (role === 'provider') {
    return [
      {
        title: 'Auditar mi oferta',
        desc: 'Antes de presentar, audita tu oferta contra las Bases del proceso.',
        href: '/revision-oferta',
        cta: 'Nueva auditoría',
        icon: ShieldCheck,
        primary: true,
      },
      {
        title: 'Generar escritos',
        desc: 'Consultas, observaciones, apelaciones, ampliación de plazo, descargo de penalidades.',
        href: '/generador',
        cta: `Ver ${data.generatedDocsCount || 'generador'}`,
        icon: FilePen,
        primary: true,
        count: data.generatedDocsCount || undefined,
      },
      {
        title: 'Trámites RNP',
        desc: 'Aumento de CMC, actualización financiera, requisitos del trámite.',
        href: '/rnp',
        cta: 'Ver trámites',
        icon: HardHat,
      },
      commonAsk,
      commonLibrary,
      commonCall,
    ];
  }

  // consultant
  return [
    {
      title: 'Casos de estudio',
      desc: 'Análisis avanzado de jurisprudencia y modelos de litigio.',
      href: '/casos',
      cta: 'Explorar casos',
      icon: Briefcase,
      primary: true,
    },
    {
      title: 'Jurisprudencia reciente',
      desc: 'Últimas resoluciones del Tribunal y pronunciamientos del OECE.',
      href: '/biblioteca?type=resolucion_tce',
      cta: 'Ver últimas',
      icon: Sparkles,
      primary: true,
    },
    {
      title: 'Análisis normativo',
      desc: 'Interpretación reciente del OECE sobre la Ley 32069 y su Reglamento.',
      href: '/biblioteca?type=opinion',
      cta: 'Ver opiniones DTN',
      icon: Building2,
    },
    commonAsk,
    commonLibrary,
    commonCall,
  ];
}
