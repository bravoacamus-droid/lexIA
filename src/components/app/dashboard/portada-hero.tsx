import { Companero } from '@/components/marca/companero';
import { FachadaDeFondo } from '@/components/app/sello-del-estado';

/**
 * La cabecera de la portada.
 *
 * El mockup pone al compañero delante del Palacio de Gobierno. Aquí el
 * fondo es un dibujo propio —el pórtico con columnas, en silueta— en vez
 * de una fotografía: no hay que pedir derechos de una imagen, pesa nada
 * y se comporta igual en tema claro y oscuro.
 */
export function PortadaHero({ nombre }: { nombre: string }) {
  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const conMayuscula = hoy.charAt(0).toUpperCase() + hoy.slice(1);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-background to-background px-5 py-6 sm:px-8 sm:py-8 dark:border-brand-900/60 dark:from-brand-950/40">
      {/* el pórtico del Palacio, al fondo y a la derecha */}
      <FachadaDeFondo className="pointer-events-none absolute bottom-0 right-0 hidden h-[86%] w-[46%] text-brand-500/[0.13] sm:block dark:text-brand-300/[0.1]" />
      {/* el resplandor que recorta al compañero del fondo */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-1/2 hidden h-64 w-64 -translate-y-1/2 rounded-full bg-brand-400/15 blur-3xl lg:block"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{conMayuscula}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
            Hola, <span className="text-brand-500">{nombre}</span>
          </h1>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground/85 sm:text-[1.7rem]">
            ¿Qué necesitas hacer hoy?
          </p>
          <p className="mt-2 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
            A-LexIA te acompaña en tus contrataciones con inteligencia artificial especializada y
            respaldo normativo.
          </p>
        </div>

        <div className="flex shrink-0 items-end justify-center gap-4 lg:justify-end">
          <p className="hidden max-w-[150px] text-right font-serif text-[17px] italic leading-tight text-brand-600 sm:block dark:text-brand-400">
            ¡Estoy contigo en cada paso!
          </p>
          <Companero pose="saludo" estado="quieto" alto={200} prioridad />
          <ul className="hidden flex-col gap-0.5 self-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand-700/70 xl:flex dark:text-brand-300/70">
            <li>Disciplina</li>
            <li>Estrategia</li>
            <li className="text-brand-500">Resultados</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
