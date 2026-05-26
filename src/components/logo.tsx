import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  href?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
}

export function Logo({
  href = '/',
  className,
  size = 'md',
  showWordmark = true,
}: LogoProps) {
  const sizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const content = (
    <span
      className={cn(
        'inline-flex items-baseline gap-0.5 font-serif italic tracking-tight',
        sizes[size],
        className,
      )}
    >
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-foreground">
          ex<span className="not-italic font-sans font-semibold">IA</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center">
        {content}
      </Link>
    );
  }
  return content;
}

export function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dotSize = {
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-2 w-2',
    xl: 'h-2.5 w-2.5',
  };
  return (
    <span className="inline-flex items-baseline">
      <span className="text-foreground">L</span>
      <span
        className={cn(
          'inline-block rounded-full bg-brand-600 dark:bg-brand-400 -ml-0.5 mb-0.5',
          dotSize[size],
        )}
        aria-hidden
      />
    </span>
  );
}
