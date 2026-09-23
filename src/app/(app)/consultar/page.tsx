import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Search,
  MessageSquare,
  Mic,
  SearchCode,
  BadgeCheck,
  Quote,
  Clock,
  Zap,
  AudioLines,
  ListChecks,
  Filter,
  Library,
  Lightbulb,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Companero } from '@/components/marca/companero';
import {
  Pagina,
  MigaDePan,
  EncabezadoDeSeccion,
  NotaDelCompanero,
  TarjetaDeHerramienta,
  BandaDeConfianza,
} from '@/components/app/seccion/piezas';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consultar' };

/** Preguntas de arranque: las mismas que ofrece el chat vacío. */
const EJEMPLOS = [
  '¿En qué casos procede la subsanación de ofertas y cuáles son los plazos?',
  '¿Qué causales permiten solicitar una ampliación de plazo contractual?',
  '¿Cuál es el plazo para presentar apelación ante el Tribunal de Contrataciones?',
  'Explícame los requisitos para la aprobación de adicionales en una obra pública.',
  '¿Qué se considera experiencia del postor y cómo se acredita?',
  '¿Cómo se calcula una penalidad por mora y en qué casos se aplica?',
];

function cuando(iso: string): string {
  const fecha = new Date(iso);
  const hoy = new Date();
  const mismoDia = fecha.toDateString() === hoy.toDateString();
  const ayer = new Date(hoy.getTime() - 86400_000).toDateString() === fecha.toDateString();
  const hora = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (mismoDia) return `Hoy, ${hora}`;
  if (ayer) return `Ayer, ${hora}`;
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function ConsultarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: recientes } = await supabase
    .from('chat_conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(4);

  return (
    <Pagina>
      <MigaDePan trozos={[{ label: 'Inicio', href: '/app' }, { label: 'Consultar' }]} />

      <EncabezadoDeSeccion
        icono={Search}
        familia="consultar"
        titulo={
          <>
            Consultar
            <span className="mt-1 block text-xl font-bold text-consultar-600 sm:text-2xl dark:text-consultar-400">
              ¿Cómo quieres realizar tu consulta?
            </span>
          </>
        }
        bajada="Consulta a A-LexIA o encuentra información directamente en la normativa de contratación pública."
        aside={
          <div className="flex items-end justify-end gap-3">
            <div className="hidden flex-col items-end gap-2 sm:flex">
              <p className="max-w-[185px] text-right font-serif text-[15px] italic leading-snug text-consultar-600 dark:text-consultar-400">
                Respuestas con respaldo normativo
              </p>
              <NotaDelCompanero
                icono={BadgeCheck}
                familia="consultar"
                className="max-w-[230px]"
              >
                IA especializada en contrataciones públicas
              </NotaDelCompanero>
            </div>
            <Companero pose="senala" estado="quieto" alto={132} className="hidden xl:inline-flex" />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TarjetaDeHerramienta
          href="/chat"
          icono={MessageSquare}
          familia="consultar"
          acabado="relleno"
          etiqueta="Texto"
          titulo="Pregunta a A-LexIA"
          descripcion="Formula tus consultas y recibe respuestas con sustento normativo."
          llamada="Iniciar chat"
          className="bg-gradient-to-br from-noche-900 via-consultar-900 to-consultar-700"
          pastillas={[
            { icono: BadgeCheck, texto: 'Respuestas precisas' },
            { icono: Quote, texto: 'Citas normativas' },
            { icono: Clock, texto: 'Disponible 24/7' },
          ]}
        />
        <TarjetaDeHerramienta
          href="/llamadas"
          icono={Mic}
          familia="consultar"
          acabado="suave"
          etiqueta="Voz"
          titulo="Habla con A-LexIA"
          descripcion="Realiza tu consulta por voz y recibe una respuesta inmediata."
          llamada="Iniciar consulta"
          pastillas={[
            { icono: Zap, texto: 'Rápido y fácil' },
            { icono: AudioLines, texto: 'Dicta tu consulta' },
            { icono: ListChecks, texto: 'Resultados confiables' },
          ]}
        />
        <TarjetaDeHerramienta
          href="/buscador"
          icono={SearchCode}
          familia="consultar"
          acabado="relleno"
          etiqueta="Normativa"
          titulo="Búsqueda avanzada"
          descripcion="Encuentra leyes, reglamentos, opiniones, pronunciamientos, resoluciones y más."
          llamada="Buscar ahora"
          className="bg-gradient-to-br from-noche-900 via-consultar-900 to-consultar-700"
          pastillas={[
            { icono: Filter, texto: 'Filtros inteligentes' },
            { icono: Search, texto: 'Resultados precisos' },
            { icono: Library, texto: 'Fuentes oficiales' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <header className="flex items-center gap-2.5">
            <Clock className="h-4.5 w-4.5 text-consultar-500" strokeWidth={2} />
            <h2 className="text-[15px] font-bold tracking-tight">Consultas recientes</h2>
            {recientes && recientes.length > 0 && (
              <Link
                href="/chat"
                className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-consultar-600 hover:underline dark:text-consultar-400"
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </header>

          {recientes && recientes.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {recientes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/chat/${c.id}`}
                    className="group flex items-center gap-3 py-2.5 transition-colors hover:text-consultar-600 dark:hover:text-consultar-400"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-consultar-500" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">
                      {c.title || 'Conversación sin título'}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">
                      {cuando(c.updated_at as string)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13.5px] text-muted-foreground">
              Todavía no has consultado nada. Empieza por una de las preguntas de al lado.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <header className="flex items-center gap-2.5">
            <Lightbulb className="h-4.5 w-4.5 text-amber-500" strokeWidth={2} />
            <h2 className="text-[15px] font-bold tracking-tight">
              Ejemplos de consultas que puedes realizar
            </h2>
          </header>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EJEMPLOS.map((e) => (
              <Link
                key={e}
                href={`/chat?new=1&q=${encodeURIComponent(e)}`}
                className="rounded-xl border border-border bg-secondary/40 px-3.5 py-3 text-[12.5px] leading-snug text-foreground/85 transition-colors hover:border-consultar-300 hover:bg-consultar-50 dark:hover:border-consultar-700 dark:hover:bg-consultar-900/30"
              >
                “{e}”
              </Link>
            ))}
          </div>
        </section>
      </div>

      <BandaDeConfianza lemas={['Disciplina', 'Estrategia', 'Resultados']} />
    </Pagina>
  );
}
