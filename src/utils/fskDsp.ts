/**
 * FSK Digital Signal Processing (DSP) & Simulation Engine
 */

export interface FSKParams {
  f0: number; // Space frequency (Hz) for bit 0
  f1: number; // Mark frequency (Hz) for bit 1
  bitRate: number; // Bit rate (bps / baud)
  amplitude: number; // Carrier amplitude (V)
  continuousPhase: boolean; // Continuous Phase FSK (CPFSK)
  snrDb: number | null; // Noise SNR in dB (null = clean, no noise)
  sampleRate: number; // Sample rate (Hz)
}

export interface FSKSimulationResult {
  time: Float64Array;
  digitalData: Float64Array; // 0 or 1 levels
  clockSignal: Float64Array; // Digital clock transitions
  carrier0: Float64Array; // Pure Space carrier
  carrier1: Float64Array; // Pure Mark carrier
  modulatedSignal: Float64Array; // Resulting FSK wave (with noise if enabled)
  cleanModulatedSignal: Float64Array; // FSK without noise (for reference)
  demodulatedAnalog: Float64Array; // Filtered decision envelope
  demodulatedBits: number[]; // Detected bit array
  originalBits: number[]; // Source bit array
  bitDuration: number; // Tb in seconds
  samplesPerBit: number;
  totalDuration: number;
  bitErrorCount: number;
  ber: number; // Bit error rate (0.0 - 1.0)
  fftFrequencies: Float64Array; // FFT frequency bins (Hz)
  fftMagnitudeDb: Float64Array; // FFT power spectrum (dB)
}

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  f0: number;
  f1: number;
  bitRate: number;
  defaultText: string;
}

export const FSK_PRESETS: PresetConfig[] = [
  {
    id: 'slow-mo',
    name: 'Laboratorio Visual (Baja Frecuencia)',
    description: 'Frecuencias bajas ideales para observar ciclos y transiciones de onda con claridad.',
    f0: 4,
    f1: 12,
    bitRate: 2,
    defaultText: 'FSK',
  },
  {
    id: 'bell-103',
    name: 'Estándar Bell 103 (300 Baudios)',
    description: 'Utilizado en los primeros módems acústicos de telefonía analógica en EE.UU.',
    f0: 1070,
    f1: 1270,
    bitRate: 300,
    defaultText: 'OK',
  },
  {
    id: 'bell-202',
    name: 'Estándar Bell 202 / Caller ID (1200 Baud)',
    description: 'Protocolo de modulación FSK para identificación de llamadas telefónicas y telemetría.',
    f0: 2200,
    f1: 1200,
    bitRate: 1200,
    defaultText: 'CALL',
  },
  {
    id: 'v21',
    name: 'Estándar ITU-T V.21 (Canal 1)',
    description: 'Estándar internacional europeo para transmisión de datos sobre pares trenzados.',
    f0: 1180,
    f1: 980,
    bitRate: 300,
    defaultText: 'DATA',
  },
  {
    id: 'rtty',
    name: 'Radio Teletipo RTTY (Amateur RF)',
    description: 'Modulación por desplazamiento de frecuencia de radioaficionados con shift de 170 Hz.',
    f0: 2125,
    f1: 2295,
    bitRate: 45.45,
    defaultText: 'CQ',
  },
];

/**
 * Convert ASCII text string to binary bits array (8-bit ASCII / UTF-8 code point)
 */
export function textToBits(text: string): number[] {
  if (!text || text.length === 0) return [1, 0, 1, 0];
  const bits: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) & 0xff;
    for (let b = 7; b >= 0; b--) {
      bits.push((code >> b) & 1);
    }
  }
  return bits;
}

/**
 * Convert binary bits array back to ASCII text string
 */
export function bitsToText(bits: number[]): string {
  let result = '';
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | (bits[i + b] & 1);
    }
    if (byteVal >= 32 && byteVal <= 126) {
      result += String.fromCharCode(byteVal);
    } else {
      result += '·';
    }
  }
  return result;
}

/**
 * Generate pseudo-random bit sequence (PRBS)
 */
export function generateRandomBits(length: number): number[] {
  const count = Math.max(4, Math.min(64, length));
  const bits: number[] = [];
  for (let i = 0; i < count; i++) {
    bits.push(Math.random() >= 0.5 ? 1 : 0);
  }
  return bits;
}

/**
 * Box-Muller transform for Gaussian AWGN noise
 */
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Fast Radix-2 Cooley-Tukey FFT Implementation
 */
