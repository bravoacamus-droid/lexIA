import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentViewer } from '@/components/app/library/document-viewer';
import type { NormativeDocType, UserAnnotation } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function DocumentPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: doc } = await supabase
    .from('normative_documents')
    .select('id, type, number, title, summary, date, source_url, raw_text')
    .eq('id', params.id)
    .maybeSingle();

  if (!doc) notFound();
  const document = doc as {
    id: string;
    type: NormativeDocType;
    number: string | null;
    title: string;
    summary: string | null;
    date: string | null;
    source_url: string | null;
    raw_text: string | null;
  };

  const [annotationsRes, savedRes, foldersRes] = await Promise.all([
    supabase
      .from('user_annotations')
      .select('id, document_id, highlighted_text, position, color, created_at')
      .eq('user_id', user.id)
      .eq('document_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('user_saved_documents')
      .select('id, folder_id')
      .eq('user_id', user.id)
      .eq('document_id', params.id)
      .maybeSingle(),
    supabase
      .from('user_folders')
      .select('id, name, color, icon, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  const saved = savedRes.data as { id: string; folder_id: string | null } | null;

  return (
    <DocumentViewer
      document={document}
      initialAnnotations={(annotationsRes.data || []) as UserAnnotation[]}
      isSaved={!!saved}
      savedFolderId={saved?.folder_id || null}
      folders={(
        (foldersRes.data || []) as Array<{
          id: string;
          name: string;
          color: string;
          icon: string;
          created_at: string;
        }>
      ).map((f) => ({ ...f, count: 0 }))}
    />
  );
}
