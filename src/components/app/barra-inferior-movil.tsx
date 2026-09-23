'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getMenuFor } from '@/lib/navigation/menu-by-role';
import type { ProfileRole } from '@/lib/auth/session';

/**
 * La barra de abajo del móvil.
 *
 * En una pantalla de teléfono la barra lateral es un cajón que hay que
 * abrir, y los cuatro destinos que se usan todo el rato —Inicio,
 * Consultar, Generar, Evaluar— quedaban a dos toques. Aquí están a uno,
 * al alcance del pulgar, con los mismos colores de familia que en la
 * barra lateral para que no parezcan otra aplicación.
 *
 * Se alimenta del mismo menú, así que a un proveedor que no tenga
 * ninguna herramienta bajo un verbo tampoco le sale el botón.
 */
export function BarraInferiorMovil({ role }: { role: ProfileRole | null }) {
  const pathname = usePathname();

  const destinos = useMemo(() => {
    const principal = getMenuFor(role).find((s) => s.label === '');
    return (principal?.items || []).filter((i) => i.corto).slice(0, 5);
  }, [role]);

  if (destinos.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <ul className="flex">
        {destinos.map((item) => {
          const ruta = item.href.split('?')[0];
          const activo =
            ruta === '/app'
              ? pathname === '/app'
              : pathname === ruta ||
                pathname?.startsWith(`${ruta}/`) ||
                (item.hijos || []).some(
                  (h) => pathname === h.href || pathname?.startsWith(`${h.href}/`),
                );
          const Icono = item.icon;
          const tinte =
            item.color === 'consultar'
              ? 'text-consultar-600 dark:text-consultar-400'
              : item.color === 'generar'
                ? 'text-generar-600 dark:text-generar-400'
                : item.color === 'evaluar'
                  ? 'text-evaluar-600 dark:text-evaluar-400'
                  : 'text-brand-600 dark:text-brand-400';
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  activo ? tinte : 'text-muted-foreground',
                )}
                aria-current={activo ? 'page' : undefined}
              >
                <Icono className="h-[18px] w-[18px]" strokeWidth={activo ? 2.3 : 1.9} />
                <span className="truncate px-1">{item.corto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
