import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoMarkProps {
  className?: string;
  /** Altura en px. Ancho calculado manteniendo el ratio del PNG. */
  height?: number;
  alt?: string;
  priority?: boolean;
}

/**
 * Variante minimalista de la marca (sin tagline, ratio ~3:1).
 * Usar en topbar, sidebar, footer, breadcrumbs y donde el espacio sea limitado.
 */
export function LogoMark({
  className,
  height = 32,
  alt = 'LexIA Contrataciones',
  priority = false,
}: LogoMarkProps) {
  // Ratio nativo del PNG: 1600×510 ≈ 3.137:1
  const width = Math.round(height * 3.137);
  return (
    <Image
      src="/brand/logo-mark.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto select-none', className)}
    />
  );
}
