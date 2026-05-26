'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  x: number;
  y: number;
  onPick: (color: 'yellow' | 'green' | 'blue') => void;
  onClose: () => void;
}

const COLORS: Array<{ key: 'yellow' | 'green' | 'blue'; bg: string; label: string }> = [
  { key: 'yellow', bg: 'bg-yellow-300 hover:bg-yellow-400', label: 'Amarillo' },
  { key: 'green', bg: 'bg-emerald-300 hover:bg-emerald-400', label: 'Verde' },
  { key: 'blue', bg: 'bg-sky-300 hover:bg-sky-400', label: 'Azul' },
];

export function HighlightToolbar({ x, y, onPick, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        zIndex: 50,
      }}
      className="rounded-xl border border-border bg-card shadow-2xl px-2 py-1.5 flex items-center gap-1"
    >
      {COLORS.map((c) => (
        <button
          key={c.key}
          onClick={() => onPick(c.key)}
          className={`h-6 w-6 rounded-full border-2 border-white/20 ${c.bg} hover:scale-110 transition-transform`}
          aria-label={`Resaltar ${c.label}`}
        />
      ))}
      <span className="mx-1 h-4 w-px bg-border" />
      <button
        onClick={onClose}
        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center"
        aria-label="Cerrar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
