import { ChatEmpty } from '@/components/app/chat/chat-empty';

export const metadata = { title: 'Chat LexIA' };

interface Props {
  searchParams: { new?: string; q?: string };
}

export default function ChatIndexPage({ searchParams }: Props) {
  return (
    <ChatEmpty
      autoCreate={Boolean(searchParams.new)}
      prefillQuery={searchParams.q || null}
    />
  );
}
