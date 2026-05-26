import { createClient } from '@/lib/supabase/server';
import { DashboardHero } from '@/components/app/dashboard/hero';
import { DashboardStats } from '@/components/app/dashboard/stats';
import { DashboardQuickActions } from '@/components/app/dashboard/quick-actions';
import { DashboardActivity } from '@/components/app/dashboard/activity';
import { DashboardSuggested } from '@/components/app/dashboard/suggested';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Cargar todos los stats en paralelo
  const [
    profileRes,
    chatCountRes,
    savedCountRes,
    foldersCountRes,
    normativeCountRes,
    recentConvosRes,
    recentEvalsRes,
    recentDocsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
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
  ]);

  const fullName = profileRes.data?.full_name || user.email?.split('@')[0] || 'invitado';

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
      <DashboardHero fullName={fullName} />

      <DashboardStats
        chatMessages={chatCountRes.count || 0}
        savedDocs={savedCountRes.count || 0}
        folders={foldersCountRes.count || 0}
        normativeTotal={normativeCountRes.count || 0}
      />

      <DashboardQuickActions />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardActivity items={activity} />
        </div>
        <DashboardSuggested />
      </div>
    </div>
  );
}