function calculateFFT(realInput: Float64Array): { frequencies: Float64Array; magnitudeDb: Float64Array } {
  // Target power of 2 for FFT
  const n = 1024;
  const sampleCount = Math.min(n, realInput.length);
  const real = new Float64Array(n);
  const imag = new Float64Array(n);

  // Apply Hann Window to reduce spectral leakage
  for (let i = 0; i < sampleCount; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (sampleCount - 1)));
    real[i] = realInput[i] * hann;
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;
      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey Radix-2 computation
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wlenR = Math.cos(angle);
    const wlenI = Math.sin(angle);
    const half = len >> 1;

    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < half; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI;
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + half] = uR - vR;
        imag[i + k + half] = uI - vI;

        const nextWR = wR * wlenR - wI * wlenI;
        wI = wR * wlenI + wI * wlenR;
        wR = nextWR;
      }
    }
  }

  // Calculate power spectrum in dB
  const halfN = n / 2;
  const frequencies = new Float64Array(halfN);
  const magnitudeDb = new Float64Array(halfN);
  let maxMag = 1e-12;

  const magLinear = new Float64Array(halfN);
  for (let i = 0; i < halfN; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    magLinear[i] = mag;
    if (mag > maxMag) maxMag = mag;
  }

  for (let i = 0; i < halfN; i++) {
    const normalized = magLinear[i] / maxMag;
    // Floor at -60 dB for clean visualization
    const db = 20 * Math.log10(Math.max(1e-3, normalized));
    magnitudeDb[i] = db;
  }

  return { frequencies, magnitudeDb };
}

/**
 * Main FSK Simulation Computation
 */
export function simulateFSK(bits: number[], params: FSKParams): FSKSimulationResult {
  const safeBits = bits.length > 0 ? bits : [1, 0, 1, 0];
  const { f0, f1, bitRate, amplitude, continuousPhase, snrDb, sampleRate } = params;

  const bitDuration = 1 / bitRate; // Tb
  const samplesPerBit = Math.max(32, Math.round(bitDuration * sampleRate));
  const totalSamples = safeBits.length * samplesPerBit;

  const time = new Float64Array(totalSamples);
  const digitalData = new Float64Array(totalSamples);
  const clockSignal = new Float64Array(totalSamples);
  const carrier0 = new Float64Array(totalSamples);
  const carrier1 = new Float64Array(totalSamples);
  const modulatedSignal = new Float64Array(totalSamples);
  const cleanModulatedSignal = new Float64Array(totalSamples);
  const demodulatedAnalog = new Float64Array(totalSamples);

  // Noise variance calculation from SNR (dB)
  let noiseSigma = 0;
  if (snrDb !== null && isFinite(snrDb)) {
    const snrLinear = Math.pow(10, snrDb / 10);
    // Signal power = A^2 / 2
    const signalPower = (amplitude * amplitude) / 2;
    const noisePower = signalPower / Math.max(1e-6, snrLinear);
    noiseSigma = Math.sqrt(noisePower);
  }

  let phase = 0;
  const dt = bitDuration / samplesPerBit;

  // 1. Generation of Digital, Clock, Carriers, and Modulated FSK Signal
  for (let bIndex = 0; bIndex < safeBits.length; bIndex++) {
    const bit = safeBits[bIndex];
    const targetFreq = bit === 1 ? f1 : f0;

    for (let s = 0; s < samplesPerBit; s++) {
      const globalSample = bIndex * samplesPerBit + s;
      const t = globalSample * dt;
      time[globalSample] = t;

      // Digital modulating wave: 1 or 0
      digitalData[globalSample] = bit;

      // Clock signal: square wave at bit rate (50% duty cycle)
      clockSignal[globalSample] = s < samplesPerBit / 2 ? 1 : 0;

      // Reference carriers
      carrier0[globalSample] = amplitude * Math.cos(2 * Math.PI * f0 * t);
      carrier1[globalSample] = amplitude * Math.cos(2 * Math.PI * f1 * t);

      // Phase calculation
      if (continuousPhase) {
        phase += 2 * Math.PI * targetFreq * dt;
      } else {
        // Discontinuous phase jumps with bit transition
        phase = 2 * Math.PI * targetFreq * t;
      }

      // Modulated FSK sample
      const cleanSample = amplitude * Math.cos(phase);
      cleanModulatedSignal[globalSample] = cleanSample;

      const noise = noiseSigma > 0 ? gaussianRandom() * noiseSigma : 0;
      modulatedSignal[globalSample] = cleanSample + noise;
    }
  }

  // 2. Demodulation using Non-Coherent Quadrature / Correlation Filter
  // For each bit window, we correlate the received modulated signal with f1 and f0
  const demodulatedBits: number[] = [];
  let bitErrorCount = 0;

  for (let bIndex = 0; bIndex < safeBits.length; bIndex++) {
    let corr0 = 0;
    let corr1 = 0;
    const startIdx = bIndex * samplesPerBit;

    // Window correlation across the bit duration
    for (let s = 0; s < samplesPerBit; s++) {
      const idx = startIdx + s;
      const t = time[idx];
      const received = modulatedSignal[idx];

      // Quadrature correlator projections (I and Q to be robust against phase shifts)
      const cos0 = Math.cos(2 * Math.PI * f0 * t);
      const sin0 = Math.sin(2 * Math.PI * f0 * t);
      const cos1 = Math.cos(2 * Math.PI * f1 * t);
      const sin1 = Math.sin(2 * Math.PI * f1 * t);

      corr0 += Math.abs(received * cos0) + Math.abs(received * sin0);
      corr1 += Math.abs(received * cos1) + Math.abs(received * sin1);

      // Generate continuous envelope for analog demodulation trace
      const runningDiff = (corr1 - corr0) / (s + 1);
      demodulatedAnalog[idx] = Math.max(-1.5, Math.min(1.5, runningDiff * 2));
    }

    // Decision rule: if corr1 > corr0 => detected bit is 1, else 0
    const detectedBit = corr1 >= corr0 ? 1 : 0;
    demodulatedBits.push(detectedBit);

    if (detectedBit !== safeBits[bIndex]) {
      bitErrorCount++;
    }
  }

  // 3. FFT Calculation on the Modulated Waveform
  const fftRes = calculateFFT(cleanModulatedSignal);
  const fftFrequencies = new Float64Array(fftRes.magnitudeDb.length);
  const nyquist = sampleRate / 2;
  for (let i = 0; i < fftFrequencies.length; i++) {
    fftFrequencies[i] = (i / fftFrequencies.length) * nyquist;
  }

  return {
    time,
    digitalData,
    clockSignal,
    carrier0,
    carrier1,
    modulatedSignal,
    cleanModulatedSignal,
    demodulatedAnalog,
    demodulatedBits,
    originalBits: safeBits,
    bitDuration,
    samplesPerBit,
    totalDuration: safeBits.length * bitDuration,
    bitErrorCount,
    ber: safeBits.length > 0 ? bitErrorCount / safeBits.length : 0,
    fftFrequencies,
    fftMagnitudeDb: fftRes.magnitudeDb,
  };
}

