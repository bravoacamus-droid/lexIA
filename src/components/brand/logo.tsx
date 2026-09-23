import { LogoAlexia } from '@/components/marca/logo-alexia';

/**
 * Adaptador de la marca anterior.
 *
 * Conserva la API que ya consumen una decena de archivos —login,
 * cabecera pública, pie, avatar del chat— pero sirve los activos nuevos
 * de `public/marca/`. Así el cambio de marca llega a todos a la vez; lo
 * nuevo debería importar directamente `@/components/marca/logo-alexia`.
 */
interface LogoProps {
  className?: string;
  /** Altura en píxeles. El ancho se calcula solo. */
  height?: number;
  alt?: string;
  priority?: boolean;
  /** Sobre fondo oscuro se usa la versión de letras blancas. */
  tono?: 'claro' | 'oscuro';
}

export function Logo({ className, height = 96, priority = false, tono = 'claro' }: LogoProps) {
  return (
    <LogoAlexia href={null} alto={height} tono={tono} conLema className={className} prioridad={priority} />
  );
}
