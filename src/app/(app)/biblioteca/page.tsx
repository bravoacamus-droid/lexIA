import { createClient } from '@/lib/supabase/server';
import { LibraryView } from '@/components/app/library/library-view';
import type { NormativeDocType } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Biblioteca normativa' };

export default async function LibraryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Cargamos en paralelo todo lo que necesita la vista inicial
  const INITIAL_PAGE_SIZE = 30;
  // Últimos 7 días — para el badge "+N esta semana" en las stats
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [
    foldersRes,
    savedRes,
    recentDocsRes,
    typeCountsRes,
    newThisWeekRes,
    aiSummaryCountRes,
  ] = await Promise.all([
    supabase
      .from('user_folders')
      .select('id, name, color, icon, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('user_saved_documents')
      .select('document_id, folder_id')
      .eq('user_id', user.id),
    supabase
      .from('normative_documents')
      .select('id, type, number, title, summary, date, source_url', {
        count: 'exact',
      })
      .order('date', { ascending: false, nullsFirst: false })
      .range(0, INITIAL_PAGE_SIZE - 1),
    supabase.from('normative_documents').select('type'),
    // Documentos ingresados en los últimos 7 días
    supabase
      .from('normative_documents')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    // Cuántos docs tienen resumen IA generado (indicador de cobertura)
    supabase
      .from('normative_documents')
      .select('id', { count: 'exact', head: true })
      .not('ai_summary', 'is', null),
  ]);

  // Conteos por carpeta
  const folderCounts = new Map<string, number>();
  let unfiledCount = 0;
  const savedDocIds = new Set<string>();
  for (const s of (savedRes.data || []) as Array<{
    document_id: string;
    folder_id: string | null;
  }>) {
    savedDocIds.add(s.document_id);
    if (s.folder_id) folderCounts.set(s.folder_id, (folderCounts.get(s.folder_id) || 0) + 1);
    else unfiledCount += 1;
  }

  const folders = ((foldersRes.data || []) as Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    created_at: string;
  }>).map((f) => ({ ...f, count: folderCounts.get(f.id) || 0 }));

  // Conteos por tipo (para los chips de filtro)
  const typeCounts: Record<string, number> = {};
  for (const row of (typeCountsRes.data || []) as Array<{ type: NormativeDocType }>) {
    typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
  }

  const initialDocuments = (recentDocsRes.data || []) as never[];
  const totalDocuments = (recentDocsRes.count ?? initialDocuments.length) as number;

  const newThisWeek = (newThisWeekRes.count ?? 0) as number;
  const aiSummaryCount = (aiSummaryCountRes.count ?? 0) as number;
  // "Precisión IA" en biblioteca: % de docs con resumen IA generado.
  // Es una métrica real de cobertura del sistema, no un placeholder.
  const aiCoveragePct =
    totalDocuments > 0 ? Math.round((aiSummaryCount / totalDocuments) * 100) : 0;

  return (
    <LibraryView
      initialFolders={folders}
      unfiledCount={unfiledCount}
      initialDocuments={initialDocuments}
      initialTotal={totalDocuments}
      pageSize={INITIAL_PAGE_SIZE}
      savedDocIds={Array.from(savedDocIds)}
      typeCounts={typeCounts}
      stats={{
        totalDocuments,
        newThisWeek,
        aiCoveragePct,
      }}
    />
  );
}
