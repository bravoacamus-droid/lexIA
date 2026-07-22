import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GeneratorChatView } from '@/components/app/generator-chat/chat-view';
import type { GeneratorPerfil } from '@/lib/ai/generator-perfiles';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Generador — Chat' };

interface Props {
  params: { id: string };
}

interface DbMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: unknown;
  attached_files: unknown;
  created_at: string;
}

interface DbFile {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  expires_at: string | null;
}

export default async function GeneratorChatPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: convo } = await supabase
    .from('generator_conversations')
    .select('id, user_id, title, perfil, law_filter, created_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!convo) notFound();
  const c = convo as {
    id: string;
    user_id: string;
    title: string | null;
    perfil: GeneratorPerfil;
    law_filter: string[] | null;
    created_at: string;
  };
  if (c.user_id !== user.id) notFound();

  const { data: messages } = await supabase
    .from('generator_messages')
    .select('id, role, content, sources, attached_files, created_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  const { data: files } = await supabase
    .from('generator_files')
    .select('id, original_name, mime_type, size_bytes, created_at, expires_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true });

  return (
    <GeneratorChatView
      conversationId={c.id}
      title={c.title}
      perfil={c.perfil}
      initialMessages={(messages || []) as DbMessage[]}
      initialFiles={(files || []) as DbFile[]}
    />
  );
}
