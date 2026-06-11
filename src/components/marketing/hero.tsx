'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Bot,
  FileSearch,
  MessageCircleQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductMockup } from '@/components/marketing/product-mockup';

export function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spotlight = useTransform(
    [mx, my],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}px ${y}px, rgba(5,131,242,0.12), transparent 50%)`,
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mx, my]);

  return (
    <section className="relative pt-36 pb-24 sm:pt-44 overflow-hidden bg-slate-50">
      {/* Mesh gradient + grid + spotlight que sigue al cursor */}
      <div className="absolute inset-0 -z-30 [background:radial-gradient(60%_50%_at_50%_0%,rgba(5,131,242,0.10),transparent_70%),radial-gradient(35%_45%_at_85%_30%,rgba(2,29,64,0.08),transparent_70%)]" />
      <div className="absolute inset-0 -z-20 [background-image:linear-gradient(to_right,rgba(2,29,64,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,29,64,0.06)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: spotlight }}
      />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Status pill */}
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-400 hover:bg-white hover:shadow-md hover:shadow-brand-500/10 transition-all mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Prueba gratuita de 30 días — sin tarjeta</span>
            <ArrowRight className="h-3 w-3 -mr-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>

          <h1 className="font-semibold text-5xl sm:text-6xl lg:text-7xl tracking-[-0.03em] leading-[1.02] text-balance">
            <span className="block text-slate-900">La IA al servicio de las</span>
            <span className="block bg-gradient-to-r from-brand-600 via-brand-500 to-brand-700 bg-clip-text text-transparent">
              Contrataciones del Estado
            </span>
            <span className="block text-slate-900">peruano</span>
          </h1>

          <p className="mt-7 mx-auto max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Entidades, proveedores y consultores resuelven en minutos lo que antes
            tomaba días. Chat con citas verificables, generadores de Bases, Consultas,
            Pliegos, Apelaciones y un Evaluador IA de ofertas — todo fundado en la Ley
            N° 32069 vigente.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              variant="glow"
              className="w-full sm:w-auto shadow-xl shadow-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all"
            >
              <Link href="/login">
                Empezar gratis 30 días
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-white hover:border-brand-400 hover:text-brand-700 hover:-translate-y-0.5 transition-all"
            >
              <Link href="#funciones">
                <Sparkles className="h-4 w-4" />
                Ver funcionalidades
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Sin tarjeta de crédito · Cancelas cuando quieras · 100% en español
          </p>
        </motion.div>

        {/* Mockup con badges flotantes orbitando */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="mt-20 sm:mt-28 mx-auto max-w-6xl relative"
          id="producto"
        >
          {/* Glow ring */}
          <div className="absolute -inset-x-8 -inset-y-4 -z-10 rounded-3xl bg-gradient-to-r from-brand-500/20 via-sky-400/10 to-brand-500/20 blur-3xl" />

          {/* Floating badges */}
          <FloatingBadge
            icon={MessageCircleQuestion}
            label="Cita verificable"
            sub="Art. 47 · Ley 32069"
            className="absolute -top-6 -left-4 sm:-left-12 hidden sm:flex"
            delay={0.6}
            float={{ y: [0, -8, 0], duration: 5 }}
          />
          <FloatingBadge
            icon={FileSearch}
            label="Evaluador IA"
            sub="98% concordancia"
            className="absolute -top-6 -right-4 sm:-right-12 hidden sm:flex"
            delay={0.8}
            float={{ y: [0, -10, 0], duration: 6 }}
            accent="emerald"
          />
          <FloatingBadge
            icon={Zap}
            label="3 min"
            sub="vs 3 días antes"
            className="absolute -bottom-4 left-6 sm:left-0 hidden sm:flex"
            delay={1.0}
            float={{ y: [0, -6, 0], duration: 4.5 }}
            accent="amber"
          />
          <FloatingBadge
            icon={ShieldCheck}
            label="RLS Supabase"
            sub="100% privado"
            className="absolute -bottom-4 right-6 sm:right-0 hidden sm:flex"
            delay={1.2}
            float={{ y: [0, -7, 0], duration: 5.5 }}
            accent="sky"
          />

          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
            <ProductMockup />
          </div>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-24 sm:mt-32 mx-auto max-w-4xl text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-slate-400 mb-5">
            Construida sobre las fuentes oficiales
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-brand-500" />
              Ley N° 32069
            </span>
            <span>·</span>
            <span>Reglamento DS 344-2018-EF</span>
            <span>·</span>
            <span>Directivas OECE</span>
            <span>·</span>
            <span>Resoluciones TCE</span>
            <span>·</span>
            <span>Opiniones DTN</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingBadge({
  icon: Icon,
  label,
  sub,
  className,
  delay,
  float,
  accent = 'brand',
}: {
  icon: typeof Sparkles;
  label: string;
  sub: string;
  className?: string;
  delay: number;
  float: { y: number[]; duration: number };
  accent?: 'brand' | 'emerald' | 'amber' | 'sky';
}) {
  const accents = {
    brand: 'bg-brand-100 text-brand-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: float.y,
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: {
          duration: float.duration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        },
      }}
      className={`z-10 inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-slate-900/5 ${className || ''}`}
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accents[accent]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="text-left">
        <p className="text-xs font-semibold text-slate-900 leading-tight">{label}</p>
        <p className="text-[10px] text-slate-500 leading-tight">{sub}</p>
      </div>
    </motion.div>
  );
}
