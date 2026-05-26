'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, LogoMark } from '@/components/logo';
import { ChatMessageView } from '@/components/app/chat/message';
import { ChatInput } from '@/components/app/chat/chat-input';
import { ChunkSheet } from '@/components/app/chat/chunk-sheet';
import { Suggested } from '@/components/app/chat/suggested';
import type { ChatMessage, ChatSource } from '@/lib/supabase/types';
import { useConversations } from '@/lib/stores/conversations';
import { Loader2 } from 'lucide-react';

interface Props {
  conversationId: string;
  title: string | null;
  initialMessages: ChatMessage[];
  prefillQuery?: string | null;
}

interface MessageWithSources {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[];
}

export function ChatPanel({
  conversationId,
  title,
  initialMessages,
  prefillQuery,
}: Props) {
  const touch = useConversations((s) => s.touch);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [sourcesById, setSourcesById] = useState<Record<string, ChatSource[]>>(
    () =>
      Object.fromEntries(
        initialMessages
          .filter((m) => m.role === 'assistant' && m.sources)
          .map((m) => [m.id, (m.sources || []) as ChatSource[]]),
      ),
  );
  const [openChunk, setOpenChunk] = useState<ChatSource | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const prefillFiredRef = useRef(false);

  const seedMessages = initialMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    isLoading,
    stop,
    reload,
    setMessages,
  } = useChat({
    api: '/api/chat',
    id: conversationId,
    initialMessages: seedMessages,
    body: { conversationId },
    streamProtocol: 'data',
    onResponse: (response) => {
      const raw = response.headers.get('x-lexia-sources');
      if (raw) {
        try {
          const decoded = decodeURIComponent(raw);
          const parsed = JSON.parse(decoded) as ChatSource[];
          (window as Window & { __lexia_last_sources?: ChatSource[] }).__lexia_last_sources = parsed;
        } catch {
          /* ignore */
        }
      }
    },
    onFinish: (message) => {
      const last = (window as Window & { __lexia_last_sources?: ChatSource[] }).__lexia_last_sources;
      if (last && message.role === 'assistant') {
        setSourcesById((prev) => ({ ...prev, [message.id]: last }));
      }
      touch(conversationId);
      // Refresh suggestions after each turn
      fetchSuggestions();
    },
    onError: (err) => {
      console.error('Chat error', err);
    },
  });

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  // Prefill query — auto-send si vinieron con ?q=
  useEffect(() => {
    if (!prefillQuery || prefillFiredRef.current) return;
    if (messages.length > 0) return; // ya hay conversación, no prefillamos
    prefillFiredRef.current = true;
    append({ role: 'user', content: prefillQuery });
  }, [prefillQuery, messages.length, append]);

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        const { suggestions: s } = await res.json();
        setSuggestions(Array.isArray(s) ? s : []);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [conversationId]);

  // Fetch suggestions inicial si ya hay conversación previa
  useEffect(() => {
    if (initialMessages.length > 0 && suggestions.length === 0) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messagesWithSources: MessageWithSources[] = messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    sources: sourcesById[m.id] || [],
  }));

  function onSuggest(s: string) {
    setSuggestions([]);
    append({ role: 'user', content: s });
  }

  function onRegenerate() {
    setSuggestions([]);
    // Remove last assistant message before reload
    const last = messages[messages.length - 1];
    if (last && last.role === 'assistant') {
      setMessages(messages.slice(0, -1));
    }
    reload();
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-4 space-y-6">
            <AnimatePresence initial={false}>
              {messagesWithSources.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border mb-4">
                    <LogoMark size="lg" />
                  </div>
                  <h2 className="font-serif text-2xl tracking-tight mb-1">
                    {title || 'Nueva conversación'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Hazme tu primera pregunta sobre Contrataciones del Estado.
                  </p>
                </motion.div>
              )}

              {messagesWithSources.map((m, i) => {
                const isLast = i === messagesWithSources.length - 1;
                return (
                  <ChatMessageView
                    key={m.id}
                    message={m}
                    isStreaming={isLast && m.role === 'assistant' && isLoading}
                    onCitationClick={(src) => setOpenChunk(src)}
                    onRegenerate={isLast && m.role === 'assistant' && !isLoading ? onRegenerate : undefined}
                  />
                );
              })}

              {isLoading &&
                (messages.length === 0 ||
                  messages[messages.length - 1].role === 'user') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="h-7 w-7 shrink-0 rounded-full bg-brand-100 dark:bg-brand-950 flex items-center justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-700 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground italic pt-1">
                      Buscando en la normativa y redactando…
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>

            {!isLoading && messagesWithSources.length > 0 && (
              <Suggested
                items={suggestions}
                loading={suggestionsLoading}
                onPick={onSuggest}
              />
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onStop={stop}
              isLoading={isLoading}
              placeholder={
                messages.length === 0
                  ? 'Pregúntame sobre normativa, opiniones, plazos…'
                  : 'Continúa la conversación…'
              }
            />
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              LexIA puede equivocarse. Verifica siempre las citaciones con la fuente original.
            </p>
          </div>
        </div>
      </div>

      <ChunkSheet open={!!openChunk} onClose={() => setOpenChunk(null)} chunk={openChunk} />
    </>
  );
}
