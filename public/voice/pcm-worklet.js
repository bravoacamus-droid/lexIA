/**
 * AudioWorklet processor que captura audio del micrófono y lo convierte
 * a PCM 16-bit mono a 16000 Hz (formato que espera Gemini Live API).
 *
 * Recibe el audio del navegador como Float32Array a la sample rate del
 * AudioContext (típicamente 48000 Hz), hace downsampling a 16000 y lo
 * convierte a Int16 (PCM 16-bit). Cada ~120ms envía un chunk al hilo
 * principal vía postMessage como ArrayBuffer.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.bufferSize = 1920; // ~120ms a 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.inputSampleRate = sampleRate; // global del worklet
    this.resampleRatio = this.inputSampleRate / this.targetSampleRate;
    this.sampleAccumulator = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    // Downsample por skip de muestras
    for (let i = 0; i < channel.length; i++) {
      this.sampleAccumulator += 1;
      if (this.sampleAccumulator >= this.resampleRatio) {
        this.buffer[this.bufferIndex++] = channel[i];
        this.sampleAccumulator -= this.resampleRatio;
        if (this.bufferIndex >= this.bufferSize) {
          this.flush();
        }
      }
    }
    return true;
  }

  flush() {
    // Calcular RMS del buffer (energía normalizada) para VAD del lado
    // cliente. La UI lo usa para pasar a "Pensando…" cuando el usuario
    // termina de hablar, sin esperar al primer audio del modelo — feedback
    // César 08/07/2026: "Te escucho…" se quedaba pegado mientras el
    // modelo procesaba, dando la sensación de que no había escuchado.
    let sumSq = 0;
    for (let i = 0; i < this.bufferIndex; i++) {
      sumSq += this.buffer[i] * this.buffer[i];
    }
    const rms = this.bufferIndex > 0 ? Math.sqrt(sumSq / this.bufferIndex) : 0;

    // Convertir Float32 [-1, 1] a Int16 PCM
    const int16 = new Int16Array(this.bufferIndex);
    for (let i = 0; i < this.bufferIndex; i++) {
      const s = Math.max(-1, Math.min(1, this.buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    // Enviamos también el rms como metadata. Solo el ArrayBuffer del
    // PCM es transferible; el rms viaja como número plano.
    this.port.postMessage(
      { buffer: int16.buffer, rms },
      [int16.buffer],
    );
    this.bufferIndex = 0;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
