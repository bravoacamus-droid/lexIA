import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EvaluationResultView } from '@/components/app/evaluator/result-view';
import { EvaluationPendingView } from '@/components/app/evaluator/pending-view';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function EvaluationPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('evaluations')
    .select(
      'id, title, status, offer_files, result, created_at, completed_at, user_id',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();
  const ev = data as {
    id: string;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    offer_files: Array<{ name: string }> | null;
    result: unknown;
    created_at: string;
    completed_at: string | null;
    user_id: string;
  };
  if (ev.user_id !== user.id) notFound();

  if (ev.status !== 'done' || !ev.result) {
    return (
      <EvaluationPendingView
        id={ev.id}
        title={ev.title}
        status={ev.status as 'pending' | 'processing' | 'failed'}
        offers={ev.offer_files || []}
      />
    );
  }

  return (
    <EvaluationResultView
      id={ev.id}
      title={ev.title}
      result={ev.result as never}
      completedAt={ev.completed_at}
    />
  );
}
