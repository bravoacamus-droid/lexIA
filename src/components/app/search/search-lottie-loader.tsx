'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

// TypeScript no conoce el web component <dotlottie-wc>. Lo declaramos
// como intrinsic element para poder usarlo en JSX sin errores.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'dotlottie-wc': any;
    }
  }
}

/**
 * Loader animado con dotLottie para el buscador inteligente.
 *
 * Feedback César 01/07/2026: reemplazar el spinner minúsculo a la
 * derecha del input por un lottie animado grande centrado debajo del
 * buscador durante la búsqueda.
 *
 * Carga el web component de dotLottie desde CDN (unpkg) mediante
 * next/script con strategy="afterInteractive" para no bloquear el
 * primer paint.
 */
export function SearchLottieLoader({
  message = 'Buscando en la base normativa…',
}: {
  message?: string;
}) {
  const [scriptReady, setScriptReady] = useState(false);

  // Fallback: si el script aún no cargó tras 800ms, mostramos un mensaje
  // simple para no dejar el layout en blanco.
  const [showFallback, setShowFallback] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFallback(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js"
        type="module"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="flex items-center justify-center w-[300px] h-[300px] max-w-full">
          {scriptReady || showFallback ? (
            <dotlottie-wc
              src="https://lottie.host/993c79dc-dc87-4d4f-a848-7ee5da96dc9a/EIB7rR5Tj2.lottie"
              style={{ width: '300px', height: '300px' }}
              autoplay
              loop
            />
          ) : (
            <div className="h-10 w-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
          )}
        </div>
        <p className="text-sm text-muted-foreground font-medium text-center">
          {message}
        </p>
      </div>
    </>
  );
}
