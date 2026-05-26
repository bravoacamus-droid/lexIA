'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CtaBanner() {
  return (
    <section className="py-20 sm:py-24 border-t border-border">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 sm:py-20 text-center"
        >
          <div className="absolute inset-0 -z-10 mesh-gradient opacity-60" />
          <div className="absolute inset-0 -z-10 bg-grid-light dark:bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance max-w-2xl mx-auto">
            Comienza a trabajar <span className="italic gradient-text">con la normativa</span>,
            no contra ella
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground text-balance">
            Solicita tu acceso a la demo privada de LexIA. Te enviamos un enlace de ingreso a tu
            correo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" variant="glow">
              <Link href="/login">
                Solicitar acceso
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#funciones">Ver funcionalidades</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
