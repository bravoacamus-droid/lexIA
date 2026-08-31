'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import Link from 'next/link';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  Paperclip,
  Loader2,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Sparkles,
  Send,
  StopCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  GENERATOR_PERFILES,
  GENERATOR_QUICK_ACTIONS,
  DATOS_CLAVE_POR_PERFIL,
  type GeneratorPerfil,
} from '@/lib/ai/generator-perfiles';
import { GENERATOR_FILE_LIMITS } from '@/lib/ai/gemini-files';
import { adelgazarDocx, esDocx } from '@/lib/subidas/adelgazar-docx';
import { LIMITE_CUERPO_BYTES, enMegas } from '@/lib/subidas/limites';
import { leerRespuesta } from '@/lib/subidas/leer-respuesta';

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

interface Props {
  conversationId: string;
  title: string | null;
  perfil: GeneratorPerfil;
  initialMessages: DbMessage[];
  initialFiles: DbFile[];
}

export function GeneratorChatView({
  conversationId,
  title,
  perfil,
  initialMessages,
  initialFiles,
}: Props) {
  const perfilMeta = GENERATOR_PERFILES[perfil];
  const [files, setFiles] = useState<DbFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const seedMessages = initialMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  // Mapa `local useChat id → UUID BD` para que el botón "Descargar
  // Word" pueda armar el endpoint correcto justo después del streaming
  // (sin esperar refresh). Se popula en `onFinish` haciendo polling
  // al endpoint /messages/last-assistant.
  const [idMap, setIdMap] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const m of initialMessages) seed[m.id] = m.id;
    return seed;
  });

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stop,
  } = useChat({
    api: '/api/generator-chat',
    id: conversationId,
    initialMessages: seedMessages,
    body: { conversationId },
    streamProtocol: 'data',
    onError(err) {
      console.error('Generator chat error', err);
      toast.error('Error generando la respuesta', {
        description: (err as Error).message?.slice(0, 200),
      });
    },
    onFinish: async (message) => {
      if (message.role !== 'assistant') return;
      // Polling con backoff: el backend inserta el mensaje en su
      // onFinish, que puede terminar después que el streaming del
      // cliente. Reintentamos hasta 3 veces con 300ms/800ms/1500ms.
      const delays = [300, 800, 1500];
      for (const d of delays) {
        await new Promise((r) => setTimeout(r, d));
        try {
          const res = await fetch(
            `/api/generator-chat/conversations/${conversationId}/messages/last-assistant`,
            { cache: 'no-store' },
          );
          if (!res.ok) continue;
          const j = (await res.json()) as { messageId: string | null };
          if (j.messageId) {
            setIdMap((prev) => ({ ...prev, [message.id]: j.messageId! }));
            break;
          }
        } catch {
          /* siguiente intento */
        }
      }
    },
  });

  // Auto-scroll al fondo
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const original = list[0];
    // reset input to allow re-selecting same file
    e.target.value = '';

    // Un Word con las tipografías incrustadas pesa como un vídeo aunque
    // su texto ocupe cuarenta veces menos, y el envío no llega al
    // servidor: se le quita lo que no se lee antes de mandarlo.
    let file = original;
    if (file.size > LIMITE_CUERPO_BYTES && esDocx(file)) {
      const aligerado = await adelgazarDocx(file);
      file = aligerado.archivo;
      if (aligerado.quitado.length > 0 && file.size < original.size) {
        toast.info('Se aligeró el Word para poder enviarlo', {
          description: `Se quitaron ${aligerado.quitado.join(' y ')} y pasó de ${enMegas(
            aligerado.bytesAntes,
          )} a ${enMegas(aligerado.bytesDespues)}. El texto es el mismo.`,
        });
      }
    }

    if (file.size > LIMITE_CUERPO_BYTES) {
      toast.error('El archivo es demasiado grande para enviarlo', {
        description: `Pesa ${enMegas(file.size)} y el máximo es ${enMegas(LIMITE_CUERPO_BYTES)}.`,
      });
      return;
    }
    if (files.length >= GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION) {
      toast.error(
        `Máximo ${GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION} archivos por conversación`,
      );
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(
        `/api/generator-chat/conversations/${conversationId}/files`,
        { method: 'POST', body: form },
      );
      // Con tolerancia: si el envío no llegó al servidor, quien
      // contesta es la plataforma y lo hace en HTML, no en JSON.
      const leida = await leerRespuesta<{
        id: string;
        name: string;
        mimeType: string;
        size: number;
      }>(res);
      if (!leida.ok || !leida.datos) throw new Error(leida.mensaje);
      const json = leida.datos;
      setFiles((prev) => [
        ...prev,
        {
          id: json.id,
          original_name: json.name,
          mime_type: json.mimeType,
          size_bytes: json.size,
          created_at: new Date().toISOString(),
          expires_at: null,
        },
      ]);
      toast.success(`"${file.name}" adjuntado`);
    } catch (e) {
      toast.error('No se pudo subir el archivo', {
        description: (e as Error).message?.slice(0, 200),
      });
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(id: string, name: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    try {
      await fetch(
        `/api/generator-chat/conversations/${conversationId}/files/${id}`,
        { method: 'DELETE' },
      );
    } catch {
      /* silent */
    }
    toast.info(`"${name}" removido`);
  }

  const quickActions = GENERATOR_QUICK_ACTIONS[perfil] || [];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border bg-card/40 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/generador">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Generador</span>
            </Link>
          </Button>
          <span className="text-2xl">{perfilMeta.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Perfil: {perfilMeta.shortLabel}
            </p>
            <h1 className="text-sm font-semibold truncate">
              {title || 'Nueva conversación'}
            </h1>
          </div>
        </div>
      </div>

      {/* Zona de mensajes + panel de fuentes */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr,280px] gap-0">
        {/* Chat central */}
        <div className="flex flex-col min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6"
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && (
                <EmptyState
                  perfilMeta={perfilMeta}
                  quickActions={quickActions}
                  onPick={(prompt) => setInput(prompt)}
                />
              )}
              {messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  role={m.role as 'user' | 'assistant'}
                  content={m.content}
                  conversationId={conversationId}
                  messageId={idMap[m.id] || m.id}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Redactando…
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card/40 px-4 sm:px-6 py-3">
            <div className="max-w-3xl mx-auto">
              {/* Chips de archivos adjuntos */}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {files.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs"
                    >
                      <FileText className="h-3 w-3 text-brand-600" />
                      <span className="truncate max-w-[180px]">
                        {f.original_name}
                      </span>
                      <span className="text-muted-foreground">
                        {(f.size_bytes / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={() => removeFile(f.id, f.original_name)}
                        className="text-muted-foreground hover:text-rose-600 transition-colors"
                        aria-label="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={uploading || files.length >= GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Adjuntar archivo"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim().length > 0 && !isLoading) {
                        handleSubmit(e as unknown as React.FormEvent);
                      }
                    }
                  }}
                  placeholder={
                    isLoading
                      ? 'Redactando…'
                      : `Pídeme un documento (${perfilMeta.shortLabel})…`
                  }
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  disabled={isLoading}
                />
                {isLoading ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={stop}
                    aria-label="Detener"
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="glow"
                    size="icon"
                    disabled={input.trim().length === 0}
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </form>
              <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                Adjunta hasta {GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION} archivos (PDF, TXT) × {GENERATOR_FILE_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB. Se combinan con la biblioteca normativa.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar derecho: info del perfil */}
        <aside className="hidden lg:block border-l border-border bg-secondary/20 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
                Perfil activo
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{perfilMeta.emoji}</span>
                <h3 className="font-semibold text-sm">{perfilMeta.shortLabel}</h3>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                {perfilMeta.description}
              </p>
            </div>

            {quickActions.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Acciones rápidas
                </p>
                <div className="space-y-1.5">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => setInput(qa.prompt)}
                      disabled={isLoading}
                      className="w-full text-left rounded-md border border-border bg-card hover:bg-brand-50/40 dark:hover:bg-brand-950/20 hover:border-brand-300 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-brand-600 shrink-0" />
                        <span className="font-medium">{qa.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist de datos para una generación completa (acordado
                con César 27/07/2026 — reemplaza los campos del formulario
                del generador anterior) */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                Datos para un documento completo
              </p>
              <ul className="space-y-1">
                {(DATOS_CLAVE_POR_PERFIL[perfil] || []).map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug"
                  >
                    <span className="text-brand-500 mt-px shrink-0">✓</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-muted-foreground/80 leading-relaxed">
                Puedes escribirlos en el mensaje o adjuntarlos en un PDF/Word.
                Si falta alguno, LexIA lo dejará marcado como
                [COMPLETAR] en el documento.
              </p>
            </div>

            <div className="pt-3 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                💡 LexIA combina tus archivos adjuntos con la
                biblioteca normativa completa (Ley 32069, Reglamento,
                Directivas OECE, Pronunciamientos y Resoluciones TCE)
                para armar el documento.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EmptyState({
  perfilMeta,
  quickActions,
  onPick,
}: {
  perfilMeta: (typeof GENERATOR_PERFILES)[GeneratorPerfil];
  quickActions: { label: string; prompt: string }[];
  onPick: (prompt: string) => void;
}) {
  return (
    <Card className="p-8 text-center bg-brand-50/30 dark:bg-brand-950/20 border-dashed">
      <div className="text-4xl mb-2">{perfilMeta.emoji}</div>
      <h2 className="font-semibold text-lg mb-1">
        Perfil {perfilMeta.shortLabel}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Describe qué documento necesitas o elige una acción rápida.
        Puedes adjuntar hasta {GENERATOR_FILE_LIMITS.MAX_FILES_PER_CONVERSATION} PDFs con tu caso concreto.
      </p>
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => onPick(qa.prompt)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:border-brand-400 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Sparkles className="h-3 w-3 text-brand-600" />
              {qa.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ChatBubble({
  role,
  content,
  conversationId,
  messageId,
}: {
  role: 'user' | 'assistant';
  content: string;
  conversationId: string;
  messageId: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-secondary rounded-2xl rounded-tr-md px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  // Solo permitimos descarga si el messageId es un UUID válido de BD.
  // Los IDs locales de useChat no son UUIDs — hay un idMap arriba que
  // los reemplaza tras polling en onFinish. Regex UUID v4-ish.
  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    messageId || '',
  );

  return (
    <div className="group">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="prose-lexia prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={copyText}
          className="h-7 text-[11px]"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          Copiar
        </Button>
        {isValidUuid && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
          >
            <a
              href={`/api/generator-chat/conversations/${conversationId}/messages/${messageId}/export`}
              download
            >
              <Download className="h-3 w-3" />
              Descargar Word
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
