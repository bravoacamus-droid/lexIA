'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Barra de progreso superior que se muestra durante navegaciones internas
 * de la app. Se monta una sola vez en el AppShell.
 *
 * Funcionamiento:
 *   1. Intercepta clicks en links <a href="/..."> que apunten a una ruta
 *      diferente a la actual.
 *   2. Muestra la barra animada (translate-x desde -100% hacia ~80%).
 *   3. Cuando el `pathname` o `searchParams` cambian al destino, oculta la
 *      barra (Next.js terminó la navegación). Combinado con loading.tsx
 *      el usuario ve siempre algo desde el primer ms.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  // Cierra la barra cuando la ruta cambia (la navegación terminó)
  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  // Intercepta clicks en links internos
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignora clicks con modifier (open in new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const link = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute('href') || '';
      // Solo rutas internas (empiezan con "/" pero no con "//")
      if (!href.startsWith('/') || href.startsWith('//')) return;

      // Mismo path actual: no hay navegación real
      const dest = href.split('?')[0].split('#')[0];
      if (dest === pathname) return;

      // target="_blank", download, etc.
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;

      setActive(true);
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          'h-full origin-left bg-gradient-to-r from-brand-500 via-brand-400 to-brand-500 shadow-[0_0_8px_rgba(5,131,242,0.7)]',
          active ? 'animate-nav-progress' : 'scale-x-0 opacity-0',
        )}
      />
    </div>
  );
}
