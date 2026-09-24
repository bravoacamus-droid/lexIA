import { cn } from '@/lib/utils';

/** Una de las tres zonas de la pantalla del expediente (sección 17). */
export function Zona({
  numero,
  titulo,
  bajada,
  children,
  className,
  accion,
}: {
  numero: string;
  titulo: string;
  bajada?: string;
  children: React.ReactNode;
  className?: string;
  accion?: React.ReactNode;
}) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5', className)} aria-label={titulo}>
      <header className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-generar-500 text-[12px] font-bold text-white">{numero}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold tracking-tight">{titulo}</h2>
          {bajada && <p className="text-[12.5px] leading-snug text-muted-foreground">{bajada}</p>}
        </div>
        {accion}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
