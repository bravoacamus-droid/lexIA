'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * El compañero — el robot de A-LexIA.
 *
 * Reemplaza al logo allí donde antes había un ícono mudo: la portada, el
 * estado vacío del chat, la pantalla de voz, la espera de una redacción.
 * No es un adorno fijo: **el efecto que lo rodea dice qué está pasando**,
 * y por eso el estado es la propiedad principal.
 *
 *   quieto      · levita y respira. El reposo.
 *   pensando    · el anillo orbital gira a su alrededor. Hay trabajo en curso.
 *   hablando    · ondas concéntricas salen de él. Está respondiendo por voz.
 *   escuchando  · las ondas entran hacia él. Tiene el micrófono abierto.
 *   celebrando  · rebota y suelta destellos. Algo salió bien.
 *
 * Todo el movimiento son animaciones CSS declaradas en `tailwind.config`
 * —ninguna librería— y todas se apagan solas con `prefers-reduced-motion`,
 * que es donde el gesto deja de ser simpático y empieza a estorbar.
 */

export type PoseDelCompanero = 'saludo' | 'senala' | 'mesa';
export type EstadoDelCompanero =
  | 'quieto'
  | 'pensando'
  | 'hablando'
  | 'escuchando'
  | 'celebrando';

const POSES: Record<PoseDelCompanero, { src: string; ancho: number; alto: number; alt: string }> = {
  saludo: {
    src: '/marca/companero-saludo.png',
    ancho: 700,
    alto: 844,
    alt: 'El compañero de A-LexIA saluda con el pulgar arriba',
  },
  senala: {
    src: '/marca/companero-senala.png',
    ancho: 460,
    alto: 637,
    alt: 'El compañero de A-LexIA señala',
  },
  mesa: {
    src: '/marca/companero-mesa.png',
    ancho: 666,
    alto: 792,
    alt: 'El compañero de A-LexIA, sentado, trabaja con la normativa',
  },
};

interface Props {
  pose?: PoseDelCompanero;
  estado?: EstadoDelCompanero;
  /** Alto en píxeles. El ancho sale de la proporción de la pose. */
  alto?: number;
  /** El halo azul de fondo. Se quita cuando el compañero va sobre una tarjeta de color. */
  halo?: boolean;
  className?: string;
  prioridad?: boolean;
}

export function Companero({
  pose = 'saludo',
  estado = 'quieto',
  alto = 220,
  halo = true,
  className,
  prioridad = false,
}: Props) {
  const p = POSES[pose];
  const ancho = Math.round((alto * p.ancho) / p.alto);

  return (
    <div
      className={cn('relative inline-flex items-end justify-center', className)}
      style={{ height: alto, width: ancho }}
      data-estado={estado}
    >
      {halo && <Halo estado={estado} />}
      {estado === 'pensando' && <AnilloOrbital />}
      {(estado === 'hablando' || estado === 'escuchando') && <Ondas hacia={estado} />}
      {estado === 'celebrando' && <Destellos />}

      <Image
        src={p.src}
        alt={p.alt}
        width={p.ancho}
        height={p.alto}
        priority={prioridad}
        draggable={false}
        className={cn(
          'relative z-10 h-full w-auto select-none drop-shadow-[0_18px_28px_rgba(2,29,64,0.22)]',
          estado === 'celebrando'
            ? 'motion-safe:animate-companero-rebote'
            : 'motion-safe:animate-companero-levita',
        )}
      />
    </div>
  );
}

/** El resplandor de fondo. Cambia de color según lo que esté ocurriendo. */
function Halo({ estado }: { estado: EstadoDelCompanero }) {
  const color =
    estado === 'celebrando'
      ? 'from-emerald-400/35'
      : estado === 'escuchando'
        ? 'from-violet-400/35'
        : 'from-brand-400/35';
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2',
        'rounded-full bg-gradient-radial to-transparent blur-2xl',
        'motion-safe:animate-companero-respira',
        color,
      )}
    />
  );
}

/** El anillo del isotipo, girando: la señal de que está trabajando. */
function AnilloOrbital() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-[-6%] top-1/2 -translate-y-1/2 motion-safe:animate-companero-orbita"
      style={{ perspective: 600 }}
    >
      <span className="block h-[42%] w-full rounded-[50%] border-2 border-brand-400/70 shadow-[0_0_18px_rgba(5,131,242,0.45)] [transform:rotateX(74deg)]" />
    </span>
  );
}

/** Ondas concéntricas: salen si habla, entran si escucha. */
function Ondas({ hacia }: { hacia: 'hablando' | 'escuchando' }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border',
            hacia === 'hablando'
              ? 'border-brand-400/60 motion-safe:animate-companero-onda'
              : 'border-violet-400/60 motion-safe:animate-companero-onda-inversa',
          )}
          style={{ animationDelay: `${i * 0.55}s` }}
        />
      ))}
    </span>
  );
}

/** Destellos de celebración, repartidos a su alrededor. */
function Destellos() {
  const sitios = [
    { left: '4%', top: '18%', delay: '0s', size: 10 },
    { left: '84%', top: '10%', delay: '0.35s', size: 14 },
    { left: '92%', top: '52%', delay: '0.7s', size: 9 },
    { left: '-2%', top: '58%', delay: '1.05s', size: 12 },
    { left: '50%', top: '-4%', delay: '1.4s', size: 11 },
  ];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {sitios.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute text-amber-300 motion-safe:animate-companero-destello"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
        >
          <path
            fill="currentColor"
            d="M12 0c.6 4.9 2.5 7.4 7.4 8.1l4.6.9-4.6.9c-4.9.7-6.8 3.2-7.4 8.1-.6-4.9-2.5-7.4-7.4-8.1L0 9l4.6-.9C9.5 7.4 11.4 4.9 12 0Z"
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * La versión pequeña y plana, para los sitios donde el render 3D pesa
 * demasiado o queda ridículo: el avatar de cada mensaje del chat, el
 * botón flotante de ayuda, los listados. Es SVG, así que escala sin
 * archivo y toma el color del tema.
 */
export function CaritaCompanero({
  tamano = 28,
  className,
  animada = false,
}: {
  tamano?: number;
  className?: string;
  animada?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={tamano}
      height={tamano}
      className={cn(className, animada && 'motion-safe:animate-companero-levita')}
      role="img"
      aria-label="A-LexIA"
    >
      {/* orejeras */}
      <rect x="1" y="17" width="7" height="14" rx="3.5" className="fill-brand-500" />
      <rect x="40" y="17" width="7" height="14" rx="3.5" className="fill-brand-500" />
      {/* cabeza */}
      <rect x="6" y="6" width="36" height="36" rx="14" className="fill-brand-950" />
      <rect x="8" y="8" width="32" height="32" rx="12" className="fill-white/95 dark:fill-white/90" />
      {/* visor */}
      <rect x="11" y="15" width="26" height="17" rx="8" className="fill-brand-950" />
      {/* ojos sonrientes y boca */}
      <path
        d="M16.5 25.5a3.4 3.4 0 0 1 6 0M25.5 25.5a3.4 3.4 0 0 1 6 0"
        className="stroke-brand-400"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* la A de la frente */}
      <path
        d="M24 9.5 27.6 17h-2.2L24 14l-1.4 3h-2.2L24 9.5Z"
        className="fill-brand-500"
      />
    </svg>
  );
}
