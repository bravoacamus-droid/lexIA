import Link from 'next/link';
import {
  Search,
  FilePlus2,
  ClipboardCheck,
  ArrowRight,
  MessageSquare,
  Mic,
  SearchCode,
  ClipboardList,
  FileSignature,
  ScanSearch,
  Users,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileRole } from '@/lib/auth/session';
import { hijosDe } from '@/lib/navigation/menu-by-role';

/**
 * Las tres tarjetas grandes de la portada: consultar, generar, evaluar.
 *
 * Son la opción 2 del mockup —las de color lleno— y no la 1, porque con
 * el color relleno los tres verbos se leen de un vistazo desde el otro
 * lado del escritorio y el recorrido de la contratación queda a la
 * vista. Los atajos del pie no están escritos a mano: salen del mismo
 * menú, así que a un proveedor le aparecen los suyos y nunca un enlace
 * que su perfil no puede abrir.
 */

const ICONOS: Record<string, LucideIcon> = {
  '/chat': MessageSquare,
  '/llamadas': Mic,
  '/buscador': SearchCode,
  '/generador/requerimiento-plantilla': ClipboardList,
  '/generador': FileSignature,
  '/revisor-tdr': ScanSearch,
  '/evaluador': Users,
  '/revision-oferta': ShieldCheck,
};

/** Rótulos cortos para los atajos del pie: en la tarjeta no cabe el largo. */
const CORTOS: Record<string, string> = {
  '/chat': 'Pregunta a A-LexIA',
  '/llamadas': 'Consulta por voz',
  '/buscador': 'Búsqueda avanzada',
  '/generador/requerimiento-plantilla': 'Requerimientos',
  '/generador': 'Documentos administrativos',
  '/revisor-tdr': 'Requerimiento',
  '/evaluador': 'Ofertas',
  '/revision-oferta': 'Mi oferta',
};

interface Verbo {
  href: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  degradado: string;
}

const VERBOS: Verbo[] = [
  {
    href: '/consultar',
    titulo: 'Consultar',
    descripcion: 'Resuelve tus dudas o encuentra normativa de contratación pública.',
    icono: Search,
    degradado: 'from-consultar-700 via-consultar-600 to-consultar-500',
  },
  {
    href: '/generar',
    titulo: 'Generar',
    descripcion: 'Crea requerimientos y documentos para todas las etapas de la contratación.',
    icono: FilePlus2,
    degradado: 'from-generar-700 via-generar-600 to-generar-500',
  },
  {
    href: '/evaluar',
    titulo: 'Evaluar',
    descripcion: 'Analiza bases, consultas, observaciones y ofertas de manera objetiva.',
    icono: ClipboardCheck,
    degradado: 'from-evaluar-700 via-evaluar-600 to-evaluar-500',
  },
];

export function TarjetasDeVerbo({ role }: { role: ProfileRole | null }) {
  const visibles = VERBOS.map((v) => ({ verbo: v, atajos: hijosDe(v.href, role) })).filter(
    (x) => x.atajos.length > 0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {visibles.map(({ verbo, atajos }) => {
        const Icono = verbo.icono;
        return (
          <div
            key={verbo.href}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-soft transition-shadow duration-200 hover:shadow-glow-strong',
              verbo.degradado,
            )}
          >
            {/* las hojas de papel del fondo */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 top-6 hidden h-40 w-40 rotate-6 rounded-xl border-2 border-white/15 bg-white/10 sm:block"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-14 top-12 hidden h-40 w-40 rotate-12 rounded-xl border-2 border-white/10 sm:block"
            />

            <Link href={verbo.href} className="relative flex items-center gap-3">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm transition-transform group-hover:scale-105">
                <Icono className="h-7 w-7" strokeWidth={1.9} />
              </span>
              <span className="text-[1.7rem] font-extrabold uppercase tracking-tight">
                {verbo.titulo}
              </span>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>

            <p className="relative mt-3 max-w-xs text-pretty text-[13.5px] leading-relaxed text-white/85">
              {verbo.descripcion}
            </p>

            <div className="relative mt-auto flex flex-wrap items-center gap-x-1 gap-y-2 pt-5">
              {atajos.map((a, i) => {
                const AtajoIcono = ICONOS[a.href] || a.icon;
                return (
                  <span key={a.href} className="flex items-center">
                    {i > 0 && <span className="mx-1.5 h-4 w-px bg-white/25" />}
                    <Link
                      href={a.href}
                      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white"
                    >
                      <AtajoIcono className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
                      <span className="whitespace-nowrap">{CORTOS[a.href] || a.label}</span>
                    </Link>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
