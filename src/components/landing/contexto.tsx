'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Estado compartido de la página pública: el modal único, la forma de pago
 * y la categoría de planes (el orientador cambia la categoría que muestran
 * las tarjetas) y la medición del recorrido.
 *
 * La medición es la de la propuesta de César, sin cambios: solo con permiso,
 * solo en este navegador (localStorage) y sin el contenido de nada de lo que
 * la persona escribe. No se envía a ningún servidor; si algún día se carga
 * Google Analytics, `window.gtag` recibe los mismos eventos.
 */

export type FormaDePago = 'monthly' | 'annual';
export type Categoria = 'personal' | 'business';
type Consentimiento = 'yes' | 'no' | null;

const CLAVE_CONSENTIMIENTO = 'alexia_measure_consent';
const CLAVE_EVENTOS = 'alexia_events';

// En modo privado o con el almacenamiento bloqueado, localStorage lanza:
// la página debe seguir funcionando igual, solo sin recordar nada.
export const almacen = {
  leer(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  guardar(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  },
  borrar(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* sin almacenamiento */
    }
  },
};

interface ValorDeLanding {
  track: (nombre: string, props?: Record<string, unknown>) => void;
  abrir: (contenido: ReactNode) => void;
  cerrar: () => void;
  formaDePago: FormaDePago;
  setFormaDePago: (f: FormaDePago) => void;
  categoria: Categoria;
  setCategoria: (c: Categoria) => void;
  fijarConsentimiento: (v: 'yes' | 'no') => void;
}

const Contexto = createContext<ValorDeLanding | null>(null);

