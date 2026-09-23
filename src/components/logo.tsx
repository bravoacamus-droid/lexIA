import { LogoAlexia, Isotipo } from '@/components/marca/logo-alexia';
import { cn } from '@/lib/utils';

/**
 * Adaptador de la marca anterior.
 *
 * Conserva la API que ya consumen una decena de archivos —login,
 * cabecera pública, pie, avatar del chat— pero sirve los activos nuevos
 * de `public/marca/`. Así el cambio de marca llega a todos a la vez; lo
 * nuevo debería importar directamente `@/components/marca/logo-alexia`.
 */
interface LogoProps {
  href?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** true → logotipo con el lema · false → solo el isotipo. */
  showWordmark?: boolean;
  /** Sobre fondo oscuro, la tipografía azul marino no se lee. */
  tono?: 'claro' | 'oscuro';
}

const ALTOS: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 22,
  md: 32,
  lg: 48,
  xl: 64,
};

export function Logo({
  href = '/',
  className,
  size = 'md',
  showWordmark = true,
  tono = 'claro',
}: LogoProps) {
  const alto = ALTOS[size];
  if (!showWordmark) {
    return <Isotipo alto={alto} className={cn('select-none', className)} />;
  }
  return (
    <LogoAlexia
      href={href}
      alto={alto}
      tono={tono}
      conLema={size === 'lg' || size === 'xl'}
      className={className}
      prioridad={size === 'xl'}
    />
  );
}

/**
 * El logotipo sin el lema —isotipo + «A-LexIA CONTRATACIONES»—, que es
 * lo que esta pieza servía antes y lo que esperan las cabeceras y los
 * pies que la usan. Para el isotipo suelto está `Logo showWordmark={false}`
 * o, mejor, `Isotipo` de `@/components/marca/logo-alexia`.
 */
export function LogoMark({
  size = 'md',
  className,
  tono = 'claro',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  tono?: 'claro' | 'oscuro';
}) {
  return (
    <LogoAlexia
      href={null}
      alto={ALTOS[size]}
      tono={tono}
      conLema={false}
      className={cn('select-none', className)}
    />
  );
}
