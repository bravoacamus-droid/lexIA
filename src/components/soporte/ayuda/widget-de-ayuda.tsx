'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LifeBuoy, MessageCircleQuestion, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { escucharErrores } from '@/lib/soporte/errores-recientes';
import type { CategoriaDeTicket } from '@/lib/soporte/tipos';
import { VistaConversacion, VistaInicio, VistaLista, VistaNueva, type UsuarioDelWidget } from './vistas';

/**
 * El botón flotante «Ayuda» de la plataforma (César, 29/09/2026).
 *
 * Abre un panel de chat con tres caminos: buscar en las preguntas
 * frecuentes, escribir al equipo (error, consulta, cuenta o sugerencia)
 * y seguir las conversaciones abiertas. Lo que se escribe llega a la
 * bandeja /admin/soporte, donde César contesta; la respuesta aparece
 * aquí con un aviso en el botón.
 *
 * Otras partes de la app lo abren con el evento `lexia:ayuda`
 * (p. ej. el menú de la cuenta), opcionalmente con una categoría.
 */
export type VistaDelWidget =
  | { tipo: 'inicio' }
  | { tipo: 'nueva'; categoria: CategoriaDeTicket; texto?: string }
  | { tipo: 'lista' }
  | { tipo: 'conversacion'; id: string };

export function abrirAyuda(categoria?: CategoriaDeTicket) {
  window.dispatchEvent(new CustomEvent('lexia:ayuda', { detail: { categoria } }));
}

async function pedirResumen(): Promise<{ sin_leer: number; por_atender: number | null }> {
  const r = await fetch('/api/soporte/tickets?resumen=1', { cache: 'no-store' });
  if (!r.ok) return { sin_leer: 0, por_atender: null };
  return r.json();
}

export function WidgetDeAyuda({ usuario }: { usuario: UsuarioDelWidget }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [historial, setHistorial] = useState<VistaDelWidget[]>([{ tipo: 'inicio' }]);
  const vista = historial[historial.length - 1];

  const { data: resumen } = useQuery({
    queryKey: ['soporte', 'resumen'],
    queryFn: pedirResumen,
    refetchInterval: abierto ? 15_000 : 45_000,
    staleTime: 5_000,
  });
  const sinLeer = resumen?.sin_leer ?? 0;

  const ir = useCallback((v: VistaDelWidget) => setHistorial((h) => [...h, v]), []);
  const reemplazar = useCallback((v: VistaDelWidget) => setHistorial((h) => [...h.slice(0, -1), v]), []);
  const volver = useCallback(() => setHistorial((h) => (h.length > 1 ? h.slice(0, -1) : h)), []);
  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    escucharErrores();
  }, []);

  useEffect(() => {
    function alPedir(e: Event) {
      const categoria = (e as CustomEvent<{ categoria?: CategoriaDeTicket }>).detail?.categoria;
      setHistorial(categoria ? [{ tipo: 'inicio' }, { tipo: 'nueva', categoria }] : [{ tipo: 'inicio' }]);
      setAbierto(true);
    }
    window.addEventListener('lexia:ayuda', alPedir);
    return () => window.removeEventListener('lexia:ayuda', alPedir);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto]);

  // En la bandeja del equipo el botón taparía el de enviar, y allí sobra.
  if (pathname?.startsWith('/admin/soporte')) return null;

  // Donde hay una caja de escritura fija abajo (el chat, las conversaciones
  // del generador), el botón sube por encima: si no, tapa «Enviar».
  const conCompositor = /^\/(chat|generador\/chat|generador\/conversacion)(\/|$)/.test(pathname || '');

  const titulo =
    vista.tipo === 'lista'
      ? 'Tus conversaciones'
      : vista.tipo === 'nueva'
        ? 'Nueva conversación'
        : vista.tipo === 'conversacion'
          ? 'Conversación'
          : 'Ayuda A-LexIA';

  return (
    <>
      {abierto && (
        <section
          role="dialog"
          aria-label="Ayuda de A-LexIA"
          className={cn(
            'flotante-globo fixed inset-0 z-50 flex flex-col overflow-hidden bg-background',
            'md:inset-auto md:right-6 md:w-[400px]',
            conCompositor
              ? 'md:bottom-[11.5rem] md:h-[min(620px,calc(100vh-15rem))]'
              : 'md:bottom-24 md:h-[min(660px,calc(100vh-8rem))]',
            'md:rounded-2xl md:border md:border-border md:shadow-2xl md:shadow-brand-950/20',
          )}
        >
          <header className="relative flex shrink-0 items-center gap-2 bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 px-3 py-3 text-white">
            {vista.tipo !== 'inicio' ? (
              <button
                type="button"
                onClick={volver}
                aria-label="Volver"
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <LifeBuoy className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-tight">{titulo}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Te responde el equipo de A-LexIA
              </p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar la ayuda"
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            {vista.tipo === 'inicio' && (
              <VistaInicio usuario={usuario} porAtender={resumen?.por_atender ?? null} ir={ir} cerrar={cerrar} />
            )}
            {vista.tipo === 'lista' && <VistaLista ir={ir} />}
            {vista.tipo === 'nueva' && (
              <VistaNueva
                usuario={usuario}
                categoria={vista.categoria}
                textoInicial={vista.texto}
                alCrear={(id) => reemplazar({ tipo: 'conversacion', id })}
                cerrar={cerrar}
              />
            )}
            {vista.tipo === 'conversacion' && <VistaConversacion id={vista.id} usuario={usuario} />}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar la ayuda' : sinLeer > 0 ? `Ayuda: ${sinLeer} respuesta(s) nueva(s)` : 'Abrir la ayuda'}
        className={cn(
          'flotante-entra fixed right-4 z-40 md:right-6',
          conCompositor ? 'bottom-[9.5rem] md:bottom-[7.5rem]' : 'bottom-20 md:bottom-6',
          abierto && 'hidden md:block',
        )}
        style={{ animationDelay: '1.2s', marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {sinLeer > 0 && !abierto && (
          <>
            <span className="flotante-onda absolute inset-0 rounded-full bg-brand-500" aria-hidden />
            <span className="flotante-onda-2 absolute inset-0 rounded-full bg-brand-500" aria-hidden />
          </>
        )}
        <span
          className={cn(
            'relative flex h-12 items-center gap-2 rounded-full text-white shadow-lg shadow-brand-900/30 ring-4 ring-background transition-all duration-200 hover:scale-105 active:scale-95',
            'bg-gradient-to-br from-brand-500 to-brand-700',
            abierto ? 'w-12 justify-center' : 'pl-3.5 pr-4',
          )}
        >
          {abierto ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <MessageCircleQuestion className="flotante-saluda h-5 w-5" />
              <span className="text-[14px] font-semibold tracking-tight">Ayuda</span>
            </>
          )}
        </span>
        {sinLeer > 0 && !abierto && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-background">
            {sinLeer}
          </span>
        )}
      </button>
    </>
  );
}
