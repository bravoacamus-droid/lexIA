import { createClient } from '@/lib/supabase/server';
import { ChatEmpty } from '@/components/app/chat/chat-empty';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pregunta a A-LexIA' };

interface Props {
  searchParams: { new?: string; q?: string };
}

export default async function ChatIndexPage({ searchParams }: Props) {
  // El saludo del mockup lleva nombre propio, así que hace falta el
  // perfil; el estado vacío es de cliente y no puede consultarlo.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    : { data: null };

  const nombre =
    (perfil?.full_name || '').trim().split(/\s+/)[0] || user?.email?.split('@')[0] || null;

  return (
    <ChatEmpty
      autoCreate={Boolean(searchParams.new)}
      prefillQuery={searchParams.q || null}
      nombre={nombre}
    />
  );
}
