import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ClipboardCheck,
  ScanSearch,
  FileText,
  Users,
  MessagesSquare,
  ShieldCheck,
  ArrowRight,
  Lightbulb,
  Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRole } from '@/lib/auth/session';
import { Companero } from '@/components/marca/companero';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/utils';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
  TarjetaDeHerramienta,
  BandaDeConfianza,
} from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evaluar' };

/**
 * Los cuatro pasos que dibuja César, en el orden en que se recorre un
 * procedimiento de selección. Dos están construidos y dos no.
 *
 * Los cuatro se muestran igualmente, porque el valor de esta pantalla es
 * precisamente **el recorrido**: quien entra tiene que ver dónde encaja
 * lo que va a hacer. Los que faltan van marcados y no navegan —enseñar
 * el camino no es lo mismo que prometer una puerta que no existe, que es
 * lo que se reportó en el menú del proveedor.
 */
interface Paso {
  numero: string;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  href: string | null;
  llamada: string;
  /** Roles que lo ven; vacío = todos. */
  roles?: ProfileRole[];
  nota?: string;
  /** Cuando la nota lleva a algo que sí existe. */
  notaHref?: string;
}

const PASOS: Paso[] = [
  {
    numero: '01',
    titulo: 'Evaluación de requerimiento',
    descripcion:
      'Analiza el requerimiento del área usuaria, verifica su consistencia y su sustento normativo, y detecta vicios o direccionamiento.',
    icono: ScanSearch,
    href: '/revisor-tdr',
    llamada: 'Evaluar requerimiento',
    roles: ['entity', 'consultant'],
  },
  {
    numero: '02',
    titulo: 'Evaluación de bases',
    descripcion:
      'Analiza las bases administrativas o integradas e identifica inconsistencias y aspectos que requieren atención.',
    icono: FileText,
    // La revisión automática de las bases no está construida; lo que sí,
    // y es a donde lleva la nota, es formular las consultas y
    // observaciones que salen de esa revisión.
    href: null,
    llamada: 'Evaluar bases',
    nota: 'Formulación de consultas y observaciones',
    notaHref: '/evaluar/consultas',
  },
  {
    numero: '03',
    titulo: 'Evaluación de ofertas',
    descripcion:
      'Analiza las ofertas presentadas, verifica el cumplimiento de los requisitos de admisión y calificación, y evalúa los factores conforme a las bases.',
    icono: Users,
    href: '/evaluador',
    llamada: 'Evaluar ofertas',
    roles: ['entity', 'consultant'],
  },
  {
    numero: '04',
    titulo: 'Absolución de consultas y observaciones',
    descripcion:
      'Analiza y absuelve las consultas y observaciones formuladas por los participantes, con sustento normativo.',
    icono: MessagesSquare,
    href: '/evaluar/consultas',
    llamada: 'Evaluar y absolver',
  },
];

