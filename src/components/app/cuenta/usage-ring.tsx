'use client';

/**
 * Ring circular animado para "Uso total de IA" — recibe el porcentaje y
 * dibuja un anillo SVG con gradiente brand→violet. Se anima al montarse
 * con motion.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function UsageRing({
  percent,
  size = 160,
  strokeWidth = 14,
  className,
  label = 'Utilizado',
}: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0583F2" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-brand)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight tabular-nums">
          {Math.round(clamped)}%
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
}
