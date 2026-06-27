'use client';

/**
 * Cliente para Gemini Live API (BidiGenerateContent).
 *
 * Encapsula:
 *  - Conexión WebSocket directa a Gemini Live.
 *  - Captura de audio del micrófono con AudioWorklet (16-bit PCM 16kHz).
 *  - Reproducción del audio recibido del agente (24kHz PCM).
 *  - Manejo de function calls hacia el backend (search_normativa).
 *  - Captura de transcripciones que se persisten al backend.
 *  - Eventos para que la UI muestre estados (listening / thinking /
 *    speaking / idle).
 */

export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface LiveClientConfig {
  apiKey: string;
  model: string;
  voiceId: string;
  systemInstruction: string;
  tools: unknown[];
  callId: string;
  /** Callback para cuando la API quiere ejecutar un tool. */
  onToolCall: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<string>;
  /** Callback para persistir un turno de transcripción. */
  onTranscript: (
    speaker: 'user' | 'assistant',
    text: string,
    timestampSec: number,
  ) => void;
  /** Callback para cambios de estado del agente. */
  onStateChange: (state: AgentState) => void;
  /** Callback para errores. */
  onError: (message: string) => void;
}

interface ToolCallMsg {
  name: string;
  id: string;
  args: Record<string, unknown>;
}

