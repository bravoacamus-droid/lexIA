import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatPanel } from '@/components/app/chat/chat-panel';
import type { ChatMessage } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
  searchParams: { q?: string };
}

export default async function ChatConversationPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: convo } = await supabase
    .from('chat_conversations')
    .select('id, title, pinned, created_at, updated_at, user_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!convo) notFound();
  const c = convo as { id: string; title: string | null; user_id: string };
  if (c.user_id !== user.id) notFound();

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, sources, created_at, conversation_id')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  return (
    <ChatPanel
      conversationId={params.id}
      title={c.title}
      initialMessages={(messages || []) as unknown as ChatMessage[]}
      prefillQuery={searchParams.q || null}
    />
  );
}
