import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TdrAuditResultView } from '@/components/app/evaluator/tdr-audit-result-view';
import { EvaluationPendingView } from '@/components/app/evaluator/pending-view';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function RevisorTdrDetailPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('evaluations')
    .select('id, title, status, result, mode, created_at, completed_at, user_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();
  const au = data as {
    id: string;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    result: unknown;
    mode: 'committee' | 'self_review' | 'tdr_audit' | null;
    created_at: string;
    completed_at: string | null;
    user_id: string;
  };
  if (au.user_id !== user.id) notFound();

  if (au.status !== 'done' || !au.result) {
    return (
      <EvaluationPendingView
        id={au.id}
        title={au.title}
        status={au.status as 'pending' | 'processing' | 'failed'}
        offers={[]}
        backHref="/revisor-tdr"
      />
    );
  }

  return (
    <TdrAuditResultView
      id={au.id}
      title={au.title}
      result={au.result as never}
      completedAt={au.completed_at}
    />
  );
}
