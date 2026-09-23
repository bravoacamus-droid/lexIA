import { cn } from '@/lib/utils';

/**
 * El edificio con columnas que cierra la barra lateral y aparece en las
 * bandas de confianza. Es un dibujo propio —no una foto— para que tome
 * el color del contexto y pese nada: la misma pieza sirve en blanco
 * translúcido sobre el azul de la barra y en azul de marca sobre fondo
 * claro.
 */
export function SelloDelEstado({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* frontón */}
      <path d="M24 5 44 16H4L24 5Z" fill="currentColor" opacity="0.9" />
      {/* arquitrabe */}
      <rect x="6" y="17.5" width="36" height="3" rx="1" fill="currentColor" opacity="0.75" />
      {/* columnas */}
      {[9.5, 17, 24.5, 32, 35.5].slice(0, 4).map((x, i) => (
        <rect
          key={i}
          x={9 + i * 8}
          y="22"
          width="5"
          height="15"
          rx="1"
          fill="currentColor"
          opacity="0.6"
        />
      ))}
      {/* basamento */}
      <rect x="4" y="38.5" width="40" height="3.2" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="1.5" y="42.7" width="45" height="2.8" rx="1.2" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

/**
 * La fachada ancha que se ve al fondo de la portada, detrás del
 * compañero: el pórtico con columnas del Palacio de Gobierno, dibujado
 * como silueta. Va apoyada en el borde inferior y es deliberadamente
 * tenue —es un fondo, no una ilustración.
 */
export function FachadaDeFondo({ className }: { className?: string }) {
  const columnas = Array.from({ length: 11 }, (_, i) => 18 + i * 16.4);
  return (
    <svg
      viewBox="0 0 220 120"
      fill="none"
      preserveAspectRatio="xMaxYMax meet"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* cuerpos laterales, más bajos */}
      <rect x="0" y="46" width="30" height="74" fill="currentColor" opacity="0.5" />
      <rect x="190" y="46" width="30" height="74" fill="currentColor" opacity="0.5" />
      {/* frontón central */}
      <path d="M110 4 196 40H24L110 4Z" fill="currentColor" opacity="0.85" />
      <rect x="20" y="40" width="180" height="7" rx="2" fill="currentColor" opacity="0.7" />
      {/* columnata */}
      {columnas.map((x) => (
        <rect key={x} x={x} y="50" width="8" height="58" rx="1.5" fill="currentColor" opacity="0.45" />
      ))}
      {/* basamento */}
      <rect x="10" y="108" width="200" height="6" rx="2" fill="currentColor" opacity="0.7" />
      <rect x="0" y="114" width="220" height="6" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
