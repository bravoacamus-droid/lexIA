import { createClient } from '@/lib/supabase/server';
import { ConversationSidebar } from '@/components/app/chat/conversation-sidebar';

export const dynamic = 'force-dynamic';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conversations } = await supabase
    .from('chat_conversations')
    .select('id, title, pinned, created_at, updated_at')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <ConversationSidebar initialConversations={(conversations || []) as never} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
