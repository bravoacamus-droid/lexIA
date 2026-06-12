'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Sparkles,
  Mail,
  Zap,
  Crown,
  Building2,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogoMark } from '@/components/brand';
import { TIERS, type TierDefinition } from '@/lib/billing/tiers';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const TIER_VISUAL: Record<
  string,
  { icon: typeof Sparkles; iconBg: string; tag: string }
> = {
  free_trial: {
    icon: Rocket,
    iconBg: 'bg-emerald-100 text-emerald-700',
    tag: 'PRUEBA',
  },
  starter: {
    icon: Zap,
    iconBg: 'bg-sky-100 text-sky-700',
    tag: 'INDIVIDUAL',
  },
  pro: {
    icon: Crown,
    iconBg: 'bg-brand-100 text-brand-700',
    tag: 'EQUIPOS',
  },
  enterprise: {
    icon: Building2,
    iconBg: 'bg-amber-100 text-amber-700',
    tag: 'CORPORATIVO',
  },
};

function formatPrice(p: number): string {
  if (p === 0) return 'Gratis';
  return `S/ ${p.toFixed(0)}`;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-x-0 top-0 h-[600px] -z-10 [background:radial-gradient(60%_50%_at_50%_0%,rgba(5,131,242,0.10),transparent_70%)]" />
      <div className="absolute inset-x-0 top-0 h-[600px] -z-10 [background-image:linear-gradient(to_right,rgba(2,29,64,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,29,64,0.05)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_top,black_0%,transparent_60%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="container max-w-6xl py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <LogoMark height={40} />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-slate-700">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm" className="shadow-md shadow-brand-500/20">
              <Link href="/login">
                Empezar gratis
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-14 sm:py-20 space-y-20 relative">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 mb-5">
            <Sparkles className="h-3 w-3" />
            Planes y precios
          </span>
          <h1 className="font-semibold text-4xl sm:text-5xl lg:text-6xl tracking-[-0.025em] text-balance leading-[1.05]">
            Empieza gratis.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
              Crece cuando lo necesites.
            </span>
          </h1>
          <p className="mt-5 text-slate-600 leading-relaxed text-balance">
            30 días con acceso completo, sin tarjeta de crédito. Cuando termine,
            eliges tú si continúas y con cuál plan.
          </p>

          {/* Toggle mensual/anual */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                billing === 'monthly'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {billing === 'monthly' && (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-slate-900"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              Mensual
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors inline-flex items-center gap-1.5',
                billing === 'annual'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {billing === 'annual' && (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-slate-900"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              Anual
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                  billing === 'annual'
                    ? 'bg-emerald-400 text-emerald-950'
                    : 'bg-emerald-100 text-emerald-700',
                )}
              >
                -20%
              </span>
            </button>
          </div>
        </motion.section>

        {/* Tier cards */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((t, i) => (
            <TierCard key={t.id} tier={t} billing={billing} index={i} />
          ))}
        </section>

        {/* Enterprise banner */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-10 sm:p-12 text-center"
        >
          <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.10),transparent_70%)]" />
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl"
          />
          <Building2 className="h-8 w-8 mx-auto mb-4 text-brand-200" />
          <h2 className="font-semibold text-2xl sm:text-3xl tracking-[-0.02em] text-white">
            ¿Volumen mayor o integración con tus sistemas?
          </h2>
          <p className="mt-3 text-sm text-slate-300 max-w-xl mx-auto">
            Para entidades, consorcios o consultoras con cartera grande tenemos
            planes a medida con SLA, multi-usuario y soporte dedicado.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-white text-brand-700 hover:bg-slate-100 shadow-2xl shadow-black/20"
          >
            <a href="mailto:hola@promptive.pe?subject=Consulta plan Enterprise LexIA">
              <Mail className="h-4 w-4" />
              Hablar con ventas
            </a>
          </Button>
        </motion.section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-[0.25em] font-semibold text-brand-600 mb-3">
              Preguntas frecuentes
            </p>
            <h2 className="font-semibold text-3xl sm:text-4xl tracking-[-0.025em] text-slate-900">
              ¿Dudas antes de empezar?
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-slate-200">
                <AccordionTrigger className="text-left text-sm sm:text-base font-semibold text-slate-900 hover:no-underline hover:text-brand-700">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-slate-600">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-slate-200 mt-10 bg-white">
        <div className="container max-w-6xl py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LogoMark height={24} />
            <span className="text-xs text-slate-500">
              · Corporación Gung Ho E.I.R.L.
            </span>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} LexIA. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function TierCard({
  tier,
  billing,
  index,
}: {
  tier: TierDefinition;
  billing: 'monthly' | 'annual';
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: -200, y: -200 });
  const isContact = tier.contactSales;
  const isFree = tier.id === 'free_trial';
  const visual = TIER_VISUAL[tier.id] || TIER_VISUAL.free_trial;
  const Icon = visual.icon;

  const monthly = tier.pricePerMonthPEN;
  const effective = billing === 'annual' ? monthly * 0.8 : monthly;

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setGlow({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setGlow({ x: -200, y: -200 })}
      className={cn(
        'group relative p-7 rounded-2xl flex flex-col h-full transition-all duration-300',
        tier.recommended
          ? 'bg-slate-900 text-white shadow-2xl shadow-brand-500/30 border border-brand-500/50 sm:scale-[1.02] hover:-translate-y-1'
          : 'bg-white border border-slate-200 overflow-hidden hover:border-slate-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5',
      )}
    >
      {/* Spotlight cursor */}
      {!tier.recommended && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `radial-gradient(300px circle at ${glow.x}px ${glow.y}px, rgba(5,131,242,0.08), transparent 60%)`,
          }}
        />
      )}

      {/* Gradient border decorativo en recommended */}
      {tier.recommended && (
        <>
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
          <div className="absolute inset-y-0 -left-px w-px bg-gradient-to-b from-transparent via-brand-500/40 to-transparent" />
          <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-brand-500/40 to-transparent" />
        </>
      )}

      {tier.recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 hover:bg-brand-500 border-0 text-white shadow-lg shadow-brand-500/40">
          <Sparkles className="h-3 w-3" />
          Más elegido
        </Badge>
      )}

      <div className="mb-5 flex items-start gap-3">
        <div
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-xl shrink-0',
            tier.recommended ? 'bg-brand-500/20 text-brand-200' : visual.iconBg,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5',
              tier.recommended ? 'text-brand-300' : 'text-slate-400',
            )}
          >
            {visual.tag}
          </p>
          <h3
            className={cn(
              'font-semibold text-lg',
              tier.recommended ? 'text-white' : 'text-slate-900',
            )}
          >
            {tier.label}
          </h3>
        </div>
      </div>

      <p
        className={cn(
          'text-xs leading-relaxed mb-6 min-h-[3em]',
          tier.recommended ? 'text-slate-300' : 'text-slate-600',
        )}
      >
        {tier.tagline}
      </p>

      <div className="mb-6">
        {isContact ? (
          <>
            <p
              className={cn(
                'text-4xl font-semibold tracking-[-0.025em]',
                tier.recommended ? 'text-white' : 'text-slate-900',
              )}
            >
              A medida
            </p>
            <p
              className={cn(
                'text-[11px] mt-1',
                tier.recommended ? 'text-slate-400' : 'text-slate-500',
              )}
            >
              Según volumen y SLA
            </p>
          </>
        ) : (
          <>
            <p
              className={cn(
                'font-semibold tracking-[-0.025em] flex items-baseline gap-1',
                tier.recommended ? 'text-white' : 'text-slate-900',
              )}
            >
              <span className="text-4xl">{formatPrice(effective)}</span>
              {effective > 0 && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    tier.recommended ? 'text-slate-300' : 'text-slate-500',
                  )}
                >
                  /mes
                </span>
              )}
            </p>
            {monthly > 0 && billing === 'annual' && (
              <p
                className={cn(
                  'text-[11px] mt-1',
                  tier.recommended ? 'text-emerald-300' : 'text-emerald-600',
                )}
              >
                Ahorras S/ {(monthly * 12 * 0.2).toFixed(0)} al año
              </p>
            )}
            {monthly > 0 && billing === 'monthly' && (
              <p
                className={cn(
                  'text-[11px] mt-1',
                  tier.recommended ? 'text-slate-400' : 'text-slate-500',
                )}
              >
                IGV incluido · facturación en soles
              </p>
            )}
          </>
        )}
      </div>

      <ul className="space-y-2.5 text-sm mb-7 flex-1">
        {tier.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                tier.recommended
                  ? 'bg-brand-500/30 text-brand-200'
                  : 'bg-brand-100 text-brand-700',
              )}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
            <span
              className={cn(
                'leading-snug',
                tier.recommended ? 'text-slate-200' : 'text-slate-700',
              )}
            >
              {h}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {isFree ? (
          <Button
            asChild
            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md"
          >
            <Link href="/login">
              Empezar gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : isContact ? (
          <Button
            asChild
            variant="outline"
            className="w-full border-slate-300 hover:bg-slate-50"
          >
            <a href="mailto:hola@promptive.pe?subject=Consulta plan Enterprise LexIA">
              Hablar con ventas
            </a>
          </Button>
        ) : (
          <Button
            asChild
            className={cn(
              'w-full',
              tier.recommended
                ? 'bg-brand-500 hover:bg-brand-400 text-white shadow-xl shadow-brand-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md',
            )}
          >
            <Link href={`/cuenta/suscripcion?upgrade=${tier.id}`}>
              Elegir {tier.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

const FAQS = [
  {
    q: '¿Necesito tarjeta para empezar?',
    a: 'No. Los 30 días de prueba son sin tarjeta. Cuando termine, decides si quieres seguir y con qué plan.',
  },
  {
    q: '¿Puedo cambiar de plan después?',
    a: 'Sí, desde Cuenta → Suscripción. El cambio toma efecto en el próximo ciclo de facturación. Si subes de plan, el prorrateo se acredita automáticamente.',
  },
  {
    q: '¿Cómo se paga?',
    a: 'Con tarjeta de débito o crédito procesada por Culqi (Visa, Mastercard, Amex, Diners). Facturamos en soles y emitimos factura electrónica.',
  },
  {
    q: '¿Mis documentos son privados?',
    a: 'Sí. Tu información jamás se comparte con terceros ni se usa para entrenar modelos. Está protegida con Row Level Security de Supabase a nivel de base de datos.',
  },
  {
    q: '¿Qué pasa si cancelo?',
    a: 'Mantienes acceso hasta el final del ciclo pagado. Después tu cuenta queda en modo solo-lectura sin borrar nada — puedes reactivarla en cualquier momento.',
  },
  {
    q: '¿Emiten factura?',
    a: 'Sí. Recibirás factura electrónica con cada cobro, a nombre de la organización que registres en tu cuenta. La emite Corporación Gung Ho E.I.R.L.',
  },
];
