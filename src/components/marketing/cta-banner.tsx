'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CtaBanner() {
  return (
    <section className="py-24 sm:py-28 border-t border-slate-200 bg-slate-50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-8 py-16 sm:py-20 text-center"
        >
          {/* Decorative mesh + grid sobre el azul oscuro */}
          <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.15),transparent_70%),radial-gradient(40%_40%_at_85%_70%,rgba(5,131,242,0.30),transparent_60%)]" />
          <div className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

          {/* Orbe animado de fondo */}
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
          />

          <h2 className="font-semibold text-4xl sm:text-5xl tracking-[-0.025em] text-balance max-w-2xl mx-auto text-white">
            Comienza a trabajar{' '}
            <span className="bg-gradient-to-r from-white via-brand-100 to-white bg-clip-text text-transparent">
              con la normativa
            </span>
            , no contra ella
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-slate-300 text-balance">
            30 días de prueba completa, sin tarjeta de crédito. Ingresa con Google
            o Facebook y empieza en menos de un minuto.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-brand-700 hover:bg-slate-100 hover:-translate-y-0.5 shadow-2xl shadow-black/20 transition-all"
            >
              <Link href="/login">
                Empezar prueba gratuita
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/40 backdrop-blur"
            >
              <Link href="#funciones">Ver funcionalidades</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
