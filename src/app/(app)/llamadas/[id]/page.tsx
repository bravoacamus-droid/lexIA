import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Star, BookOpen, Phone } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { CallActions } from '@/components/app/voice/call-actions';
import { TurnMarkdown } from '@/components/app/voice/turn-markdown';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function LlamadaDetailPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: call } = await supabase
    .from('voice_calls')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!call) notFound();
  if ((call as { user_id: string }).user_id !== user.id) notFound();

  const c = call as {
    id: string;
    status: 'active' | 'completed' | 'failed' | 'deleted';
    voice_id: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    tokens_in: number | null;
    tokens_out: number | null;
    cost_usd: number | null;
    rag_queries_count: number;
    cited_documents: Array<{ id: string; type: string; title: string; citation: string }>;
    summary: string | null;
    user_rating: number | null;
    user_rating_comment: string | null;
    audio_storage_path: string | null;
  };

  // Ordenar por timestamp Y luego por created_at para desempatar cuando
  // dos turnos comparten segundo (caso frecuente: usuario habla justo
  // cuando el agente termina). Antes la UI mostraba respuestas ANTES de
  // las preguntas correspondientes.
  const { data: transcripts } = await supabase
    .from('voice_call_transcripts')
    .select('id, speaker, timestamp_seconds, text, citations, created_at')
    .eq('call_id', params.id)
    .order('timestamp_seconds', { ascending: true })
    .order('created_at', { ascending: true });

  const turns = (transcripts || []) as Array<{
    id: string;
    speaker: 'user' | 'assistant';
    timestamp_seconds: number;
    text: string;
    citations: Array<{ citation: string; title: string }>;
  }>;

  return (
    // Feedback César 30/06/2026: ampliar el ancho de la vista para que
    // las transcripciones respiren y usen el mismo layout que el chat.
    <div className="container max-w-5xl py-6 space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/llamadas">
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </Link>
      </Button>

      <Card className="p-7 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant={c.status === 'completed' ? 'success' : 'secondary'}
                className="text-[10px]"
              >
                {c.status === 'completed'
                  ? 'Finalizada'
                  : c.status === 'active'
                    ? 'En curso'
                    : c.status === 'failed'
                      ? 'Falló'
                      : 'Eliminada'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelative(c.started_at)}
              </span>
              {c.duration_seconds && (
                <span className="text-xs font-mono text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-0.5" />
                  {formatDuration(c.duration_seconds)}
                </span>
              )}
            </div>
            <h1 className="font-semibold text-2xl tracking-tight">
              Conversación por voz con LexIA
            </h1>
          </div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-400 shrink-0">
            <Phone className="h-5 w-5" />
          </span>
        </div>

        {c.summary && (
          <div className="rounded-lg bg-secondary/30 border border-border/40 p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
              Resumen ejecutivo
            </p>
            <p className="text-sm leading-relaxed">{c.summary}</p>
          </div>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Metric
            label="Consultas a normativa"
            value={c.rag_queries_count.toString()}
            icon={<BookOpen className="h-3.5 w-3.5" />}
          />
          <Metric
            label="Voz utilizada"
            value={c.voice_id}
            icon={<Phone className="h-3.5 w-3.5" />}
          />
          <Metric
            label="Tu calificación"
            value={c.user_rating ? `${c.user_rating}/5` : '—'}
            icon={<Star className="h-3.5 w-3.5" />}
          />
        </div>
      </Card>

      {/* Transcripción */}
      {turns.length > 0 && (
        <Card className="p-6 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
            Transcripción
          </p>
          <div className="space-y-3">
            {turns.map((t) => (
              <Turn key={t.id} turn={t} />
            ))}
          </div>
        </Card>
      )}

      {/* Documentos citados */}
      {c.cited_documents && c.cited_documents.length > 0 && (
        <Card className="p-6 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-600">
            Fuentes consultadas durante la llamada
          </p>
          <ul className="space-y-2">
            {c.cited_documents.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-brand-700 dark:text-brand-400">
                    {d.citation}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {d.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Acciones */}
      <CallActions
        callId={c.id}
        currentRating={c.user_rating}
        currentComment={c.user_rating_comment}
        canDelete={c.status !== 'active'}
        hasAudio={!!c.audio_storage_path}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function Turn({
  turn,
}: {
  turn: {
    speaker: 'user' | 'assistant';
    timestamp_seconds: number;
    text: string;
    citations: Array<{ citation: string; title: string }>;
  };
}) {
  const isUser = turn.speaker === 'user';
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`text-[10px] font-mono text-muted-foreground shrink-0 mt-2 ${
          isUser ? 'text-right' : ''
        }`}
        style={{ minWidth: 40 }}
      >
        {formatDuration(Math.floor(turn.timestamp_seconds))}
      </span>
      <div
        className={`flex-1 rounded-xl px-5 py-4 ${
          isUser
            ? 'bg-secondary/50'
            : 'bg-brand-50/30 dark:bg-brand-950/20 border border-brand-500/20'
        }`}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 text-brand-600 dark:text-brand-400">
          {isUser ? 'Tú' : 'Abogada Virtual'}
        </p>
        {/* Feedback César 30/06/2026: aplicar el MISMO estilo del chat a
            las transcripciones. Antes era <p> plain, ahora es prose-lexia
            con markdown para que las respuestas del agente respetan
            listas numeradas y sub-headings. */}
        {isUser ? (
          <p className="leading-relaxed text-[15px]">{turn.text}</p>
        ) : (
          <TurnMarkdown text={turn.text} />
        )}
        {turn.citations && turn.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
            {turn.citations.map((c, i) => (
              <p
                key={i}
                className="text-[11px] text-brand-700 dark:text-brand-400 flex items-start gap-1.5"
              >
                <BookOpen className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="font-medium">{c.citation}</span>
                <span className="text-muted-foreground">— {c.title}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
