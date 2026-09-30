'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { enlaceDeWhatsApp, WHATSAPP_VISIBLE } from '@/lib/soporte/tipos';

/**
 * El botón flotante de WhatsApp de las páginas públicas (César,
 * 29/09/2026): abajo a la derecha, animado, abre la conversación con
 * quien atiende A-LexIA con un mensaje ya escrito.
 *
 * A los pocos segundos asoma un globo con una invitación; si la persona
 * lo cierra, no vuelve a salir en esta visita.
 */
const CLAVE_GLOBO = 'lexia.whatsapp.globo_cerrado';

export function BotonWhatsApp({
  mensaje = 'Hola, vengo de la web de A-LexIA y quisiera más información sobre la plataforma.',
  invitacion = '¿Tienes preguntas sobre A-LexIA? Escríbenos y te respondemos por WhatsApp.',
}: {
  mensaje?: string;
  invitacion?: string;
}) {
  const [globo, setGlobo] = useState(false);

  useEffect(() => {
    let cerrado = false;
    try {
      cerrado = sessionStorage.getItem(CLAVE_GLOBO) === '1';
    } catch {
      cerrado = false;
    }
    if (cerrado) return;
    const t = setTimeout(() => setGlobo(true), 4000);
    return () => clearTimeout(t);
  }, []);

  function cerrarGlobo() {
    setGlobo(false);
    try {
      sessionStorage.setItem(CLAVE_GLOBO, '1');
    } catch {
      // Sin almacenamiento, el globo simplemente vuelve en la próxima página.
    }
  }

  const href = enlaceDeWhatsApp(mensaje);

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex items-end gap-3 sm:bottom-6 sm:right-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {globo && (
        <div className="flotante-globo relative mb-2 hidden max-w-[260px] rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-8 text-[13px] leading-snug text-slate-700 shadow-xl shadow-slate-900/10 sm:block">
          <button
            type="button"
            onClick={cerrarGlobo}
            aria-label="Cerrar"
            className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="mb-0.5 text-[12.5px] font-semibold text-slate-900">Atención A-LexIA</p>
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={cerrarGlobo} className="hover:text-slate-900">
            {invitacion}
          </a>
          {/* La colita del globo, hacia el botón */}
          <span className="absolute -right-1.5 bottom-5 h-3 w-3 rotate-45 border-r border-t border-slate-200 bg-white" />
        </div>
      )}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={cerrarGlobo}
        aria-label={`Escríbenos por WhatsApp al ${WHATSAPP_VISIBLE}`}
        title={`WhatsApp ${WHATSAPP_VISIBLE}`}
        className="flotante-entra group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full sm:h-16 sm:w-16"
        style={{ animationDelay: '0.8s' }}
      >
        <span className="flotante-onda absolute inset-0 rounded-full bg-[#25D366]" aria-hidden />
        <span className="flotante-onda-2 absolute inset-0 rounded-full bg-[#25D366]" aria-hidden />
        <span
          className={cn(
            'relative flex h-full w-full items-center justify-center rounded-full bg-[#25D366] text-white',
            'shadow-lg shadow-[#25D366]/40 ring-4 ring-white/70 transition-transform duration-200',
            'group-hover:scale-110 group-hover:bg-[#1FBE5B] group-active:scale-95',
          )}
        >
          <IconoWhatsApp className="flotante-saluda h-7 w-7 sm:h-8 sm:w-8" />
        </span>
      </a>
    </div>
  );
}

/** El glifo de WhatsApp (Simple Icons, CC0). */
export function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
