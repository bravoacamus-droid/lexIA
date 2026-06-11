import Link from 'next/link';
import { Check, Sparkles, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogoMark } from '@/components/brand';
import { TIERS, type TierDefinition } from '@/lib/billing/tiers';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Planes y precios',
  description:
    'Elige el plan que se ajusta a tu volumen de procedimientos. Prueba gratis 30 días sin tarjeta.',
};

function formatPrice(p: number): string {
  if (p === 0) return 'Gratis';
  return `S/ ${p.toFixed(0)}`;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-6xl py-5 flex items-center justify-between">
          <Link href="/">
            <LogoMark height={28} />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl py-14 sm:py-20 space-y-16">
        <section className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest text-brand-600 mb-3">
            Planes y precios
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight text-balance">
            Empieza gratis. Crece cuando lo necesites.
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            30 días de prueba con acceso completo, sin tarjeta de crédito. Cuando
            termine, eliges tú si continúas y con cuál plan.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t) => (
            <TierCard key={t.id} tier={t} />
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-secondary/40 p-8 text-center">
          <h2 className="font-serif text-2xl tracking-tight">
            ¿Volumen mucho mayor o necesitas integración con tus sistemas?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Para entidades, consorcios o consultoras con cartera grande tenemos
            planes a medida con SLA y soporte dedicado.
          </p>
          <Button asChild className="mt-5">
            <a href="mailto:hola@promptive.pe?subject=Consulta plan Enterprise LexIA">
              <Mail className="h-4 w-4" />
              Hablar con ventas
            </a>
          </Button>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto pt-4">
          <FaqItem
            q="¿Necesito tarjeta para empezar?"
            a="No. Los 30 días de prueba son sin tarjeta. Cuando termine, decides si quieres seguir y con qué plan."
          />
          <FaqItem
            q="¿Puedo cambiar de plan después?"
            a="Sí, desde Cuenta → Suscripción. El cambio toma efecto en el próximo ciclo."
          />
          <FaqItem
            q="¿Cómo se paga?"
            a="Con tarjeta de débito o crédito, procesado por Culqi (Visa, Mastercard, Amex, Diners). Facturamos en soles."
          />
          <FaqItem
            q="¿Mis documentos son privados?"
            a="Sí. Tu información jamás se comparte con terceros ni se usa para entrenar modelos. Está protegida con RLS de Supabase."
          />
          <FaqItem
            q="¿Qué pasa si cancelo?"
            a="Mantienes acceso hasta el final del ciclo pagado. Después tu cuenta queda en modo solo-lectura sin borrar nada."
          />
          <FaqItem
            q="¿Emiten factura?"
            a="Sí. Recibirás factura electrónica con cada cobro, a nombre de la organización que registres."
          />
        </section>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container max-w-6xl py-6 text-center text-xs text-muted-foreground">
          LexIA Contrataciones · Promptive
        </div>
      </footer>
    </div>
  );
}

function TierCard({ tier }: { tier: TierDefinition }) {
  const isContact = tier.contactSales;
  const isFree = tier.id === 'free_trial';

  return (
    <Card
      className={cn(
        'relative p-6 flex flex-col h-full',
        tier.recommended &&
          'border-brand-500 ring-2 ring-brand-500/20 shadow-glow',
      )}
    >
      {tier.recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Sparkles className="h-3 w-3" />
          Recomendado
        </Badge>
      )}
      <div className="mb-5">
        <h3 className="font-semibold text-lg">{tier.label}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {tier.tagline}
        </p>
      </div>

      <div className="mb-6">
        {isContact ? (
          <p className="text-3xl font-serif tracking-tight">A medida</p>
        ) : (
          <>
            <p className="text-3xl font-serif tracking-tight">
              {formatPrice(tier.pricePerMonthPEN)}
              {tier.pricePerMonthPEN > 0 && (
                <span className="text-sm font-sans text-muted-foreground ml-1">
                  /mes
                </span>
              )}
            </p>
            {tier.pricePerMonthPEN > 0 && (
              <p className="text-[11px] text-muted-foreground">IGV incluido</p>
            )}
          </>
        )}
      </div>

      <ul className="space-y-2 text-sm text-foreground/85 mb-7 flex-1">
        {tier.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <Check className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {isFree ? (
          <Button asChild variant="default" className="w-full">
            <Link href="/login">Empezar gratis</Link>
          </Button>
        ) : isContact ? (
          <Button asChild variant="outline" className="w-full">
            <a href="mailto:hola@promptive.pe?subject=Consulta plan Enterprise LexIA">
              Hablar con ventas
            </a>
          </Button>
        ) : (
          <Button asChild variant={tier.recommended ? 'glow' : 'default'} className="w-full">
            <Link href={`/cuenta/suscripcion?upgrade=${tier.id}`}>
              Elegir {tier.label}
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-medium text-sm mb-1">{q}</p>
      <p className="text-[13px] text-muted-foreground leading-relaxed">{a}</p>
    </div>
  );
}
