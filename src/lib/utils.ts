import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function groupDateLabel(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'Esta semana';
  return 'Anterior';
}

export function truncate(text: string, max = 40): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return 'LX';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const DOC_TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; tagColor: string }
> = {
  ley: {
    label: 'Ley',
    color: 'text-brand-700 dark:text-brand-300',
    bg: 'bg-brand-100 dark:bg-brand-950',
    tagColor: '#4338CA',
  },
  reglamento: {
    label: 'Reglamento',
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-100 dark:bg-violet-950',
    tagColor: '#7C3AED',
  },
  directiva: {
    label: 'Directiva',
    color: 'text-cyan-700 dark:text-cyan-300',
    bg: 'bg-cyan-100 dark:bg-cyan-950',
    tagColor: '#0891B2',
  },
  opinion: {
    label: 'Opinión',
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-100 dark:bg-sky-950',
    tagColor: '#0284C7',
  },
  pronunciamiento: {
    label: 'Pronunciamiento',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-950',
    tagColor: '#D97706',
  },
  resolucion_tce: {
    label: 'Resolución TCE',
    color: 'text-fuchsia-700 dark:text-fuchsia-300',
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-950',
    tagColor: '#C026D3',
  },
};

export function getDocTypeMeta(type: string) {
  return (
    DOC_TYPE_META[type] || {
      label: type,
      color: 'text-slate-700 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-800',
      tagColor: '#475569',
    }
  );
}

export function isDemoAllowedEmail(email: string): boolean {
  const allowed = (process.env.DEMO_ALLOWED_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(email.trim().toLowerCase());
}
