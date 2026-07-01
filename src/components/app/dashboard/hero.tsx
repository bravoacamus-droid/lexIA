'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Settings,
  MessageSquare,
  FileSearch,
  ScanSearch,
  ShieldCheck,
  HardHat,
  Briefcase,
  FilePen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRoleTheme } from '@/lib/navigation/role-theme';
import type { ProfileRole } from '@/lib/auth/session';

interface Props {
  fullName: string;
  role: ProfileRole | null;
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * CTAs principales por rol — las 2 acciones más ejecutadas por cada
 * perfil según el docx de Observaciones y las conversaciones con
 * César 30/06/2026. Se muestran como botones grandes en el hero.
 */
const ROLE_CTAS: Record<
  ProfileRole,
  Array<{ icon: typeof MessageSquare; label: string; href: string; primary?: boolean }>
> = {
  entity: [
    { icon: FileSearch, label: 'Evaluar ofertas', href: '/evaluador/nuevo', primary: true },
    { icon: ScanSearch, label: 'Auditar TDR', href: '/revisor-tdr/nuevo' },
    { icon: MessageSquare, label: 'Preguntar a LexIA', href: '/chat?new=1' },
  ],
  provider: [
    { icon: ShieldCheck, label: 'Auditar mi oferta', href: '/revision-oferta/nuevo', primary: true },
    { icon: FilePen, label: 'Generar documento', href: '/generador/nuevo' },
    { icon: MessageSquare, label: 'Preguntar a LexIA', href: '/chat?new=1' },
  ],
  consultant: [
    { icon: MessageSquare, label: 'Iniciar consulta', href: '/chat?new=1', primary: true },
    { icon: Briefcase, label: 'Casos de estudio', href: '/casos' },
    { icon: Sparkles, label: 'Análisis jurisprudencial', href: '/biblioteca?type=resolucion_tce' },
  ],
};

/**
 * Rediseño completo del hero de la home (30/06/2026).
 *
 * Feedback del usuario en 2 mensajes:
 *   1. "colores específicos y estilo para cada perfil recuerda"
 *   2. "un rediseño completo a los 3 heros genéricos, mejorando la
 *       UI/UX completamente"
 *
 * El hero anterior era genérico (mismo layout, mismos colores). Ahora
 * es un componente premium con:
 *   - Fondo con gradient específico del rol (sky / amber / violet)
 *   - Grid pattern decorativo sutil
 *   - Badge grande del rol activo (con Link a cambiar en Mi Cuenta)
 *   - Saludo dinámico según hora del día
 *   - Descripción específica del rol
 *   - 3 CTAs de acciones principales del rol
 *   - Micro-animaciones staged
 */
export function DashboardHero({ fullName, role }: Props) {
  const firstName = fullName.trim().split(/\s+/)[0];
  const [client, setClient] = useState<{ greeting: string; today: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    setClient({
      greeting: greetingFor(now),
      today: format(now, "EEEE, d 'de' MMMM", { locale: es }),
    });
  }, []);

  const theme = getRoleTheme(role);
  const ctas = role ? ROLE_CTAS[role] : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border ${
        theme?.classes.softBorder || 'border-brand-500/20'
      } ${theme?.classes.gradient || 'bg-gradient-to-br from-brand-50/40 to-transparent dark:from-brand-950/30'} p-6 sm:p-8`}
    >
      {/* Grid pattern decorativo */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      {/* Blob decorativo */}
      {theme && (
        <div
          className={`absolute -top-24 -right-24 h-64 w-64 rounded-full ${theme.classes.solidBg} opacity-10 blur-3xl pointer-events-none`}
          aria-hidden
        />
      )}

      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left: greeting + description */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p
              className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground min-h-[1em]"
              suppressHydrationWarning
            >
              {client?.today || ''}
            </p>
            {theme && (
              <Link
                href="/cuenta/perfil"
                className="group inline-flex items-center gap-1"
                title="Cambiar de perfil en Mi Cuenta"
              >
                <Badge
                  variant="outline"
                  className={`gap-1.5 border ${theme.classes.softBorder} ${theme.classes.softBg} ${theme.classes.text} font-semibold group-hover:scale-105 transition-transform`}
                >
                  <theme.icon className="h-3 w-3" />
                  Modo {theme.label}
                </Badge>
                <Settings className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>

          <motion.h1
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="font-semibold text-4xl sm:text-5xl tracking-tight text-balance leading-[1.1]"
            suppressHydrationWarning
          >
            {client?.greeting || 'Hola'},{' '}
            <span className="italic gradient-text">{firstName}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-[15px] leading-relaxed max-w-xl"
          >
            {theme?.tagline ||
              '¿En qué podemos ayudarte hoy con Contrataciones del Estado?'}
          </motion.p>

          {/* CTAs por rol */}
          {ctas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-wrap items-center gap-2 pt-2"
            >
              {ctas.map((cta) => {
                const Icon = cta.icon;
                if (cta.primary) {
                  /* Feedback César 30/06/2026: "el botón Auditar mi oferta
                     no se nota sin hover, su color de texto no hace contraste".
                     Fix: usar variant="default" del Button (brand-600 nativo)
                     que garantiza contraste sobre fondos claros. El acento
                     del rol está en el ícono grande + badge del hero, no
                     en los botones. Botones consistentes en todos los
                     perfiles = usabilidad predecible. */
                  return (
                    <Button
                      key={cta.href}
                      asChild
                      size="lg"
                      variant="default"
                      className="shadow-md hover:shadow-lg"
                    >
                      <Link href={cta.href} className="gap-2 text-white">
                        <Icon className="h-4 w-4" />
                        {cta.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  );
                }
                return (
                  <Button
                    key={cta.href}
                    asChild
                    variant="outline"
                    size="lg"
                    className="bg-background/60 backdrop-blur-sm"
                  >
                    <Link href={cta.href} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {cta.label}
                    </Link>
                  </Button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Right: ícono decorativo grande */}
        {theme && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.4, type: 'spring' }}
            className="hidden lg:flex items-center justify-center shrink-0"
          >
            <div
              className={`relative h-28 w-28 rounded-3xl ${theme.classes.softBg} border ${theme.classes.softBorder} flex items-center justify-center shadow-inner`}
            >
              <theme.icon
                className={`h-14 w-14 ${theme.classes.text}`}
                strokeWidth={1.4}
              />
              <div
                className={`absolute -bottom-2 -right-2 h-6 w-6 rounded-full ${theme.classes.solidBg} border-4 border-background flex items-center justify-center`}
                title={`Modo ${theme.label} activo`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}
