import { createClient } from '@/lib/supabase/server';
import { DashboardHero } from '@/components/app/dashboard/hero';
import { DashboardStats } from '@/components/app/dashboard/stats';
import { DashboardActivity } from '@/components/app/dashboard/activity';
import { DashboardSuggested } from '@/components/app/dashboard/suggested';
import { ContinueLeftOff } from '@/components/app/dashboard/continue-left-off';
import { RoleWidget } from '@/components/app/dashboard/role-widget';
import { RecentLibrary } from '@/components/app/dashboard/recent-library';
import { TrialBanner } from '@/components/app/dashboard/trial-banner';
import type { ProfileRole, SubscriptionRow } from '@/lib/auth/session';
import type { NormativeDocType } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Ventana de 7 días para sparklines/trends
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Cargar todos los stats + perfil + subscription en paralelo
  const [
    profileRes,
    subscriptionRes,
    chatCountRes,
    savedCountRes,
    foldersCountRes,
    normativeCountRes,
    recentConvosRes,
    recentEvalsRes,
    recentDocsRes,
    lastCallRes,
    lastConvoRes,
    recentChatMsgsRes,
    recentSavedRes,
    recentCallsRes,
    recentNormativeRes,
    evaluationsCountRes,
    generatedDocsCountRes,
    voiceCallsCountRes,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, profile_role')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id, user_id, tier, status, trial_ends_at, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user'),
    supabase
      .from('user_saved_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('user_folders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('normative_documents')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('evaluations')
      .select('id, title, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('generated_documents')
      .select('id, title, document_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    // Última llamada de voz completada
    supabase
      .from('voice_calls')
      .select('id, voice_id, duration_seconds, summary, ended_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Última conversación con mensajes
    supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Chat messages últimos 7 días (para sparkline)
    supabase
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .gte('created_at', sevenDaysAgo.toISOString()),
    // Documentos guardados últimos 7 días
    supabase
      .from('user_saved_documents')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString()),
    // Llamadas últimos 7 días
    supabase
      .from('voice_calls')
      .select('started_at')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgo.toISOString()),
    // Docs normativos recientes con resumen IA (para RecentLibrary)
    supabase
      .from('normative_documents')
      .select('id, type, number, title, date, ai_summary')
      .not('ai_summary', 'is', null)
      .order('date', { ascending: false, nullsFirst: false })
      .limit(4),
    // Total de evaluaciones del usuario
    supabase
      .from('evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Total de documentos generados del usuario
    supabase
      .from('generated_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Total de llamadas del usuario
    supabase
      .from('voice_calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ]);

  const fullName = profileRes.data?.full_name || user.email?.split('@')[0] || 'invitado';
  const role = (profileRes.data?.profile_role as ProfileRole | null) || null;
  const subscription = (subscriptionRes.data as SubscriptionRow | null) || null;

  // Trends 7 días → arrays de 7 elementos con conteo por día
  function daysTrend(rows: Array<{ created_at?: string; started_at?: string }> | null): number[] {
    const buckets = new Array(7).fill(0);
    if (!rows) return buckets;
    for (const r of rows) {
      const ts = r.created_at || r.started_at;
      if (!ts) continue;
      const daysAgo = Math.floor((now.getTime() - new Date(ts).getTime()) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 7) {
        // buckets[6] = hoy, buckets[0] = hace 6 días
        buckets[6 - daysAgo]++;
      }
    }
    return buckets;
  }

  const chatTrend = daysTrend((recentChatMsgsRes.data as Array<{ created_at: string }>) || []);
  const savedTrend = daysTrend((recentSavedRes.data as Array<{ created_at: string }>) || []);
  const voiceTrend = daysTrend((recentCallsRes.data as Array<{ started_at: string }>) || []);

  // Mezclar actividades y ordenar por fecha
  const activity = [
    ...(recentConvosRes.data || []).map((c) => ({
      type: 'chat' as const,
      id: c.id,
      title: c.title || 'Nueva conversación',
      timestamp: c.updated_at,
    })),
    ...(recentEvalsRes.data || []).map((e) => ({
      type: 'evaluation' as const,
      id: e.id,
      title: e.title || 'Evaluación',
      status: e.status,
      timestamp: e.created_at,
    })),
    ...(recentDocsRes.data || []).map((d) => ({
      type: 'document' as const,
      id: d.id,
      title: d.title || 'Documento generado',
      documentType: d.document_type,
      timestamp: d.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <div className="container max-w-7xl py-8 sm:py-10 space-y-10">
      <DashboardHero fullName={fullName} role={role} />

      <TrialBanner subscription={subscription} />

      <DashboardStats
        chatMessages={chatCountRes.count || 0}
        savedDocs={savedCountRes.count || 0}
        folders={foldersCountRes.count || 0}
        normativeTotal={normativeCountRes.count || 0}
        chatTrend={chatTrend}
        savedTrend={savedTrend}
        voiceTrend={voiceTrend}
      />

      <ContinueLeftOff
        lastConversation={
          lastConvoRes.data
            ? {
                id: (lastConvoRes.data as { id: string }).id,
                title: (lastConvoRes.data as { title: string | null }).title,
                updatedAt: (lastConvoRes.data as { updated_at: string }).updated_at,
              }
            : null
        }
        lastCall={
          lastCallRes.data
            ? {
                id: (lastCallRes.data as { id: string }).id,
                voice: (lastCallRes.data as { voice_id: string }).voice_id,
                durationSeconds: (lastCallRes.data as { duration_seconds: number | null }).duration_seconds,
                summary: (lastCallRes.data as { summary: string | null }).summary,
                endedAt: (lastCallRes.data as { ended_at: string }).ended_at,
              }
            : null
        }
      />

      {/* Widget grande "Mi trabajo como {rol}" con acciones específicas
          del perfil y contadores de items relacionados del usuario. */}
      <RoleWidget
        role={role}
        data={{
          generatedDocsCount: generatedDocsCountRes.count || 0,
          savedDocsCount: savedCountRes.count || 0,
          evaluationsCount: evaluationsCountRes.count || 0,
          voiceCallsCount: voiceCallsCountRes.count || 0,
        }}
      />

      {/* Normativa reciente del OECE con resumen IA. Es la carta de
          presentación real de la utilidad de LexIA. */}
      <RecentLibrary
        docs={
          ((recentNormativeRes.data as Array<{
            id: string;
            type: NormativeDocType;
            number: string | null;
            title: string;
            date: string | null;
            ai_summary: { de_que_trata?: string; temas?: string[] } | null;
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardActivity items={activity} />
        </div>
        <DashboardSuggested role={role} />
      </div>

    </div>
  );
}
