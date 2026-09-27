'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  PhoneOff,
  ChevronRight,
  Volume2,
  ShieldCheck,
  FileText,
  Zap,
  BookOpen,
  Landmark,
  Gavel,
  ScrollText,
  Crown,
  Loader2,
  Check,
} from 'lucide-react';
import { LiveClient, type AgentState } from '@/lib/voice/live-client';
import { VOCES, VOZ_PREDETERMINADA } from '@/lib/ai/voice-config';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn, getDocTypeMeta } from '@/lib/utils';

/**
 * «Habla con A-LexIA»: la portada y la llamada en una sola pantalla.
 *
 * César (27/09/2026) pidió quitar la segunda ventana, donde se volvía a
 * elegir la voz y además la ley: «ya no debe ingresar a esta segunda
 * ventana… de frente debe estar programado para responder sobre la Ley
 * vigente 32069». Aquí se presiona «Iniciar conversación» y la tarjeta
 * se convierte en la llamada. El consentimiento se pide una sola vez, la
 * primera, en un diálogo sobre la misma pantalla.
 *
 * La llamada sigue su diseño de cuatro estados: te escucho, preparando
 * la respuesta, consultando fuentes y respondiendo.
 */

const PREDETERMINADA: string = VOZ_PREDETERMINADA;
const CLAVE_VOZ = 'lexia.voz';

type Etapa = 'portada' | 'conectando' | 'activa' | 'cerrando';

interface Fuente {
  citation: string;
  title: string;
  type?: string;
  document_id?: string | null;
}

interface Props {
  disponible: boolean;
  tieneConsentimiento: boolean;
  versionAviso: string;
}