interface GeminiServerMessage {
  setupComplete?: object;
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }>;
    };
    turnComplete?: boolean;
    interrupted?: boolean;
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
  };
  toolCall?: {
    functionCalls: ToolCallMsg[];
  };
  goAway?: { timeLeft: string };
  sessionResumptionUpdate?: object;
  usageMetadata?: {
    promptTokenCount?: number;
    responseTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Limpia un fragmento de transcripción que Gemini devuelve.
 * El modelo a veces emite tokens internos de control (<ctrl46>),
 * caracteres unicode raros o transcribe ruido como si fuera otro
 * idioma. Filtrar antes de persistir mejora la UX del historial.
 */
function sanitizeTranscript(text: string): string {
  let s = text;
  // Quitar tokens de control tipo <ctrl46>, <ctrl42><ctrl42>
  s = s.replace(/<\/?ctrl\d+>/gi, '');
  // Quitar tokens de control específicos del modelo
  s = s.replace(/<\/?(?:noinput|noaudio|silence|pad)>/gi, '');
  // Colapsar espacios múltiples
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Detecta si un texto es probable transcripción de ruido en idioma
 * que no es español. Si tiene proporción alta de caracteres no
 * latinos (árabe, hindi, chino, cirílico, etc.) lo marcamos como ruido
 * para no guardarlo en la transcripción del usuario.
 */
function isLikelyNoise(text: string): boolean {
  if (text.length < 2) return true;
  // Detectar bloques unicode no latinos
  const arabic = /[؀-ۿ]/;
  const devanagari = /[ऀ-ॿ]/;
  const cjk = /[一-鿿]/;
  const cyrillic = /[Ѐ-ӿ]/;
  if (arabic.test(text) || devanagari.test(text) || cjk.test(text) || cyrillic.test(text)) {
    return true;
  }
  // Solo caracteres no alfanuméricos
  if (!/[a-záéíóúñü0-9]/i.test(text)) return true;
  return false;
}

const LIVE_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export class LiveClient {
  private cfg: LiveClientConfig;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isPlayingAudio = false;
  private startedAt = 0;
  private accumulatedUserText = '';
  private accumulatedAgentText = '';
  private muted = false;
  private agentState: AgentState = 'idle';
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  /** Tokens acumulados durante la sesión (último usageMetadata recibido). */
  private lastUsage: {
    promptTokenCount: number;
    responseTokenCount: number;
    totalTokenCount: number;
  } = { promptTokenCount: 0, responseTokenCount: 0, totalTokenCount: 0 };

  constructor(config: LiveClientConfig) {
    this.cfg = config;
  }

  async start() {
    this.startedAt = Date.now();
    // 1. Abrir WebSocket
    const url = `${LIVE_WS_URL}?key=${encodeURIComponent(this.cfg.apiKey)}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('No WS'));
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('No se pudo conectar a Gemini Live'));
      setTimeout(() => reject(new Error('Timeout abriendo WebSocket')), 10000);
    });
    this.ws.onmessage = (e) => this.handleServerMessage(e.data);
    this.ws.onclose = (ev) => {
      // Gemini cierra con código 1008 + reason específico cuando hay
      // problema con el modelo, permisos o billing. Lo mostramos al
      // usuario para que sepa qué hacer.
      if (ev.code !== 1000 && ev.code !== 1005) {
        const reason = ev.reason || 'sin detalle';
        this.cfg.onError(
          `Llamada cerrada (código ${ev.code}): ${reason.slice(0, 200)}`,
        );
      }
      this.cleanup();
    };
    this.ws.onerror = () => this.cfg.onError('Error de red con Gemini Live');

    // 2. Enviar setup
    this.ws.send(
      JSON.stringify({
        setup: {
          model: `models/${this.cfg.model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: this.cfg.voiceId },
              },
              languageCode: 'es-US',
            },
          },
          systemInstruction: {
            parts: [{ text: this.cfg.systemInstruction }],
          },
          tools: this.cfg.tools,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      }),
    );

    // 3. Inicializar audio
    await this.setupAudioCapture();
    this.setupPlayback();
  }

  private async setupAudioCapture() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.audioContext = new AudioContext({ sampleRate: 48000 });
    await this.audioContext.audioWorklet.addModule('/voice/pcm-worklet.js');
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
    this.workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (this.muted) return;
      this.sendAudioChunk(e.data);
      this.setState('listening');
    };
    this.sourceNode.connect(this.workletNode);

    // Grabar el audio del usuario con MediaRecorder.
    // Usamos webm que es el formato más compatible con browsers modernos.
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 32000,
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      // Capturar chunks cada 1s para no perder mucho si crash
      this.mediaRecorder.start(1000);
    } catch (e) {
      console.warn('[live] MediaRecorder no disponible:', (e as Error).message);
    }
  }

  /**
   * Devuelve el blob con la grabación del audio del usuario, o null
   * si MediaRecorder no estaba activo.
   */
  getRecordedBlob(): Blob | null {
    if (this.recordedChunks.length === 0) return null;
    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    return new Blob(this.recordedChunks, { type: mimeType });
  }

  /**
   * Devuelve los tokens consumidos en la sesión hasta el momento.
   * Gemini Live API los envía periódicamente vía usageMetadata.
   */
  getUsageTokens(): {
    promptTokenCount: number;
    responseTokenCount: number;
    totalTokenCount: number;
  } {
    return { ...this.lastUsage };
  }

  private setupPlayback() {
    // Gemini envía audio en 24kHz PCM
    this.playbackContext = new AudioContext({ sampleRate: 24000 });
  }

  private sendAudioChunk(pcmBuffer: ArrayBuffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const b64 = arrayBufferToBase64(pcmBuffer);
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: b64 }],
        },
      }),
    );
  }

  private async handleServerMessage(raw: string | ArrayBuffer) {
    let msg: GeminiServerMessage;
    try {
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (msg.setupComplete) {
      console.log('[live] setup complete');
      this.setState('idle');
      return;
    }

    if (msg.usageMetadata) {
      this.lastUsage = {
        promptTokenCount: msg.usageMetadata.promptTokenCount ?? 0,
        responseTokenCount: msg.usageMetadata.responseTokenCount ?? 0,
        totalTokenCount: msg.usageMetadata.totalTokenCount ?? 0,
      };
    }

    if (msg.serverContent) {
      const sc = msg.serverContent;
      if (sc.inputTranscription?.text) {
        this.accumulatedUserText += sc.inputTranscription.text;
      }
      if (sc.outputTranscription?.text) {
        this.accumulatedAgentText += sc.outputTranscription.text;
        this.setState('speaking');
      }
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.mimeType?.includes('audio')) {
            this.queueAudioPlayback(part.inlineData.data);
            this.setState('speaking');
          }
        }
      }
      if (sc.turnComplete) {
        const userClean = sanitizeTranscript(this.accumulatedUserText);
        if (userClean && !isLikelyNoise(userClean)) {
          this.cfg.onTranscript('user', userClean, this.elapsedSeconds());
        }
        this.accumulatedUserText = '';

        const agentClean = sanitizeTranscript(this.accumulatedAgentText);
        if (agentClean && !isLikelyNoise(agentClean)) {
          this.cfg.onTranscript('assistant', agentClean, this.elapsedSeconds());
        }
        this.accumulatedAgentText = '';

        this.setState('idle');
      }
      if (sc.interrupted) {
        // Cancelar audio en cola: resetear el cursor de playback al
        // tiempo actual hace que cualquier chunk programado después
        // sea silenciado por la siguiente sobreescritura.
        if (this.playbackContext) {
          this.nextPlaybackTime = this.playbackContext.currentTime;
        }
        this.setState('listening');
      }
      return;
    }

    if (msg.toolCall) {
      this.setState('thinking');
      for (const fc of msg.toolCall.functionCalls) {
        // Cinturón de seguridad: incluso si la implementación del
        // onToolCall ya tiene timeout interno, garantizamos aquí un
        // máximo de 18s antes de devolver una respuesta de fallback
        // al modelo. Sin esto un onToolCall que nunca resuelva deja
        // al modelo esperando y la conversación se rompe en silencio.
        const TIMEOUT_MS = 18000;
        const timeoutResult = new Promise<string>((resolve) =>
          setTimeout(
            () =>
              resolve(
                'Timeout consultando la base normativa. Responde con tu mejor conocimiento general y sugiere verificar en el portal del OECE.',
              ),
            TIMEOUT_MS,
          ),
        );
        try {
          const result = await Promise.race([
            this.cfg.onToolCall(fc.name, fc.args),
            timeoutResult,
          ]);
          this.sendToolResponse(fc.id, fc.name, result);
        } catch (e) {
          this.sendToolResponse(
            fc.id,
            fc.name,
            JSON.stringify({ error: (e as Error).message }),
          );
        }
      }
      return;
    }
  }

  private sendToolResponse(id: string, name: string, content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        toolResponse: {
          functionResponses: [
            {
              id,
              name,
              response: { content },
            },
          ],
        },
      }),
    );
  }

  /** Timestamp del playback donde empezará el siguiente chunk. */
  private nextPlaybackTime = 0;

  private queueAudioPlayback(b64: string) {
    if (!this.playbackContext) return;
    const buffer = base64ToArrayBuffer(b64);
    // Convertir Int16 PCM a Float32 y reproducir inmediatamente
    // programado en el timeline del AudioContext para que los chunks
    // se encadenen sin gaps (lo que causaba el "ruido" tipo clic
    // entre fragmentos).
    const int16 = new Int16Array(buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    const audioBuf = this.playbackContext.createBuffer(1, float32.length, 24000);
    audioBuf.copyToChannel(float32, 0);
    const src = this.playbackContext.createBufferSource();
    src.buffer = audioBuf;
    src.connect(this.playbackContext.destination);
    const now = this.playbackContext.currentTime;
    const startAt = Math.max(now, this.nextPlaybackTime);
    src.start(startAt);
    this.nextPlaybackTime = startAt + audioBuf.duration;
    this.isPlayingAudio = true;
    src.onended = () => {
      // Si la cola ya terminó, marcar idle
      if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlaybackTime - 0.05) {
        this.isPlayingAudio = false;
      }
    };
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private setState(s: AgentState) {
    if (this.agentState !== s) {
      this.agentState = s;
      this.cfg.onStateChange(s);
    }
  }

  private elapsedSeconds(): number {
    return (Date.now() - this.startedAt) / 1000;
  }

  async stop() {
    // Parar MediaRecorder antes de cleanup para no perder el último chunk
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      const stopped = new Promise<void>((resolve) => {
        this.mediaRecorder!.onstop = () => resolve();
      });
      try {
        this.mediaRecorder.stop();
      } catch {
        /* ignore */
      }
      await Promise.race([stopped, new Promise((r) => setTimeout(r, 1500))]);
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {
        /* ignore */
      }
      this.workletNode = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* ignore */
      }
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.close();
    }
    this.audioContext = null;
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      void this.playbackContext.close();
    }
    this.playbackContext = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.nextPlaybackTime = 0;
    this.isPlayingAudio = false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}
