import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-secondary/60',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        "before:bg-[linear-gradient(110deg,transparent_30%,hsl(var(--background)/0.5)_50%,transparent_70%)]",
        'before:bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
