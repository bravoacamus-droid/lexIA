import Link from 'next/link';
import { Library, FolderKanban, ArrowRight, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PortadaHero } from '@/components/app/dashboard/portada-hero';
import { TarjetasDeVerbo } from '@/components/app/dashboard/tarjetas-de-verbo';
import { DashboardActivity } from '@/components/app/dashboard/activity';
import { RecentLibrary } from '@/components/app/dashboard/recent-library';
import { TrialBanner } from '@/components/app/dashboard/trial-banner';
import { Pagina, BandaDeConfianza } from '@/components/app/seccion/piezas';
import type { ProfileRole, SubscriptionRow } from '@/lib/auth/session';
import type { NormativeDocType } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inicio' };

/**
 * La portada, rehecha sobre la opción 2 de los mockups de setiembre.
 *
 * La anterior era un tablero de mandos: nueve widgets, contadores,
 * sparklines y tres listas. Esta pregunta una sola cosa —«¿qué necesitas
 * hacer hoy?»— y ofrece tres caminos. Lo que había en los widgets no se
 * perdió: «continuar donde lo dejaste» vive ahora en Generar, las
 * consultas recientes y las sugerencias en Consultar, y el trabajo por
 * perfil lo resuelve el propio menú, que ya filtra por rol.
 */
export default async function PortadaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [perfil, suscripcion, convos, evals, docs, normativaReciente] = await Promise.all([
    supabase.from('profiles').select('full_name, profile_role').eq('id', user.id).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id, user_id, tier, status, trial_ends_at, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('evaluations')
      .select('id, title, status, created_at, mode')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('generated_documents')
      .select('id, title, document_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('normative_documents')
      .select('id, type, number, title, date, ai_summary')
      .not('ai_summary', 'is', null)
      .order('date', { ascending: false, nullsFirst: false })
      .limit(4),
  ]);

  const nombre =
    (perfil.data?.full_name || '').trim().split(/\s+/)[0] ||
    user.email?.split('@')[0] ||
    'de nuevo';
  const rol = (perfil.data?.profile_role as ProfileRole | null) || null;

  const actividad = [
    ...(convos.data || []).map((c) => ({
      type: 'chat' as const,
      id: c.id,
      title: c.title || 'Nueva conversación',
      timestamp: c.updated_at,
    })),
    ...(evals.data || []).map((e) => ({
      type: 'evaluation' as const,
      id: e.id,
      title: e.title || 'Evaluación',
      status: e.status,
      mode: e.mode as string | null,
      timestamp: e.created_at,
    })),
    ...(docs.data || []).map((d) => ({
      type: 'document' as const,
      id: d.id,
      title: d.title || 'Documento generado',
      documentType: d.document_type,
      timestamp: d.created_at,
    })),
  ]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, 3);

  return (
    <Pagina className="space-y-5">
      <PortadaHero nombre={nombre} />

      <TrialBanner subscription={(suscripcion.data as SubscriptionRow | null) || null} />

      <TarjetasDeVerbo role={rol} />

      {/* `items-start`: las tres columnas miden lo suyo. Si se estiran
          para igualarse, las dos tarjetas de la izquierda se quedan con
          medio panel vacío debajo del texto. */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <TarjetaSecundaria
          href="/biblioteca"
          icono={Library}
          titulo="Biblioteca normativa"
          descripcion="Accede a la Ley N.° 32069, su reglamento, opiniones, pronunciamientos, resoluciones, bases estándar, guías y más."
        />
        <TarjetaSecundaria
          href="/generar"
          icono={FolderKanban}
          titulo="Mis borradores"
          descripcion="Retoma tus requerimientos y documentos administrativos donde los dejaste y sigue su avance."
        />
        <DashboardActivity items={actividad} />
      </div>

      <RecentLibrary
        docs={
          ((normativaReciente.data as Array<{
            id: string;
            type: NormativeDocType;
            number: string | null;
            title: string;
            date: string | null;
            ai_summary: {
              de_que_trata?: string;
              temas?: string[];
              questions?: Array<{ key: string; label: string; answer: string }>;
            } | null;
          }>) || []).map((d) => ({
            id: d.id,
            type: d.type,
            number: d.number,
            title: d.title,
            date: d.date,
            ai_summary: d.ai_summary,
          }))
        }
      />

      <BandaDeConfianza
        texto="IA especializada con respaldo normativo en contratación pública: todas las respuestas, análisis y documentos de A-LexIA se sustentan en la Ley N.° 32069, su reglamento y otras fuentes oficiales."
        lemas={['Más precisión', 'Menos tiempo', 'Mejores decisiones']}
      />
    </Pagina>
  );
}

function TarjetaSecundaria({
  href,
  icono: Icono,
  titulo,
  descripcion,
}: {
  href: string;
  icono: typeof Library;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-glow dark:hover:border-brand-800"
    >
      <div className="flex items-start gap-3.5">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/50">
          <Icono className="h-5 w-5 text-brand-600 dark:text-brand-400" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
            {titulo}
            <ArrowRight className="h-4 w-4 text-brand-500 transition-transform group-hover:translate-x-0.5" />
          </h2>
          <p className="mt-1.5 text-pretty text-[13px] leading-relaxed text-muted-foreground">
            {descripcion}
          </p>
        </div>
      </div>
    </Link>
  );
}
