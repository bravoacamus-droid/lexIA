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
  private playbackQueue: ArrayBuffer[] = [];
  private isPlayingAudio = false;
  private startedAt = 0;
  private accumulatedUserText = '';
  private accumulatedAgentText = '';
  private muted = false;
  private agentState: AgentState = 'idle';
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

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
    this.ws.onclose = () => this.cleanup();
    this.ws.onerror = () => this.cfg.onError('Error de conexión con Gemini Live');

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
        if (this.accumulatedUserText.trim()) {
          this.cfg.onTranscript(
            'user',
            this.accumulatedUserText.trim(),
            this.elapsedSeconds(),
          );
          this.accumulatedUserText = '';
        }
        if (this.accumulatedAgentText.trim()) {
          this.cfg.onTranscript(
            'assistant',
            this.accumulatedAgentText.trim(),
            this.elapsedSeconds(),
          );
          this.accumulatedAgentText = '';
        }
        this.setState('idle');
      }
      if (sc.interrupted) {
        this.playbackQueue = [];
        this.setState('listening');
      }
      return;
    }

    if (msg.toolCall) {
      this.setState('thinking');
      for (const fc of msg.toolCall.functionCalls) {
        try {
          const result = await this.cfg.onToolCall(fc.name, fc.args);
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

  private queueAudioPlayback(b64: string) {
    const buffer = base64ToArrayBuffer(b64);
    this.playbackQueue.push(buffer);
    if (!this.isPlayingAudio) {
      void this.processPlaybackQueue();
    }
  }

  private async processPlaybackQueue() {
    if (!this.playbackContext || this.isPlayingAudio) return;
    this.isPlayingAudio = true;
    while (this.playbackQueue.length > 0) {
      const buffer = this.playbackQueue.shift();
      if (!buffer) continue;
      await this.playPCMBuffer(buffer);
    }
    this.isPlayingAudio = false;
    this.setState('idle');
  }

  private async playPCMBuffer(pcmBuffer: ArrayBuffer): Promise<void> {
    if (!this.playbackContext) return;
    // Gemini envía Int16 PCM. Convertir a Float32 para AudioBuffer.
    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }
    const audioBuf = this.playbackContext.createBuffer(1, float32.length, 24000);
    audioBuf.copyToChannel(float32, 0);
    return new Promise<void>((resolve) => {
      const src = this.playbackContext!.createBufferSource();
      src.buffer = audioBuf;
      src.connect(this.playbackContext!.destination);
      src.onended = () => resolve();
      src.start();
    });
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
    this.playbackQueue = [];
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