export function HablaConALexia({ disponible, tieneConsentimiento, versionAviso }: Props) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>('portada');
  const [voz, setVoz] = useState<string>(PREDETERMINADA);
  const [eligiendoVoz, setEligiendoVoz] = useState(false);
  const [pidiendoAviso, setPidiendoAviso] = useState(false);
  const [consentido, setConsentido] = useState(tieneConsentimiento);
  const [estado, setEstado] = useState<AgentState>('idle');
  const [reconectando, setReconectando] = useState(false);
  const [silenciado, setSilenciado] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [viendoFuentes, setViendoFuentes] = useState(false);

  const clienteRef = useRef<LiveClient | null>(null);
  const llamadaRef = useRef<string | null>(null);
  const relojRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segundosRef = useRef(0);
  const nuevaRondaRef = useRef(true);
  const tarjetaRef = useRef<HTMLDivElement | null>(null);

  // La voz elegida se recuerda en este navegador.
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CLAVE_VOZ);
      if (guardada && VOCES.some((v) => v.id === guardada)) setVoz(guardada);
    } catch {
      /* sin almacenamiento: la predeterminada */
    }
  }, []);

  useEffect(() => {
    clienteRef.current?.setMuted(silenciado);
  }, [silenciado]);

  // Al salir de la pantalla con la llamada abierta, se corta.
  useEffect(() => {
    return () => {
      if (relojRef.current) clearInterval(relojRef.current);
      void clienteRef.current?.stop();
    };
  }, []);

  // Cuando el usuario vuelve a hablar empieza una respuesta nueva: sus
  // fuentes reemplazan a las de la anterior.
  useEffect(() => {
    if (estado === 'listening') nuevaRondaRef.current = true;
  }, [estado]);

  const vozActual = VOCES.find((v) => v.id === voz) ?? VOCES[0];

  function elegirVoz(id: string) {
    setVoz(id);
    setEligiendoVoz(false);
    try {
      localStorage.setItem(CLAVE_VOZ, id);
    } catch {
      /* no se recuerda */
    }
  }

  function iniciar() {
    if (!consentido) {
      setPidiendoAviso(true);
      return;
    }
    void conectar();
  }

  async function conectar() {
    setEtapa('conectando');
    setFuentes([]);
    setSegundos(0);
    segundosRef.current = 0;
    requestAnimationFrame(() =>
      tarjetaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    try {
      const crear = await fetch('/api/voice/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voz }),
      });
      const creada = await crear.json();
      if (!crear.ok) throw new Error(creada?.message || creada?.detail || creada?.error || 'No se pudo crear la llamada');
      const id = creada.call.id as string;
      llamadaRef.current = id;

      const cfgRes = await fetch('/api/voice/session-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: id }),
      });
      const cfg = await cfgRes.json();
      if (!cfgRes.ok) throw new Error(cfg?.detail || cfg?.error || 'No se pudo preparar la llamada');

      const cliente = new LiveClient({
        apiKey: cfg.api_key,
        model: cfg.model,
        voiceId: cfg.voice_id,
        systemInstruction: cfg.system_instruction,
        initialGreetingPrompt: cfg.initial_greeting
          ? `Hola, acabo de conectar. Usa EXACTAMENTE este saludo textual sin modificarlo ni parafrasearlo: "${cfg.initial_greeting}". Luego espera mi pregunta en silencio.`
          : undefined,
        tools: cfg.tools,
        callId: id,
        onToolCall: (nombre, args) => buscarNormativa(id, nombre, args),
        onTranscript: (hablante, texto, ts) => guardarTurno(id, hablante, texto, ts),
        onStateChange: setEstado,
        onError: (m) => toast.error(m),
        onReconnecting: setReconectando,
        onLost: (motivo) => {
          toast.error('Se perdió la conexión con A-LexIA', {
            description: `La llamada quedó guardada hasta donde llegó (${motivo}).`,
          });
          void colgar();
        },
      });
      await cliente.start();
      clienteRef.current = cliente;
      setEtapa('activa');
      relojRef.current = setInterval(() => {
        segundosRef.current += 1;
        setSegundos(segundosRef.current);
      }, 1000);
    } catch (e) {
      toast.error((e as Error).message.slice(0, 160));
      // Una llamada que no llegó a conectar no debe quedar «En curso».
      const id = llamadaRef.current;
      if (id) {
        void fetch(`/api/voice/calls/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'failed' }),
        });
      }
      llamadaRef.current = null;
      void clienteRef.current?.stop();
      clienteRef.current = null;
      setEtapa('portada');
    }
  }

  async function buscarNormativa(id: string, nombre: string, args: Record<string, unknown>) {
    if (nombre !== 'search_normativa') return JSON.stringify({ error: 'function not implemented' });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch('/api/voice/search-normativa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: (args.query as string) || '',
          filter_type: (args.filter_type as string) ?? null,
          call_id: id,
        }),
        signal: ctrl.signal,
      });
      const j = await r.json();
      if (r.ok && Array.isArray(j.citations)) {
        const nuevas = j.citations as Fuente[];
        // Una búsqueda trae varios fragmentos del mismo documento: la
        // lista enseña cada documento una sola vez.
        const clave = (f: Fuente) => f.document_id || `${f.citation}|${f.title}`;
        setFuentes((previas) => {
          const lista = nuevaRondaRef.current ? [] : [...previas];
          nuevaRondaRef.current = false;
          const vistas = new Set(lista.map(clave));
          for (const f of nuevas) {
            if (vistas.has(clave(f))) continue;
            vistas.add(clave(f));
            lista.push(f);
          }
          return lista;
        });
      }
      return r.ok ? j.content : `error: ${j.error || 'desconocido'}`;
    } catch (e) {
      return (e as Error).name === 'AbortError'
        ? 'La búsqueda en la base normativa tardó demasiado. Responde con tu conocimiento general y avisa al usuario que verificarías el numeral exacto en el portal del OECE.'
        : `error de bridge: ${(e as Error).message}`;
    } finally {
      clearTimeout(t);
    }
  }

  function guardarTurno(id: string, hablante: 'user' | 'assistant', texto: string, ts: number) {
    const persistir = async (intento = 1): Promise<void> => {
      try {
        const r = await fetch('/api/voice/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ call_id: id, speaker: hablante, timestamp_seconds: ts, text: texto }),
          keepalive: true,
        });
        if (!r.ok && intento < 3) {
          await new Promise((res) => setTimeout(res, 300 * intento));
          return persistir(intento + 1);
        }
      } catch {
        if (intento < 3) {
          await new Promise((res) => setTimeout(res, 300 * intento));
          return persistir(intento + 1);
        }
      }
    };
    void persistir();
  }

  async function colgar() {
    const id = llamadaRef.current;
    if (!id) return;
    llamadaRef.current = null;
    setEtapa('cerrando');
    const cliente = clienteRef.current;
    clienteRef.current = null;
    if (relojRef.current) {
      clearInterval(relojRef.current);
      relojRef.current = null;
    }
    try {
      await cliente?.stop();
      const uso = cliente?.getUsageTokens();
      await fetch(`/api/voice/calls/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          duration_seconds: segundosRef.current,
          tokens_in: uso?.promptTokenCount || 0,
          tokens_out: uso?.responseTokenCount || 0,
        }),
      });
      const audio = cliente?.getRecordedBlob();
      if (audio && audio.size > 1024) {
        const fd = new FormData();
        fd.append('audio', new File([audio], `${id}.webm`, { type: audio.type || 'audio/webm' }));
        void fetch(`/api/voice/calls/${id}/upload-audio`, { method: 'POST', body: fd }).catch(() => {});
      }
      void fetch(`/api/voice/calls/${id}/summarize`, { method: 'POST', keepalive: true }).catch(() => {});
      toast.success('Llamada finalizada');
      router.push(`/llamadas/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setEtapa('portada');
    }
  }

  if (etapa === 'activa' || etapa === 'cerrando' || etapa === 'conectando') {
    return (
      <div ref={tarjetaRef}>
        <LlamadaEnCurso
          etapa={etapa}
          estado={estado}
          reconectando={reconectando}
          segundos={segundos}
          silenciado={silenciado}
          onSilenciar={() => setSilenciado((s) => !s)}
          onColgar={() => void colgar()}
          fuentes={fuentes}
          onVerFuentes={() => setViendoFuentes(true)}
          nombreDeVoz={vozActual.nombre}
        />
        <Sheet open={viendoFuentes} onOpenChange={setViendoFuentes}>
          <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto sm:mx-auto sm:max-w-xl sm:rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Fuentes de la respuesta</SheetTitle>
              <SheetDescription>
                Lo que A-LexIA consultó en la biblioteca para responderte.
              </SheetDescription>
            </SheetHeader>
            <ul className="mt-4 space-y-2">
              {fuentes.map((f) => (
                <li key={f.document_id || `${f.citation}|${f.title}`}>
                  {f.document_id ? (
                    <Link
                      href={`/biblioteca/documento/${f.document_id}`}
                      target="_blank"
                      className="flex items-start gap-2.5 rounded-xl border border-border p-3 transition-colors hover:border-consultar-300 hover:bg-consultar-50/60 dark:hover:bg-consultar-900/20"
                    >
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-consultar-500" />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {getDocTypeMeta(f.type ?? '').label}
                        </span>
                        <span className="block text-[13.5px] font-semibold leading-snug">{f.title}</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-consultar-500" />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {getDocTypeMeta(f.type ?? '').label}
                        </span>
                        <span className="block text-[13.5px] font-semibold leading-snug">{f.title}</span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <>
      <section
        ref={tarjetaRef}
        className="flex flex-col items-center rounded-2xl border border-border bg-card px-5 py-10 text-center shadow-soft sm:py-14"
      >
        <h2 className="text-2xl font-bold tracking-tight sm:text-[1.8rem]">
          {disponible ? '¿Listo para hablar?' : 'La voz no está en tu plan'}
        </h2>
        <p className="mt-1.5 max-w-sm text-pretty text-[14.5px] leading-relaxed text-muted-foreground">
          {disponible
            ? 'Presiona el botón y cuéntale tu consulta a A-LexIA'
            : 'Actualiza tu plan para conversar por voz con A-LexIA y recibir respuestas con su sustento citado.'}
        </p>

        {disponible ? (
          <>
            <button
              type="button"
              onClick={iniciar}
              aria-label="Iniciar conversación"
              className="group relative mt-8 inline-flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-consultar-400/40 motion-safe:animate-companero-onda"
                  style={{ animationDelay: `${i * 0.6}s` }}
                />
              ))}
              <span className="absolute inset-4 rounded-full bg-consultar-500/10" />
              <span className="relative inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-consultar-400 to-consultar-600 text-white shadow-glow-strong transition-transform group-hover:scale-105">
                <Mic className="h-10 w-10" strokeWidth={1.9} />
              </span>
            </button>

            <Button
              onClick={iniciar}
              size="lg"
              variant="glow"
              className="mt-8 h-14 w-full max-w-sm rounded-full text-[16px]"
            >
              <Mic className="h-5 w-5" />
              Iniciar conversación
              <ChevronRight className="ml-auto h-5 w-5" />
            </Button>

            <div className="mt-4 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-consultar-50 text-consultar-600 dark:bg-consultar-900/40 dark:text-consultar-300">
                <Volume2 className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-tight">{vozActual.nombre}</span>
                <span className="block text-[12.5px] text-muted-foreground">{vozActual.estilo}</span>
              </span>
              {vozActual.id === PREDETERMINADA && (
                <span className="hidden rounded-full border border-emerald-300/70 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline">
                  Predeterminada
                </span>
              )}
              <button
                type="button"
                onClick={() => setEligiendoVoz(true)}
                className="inline-flex shrink-0 items-center gap-0.5 text-[13.5px] font-semibold text-consultar-600 hover:text-consultar-700 dark:text-consultar-400"
              >
                Cambiar
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-6 grid w-full max-w-md grid-cols-3 divide-x divide-border text-[12px] leading-snug text-muted-foreground">
              {[
                { icono: ShieldCheck, texto: 'Respuestas con sustento' },
                { icono: FileText, texto: 'Fuentes especializadas' },
                { icono: Zap, texto: 'Rápido y confiable' },
              ].map((r) => (
                <li key={r.texto} className="flex flex-col items-center gap-1.5 px-2">
                  <r.icono className="h-5 w-5 text-consultar-500" strokeWidth={1.8} />
                  {r.texto}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Crown className="h-4 w-4" />
            Ver planes
          </Link>
        )}
      </section>

      <Dialog open={eligiendoVoz} onOpenChange={setEligiendoVoz}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elige la voz de A-LexIA</DialogTitle>
            <DialogDescription>Se recordará para tus próximas consultas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(['femenina', 'masculina'] as const).map((grupo) => (
              <div key={grupo}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {grupo === 'femenina' ? 'Voces femeninas' : 'Voces masculinas'}
                </p>
                <div className="space-y-2">
                  {VOCES.filter((v) => v.genero === grupo).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => elegirVoz(v.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                        v.id === voz
                          ? 'border-consultar-400 bg-consultar-50/70 dark:border-consultar-600 dark:bg-consultar-900/30'
                          : 'border-border hover:border-consultar-300',
                      )}
                    >
                      <Volume2 className="h-4 w-4 shrink-0 text-consultar-500" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold">
                          {v.nombre}
                          {v.id === PREDETERMINADA && (
                            <span className="ml-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Predeterminada
                            </span>
                          )}
                        </span>
                        <span className="block text-[12.5px] text-muted-foreground">{v.estilo}</span>
                      </span>
                      {v.id === voz && <Check className="h-4 w-4 text-consultar-600" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AvisoDeVoz
        abierto={pidiendoAviso}
        onCerrar={() => setPidiendoAviso(false)}
        version={versionAviso}
        onAceptado={() => {
          setConsentido(true);
          setPidiendoAviso(false);
          void conectar();
        }}
      />
    </>
  );
}

// ───────────────────────── La llamada ─────────────────────────

const ESTADOS = {
  escuchando: { imagen: '/marca/voz/escuchando.webp', texto: 'Te estoy escuchando…' },
  preparando: { imagen: '/marca/voz/preparando.webp', texto: 'Preparando tu respuesta…' },
  consultando: { imagen: '/marca/voz/consultando.webp', texto: 'Consultando fuentes…' },
  respondiendo: { imagen: '/marca/voz/respondiendo.webp', texto: 'A-LexIA está respondiendo…' },
} as const;

function vistaDe(estado: AgentState): keyof typeof ESTADOS {
  if (estado === 'thinking') return 'preparando';
  if (estado === 'searching') return 'consultando';
  if (estado === 'speaking') return 'respondiendo';
  return 'escuchando';
}

const FUENTES_QUE_CONSULTA = [
  { icono: BookOpen, texto: 'Ley N.° 32069' },
  { icono: ScrollText, texto: 'Reglamento' },
  { icono: Landmark, texto: 'OECE' },
  { icono: Gavel, texto: 'TCP' },
];

function LlamadaEnCurso({
  etapa,
  estado,
  reconectando,
  segundos,
  silenciado,
  onSilenciar,
  onColgar,
  fuentes,
  onVerFuentes,
  nombreDeVoz,
}: {
  etapa: Etapa;
  estado: AgentState;
  reconectando: boolean;
  segundos: number;
  silenciado: boolean;
  onSilenciar: () => void;
  onColgar: () => void;
  fuentes: Fuente[];
  onVerFuentes: () => void;
  nombreDeVoz: string;
}) {
  const vista = etapa === 'conectando' ? 'escuchando' : vistaDe(estado);
  const e = ESTADOS[vista];
  const texto =
    etapa === 'conectando'
      ? 'Conectando con A-LexIA…'
      : etapa === 'cerrando'
        ? 'Guardando la llamada…'
        : reconectando
          ? 'Reconectando… no cuelgues'
          : e.texto;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border border-border bg-gradient-to-b from-consultar-50/70 to-card px-5 pb-6 pt-5 shadow-soft dark:from-consultar-900/20">
      <div className="flex w-full items-center justify-between rounded-full border border-border bg-card px-4 py-2.5 shadow-soft">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              etapa === 'activa' && !reconectando ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-amber-400',
            )}
          />
          {etapa === 'activa' ? 'Llamada activa' : etapa === 'conectando' ? 'Conectando' : 'Finalizando'}
        </span>
        <span className="font-mono text-lg font-bold tabular-nums">{reloj(segundos)}</span>
      </div>

      <div className="relative mt-7 h-56 w-56 sm:h-60 sm:w-60">
        {(vista === 'escuchando' || vista === 'respondiendo') && etapa === 'activa' && (
          <>
            {[0, 1].map((i) => (
              <span
                key={i}
                aria-hidden
                className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-consultar-300/50 motion-safe:animate-companero-onda"
                style={{ animationDelay: `${i * 0.9}s` }}
              />
            ))}
          </>
        )}
        {(Object.keys(ESTADOS) as Array<keyof typeof ESTADOS>).map((k) => (
          <Image
            key={k}
            src={ESTADOS[k].imagen}
            alt={k === vista ? `A-LexIA: ${ESTADOS[k].texto}` : ''}
            width={480}
            height={480}
            priority
            className={cn(
              'absolute inset-0 h-full w-full select-none rounded-full transition-opacity duration-300',
              k === vista ? 'opacity-100' : 'opacity-0',
            )}
            draggable={false}
          />
        ))}
      </div>

      <div className="mt-3 flex h-8 items-center justify-center" aria-hidden>
        {etapa === 'activa' && !reconectando && (vista === 'escuchando' || vista === 'respondiendo') && (
          <Ondas activas={vista === 'respondiendo' || estado === 'listening'} />
        )}
        {(etapa !== 'activa' || reconectando) && <Loader2 className="h-5 w-5 animate-spin text-consultar-500" />}
      </div>

      <p className="mt-1 text-center text-xl font-bold tracking-tight" aria-live="polite">
        {texto}
      </p>

      <div className="mt-3 flex min-h-[4.5rem] flex-col items-center justify-start">
        {etapa === 'activa' && vista === 'preparando' && <Puntos />}
        {etapa === 'activa' && vista === 'consultando' && (
          <div className="grid grid-cols-2 gap-2">
            {FUENTES_QUE_CONSULTA.map((f) => (
              <span
                key={f.texto}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium shadow-soft"
              >
                <f.icono className="h-3.5 w-3.5 text-consultar-600" />
                {f.texto}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-start justify-center gap-10">
        <button
          type="button"
          onClick={onSilenciar}
          disabled={etapa !== 'activa'}
          aria-label={silenciado ? 'Activar micrófono' : 'Silenciar micrófono'}
          className="flex flex-col items-center gap-1.5 disabled:opacity-50"
        >
          <span
            className={cn(
              'inline-flex h-16 w-16 items-center justify-center rounded-full border shadow-soft transition-colors',
              silenciado
                ? 'border-consultar-600 bg-consultar-600 text-white'
                : 'border-border bg-card text-consultar-700 hover:bg-secondary dark:text-consultar-300',
            )}
          >
            {silenciado ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </span>
          <span className="text-[13px] font-medium">{silenciado ? 'Activar' : 'Silenciar'}</span>
        </button>
        <button
          type="button"
          onClick={onColgar}
          disabled={etapa === 'cerrando'}
          aria-label="Colgar"
          className="flex flex-col items-center gap-1.5 disabled:opacity-60"
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-colors hover:bg-rose-600">
            {etapa === 'cerrando' ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
          </span>
          <span className="text-[13px] font-medium">Colgar</span>
        </button>
      </div>

      {fuentes.length > 0 && (
        <button
          type="button"
          onClick={onVerFuentes}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-soft transition-colors hover:border-consultar-300"
        >
          <FileText className="h-5 w-5 text-consultar-600" />
          <span className="flex-1 text-[14px] font-semibold text-consultar-700 dark:text-consultar-300">
            Ver fuentes de la respuesta
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11.5px] font-semibold">{fuentes.length}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <p className="mt-4 text-center text-[11.5px] leading-snug text-muted-foreground">
        Voz: {nombreDeVoz} · Estás hablando con IA: información orientativa, no asesoría legal.
      </p>
    </section>
  );
}

function Ondas({ activas }: { activas: boolean }) {
  const alturas = [10, 18, 26, 14, 30, 20, 12, 24, 16, 28, 12, 20, 10];
  return (
    <span className="flex h-8 items-center gap-[3px]">
      {alturas.map((h, i) => (
        <span
          key={i}
          className={cn(
            'w-[3px] origin-center rounded-full bg-consultar-500',
            activas ? 'motion-safe:animate-barra-de-voz' : 'opacity-40',
          )}
          style={{ height: h, animationDelay: `${(i % 5) * 0.12}s` }}
        />
      ))}
    </span>
  );
}

function Puntos() {
  return (
    <span className="flex items-center gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full bg-consultar-500 motion-safe:animate-pulse-soft"
          style={{ animationDelay: `${i * 0.25}s`, opacity: 1 - i * 0.25 }}
        />
      ))}
    </span>
  );
}

function reloj(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// ───────────────────────── El aviso, una sola vez ─────────────────────────

const CASILLAS = [
  {
    clave: 'accepted_ia_no_lawyer',
    texto:
      'Acepto que esta es una conversación con inteligencia artificial, no con un abogado licenciado. La información es orientativa y no constituye asesoría legal profesional.',
  },
  {
    clave: 'accepted_recording',
    texto:
      'Acepto que la llamada sea grabada y la transcripción almacenada en mi cuenta para que pueda consultarla después. Puedo eliminar mis grabaciones en cualquier momento.',
  },
  {
    clave: 'accepted_data_in_google_cloud',
    texto:
      'Entiendo que mis datos se procesan en servidores de Google Cloud (Estados Unidos / Brasil) bajo los términos de privacidad de A-LexIA y Google.',
  },
  {
    clave: 'accepted_no_confidential_third_party',
    texto:
      'Acepto no compartir información confidencial de terceros, datos personales sensibles ni secretos profesionales en esta llamada.',
  },
] as const;

function AvisoDeVoz({
  abierto,
  onCerrar,
  onAceptado,
  version,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onAceptado: () => void;
  version: string;
}) {
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const todas = CASILLAS.every((c) => marcadas[c.clave]);

  async function aceptar() {
    if (!todas) return;
    setGuardando(true);
    try {
      const res = await fetch('/api/voice/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(CASILLAS.map((c) => [c.clave, true]))),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.detail || `HTTP ${res.status}`);
      }
      onAceptado();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Antes de tu primera llamada</DialogTitle>
          <DialogDescription>
            Necesitamos tu consentimiento una sola vez (Ley N.° 29733).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5">
          {CASILLAS.map((c) => (
            <label
              key={c.clave}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                marcadas[c.clave] ? 'border-brand-500/50 bg-brand-50/40 dark:bg-brand-950/30' : 'border-border',
              )}
            >
              <input
                type="checkbox"
                checked={!!marcadas[c.clave]}
                onChange={(e) => setMarcadas((m) => ({ ...m, [c.clave]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-border accent-brand-600"
              />
              <span className="text-[13px] leading-relaxed">{c.texto}</span>
            </label>
          ))}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            Aviso {version} ·{' '}
            <Link href="/legal/privacidad-voz" target="_blank" className="underline">
              Política de privacidad de voz
            </Link>
          </span>
          <Button onClick={aceptar} disabled={!todas} loading={guardando}>
            Acepto e iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
