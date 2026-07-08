'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Card destacada de "Habla con LexIA BETA" — feedback César 02/07/2026
 * inspirada en la referencia del cliente (mockup con card violeta/brand
 * + badge BETA + CTA con ícono de micrófono).
 *
 * Se muestra en el dashboard como CTA promocional del asistente de voz
 * para que el usuario descubra la feature. Layout compacto con:
 * - Título "Habla con LexIA" + badge BETA
 * - Descripción corta (una línea)
 * - Botón "Hablar con LexIA" con ícono Mic
 */
export function VoiceCTA() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-50 via-brand-50/60 to-violet-50 dark:from-brand-950/60 dark:via-brand-950/40 dark:to-violet-950/40 p-5 sm:p-6"
    >
      {/* Patrón decorativo */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      {/* Chispas decorativas en la esquina */}
      <Sparkles
        className="absolute top-4 right-4 h-4 w-4 text-brand-400/50 dark:text-brand-500/50"
        aria-hidden
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold tracking-tight">Habla con LexIA</h3>
            <span className="inline-flex items-center rounded-full bg-brand-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              Beta
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Cuéntanos tu consulta en lenguaje natural y nuestro asistente de voz te
            responderá con normativa citada al artículo.
          </p>
        </div>

        <Button asChild size="lg" variant="glow" className="shrink-0">
          <Link href="/llamadas/nueva">
            <Mic className="h-4 w-4" />
            Hablar con LexIA
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
