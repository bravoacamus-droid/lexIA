'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Dictar la pregunta en vez de teclearla (Web Speech API del navegador).
 *
 * César lo pidió el 30/06/2026 para el chat, y el 27/09/2026 señaló que
 * el micrófono de la portada del chat no dictaba: llevaba a «Hablando
 * con A-LexIA», que es otra cosa (una llamada). Este hook es el dictado
 * de las dos pantallas, para que un micrófono junto a un cuadro de texto
 * haga siempre lo mismo: escribir lo que se dice.
 *
 * Es gratuito y no pasa por la API de voz de Google.
 */

interface ResultadoDeVoz {
  isFinal: boolean;
  [i: number]: { transcript: string };
}
interface EventoDeVoz {
  results: { length: number; [i: number]: ResultadoDeVoz };
}
interface Reconocedor {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((e: EventoDeVoz) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function constructor(): (new () => Reconocedor) | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => Reconocedor;
    webkitSpeechRecognition?: new () => Reconocedor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useDictado(valor: string, alCambiar: (v: string) => void) {
  const [disponible, setDisponible] = useState(false);
  const [dictando, setDictando] = useState(false);
  const ref = useRef<Reconocedor | null>(null);

  useEffect(() => {
    setDisponible(constructor() !== null);
    return () => {
      try {
        ref.current?.stop();
      } catch {
        /* ya estaba detenido */
      }
    };
  }, []);

  function empezar() {
    const SR = constructor();
    if (!SR || dictando) return;
    try {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'es-PE';
      const base = valor;
      r.onstart = () => setDictando(true);
      r.onresult = (e) => {
        let final = '';
        let parcial = '';
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += `${t} `;
          else parcial += t;
        }
        const sep = base === '' || base.endsWith(' ') ? '' : ' ';
        alCambiar(`${base}${sep}${final}${parcial}`.trim());
      };
      r.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          toast.error('Permite el acceso al micrófono para dictar', {
            description: 'El navegador bloqueó el acceso.',
          });
        } else if (e.error === 'no-speech') {
          toast.info('No detectamos audio. Intenta de nuevo.');
        } else if (e.error !== 'aborted') {
          toast.error(`Error de dictado: ${e.error}`);
        }
        setDictando(false);
      };
      r.onend = () => {
        setDictando(false);
        ref.current = null;
      };
      ref.current = r;
      r.start();
    } catch {
      toast.error('No se pudo iniciar el dictado');
    }
  }

  function detener() {
    try {
      ref.current?.stop();
    } catch {
      /* ya estaba detenido */
    }
  }

  return { disponible, dictando, empezar, detener, alternar: dictando ? detener : empezar };
}