export function useLanding() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useLanding fuera de <LandingProvider>');
  return v;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function LandingProvider({ children }: { children: ReactNode }) {
  const [formaDePago, setFormaDePago] = useState<FormaDePago>('monthly');
  const [categoria, setCategoria] = useState<Categoria>('personal');
  // null mientras no se sabe (en el servidor y el primer pintado): así el
  // banner no aparece y desaparece a quien ya decidió.
  const [mostrarBanner, setMostrarBanner] = useState(false);

  const consentimiento = useRef<Consentimiento>(null);
  const sesion = useRef('');
  const formaRef = useRef(formaDePago);
  formaRef.current = formaDePago;
  const observador = useRef<IntersectionObserver | null>(null);
  const vistas = useRef(new Set<string>());

  const track = useCallback((nombre: string, props: Record<string, unknown> = {}) => {
    if (consentimiento.current !== 'yes') return;
    const evento = { event: nombre, ...props, time: new Date().toISOString(), session: sesion.current };
    let guardados: unknown[] = [];
    try {
      guardados = JSON.parse(almacen.leer(CLAVE_EVENTOS) || '[]');
    } catch {
      guardados = [];
    }
    guardados.push(evento);
    almacen.guardar(CLAVE_EVENTOS, JSON.stringify(guardados.slice(-2000)));
    window.dispatchEvent(new CustomEvent('alexia:analytics', { detail: evento }));
    if (typeof window.gtag === 'function') window.gtag('event', nombre, props);
  }, []);

  // Una sección cuenta como vista si sigue en pantalla dos segundos después
  // de asomar: pasar de largo con la rueda no es leerla.
  const medirSecciones = useCallback(() => {
    if (!('IntersectionObserver' in window)) return;
    observador.current?.disconnect();
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          const el = e.target as HTMLElement;
          const seccion = el.dataset.section ?? '';
          if (!e.isIntersecting || vistas.current.has(seccion)) return;
          setTimeout(() => {
            const r = el.getBoundingClientRect();
            if (!vistas.current.has(seccion) && r.bottom > 0 && r.top < innerHeight) {
              vistas.current.add(seccion);
              track('section_view', { section: seccion });
            }
          }, 2000);
        });
      },
      { threshold: 0.15 },
    );
    observador.current = io;
    document.querySelectorAll('.landing-cesar .section-track').forEach((el) => io.observe(el));
  }, [track]);

  const fijarConsentimiento = useCallback(
    (v: 'yes' | 'no') => {
      consentimiento.current = v;
      almacen.guardar(CLAVE_CONSENTIMIENTO, v);
      setMostrarBanner(false);
      if (v === 'yes') {
        track('page_view', { page: 'landing' });
        medirSecciones();
      }
    },
    [track, medirSecciones],
  );

  useEffect(() => {
    sesion.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const guardado = almacen.leer(CLAVE_CONSENTIMIENTO);
    consentimiento.current = guardado === 'yes' || guardado === 'no' ? guardado : null;
    setMostrarBanner(!guardado);
    if (consentimiento.current === 'yes') {
      track('page_view', { page: 'landing' });
      medirSecciones();
    }

    // Profundidad de desplazamiento.
    const umbrales = new Set<number>();
    const alDesplazar = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max <= 0) return;
      const p = Math.round((scrollY / max) * 100);
      [25, 50, 75, 90, 100].forEach((t) => {
        if (p >= t && !umbrales.has(t)) {
          umbrales.add(t);
          track('scroll_depth', { percent: t });
        }
      });
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });

    // Tiempo activo (pestaña visible).
    let segundos = 0;
    const reloj = setInterval(() => {
      if (!document.hidden && consentimiento.current === 'yes') {
        segundos += 5;
        if ([30, 60, 120, 180].includes(segundos)) track('active_time', { seconds: segundos });
      }
    }, 5000);

    // Videos: inicio, avance real visto (no el salto con la barra) y final.
    // Además, al reproducir uno se pausan los demás.
    const avance = new WeakMap<HTMLVideoElement, { vistos: Set<number>; ultimo: number; visto: number }>();
    const idDe = (v: HTMLVideoElement) => v.dataset.videoId || 'video-sin-identificador';
    const alReproducir = (e: Event) => {
      const v = e.target as HTMLElement;
      if (v.tagName !== 'VIDEO') return;
      const video = v as HTMLVideoElement;
      document.querySelectorAll('video').forEach((otro) => {
        if (otro !== video) otro.pause();
      });
      if (!avance.has(video)) avance.set(video, { vistos: new Set(), ultimo: video.currentTime, visto: 0 });
      track('video_start', { video: idDe(video) });
    };
    const alAvanzar = (e: Event) => {
      const v = e.target as HTMLElement;
      if (v.tagName !== 'VIDEO') return;
      const video = v as HTMLVideoElement;
      const s = avance.get(video);
      if (!s || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const delta = video.currentTime - s.ultimo;
      if (!video.paused && !video.seeking && delta > 0 && delta < 2) s.visto += delta;
      s.ultimo = video.currentTime;
      const p = Math.min(100, (s.visto / video.duration) * 100);
      [25, 50, 75].forEach((nivel) => {
        if (p >= nivel && !s.vistos.has(nivel)) {
          s.vistos.add(nivel);
          track('video_progress', { video: idDe(video), percent: nivel });
        }
      });
    };
    const alTerminar = (e: Event) => {
      const v = e.target as HTMLElement;
      if (v.tagName !== 'VIDEO') return;
      const video = v as HTMLVideoElement;
      const s = avance.get(video);
      track('video_ended', {
        video: idDe(video),
        watched_percent: s && video.duration ? Math.min(100, Math.round((s.visto / video.duration) * 100)) : 0,
      });
    };
    document.addEventListener('play', alReproducir, true);
    document.addEventListener('timeupdate', alAvanzar, true);
    document.addEventListener('ended', alTerminar, true);

    // Cualquier enlace de WhatsApp de la página, venga de donde venga.
    const alHacerClic = (e: MouseEvent) => {
      const enlace = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-whatsapp]');
      if (enlace)
        track('whatsapp_click', {
          origin: enlace.dataset.whatsapp,
          video: enlace.dataset.video || null,
          plan: enlace.dataset.plan || 'general',
          billing: formaRef.current,
        });
    };
    document.addEventListener('click', alHacerClic);

    return () => {
      observador.current?.disconnect();
      window.removeEventListener('scroll', alDesplazar);
      clearInterval(reloj);
      document.removeEventListener('play', alReproducir, true);
      document.removeEventListener('timeupdate', alAvanzar, true);
      document.removeEventListener('ended', alTerminar, true);
      document.removeEventListener('click', alHacerClic);
    };
  }, [track, medirSecciones]);

  // ── El modal único (un <dialog> nativo, como en la propuesta) ──
  const dialogo = useRef<HTMLDialogElement>(null);
  const [contenido, setContenido] = useState<{ nodo: ReactNode; clave: number } | null>(null);
  const ultimoFoco = useRef<HTMLElement | null>(null);

  const abrir = useCallback((nodo: ReactNode) => {
    if (!dialogo.current?.open) ultimoFoco.current = document.activeElement as HTMLElement | null;
    setContenido({ nodo, clave: Date.now() });
  }, []);
  const cerrar = useCallback(() => dialogo.current?.close(), []);

  useEffect(() => {
    const d = dialogo.current;
    if (!d || !contenido) return;
    if (!d.open) d.showModal();
    d.querySelector<HTMLButtonElement>('.modal-close')?.focus();
  }, [contenido]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    const alCerrar = () => {
      setContenido(null);
      // Sin desplazar: si el cierre vino de «Ver planes», la página ya va
      // camino a #planes y el foco no debe arrastrarla de vuelta.
      if (ultimoFoco.current?.isConnected) ultimoFoco.current.focus({ preventScroll: true });
    };
    d.addEventListener('close', alCerrar);
    return () => d.removeEventListener('close', alCerrar);
  }, []);

  const valor = useMemo<ValorDeLanding>(
    () => ({
      track,
      abrir,
      cerrar,
      formaDePago,
      setFormaDePago,
      categoria,
      setCategoria,
      fijarConsentimiento,
    }),
    [track, abrir, cerrar, formaDePago, categoria, fijarConsentimiento],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}

      <div
        className="privacy-banner"
        id="privacy-banner"
        role="region"
        aria-label="Preferencias de medición"
        hidden={!mostrarBanner}
      >
        <p>
          ¿Permites medir tu recorrido en esta versión? Se guardan eventos de navegación en este navegador, sin
          el contenido de tus documentos.
        </p>
        <button id="analytics-accept" onClick={() => fijarConsentimiento('yes')}>
          Permitir medición
        </button>
        <button id="analytics-decline" onClick={() => fijarConsentimiento('no')}>
          Continuar sin medir
        </button>
      </div>

      <dialog
        id="modal"
        ref={dialogo}
        aria-label="Información de A-LexIA"
        onClick={(e) => {
          // Clic en el fondo oscuro (fuera de la caja) cierra; dentro, no.
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cerrar();
        }}
      >
        <button className="modal-close" aria-label="Cerrar" onClick={cerrar}>
          ×
        </button>
        <div id="modal-content" key={contenido?.clave}>
          {contenido?.nodo}
        </div>
      </dialog>
    </Contexto.Provider>
  );
}
