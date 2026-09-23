import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * La marca A-LexIA Contrataciones.
 *
 * Hay dos piezas y conviene no confundirlas:
 *
 *  · el **logotipo** (`LogoAlexia`) — isotipo + "A-LexIA CONTRATACIONES"
 *    + la línea "TU ALIADO ESTRATÉGICO EN EL ESTADO". Va en la cabecera
 *    de la barra lateral, en el login y en las páginas públicas.
 *  · el **isotipo** (`Isotipo`) — la A con el anillo orbital, sola. Va
 *    donde no cabe el nombre: la barra lateral plegada, el favicon, los
 *    avatares del asistente.
 *
 * El logotipo viene en dos versiones porque la tipografía original es
 * azul marino y desaparece sobre el fondo oscuro de la barra lateral:
 * `tono="oscuro"` usa la de letras blancas. No se resuelve con filtros
 * CSS —`brightness-0 invert` aplanaba también el isotipo y lo dejaba en
 * una silueta blanca—, sino con dos archivos.
 */

export type TonoDeFondo = 'claro' | 'oscuro';

const PROPORCION_LOGO = 1200 / 407;
const PROPORCION_ISOTIPO = 640 / 405;

interface LogoProps {
  /** Dónde lleva al pulsarlo. `null` lo deja como imagen suelta. */
  href?: string | null;
  /** Altura en píxeles del isotipo. El ancho se calcula solo. */
  alto?: number;
  /** Sobre qué fondo se va a ver. */
  tono?: TonoDeFondo;
  /** La línea "tu aliado estratégico…" va dentro del PNG; esto la recorta. */
  conLema?: boolean;
  className?: string;
  prioridad?: boolean;
}

export function LogoAlexia({
  href = '/app',
  alto = 34,
  tono = 'claro',
  conLema = true,
  className,
  prioridad = false,
}: LogoProps) {
  const archivo =
    tono === 'oscuro' ? '/marca/logo-horizontal-claro.png' : '/marca/logo-horizontal.png';
  // El lema ocupa la franja inferior del PNG (≈14 % del alto). Cuando no
  // se quiere, se recorta con un contenedor más bajo y overflow oculto,
  // que es más fiel que mantener dos archivos más.
  const altoCompleto = conLema ? alto : Math.round(alto / 0.86);
  const ancho = Math.round(altoCompleto * PROPORCION_LOGO);

  const img = (
    <span
      className={cn('inline-flex select-none overflow-hidden', className)}
      style={{ height: alto }}
    >
      <Image
        src={archivo}
        alt="A-LexIA Contrataciones"
        width={ancho}
        height={altoCompleto}
        priority={prioridad}
        className="max-w-none"
        style={{ height: altoCompleto, width: ancho }}
      />
    </span>
  );

  if (!href) return img;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="A-LexIA Contrataciones">
      {img}
    </Link>
  );
}

export function Isotipo({
  alto = 32,
  className,
  prioridad = false,
}: {
  alto?: number;
  className?: string;
  prioridad?: boolean;
}) {
  return (
    <Image
      src="/marca/isotipo.png"
      alt="A-LexIA"
      width={Math.round(alto * PROPORCION_ISOTIPO)}
      height={alto}
      priority={prioridad}
      className={cn('select-none', className)}
    />
  );
}

/**
 * El bloque de marca de la barra lateral: isotipo + nombre en texto vivo
 * + lema en dos líneas, tal como lo dibuja el mockup. Se compone con
 * texto y no con el PNG porque ahí el lema va aparte, en dos renglones,
 * y necesita heredar el color del tema.
 */
export function MarcaLateral({
  href = '/app',
  className,
}: {
  href?: string | null;
  className?: string;
}) {
  const cuerpo = (
    <span className={cn('flex flex-col items-start gap-1.5', className)}>
      <LogoAlexia href={null} alto={40} tono="oscuro" conLema={false} prioridad />
      <span className="text-[10px] font-medium leading-tight text-white/55">
        Tu aliado estratégico
        <br />
        en la contratación pública
      </span>
    </span>
  );

  if (!href) return cuerpo;
  return (
    <Link href={href} className="block" aria-label="A-LexIA Contrataciones — ir al inicio">
      {cuerpo}
    </Link>
  );
}
