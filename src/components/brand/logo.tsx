import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Altura en px. El ancho se calcula manteniendo el ratio del PNG. */
  height?: number;
  /** Texto alt para accesibilidad. */
  alt?: string;
  /** Si es priority, Next.js precarga el asset (úsalo en hero/login). */
  priority?: boolean;
}

/**
 * Logo compuesto de LexIA (isotipo + wordmark + tagline).
 * Usar en espacios grandes: hero del landing, página de login, splashes,
 * dialogs principales. Para header/sidebar/footer usa <LogoMark />.
 */
export function Logo({
  className,
  height = 96,
  alt = 'LexIA Contrataciones — La IA a la vanguardia de las contrataciones',
  priority = false,
}: LogoProps) {
  // Ratio nativo del PNG: 1600×800 = 2:1
  const width = Math.round(height * 2);
  return (
    <Image
      src="/brand/logo-full.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto select-none', className)}
    />
  );
}
