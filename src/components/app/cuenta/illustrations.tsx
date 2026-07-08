/**
 * Ilustraciones SVG inline para la página "Tu plan y consumo".
 * Se dibujan directamente en SVG con gradientes brand+violet para mantener
 * la página self-contained (sin dependencia de assets externos) y que la
 * paleta siempre acompañe al tema (light/dark).
 */

export function GiftIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="gift-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#0583F2" />
        </linearGradient>
        <linearGradient id="gift-lid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#3b9df2" />
        </linearGradient>
        <linearGradient id="gift-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id="gift-shine" cx="0.3" cy="0.3" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sombra difusa */}
      <ellipse cx="100" cy="175" rx="55" ry="8" fill="#0583F2" opacity="0.12" />

      {/* Caja del regalo */}
      <rect
        x="50"
        y="80"
        width="100"
        height="80"
        rx="8"
        fill="url(#gift-body)"
        transform="skewY(-2)"
      />
      <rect
        x="50"
        y="80"
        width="100"
        height="80"
        rx="8"
        fill="url(#gift-shine)"
        transform="skewY(-2)"
      />

      {/* Tapa */}
      <rect
        x="42"
        y="65"
        width="116"
        height="24"
        rx="6"
        fill="url(#gift-lid)"
      />
      <rect
        x="42"
        y="65"
        width="116"
        height="24"
        rx="6"
        fill="url(#gift-shine)"
        opacity="0.5"
      />

      {/* Cinta vertical caja */}
      <rect x="92" y="80" width="16" height="80" fill="url(#gift-ribbon)" transform="skewY(-2)" />
      {/* Cinta vertical tapa */}
      <rect x="92" y="65" width="16" height="24" fill="url(#gift-ribbon)" />

      {/* Lazo */}
      <path
        d="M100 65 C 75 40, 65 55, 78 65 L 100 65 Z"
        fill="url(#gift-ribbon)"
      />
      <path
        d="M100 65 C 125 40, 135 55, 122 65 L 100 65 Z"
        fill="url(#gift-ribbon)"
      />
      <circle cx="100" cy="65" r="6" fill="#ede9fe" />

      {/* Estrella flotante */}
      <g transform="translate(150 40)">
        <path
          d="M0 -10 L3 -3 L10 -3 L4 2 L7 10 L0 5 L-7 10 L-4 2 L-10 -3 L-3 -3 Z"
          fill="#fde047"
          stroke="#facc15"
          strokeWidth="1"
        />
      </g>
      {/* Estrellas pequeñas */}
      <circle cx="35" cy="45" r="2.5" fill="#a78bfa" />
      <circle cx="170" cy="90" r="2" fill="#3b9df2" />
      <circle cx="25" cy="120" r="1.8" fill="#0583F2" opacity="0.6" />
    </svg>
  );
}

export function TargetIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="tgt-outer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id="tgt-shaft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="175" rx="55" ry="7" fill="#7c3aed" opacity="0.12" />

      {/* Anillos concéntricos */}
      <circle cx="100" cy="100" r="65" fill="url(#tgt-outer)" />
      <circle cx="100" cy="100" r="65" fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.5" />
      <circle cx="100" cy="100" r="48" fill="#ffffff" />
      <circle cx="100" cy="100" r="48" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="32" fill="#ede9fe" />
      <circle cx="100" cy="100" r="32" fill="none" stroke="#a78bfa" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="16" fill="#8b5cf6" />
      <circle cx="100" cy="100" r="6" fill="#facc15" />

      {/* Flecha clavada */}
      <line
        x1="145"
        y1="55"
        x2="103"
        y2="97"
        stroke="url(#tgt-shaft)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Punta de flecha */}
      <path d="M100 100 L107 90 L112 96 Z" fill="#facc15" stroke="#f59e0b" strokeWidth="0.8" />

      {/* Plumas */}
      <path d="M148 52 L156 44 L162 50 L154 58 Z" fill="#7c3aed" />
      <path d="M144 56 L152 48 L158 54 L150 62 Z" fill="#a78bfa" />

      {/* Sparkles */}
      <circle cx="40" cy="60" r="2.5" fill="#8b5cf6" />
      <circle cx="165" cy="130" r="2" fill="#0583F2" opacity="0.7" />
      <circle cx="30" cy="140" r="1.5" fill="#7c3aed" opacity="0.6" />
    </svg>
  );
}

export function RocketIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="rkt-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id="rkt-fin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#0583F2" />
        </linearGradient>
        <linearGradient id="rkt-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      {/* Sombra */}
      <ellipse cx="100" cy="180" rx="35" ry="4" fill="#0583F2" opacity="0.15" />

      {/* Llama */}
      <path
        d="M85 145 Q 100 195 115 145 Q 110 165 100 155 Q 90 165 85 145 Z"
        fill="url(#rkt-flame)"
      />

      {/* Aletas */}
      <path d="M75 130 L60 155 L80 145 Z" fill="url(#rkt-fin)" />
      <path d="M125 130 L140 155 L120 145 Z" fill="url(#rkt-fin)" />

      {/* Cuerpo */}
      <path
        d="M100 30 C 80 30 75 60 75 100 L 75 140 L 125 140 L 125 100 C 125 60 120 30 100 30 Z"
        fill="url(#rkt-body)"
        stroke="#a5b4fc"
        strokeWidth="1.5"
      />

      {/* Ventana */}
      <circle cx="100" cy="80" r="12" fill="#0583F2" />
      <circle cx="100" cy="80" r="12" fill="none" stroke="#3730a3" strokeWidth="2" />
      <circle cx="96" cy="76" r="4" fill="#93c5fd" />

      {/* Detalles */}
      <line x1="75" y1="115" x2="125" y2="115" stroke="#a5b4fc" strokeWidth="1.5" />
      <circle cx="100" cy="125" r="3" fill="#c4b5fd" />

      {/* Estrellas */}
      <path d="M40 50 L42 55 L47 55 L43 58 L45 63 L40 60 L35 63 L37 58 L33 55 L38 55 Z" fill="#facc15" />
      <circle cx="160" cy="60" r="2.5" fill="#a78bfa" />
      <circle cx="30" cy="100" r="2" fill="#0583F2" opacity="0.6" />
      <circle cx="170" cy="110" r="2" fill="#8b5cf6" opacity="0.7" />
    </svg>
  );
}