/**
 * Theoretical Carson's Rule Bandwidth calculation for FSK
 * B = 2 * (Delta_f + Rb)
 * where Delta_f = |f1 - f0| / 2 (frequency deviation)
 */
export function calculateCarsonBandwidth(f0: number, f1: number, bitRate: number): {
  bandwidth: number;
  deltaF: number;
  modulationIndex: number;
  centerFrequency: number;
} {
  const deltaF = Math.abs(f1 - f0) / 2;
  const modulationIndex = bitRate > 0 ? (2 * deltaF) / bitRate : 0;
  const bandwidth = 2 * (deltaF + bitRate);
  const centerFrequency = (f0 + f1) / 2;

  return {
    bandwidth,
    deltaF,
    modulationIndex,
    centerFrequency,
  };
}

/**
 * Web Audio Synthesizer to play acoustic FSK sound
 */
class FSKAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  async play(bits: number[], f0: number, f1: number, bitRate: number, volume = 0.25): Promise<void> {
    this.stop();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const bitDuration = 1 / bitRate;
    const sampleRate = this.ctx.sampleRate;
    const totalSamples = Math.floor(bits.length * bitDuration * sampleRate);

    if (totalSamples <= 0) return;

    const buffer = this.ctx.createBuffer(1, totalSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    let phase = 0;
    const dt = 1 / sampleRate;

    for (let b = 0; b < bits.length; b++) {
      const bit = bits[b];
      const freq = bit === 1 ? f1 : f0;
      const start = Math.floor(b * bitDuration * sampleRate);
      const end = Math.floor((b + 1) * bitDuration * sampleRate);

      for (let s = start; s < end && s < totalSamples; s++) {
        phase += 2 * Math.PI * freq * dt;
        channelData[s] = Math.sin(phase) * volume;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.onended = () => {
      this.isPlaying = false;
    };

    source.start();
    this.currentSource = source;
    this.isPlaying = true;
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // ignore already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  get active(): boolean {
    return this.isPlaying;
  }
}

export const fskAudio = new FSKAudioSynthesizer();
