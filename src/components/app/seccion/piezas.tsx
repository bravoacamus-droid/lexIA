import Link from 'next/link';
import { ChevronRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Las piezas que comparten los centros de sección —Consultar, Generar,
 * Evaluar— y la portada.
 *
 * Los mockups de César repiten la misma anatomía en las tres pantallas:
 * miga de pan, un encabezado con el ícono grande a la izquierda y una
 * nota del compañero a la derecha, una rejilla de tarjetas de
 * herramienta, una tira de «lo último» y una banda de confianza al pie.
 * Están aquí una sola vez para que las tres no se separen con el tiempo,
 * que es exactamente lo que pasó con la numeración del requerimiento
 * hasta que se unificó.
 */

export type Familia = 'consultar' | 'generar' | 'evaluar' | 'neutra';

/** Las clases de cada familia, en un solo sitio. */
export function tintes(familia: Familia) {
  switch (familia) {
    case 'consultar':
      return {
        texto: 'text-consultar-600 dark:text-consultar-400',
        fondoSuave: 'bg-consultar-50 dark:bg-consultar-900/30',
        borde: 'border-consultar-100 dark:border-consultar-900/60',
        solido: 'bg-consultar-500 hover:bg-consultar-600 text-white',
        degradado: 'from-consultar-600 to-consultar-500',
        anillo: 'ring-consultar-500/30',
      };
    case 'generar':
      return {
        texto: 'text-generar-600 dark:text-generar-400',
        fondoSuave: 'bg-generar-50 dark:bg-generar-900/30',
        borde: 'border-generar-100 dark:border-generar-900/60',
        solido: 'bg-generar-500 hover:bg-generar-600 text-white',
        degradado: 'from-generar-600 to-generar-500',
        anillo: 'ring-generar-500/30',
      };
    case 'evaluar':
      return {
        texto: 'text-evaluar-600 dark:text-evaluar-400',
        fondoSuave: 'bg-evaluar-50 dark:bg-evaluar-900/30',
        borde: 'border-evaluar-100 dark:border-evaluar-900/60',
        solido: 'bg-evaluar-500 hover:bg-evaluar-600 text-white',
        degradado: 'from-evaluar-600 to-evaluar-500',
        anillo: 'ring-evaluar-500/30',
      };
    default:
      return {
        texto: 'text-brand-600 dark:text-brand-400',
        fondoSuave: 'bg-brand-50 dark:bg-brand-950/40',
        borde: 'border-brand-100 dark:border-brand-900/60',
        solido: 'bg-brand-500 hover:bg-brand-600 text-white',
        degradado: 'from-brand-600 to-brand-500',
        anillo: 'ring-brand-500/30',
      };
  }
}

export function MigaDePan({
  trozos,
  className,
}: {
  trozos: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Dónde estás" className={cn('flex items-center gap-1.5 text-[13px]', className)}>
      {trozos.map((t, i) => {
        const ultimo = i === trozos.length - 1;
        return (
          <span key={`${t.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
            {t.href && !ultimo ? (
              <Link href={t.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {t.label}
              </Link>
            ) : (
              <span className={ultimo ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                {t.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * El encabezado de una sección: ícono grande, título, bajada y, opcional,
 * una pieza a la derecha (la nota del compañero o una insignia).
 */
export function EncabezadoDeSeccion({
  icono: Icono,
  familia = 'neutra',
  titulo,
  bajada,
  etiqueta,
  aside,
  className,
}: {
  icono: LucideIcon;
  familia?: Familia;
  titulo: React.ReactNode;
  bajada?: React.ReactNode;
  /** La píldora pequeña sobre el título («GENERAR»). */
  etiqueta?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  const t = tintes(familia);
  return (
    <div className={cn('flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
        <span
          className={cn(
            'hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:inline-flex',
            t.fondoSuave,
            t.borde,
          )}
        >
          <Icono className={cn('h-7 w-7', t.texto)} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          {etiqueta && (
            <span
              className={cn(
                'mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                t.fondoSuave,
                t.texto,
              )}
            >
              {etiqueta}
            </span>
          )}
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-[2.35rem] sm:leading-[1.12]">
            {titulo}
          </h1>
          {bajada && (
            <p className="mt-2 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {bajada}
            </p>
          )}
        </div>
      </div>
      {/* `min-w-0` + `max-w`: sin ellos los hijos con `shrink-0` de
          dentro —el compañero y su nota— empujaban el bloque más allá
          del ancho de la página y el robot salía cortado por el
          borde, que recorta con `overflow-x-clip`. */}
      {aside && <div className="min-w-0 shrink-0 lg:max-w-[420px]">{aside}</div>}
    </div>
  );
}

/**
 * La nota que el compañero deja al lado del encabezado. En los mockups
 * es un bocadillo manuscrito; aquí es texto de verdad, para que escale,
 * se traduzca y se lea con un lector de pantalla.
 */
export function NotaDelCompanero({
  children,
  icono: Icono = ShieldCheck,
  familia = 'neutra',
  className,
}: {
  children: React.ReactNode;
  icono?: LucideIcon;
  familia?: Familia;
  className?: string;
}) {
  const t = tintes(familia);
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border bg-card px-4 py-3.5 shadow-soft',
        t.borde,
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          t.fondoSuave,
        )}
      >
        <Icono className={cn('h-4 w-4', t.texto)} strokeWidth={2} />
      </span>
      <p className="text-[13px] font-medium leading-snug text-foreground/85">{children}</p>
    </div>
  );
}

/**
 * La tarjeta grande de una herramienta. Dos acabados:
 *  · `relleno` — degradado de la familia, letra blanca. Es el de la
 *    portada, donde las tres tarjetas compiten por la atención.
 *  · `suave` — fondo de tarjeta con un filo de color. Es el de dentro de
 *    una sección, donde ya se sabe en qué familia se está.
 */
export function TarjetaDeHerramienta({
  href,
  icono: Icono,
  titulo,
  descripcion,
  familia = 'neutra',
  acabado = 'suave',
  etiqueta,
  pastillas,
  llamada,
  ilustracion,
  className,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  familia?: Familia;
  acabado?: 'relleno' | 'suave';
  etiqueta?: string;
  /** Las virtudes del pie de la tarjeta. */
  pastillas?: Array<{ icono: LucideIcon; texto: string }>;
  llamada?: string;
  ilustracion?: React.ReactNode;
  className?: string;
}) {
  const t = tintes(familia);
  const relleno = acabado === 'relleno';

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2',
        relleno
          ? cn('border-transparent bg-gradient-to-br text-white shadow-soft', t.degradado)
          : cn('bg-card shadow-soft', t.borde),
        className,
      )}
    >
      {ilustracion && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 bottom-0 top-0 flex items-center opacity-[0.16] transition-transform duration-300 group-hover:scale-105"
        >
          {ilustracion}
        </span>
      )}

      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            relleno ? 'bg-white/15 backdrop-blur-sm' : t.fondoSuave,
          )}
        >
          <Icono className={cn('h-6 w-6', relleno ? 'text-white' : t.texto)} strokeWidth={1.9} />
        </span>
        {etiqueta && (
          <span
            className={cn(
              'ml-auto rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em]',
              relleno ? 'bg-white/15 text-white/90' : cn(t.fondoSuave, t.texto),
            )}
          >
            {etiqueta}
          </span>
        )}
      </div>

      <h3
        className={cn(
          'relative mt-4 text-xl font-bold tracking-tight',
          relleno ? 'text-white' : 'text-foreground',
        )}
      >
        {titulo}
      </h3>
      <p
        className={cn(
          'relative mt-1.5 text-pretty text-[13.5px] leading-relaxed',
          relleno ? 'text-white/85' : 'text-muted-foreground',
        )}
      >
        {descripcion}
      </p>

      <div className="relative mt-4 flex-1" />

      {llamada && (
        <span
          className={cn(
            'relative inline-flex items-center gap-2 self-start rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors',
            relleno ? 'bg-white/15 text-white group-hover:bg-white/25' : t.solido,
          )}
        >
          {llamada}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}

      {pastillas && pastillas.length > 0 && (
        <div
          className={cn(
            'relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3',
            relleno ? 'border-white/20' : 'border-border',
          )}
        >
          {pastillas.map((p) => (
            <span
              key={p.texto}
              className={cn(
                'inline-flex items-center gap-1.5 text-[11.5px] font-medium',
                relleno ? 'text-white/85' : 'text-muted-foreground',
              )}
            >
              <p.icono className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
              {p.texto}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

/** La banda del pie: de dónde sale lo que dice A-LexIA. */
export function BandaDeConfianza({
  texto = 'Toda la información de A-LexIA se sustenta en la Ley N.° 32069, su reglamento y otras fuentes oficiales.',
  lemas = ['Más precisión', 'Menos tiempo', 'Mejores decisiones'],
  className,
}: {
  texto?: string;
  lemas?: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6 dark:border-brand-900/60 dark:bg-brand-950/30',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15">
          <ShieldCheck className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" strokeWidth={2} />
        </span>
        <p className="text-pretty text-[13px] font-medium text-foreground/85">{texto}</p>
      </div>
      {lemas.length > 0 && (
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
          {lemas.map((l, i) => (
            <span key={l} className="flex items-center gap-3">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-brand-400/60" />}
              <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-700/80 dark:text-brand-300/80">
                {l}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** El contenedor de página: ancho máximo y aire, iguales en todas. */
export function Pagina({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:py-8', className)}>
      {children}
    </div>
  );
}