export default async function EvaluarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_role')
    .eq('id', user.id)
    .maybeSingle();
  const rol = (profile?.profile_role as ProfileRole | null) || null;
  const esProveedor = rol === 'provider';

  const { data: recientes } = await supabase
    .from('evaluations')
    .select('id, title, mode, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const pasos = PASOS.filter((p) => !p.roles || !rol || p.roles.includes(rol));

  return (
    <Pagina>
      <MigaDePan trozos={[{ label: 'Inicio', href: '/app' }, { label: 'Evaluar' }]} />

      <EncabezadoDeSeccion
        icono={ClipboardCheck}
        familia="evaluar"
        titulo="Evaluar con A-LexIA"
        bajada="Analiza cada etapa del procedimiento de selección con sustento normativo."
        aside={
          <div className="flex items-end justify-end gap-3">
            <NotaDelCompanero icono={ShieldCheck} familia="evaluar" className="max-w-[270px]">
              A-LexIA te acompaña en todo el proceso de evaluación, con análisis normativo preciso
              y resultados confiables.
            </NotaDelCompanero>
            <Companero pose="saludo" estado="quieto" alto={118} className="hidden xl:inline-flex" />
          </div>
        }
      />

      {esProveedor ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <TarjetaDeHerramienta
            href="/revision-oferta"
            icono={ShieldCheck}
            familia="evaluar"
            titulo="Revisión de mi oferta"
            descripcion="Audita tu propia oferta antes de presentarla: qué falta, qué puede observarse y con qué sustento."
            llamada="Revisar mi oferta"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pasos.map((paso, i) => (
            <TarjetaDePaso key={paso.numero} paso={paso} ultimo={i === pasos.length - 1} />
          ))}
        </div>
      )}

      {recientes && recientes.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <header className="flex items-center gap-2.5">
            <Clock className="h-4.5 w-4.5 text-evaluar-500" strokeWidth={2} />
            <h2 className="text-[15px] font-bold tracking-tight">Tus últimas evaluaciones</h2>
          </header>
          <ul className="mt-3 divide-y divide-border">
            {recientes.map((e) => {
              const esAuditoria = e.mode === 'tdr_audit';
              return (
                <li key={e.id}>
                  <Link
                    href={`${esAuditoria ? '/revisor-tdr' : '/evaluador'}/${e.id}`}
                    className="group flex items-center gap-3 py-2.5"
                  >
                    {esAuditoria ? (
                      <ScanSearch className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13.5px] group-hover:text-evaluar-600 dark:group-hover:text-evaluar-400">
                      {e.title || 'Evaluación sin título'}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">
                      <RelativeTime date={e.created_at as string} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-evaluar-100 bg-evaluar-50/70 px-4 py-3.5 dark:border-evaluar-900/60 dark:bg-evaluar-900/20">
        <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-evaluar-600 dark:text-evaluar-400" />
        <p className="text-pretty text-[13px] leading-relaxed text-foreground/85">
          <span className="font-semibold">Consejo de A-LexIA: </span>
          evalúa primero el requerimiento y las bases. Luego, evalúa las ofertas y, finalmente,
          absuelve las consultas y observaciones para un análisis integral del procedimiento.
        </p>
      </div>

      <BandaDeConfianza lemas={['Objetividad', 'Trazabilidad', 'Sustento']} />
    </Pagina>
  );
}

/** Una tarjeta numerada del recorrido, con la flecha que lleva a la siguiente. */
function TarjetaDePaso({ paso, ultimo }: { paso: Paso; ultimo: boolean }) {
  const Icono = paso.icono;
  const disponible = paso.href !== null;

  const cuerpo = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
            disponible ? 'bg-evaluar-500 text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          {paso.numero}
        </span>
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            disponible ? 'bg-evaluar-500/12' : 'bg-muted',
          )}
        >
          <Icono
            className={cn(
              'h-5 w-5',
              disponible ? 'text-evaluar-600 dark:text-evaluar-400' : 'text-muted-foreground',
            )}
            strokeWidth={1.9}
          />
        </span>
        {!disponible && (
          <span className="ml-auto rounded-full bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Pronto
          </span>
        )}
      </div>

      <h3 className="mt-4 text-pretty text-[17px] font-bold leading-snug tracking-tight">
        {paso.titulo}
      </h3>
      {paso.nota &&
        (paso.notaHref ? (
          <Link
            href={paso.notaHref}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-evaluar-50 px-2.5 py-1.5 text-[11.5px] font-medium text-evaluar-700 transition-colors hover:bg-evaluar-100 dark:bg-evaluar-900/40 dark:text-evaluar-300 dark:hover:bg-evaluar-900/60"
          >
            {paso.nota}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <span className="mt-2 inline-flex rounded-lg bg-evaluar-50 px-2.5 py-1.5 text-[11.5px] font-medium text-evaluar-700 dark:bg-evaluar-900/40 dark:text-evaluar-300">
            {paso.nota}
          </span>
        ))}
      <p className="mt-2 flex-1 text-pretty text-[13px] leading-relaxed text-muted-foreground">
        {paso.descripcion}
      </p>

      <span
        className={cn(
          'mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold',
          disponible
            ? 'bg-evaluar-500 text-white transition-colors group-hover:bg-evaluar-600'
            : 'cursor-not-allowed bg-muted text-muted-foreground',
        )}
      >
        {paso.llamada}
        {disponible && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
    </>
  );

  const clases = cn(
    // `h-full`: sin él cada tarjeta mide lo que mide su texto y el
    // recorrido se ve como una escalera, con las flechas a distinta
    // altura.
    'group relative flex h-full flex-col rounded-2xl border bg-card p-5 shadow-soft transition-all duration-200',
    disponible
      ? 'border-evaluar-100 hover:-translate-y-0.5 hover:shadow-glow dark:border-evaluar-900/60'
      : 'border-dashed border-border opacity-80',
  );

  return (
    <div className="relative h-full">
      {disponible && paso.href ? (
        <Link href={paso.href} className={clases}>
          {cuerpo}
        </Link>
      ) : (
        <div className={clases} aria-disabled>
          {cuerpo}
        </div>
      )}
      {!ultimo && (
        <span
          aria-hidden
          className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-background xl:flex"
        >
          <ArrowRight className="h-4 w-4 text-evaluar-400" />
        </span>
      )}
    </div>
  );
}
