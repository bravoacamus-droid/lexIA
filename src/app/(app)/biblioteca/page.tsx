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
  const [foldersRes, savedRes, recentDocsRes, typeCountsRes] = await Promise.all([
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
      .select('id, type, number, title, summary, date, source_url')
      .order('date', { ascending: false })
      .limit(20),
    supabase.from('normative_documents').select('type'),
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

  return (
    <LibraryView
      initialFolders={folders}
      unfiledCount={unfiledCount}
      initialDocuments={(recentDocsRes.data || []) as never}
      savedDocIds={Array.from(savedDocIds)}
      typeCounts={typeCounts}
    />
  );
}
