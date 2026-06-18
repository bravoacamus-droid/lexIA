import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentEditor } from '@/components/app/generator/document-editor';
import { DocumentUsageCard } from '@/components/app/generator/document-usage-card';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
  searchParams: { generate?: string };
}

export default async function GeneradorDocumentPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('generated_documents')
    .select(
      'id, document_type, title, status, input_data, generated_content, created_at, user_id',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();
  const row = data as {
    id: string;
    document_type: string;
    title: string;
    status: 'draft' | 'final';
    input_data: Record<string, unknown>;
    generated_content: string | null;
    created_at: string;
    user_id: string;
  };
  if (row.user_id !== user.id) notFound();

  return (
    <div className="space-y-6">
      <DocumentEditor
        id={row.id}
        documentType={row.document_type}
        title={row.title}
        status={row.status}
        initialContent={row.generated_content || ''}
        autoGenerate={searchParams.generate === '1' && !row.generated_content}
      />
      <div className="container max-w-5xl pb-12">
        <DocumentUsageCard
          documentId={row.id}
          pollWhileEmpty={!row.generated_content}
        />
      </div>
    </div>
  );
}
