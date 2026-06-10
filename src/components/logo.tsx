import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Adaptador legacy del logo — preserva la API pública (size + showWordmark + href)
 * que ya consumen ~10 archivos del codebase, pero renderiza los PNG corporativos
 * en public/brand/. Para componentes nuevos preferir `@/components/brand`.
 */
interface LogoProps {
  href?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** true → logo compuesto (con tagline) · false → logo mark (sin tagline) */
  showWordmark?: boolean;
}

const HEIGHTS: Record<NonNullable<LogoProps['size']>, number> = {
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
}: LogoProps) {
  const h = HEIGHTS[size];
  const src = showWordmark ? '/brand/logo-full.png' : '/brand/logo-mark.png';
  const ratio = showWordmark ? 2 : 3.137;
  const w = Math.round(h * ratio);

  const img = (
    <Image
      src={src}
      alt="LexIA Contrataciones"
      width={w}
      height={h}
      className={cn('h-auto select-none', className)}
      priority={size === 'xl'}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {img}
      </Link>
    );
  }
  return img;
}

export function LogoMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const h = HEIGHTS[size];
  return (
    <Image
      src="/brand/logo-mark.png"
      alt="LexIA"
      width={Math.round(h * 3.137)}
      height={h}
      className={cn('h-auto select-none', className)}
    />
  );
}
