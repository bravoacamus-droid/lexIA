'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { LiveClient, type AgentState } from '@/lib/voice/live-client';
import {
  Phone,
  PhoneOff,
  ArrowLeft,
  Shield,
  Mic,
  MicOff,
  Pause,
  Play,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LawSelector, type LawFilter } from '@/components/app/law-selector';
import { cn } from '@/lib/utils';

interface Props {
  hasConsent: boolean;
  disclaimerVersion: string;
}

type Stage = 'consent' | 'setup' | 'connecting' | 'active' | 'ending';
type AgentStateExtended = AgentState;

interface ConsentState {
  ia_no_lawyer: boolean;
  recording: boolean;
  data_in_google_cloud: boolean;
  no_confidential_third_party: boolean;
}

const VOICES = [
  { id: 'Aoede', label: 'Aoede (femenina, neutra)' },
  { id: 'Kore', label: 'Kore (femenina, cálida)' },
  { id: 'Puck', label: 'Puck (masculina, juvenil)' },
  { id: 'Charon', label: 'Charon (masculina, grave)' },
] as const;

export function CallStarter({ hasConsent, disclaimerVersion }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(hasConsent ? 'setup' : 'consent');
  const [consent, setConsent] = useState<ConsentState>({
    ia_no_lawyer: false,
    recording: false,
    data_in_google_cloud: false,
    no_confidential_third_party: false,
  });
  const [savingConsent, setSavingConsent] = useState(false);
  const [voiceId, setVoiceId] = useState<string>('Aoede');
  // Filtro de ley aplicable a esta llamada (null = ambas). Se envía al
  // crear la llamada y queda persistido en voice_calls.law_filter.
  const [lawFilter, setLawFilter] = useState<LawFilter>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [agentState, setAgentState] = useState<AgentStateExtended>('idle');
  const liveClientRef = useRef<LiveClient | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);

  const allConsented =
    consent.ia_no_lawyer &&
    consent.recording &&
    consent.data_in_google_cloud &&
    consent.no_confidential_third_party;

  async function saveConsent() {
    if (!allConsented) {
      toast.error('Debes aceptar las 4 casillas para continuar.');
      return;
    }
    setSavingConsent(true);
    try {
      const res = await fetch('/api/voice/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accepted_ia_no_lawyer: true,
          accepted_recording: true,
          accepted_data_in_google_cloud: true,
          accepted_no_confidential_third_party: true,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.detail || `HTTP ${res.status}`);
      }
      toast.success('Consentimiento registrado');
      setStage('setup');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingConsent(false);
    }
  }

  async function startCall() {
    setStage('connecting');
    try {
      // 1. Crear la llamada en BD
      const createRes = await fetch('/api/voice/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: voiceId,
          law_filter: lawFilter || [],
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createJson?.detail || createJson?.error || 'No se pudo crear la llamada');
      }
      const newCallId = createJson.call.id as string;
      setCallId(newCallId);
      callIdRef.current = newCallId;

      // 2. Obtener config (API key, modelo, voz, system prompt, tools)
      const cfgRes = await fetch('/api/voice/session-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: newCallId }),
      });
      const cfgJson = await cfgRes.json();
      if (!cfgRes.ok) {
        throw new Error(cfgJson?.detail || cfgJson?.error || 'No se pudo obtener configuración');
      }

      // 3. Inicializar LiveClient (WebSocket + audio)
      const client = new LiveClient({
        apiKey: cfgJson.api_key,
        model: cfgJson.model,
        voiceId: cfgJson.voice_id,
        systemInstruction: cfgJson.system_instruction,
        // Prompt de saludo inicial ajustado al régimen normativo elegido
        // por el usuario. Si no viene del server, cae al default del
        // LiveClient.
        initialGreetingPrompt: cfgJson.initial_greeting
          ? `Hola, acabo de conectar. Usa EXACTAMENTE este saludo textual sin modificarlo ni parafrasearlo: "${cfgJson.initial_greeting}". Luego espera mi pregunta en silencio.`
          : undefined,
        tools: cfgJson.tools,
        callId: newCallId,
        onToolCall: async (name, args) => {
          if (name !== 'search_normativa') {
            return JSON.stringify({ error: 'function not implemented' });
          }
          // Timeout duro de 15s: si el bridge no responde, abortamos
          // y devolvemos un fallback al modelo. Sin esto, una request
          // colgada deja al modelo esperando indefinidamente y la
          // conversación se rompe en silencio (bug del 27/06/2026).
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 15000);
          try {
            const r = await fetch('/api/voice/search-normativa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: (args.query as string) || '',
                filter_type: (args.filter_type as string) ?? null,
                call_id: newCallId,
              }),
              signal: ctrl.signal,
            });
            const j = await r.json();
            return r.ok ? j.content : `error: ${j.error || 'desconocido'}`;
          } catch (e) {
            const isAbort = (e as Error).name === 'AbortError';
            return isAbort
              ? 'La búsqueda en la base normativa tardó demasiado. Responde con tu conocimiento general y avisa al usuario que verificarías el numeral exacto en el portal del OECE.'
              : `error de bridge: ${(e as Error).message}`;
          } finally {
            clearTimeout(timer);
          }
        },
        onTranscript: (speaker, text, ts) => {
          // Persistir transcripción con retry — antes era fire-and-forget
          // sin manejo de error. En la llamada donde se perdió la 2ª
          // pregunta del CMN el POST silenciosamente falló (probable race
          // con el stop() cerrando el navegador). Usamos keepalive + retry.
          const persist = async (attempt = 1): Promise<void> => {
            try {
              const r = await fetch('/api/voice/transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  call_id: newCallId,
                  speaker,
                  timestamp_seconds: ts,
                  text,
                }),
                // keepalive: el request sobrevive al cierre de página / stop()
                keepalive: true,
              });
              if (!r.ok && attempt < 3) {
                await new Promise((r) => setTimeout(r, 300 * attempt));
                return persist(attempt + 1);
              }
            } catch {
              if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 300 * attempt));
                return persist(attempt + 1);
              }
            }
          };
          void persist();
        },
        onStateChange: (s) => setAgentState(s),
        onError: (msg) => toast.error(msg),
      });

      await client.start();
      liveClientRef.current = client;
      setStage('active');
      startTimer();
    } catch (e) {
      toast.error((e as Error).message.slice(0, 120));
      setStage('setup');
    }
  }

  function startTimer() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      void liveClientRef.current?.stop();
    };
  }, []);

  // Reflejar mute en el cliente
  useEffect(() => {
    liveClientRef.current?.setMuted(muted);
  }, [muted]);

  async function endCall() {
    if (!callId) return;
    setStage('ending');
    try {
      // 1. Cortar la conexión Live (esto también detiene MediaRecorder)
      const client = liveClientRef.current;
      await client?.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // 2. Marcar la llamada como completada (con duración + tokens reales)
      const usage = client?.getUsageTokens();
      await fetch(`/api/voice/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          duration_seconds: elapsedSeconds,
          tokens_in: usage?.promptTokenCount || 0,
          tokens_out: usage?.responseTokenCount || 0,
        }),
      });

      // 3. Subir audio grabado (fire-and-forget; no bloqueamos la salida)
      const blob = client?.getRecordedBlob();
      if (blob && blob.size > 1024) {
        const fd = new FormData();
        fd.append(
          'audio',
          new File([blob], `${callId}.webm`, { type: blob.type || 'audio/webm' }),
        );
        void fetch(`/api/voice/calls/${callId}/upload-audio`, {
          method: 'POST',
          body: fd,
        }).catch((e) => console.warn('upload audio fallo:', e.message));
      }

      // 4. Generar resumen ejecutivo (también fire-and-forget para no
      //    demorar la redirección — el detalle hará un fetch al cargar)
      void fetch(`/api/voice/calls/${callId}/summarize`, {
        method: 'POST',
      }).catch((e) => console.warn('summarize fallo:', e.message));

      liveClientRef.current = null;
      toast.success('Llamada finalizada');
      router.push(`/llamadas/${callId}`);
    } catch (e) {
      toast.error((e as Error).message);
      setStage('active');
    }
  }

  // ───── ETAPA: CONSENTIMIENTO ─────
  if (stage === 'consent') {
    return (
      <div className="container max-w-2xl py-6 space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link href="/llamadas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <Card className="p-7 space-y-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-semibold text-2xl tracking-tight">
                Antes de tu primera llamada
              </h1>
              <p className="text-sm text-muted-foreground">
                Necesitamos tu consentimiento para usar esta funcionalidad
                (Ley N° 29733).
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <ConsentCheckbox
              checked={consent.ia_no_lawyer}
              onChange={(v) => setConsent((s) => ({ ...s, ia_no_lawyer: v }))}
              text="Acepto que esta es una conversación con inteligencia artificial, no con un abogado licenciado. La información es orientativa y no constituye asesoría legal profesional."
            />
            <ConsentCheckbox
              checked={consent.recording}
              onChange={(v) => setConsent((s) => ({ ...s, recording: v }))}
              text="Acepto que la llamada sea grabada y la transcripción almacenada en mi cuenta para que pueda consultarla después. Puedo eliminar mis grabaciones en cualquier momento."
            />
            <ConsentCheckbox
              checked={consent.data_in_google_cloud}
              onChange={(v) =>
                setConsent((s) => ({ ...s, data_in_google_cloud: v }))
              }
              text="Entiendo que mis datos se procesan en servidores de Google Cloud (Estados Unidos / Brasil) bajo los términos de privacidad de LexIA y Google."
            />
            <ConsentCheckbox
              checked={consent.no_confidential_third_party}
              onChange={(v) =>
                setConsent((s) => ({ ...s, no_confidential_third_party: v }))
              }
              text="Acepto no compartir información confidencial de terceros, datos personales sensibles ni secretos profesionales en esta llamada."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button asChild variant="outline">
              <Link href="/llamadas">Cancelar</Link>
            </Button>
            <Button
              onClick={saveConsent}
              disabled={!allConsented}
              loading={savingConsent}
            >
              Acepto y continuar
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Versión del aviso: {disclaimerVersion} ·{' '}
            <Link
              href="/legal/privacidad-voz"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Política de privacidad de voz
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  // ───── ETAPA: SETUP (elegir voz, iniciar) ─────
  if (stage === 'setup' || stage === 'connecting') {
    return (
      <div className="container max-w-2xl py-6 space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link href="/llamadas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        <Card className="p-7 space-y-6">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight mb-1">
              Hablar con LexIA
            </h1>
            <p className="text-sm text-muted-foreground">
              Antes de iniciar, elige la voz preferida y permite el micrófono cuando te lo pida el navegador.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Voz del agente
            </Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Régimen normativo
            </Label>
            <div>
              <LawSelector
                value={lawFilter}
                onChange={setLawFilter}
                size="md"
                ariaLabel="Restringir el RAG de esta llamada a Ley 30225, Ley 32069 o ambas"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Elige sobre cuál ley quieres consultar. <strong>Ambas</strong> es lo más amplio (incluye jurisprudencia de Ley 30225 y Ley 32069). Útil para acotar si tu caso está bajo un régimen específico.
            </p>
          </div>

          <div className="rounded-lg bg-amber-50/40 dark:bg-amber-950/30 border border-amber-500/30 p-4 text-xs leading-relaxed">
            <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              🤖 Recordatorio
            </p>
            <p className="text-amber-900/80 dark:text-amber-100/80">
              Estás hablando con IA, no con un abogado real. La información es
              orientativa y no constituye asesoría legal profesional.
            </p>
          </div>

          <Button
            onClick={startCall}
            size="lg"
            variant="glow"
            className="w-full"
            loading={stage === 'connecting'}
          >
            <Phone className="h-4 w-4" />
            {stage === 'connecting' ? 'Conectando…' : 'Hablar con LexIA'}
          </Button>
        </Card>
      </div>
    );
  }

  // ───── ETAPA: LLAMADA ACTIVA ─────
  return (
    <div className="container max-w-2xl py-6">
      <Card className="p-7 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Llamada activa
            </p>
          </div>
          <div className="text-2xl font-mono font-bold tabular-nums">
            {formatTimer(elapsedSeconds)}
          </div>
        </div>

        {/* Banner permanente */}
        <div className="rounded-lg bg-amber-50/40 dark:bg-amber-950/30 border border-amber-500/30 px-3 py-2 text-[11px]">
          <p className="text-amber-900 dark:text-amber-100">
            🤖 Estás hablando con IA · Información orientativa, no asesoría legal
          </p>
        </div>

        {/* Indicador de estado */}
        <div className="py-10 flex flex-col items-center justify-center">
          <div
            className={cn(
              'relative h-32 w-32 rounded-full flex items-center justify-center transition-all',
              agentState === 'speaking' &&
                'bg-brand-500 text-white shadow-lg shadow-brand-500/40',
              agentState === 'listening' &&
                'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40',
              agentState === 'thinking' &&
                'bg-amber-500 text-white shadow-lg shadow-amber-500/40',
              agentState === 'idle' && 'bg-secondary text-muted-foreground',
            )}
          >
            {(agentState === 'speaking' || agentState === 'listening') && (
              <>
                <span
                  className={cn(
                    'absolute inset-0 rounded-full animate-ping opacity-30',
                    agentState === 'speaking' ? 'bg-brand-500' : 'bg-emerald-500',
                  )}
                />
                <span
                  className={cn(
                    'absolute inset-2 rounded-full animate-pulse opacity-50',
                    agentState === 'speaking' ? 'bg-brand-400' : 'bg-emerald-400',
                  )}
                />
              </>
            )}
            {agentState === 'thinking' ? (
              <BookOpen className="h-10 w-10 relative animate-pulse" />
            ) : (
              <Sparkles className="h-10 w-10 relative" />
            )}
          </div>
          <p className="mt-5 text-sm font-semibold">
            {agentState === 'speaking' && 'Abogada Virtual está hablando…'}
            {agentState === 'listening' && 'Te escucho…'}
            {agentState === 'thinking' && 'Consultando normativa…'}
            {agentState === 'idle' && 'Tu turno'}
          </p>
          {agentState === 'thinking' && (
            <p className="text-xs text-muted-foreground mt-1">
              📚 Buscando en la Ley 32069 y pronunciamientos del OECE
            </p>
          )}
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={muted ? 'default' : 'outline'}
            size="lg"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
            className="h-14 w-14 rounded-full p-0"
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant={paused ? 'default' : 'outline'}
            size="lg"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Reanudar' : 'Pausar'}
            className="h-14 w-14 rounded-full p-0"
          >
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            loading={stage === 'ending'}
            className="h-14 px-6 rounded-full"
          >
            <PhoneOff className="h-5 w-5" />
            Colgar
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Voz: {VOICES.find((v) => v.id === voiceId)?.label} · ID llamada: {callId?.slice(0, 8)}
        </p>
      </Card>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  text,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  text: string;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
        checked
          ? 'border-brand-500/50 bg-brand-50/40 dark:bg-brand-950/30'
          : 'border-border hover:border-border/80',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-brand-600"
      />
      <span className="text-sm leading-relaxed">{text}</span>
    </label>
  );
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
