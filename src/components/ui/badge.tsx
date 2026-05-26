import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        success:
          'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        warning:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        danger:
          'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
        outline: 'text-foreground border-border',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
