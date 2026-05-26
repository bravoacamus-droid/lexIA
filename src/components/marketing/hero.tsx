'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductMockup } from '@/components/marketing/product-mockup';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 overflow-hidden">
      {/* Mesh gradient backdrop */}
      <div className="absolute inset-0 -z-10 mesh-gradient" />
      <div className="absolute inset-0 -z-10 bg-grid-light dark:bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-4xl text-center"
        >
          <Link
            href="#producto"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-400 hover:text-foreground transition-colors mb-8"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Disponible en demo privada · Junio 2026
          </Link>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl tracking-tight text-balance">
            <span className="block text-foreground">Inteligencia artificial</span>
            <span className="block">
              <span className="italic gradient-text">especializada</span>{' '}
              <span className="text-foreground">en</span>
            </span>
            <span className="block text-foreground">Contrataciones del Estado</span>
          </h1>

          <p className="mt-7 mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed text-balance">
            LexIA responde con sustento normativo real. Consulta la Ley N° 32069, su Reglamento,
            Opiniones del OSCE y Resoluciones del Tribunal en lenguaje natural — con citaciones
            verificables en cada respuesta.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" variant="glow" className="w-full sm:w-auto">
              <Link href="/login">
                Solicitar acceso
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="#funciones">
                <Sparkles className="h-4 w-4" />
                Ver funcionalidades
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Acceso por invitación · Sin tarjeta de crédito
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="mt-16 sm:mt-24 mx-auto max-w-6xl"
          id="producto"
        >
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-x-8 -inset-y-4 -z-10 rounded-3xl bg-gradient-to-r from-brand-500/20 via-violet-500/10 to-brand-500/20 blur-2xl" />
            <ProductMockup />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
