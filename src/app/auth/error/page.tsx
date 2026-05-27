import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowLeft,
  MailQuestion,
  Clock,
  RefreshCw,
  Eye,
  Shield,
  ChevronRight,
} from 'lucide-react';

interface Props {
  searchParams: { message?: string };
}

interface ErrorVariant {
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  causes: string[];
  cta: string;
  isPkce?: boolean;
}

const VARIANTS: Record<string, ErrorVariant> = {
  pkce: {
    icon: Shield,
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-700 dark:text-amber-400',
    title: 'Abre el enlace desde el mismo navegador',
    description:
      'Por seguridad, el enlace mágico solo funciona en el navegador donde lo solicitaste. Parece que lo abriste en otro.',
    causes: [
      'Solicitaste el enlace desde tu computadora y lo abriste desde el celular (o viceversa)',
      'Tu correo (Gmail, Outlook) hizo una pre-verificación automática del enlace antes de tu clic',
      'Limpiaste cookies del sitio entre la solicitud y el clic',
    ],
    cta: 'Solicitar uno nuevo',
    isPkce: true,
  },
  expired: {
    icon: Clock,
    iconBg: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-700 dark:text-orange-400',
    title: 'Este enlace ya expiró',
    description:
      'Por seguridad los enlaces mágicos son válidos solo por 1 hora desde que los solicitas.',
    causes: ['Solicita un nuevo enlace e ingresa con él inmediatamente'],
    cta: 'Solicitar uno nuevo',
  },
  invalid: {
    icon: MailQuestion,
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-700 dark:text-red-400',
    title: 'Enlace inválido o ya usado',
    description:
      'Cada enlace mágico solo puede usarse una vez. Si ya iniciaste sesión, este enlace ya no es válido.',
    causes: ['Solicita uno nuevo si aún no has iniciado sesión'],
    cta: 'Volver al inicio',
  },
  missing: {
    icon: MailQuestion,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-700 dark:text-slate-400',
    title: 'Enlace incompleto',
    description:
      'El enlace que abriste no contiene la información necesaria. Es posible que haya sido copiado parcialmente.',
    causes: ['Vuelve a abrir el correo y haz clic directamente en el botón "Ingresar a LexIA"'],
    cta: 'Solicitar uno nuevo',
  },
  generic: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-700 dark:text-red-400',
    title: 'No pudimos iniciar tu sesión',
    description:
      'Algo salió mal al verificar tu enlace. Esto suele resolverse con un nuevo intento.',
    causes: [],
    cta: 'Solicitar uno nuevo',
  },
};

function classifyError(rawMessage: string): ErrorVariant {
  const m = rawMessage.toLowerCase();
  if (m.includes('pkce') || m.includes('code verifier')) return VARIANTS.pkce;
  if (m.includes('expired') || m.includes('expirado')) return VARIANTS.expired;
  if (m.includes('invalid') || m.includes('used') || m.includes('already')) return VARIANTS.invalid;
  if (m.includes('missing_code') || m.includes('missing')) return VARIANTS.missing;
  return VARIANTS.generic;
}

export default function AuthErrorPage({ searchParams }: Props) {
  const raw = searchParams.message || '';
  const variant = classifyError(raw);
  const Icon = variant.icon;

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 mesh-gradient opacity-30" />
      <div className="absolute inset-0 -z-10 bg-grid-light dark:bg-grid-dark opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

      <header className="container py-6">
        <Logo />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg shadow-2xl border-border/60 backdrop-blur-sm bg-card/95 p-8">
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5 ${variant.iconBg} ${variant.iconColor}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>

          <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-balance">
            {variant.title}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-balance">
            {variant.description}
          </p>

          {variant.causes.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Causas comunes
              </p>
              <ul className="space-y-1.5">
                {variant.causes.map((cause, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed">
                    <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="text-foreground/85">{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {variant.isPkce && (
            <div className="mt-4 rounded-xl border border-brand-200/60 dark:border-brand-900/60 bg-brand-50/40 dark:bg-brand-950/30 p-4">
              <div className="flex items-start gap-2.5">
                <Eye className="h-4 w-4 mt-0.5 shrink-0 text-brand-700 dark:text-brand-400" />
                <div>
                  <p className="text-xs font-semibold text-brand-900 dark:text-brand-200 mb-1">
                    Tip rápido
                  </p>
                  <p className="text-[13px] leading-relaxed text-brand-900/85 dark:text-brand-200/85">
                    Solicita el nuevo enlace y ábrelo <strong>en el mismo dispositivo y navegador</strong>{' '}
                    desde donde lo pediste. O usa <strong>modo incógnito</strong> — funciona siempre.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col sm:flex-row gap-2">
            <Button asChild variant="default" size="lg" className="flex-1">
              <Link href="/login">
                <RefreshCw className="h-4 w-4" />
                {variant.cta}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="sm:w-auto">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Inicio
              </Link>
            </Button>
          </div>

          {raw && raw !== 'missing_code' && (
            <details className="mt-6 group">
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors select-none">
                Ver detalle técnico
              </summary>
              <pre className="mt-2 rounded-md border border-border bg-secondary/40 p-3 text-[10px] font-mono text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {raw}
              </pre>
            </details>
          )}
        </Card>
      </main>

      <footer className="container py-6">
        <p className="text-center text-xs text-muted-foreground">
          ¿Necesitas ayuda? Escríbenos a{' '}
          <a href="mailto:hola@promptive.pe" className="text-foreground hover:text-brand-600 transition-colors">
            hola@promptive.pe
          </a>
        </p>
      </footer>
    </div>
  );
}
