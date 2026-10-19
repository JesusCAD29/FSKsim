import React, { useState } from 'react';
import {
  FSKParams,
  FSK_PRESETS,
  PresetConfig,
  textToBits,
  bitsToText,
  generateRandomBits,
  fskAudio,
} from '../utils/fskDsp';
import {
  Sliders,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Wand2,
  Binary,
  Type,
  Shuffle,
  ShieldAlert,
} from 'lucide-react';

interface SignalControlsProps {
  bits: number[];
  setBits: (bits: number[]) => void;
  params: FSKParams;
  setParams: React.Dispatch<React.SetStateAction<FSKParams>>;
  onExportCsv: () => void;
}

export const SignalControls: React.FC<SignalControlsProps> = ({
  bits,
  setBits,
  params,
  setParams,
  onExportCsv,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'bits' | 'random'>('bits');
  const [textInput, setTextInput] = useState<string>('FSK');
  const [bitStringInput, setBitStringInput] = useState<string>(bits.join(''));
  const [randomLength, setRandomLength] = useState<number>(12);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(0.25);

  // Apply Preset
  const handleSelectPreset = (preset: PresetConfig) => {
    let newBits: number[];
    if (preset.id === 'slow-mo') {
      newBits = [1, 0, 1, 1, 0, 0, 1, 0];
    } else {
      newBits = textToBits(preset.defaultText);
    }
    setBits(newBits);
    setBitStringInput(newBits.join(''));
    setTextInput(preset.defaultText);

    setParams((prev) => ({
      ...prev,
      f0: preset.f0,
      f1: preset.f1,
      bitRate: preset.bitRate,
    }));
  };

  // Text input changed
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 8); // Limit to 8 chars (64 bits max for smooth rendering)
    setTextInput(val);
    const converted = textToBits(val);
    setBits(converted);
    setBitStringInput(converted.join(''));
  };

  // Direct bit string input changed
  const handleBitStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow 0 and 1
    const clean = e.target.value.replace(/[^01]/g, '').slice(0, 48);
    setBitStringInput(clean);
    if (clean.length > 0) {
      const parsed = clean.split('').map((c) => parseInt(c, 10));
      setBits(parsed);
      setTextInput(bitsToText(parsed));
    }
  };

  // Individual bit toggle
  const handleToggleSingleBit = (index: number) => {
    const newBits = [...bits];
    newBits[index] = newBits[index] === 1 ? 0 : 1;
    setBits(newBits);
    setBitStringInput(newBits.join(''));
    setTextInput(bitsToText(newBits));
  };

  // Add bit
  const handleAddBit = (val: number) => {
    if (bits.length >= 48) return;
    const newBits = [...bits, val];
    setBits(newBits);
    setBitStringInput(newBits.join(''));
    setTextInput(bitsToText(newBits));
  };

  // Remove last bit
  const handleRemoveLastBit = () => {
    if (bits.length <= 2) return;
    const newBits = bits.slice(0, -1);
    setBits(newBits);
    setBitStringInput(newBits.join(''));
    setTextInput(bitsToText(newBits));
  };

  // Generate random bits
  const handleGenerateRandom = () => {
    const newBits = generateRandomBits(randomLength);
    setBits(newBits);
    setBitStringInput(newBits.join(''));
    setTextInput(bitsToText(newBits));
  };

  // Audio Modem toggle
  const handleToggleAudio = async () => {
    if (isPlayingAudio) {
      fskAudio.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      await fskAudio.play(bits, params.f0, params.f1, params.bitRate, audioVolume);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* 1. Presets Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px] font-mono">
            Estándares y Presets FSK
          </span>
          <span className="text-slate-400 text-[10px]">Configuraciones Históricas</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {FSK_PRESETS.map((p) => {
            const isSelected =
              params.f0 === p.f0 && params.f1 === p.f1 && params.bitRate === p.bitRate;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`p-2 rounded text-left transition-colors border ${
                  isSelected
                    ? 'bg-cyan-950/80 border-cyan-700 text-cyan-200'
                    : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">{p.name}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  f0: {p.f0}Hz · f1: {p.f1}Hz · {p.bitRate} bps
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Modulating Input Signal Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px] font-mono">
            Señal Digital de Entrada m(t)
          </span>
          <span className="text-[10px] font-mono text-emerald-400">
            {bits.length} bits cargados
          </span>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 mb-3">
          <button
            onClick={() => setInputMode('bits')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded font-medium transition-colors ${
              inputMode === 'bits'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Bits 0 / 1</span>
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded font-medium transition-colors ${
              inputMode === 'text'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Texto ASCII</span>
          </button>
          <button
            onClick={() => setInputMode('random')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded font-medium transition-colors ${
              inputMode === 'random'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>PRBS Aleatorio</span>
          </button>
        </div>

        {/* Mode 1: Direct Bitstream & Interactive Bit Toggles */}
        {inputMode === 'bits' && (
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                Escribir bits directamente (0 y 1):
              </label>
              <input
                type="text"
                value={bitStringInput}
                onChange={handleBitStringChange}
                placeholder="10101100"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-sm tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Quick Bit Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddBit(1)}
                className="flex-1 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded font-mono font-semibold"
              >
                + Bit 1 (Mark)
              </button>
              <button
                onClick={() => handleAddBit(0)}
                className="flex-1 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded font-mono font-semibold"
              >
                + Bit 0 (Space)
              </button>
              <button
                onClick={handleRemoveLastBit}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded font-mono"
              >
                Borrar
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Text to ASCII */}
        {inputMode === 'text' && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-slate-400 block">
              Escribe un texto corto (se convertirá en 8 bits por carácter):
            </label>
            <input
              type="text"
              value={textInput}
              onChange={handleTextChange}
              maxLength={6}
              placeholder="Ej: FSK"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-sm text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-400 font-mono">
              Texto decodificado: "{textInput}" = {textInput.length * 8} bits
            </span>
          </div>
        )}

        {/* Mode 3: Random PRBS */}
        {inputMode === 'random' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Longitud de secuencia:</span>
              <span className="text-cyan-400 font-bold">{randomLength} bits</span>
            </div>
            <input
              type="range"
              min="4"
              max="32"
              step="2"
              value={randomLength}
              onChange={(e) => setRandomLength(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <button
              onClick={handleGenerateRandom}
              className="flex items-center justify-center gap-1.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Generar Nueva Secuencia</span>
            </button>
          </div>
        )}

        {/* Interactive Bit Stream Pill Matrix */}
        <div className="mt-3 pt-2.5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-slate-400">
              Haz clic en cualquier bit para alternarlo (0 ↔ 1):
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-950 rounded border border-slate-800/80">
            {bits.map((bit, idx) => (
              <button
                key={idx}
                onClick={() => handleToggleSingleBit(idx)}
                title={`Bit #${idx + 1}: ${bit} (${bit === 1 ? 'Mark f1' : 'Space f0'})`}
                className={`w-5 h-6 text-[11px] font-mono font-bold rounded flex items-center justify-center transition-all ${
                  bit === 1
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 hover:bg-cyan-900'
                    : 'bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900'
                }`}
              >
                {bit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Analog Modulation Parameters Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px] font-mono">
            Parámetros de Modulación FSK
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Space Frequency f0 */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span>Frecuencia Space (f0 - Bit 0)</span>
              </span>
              <span className="text-slate-200 font-bold">{params.f0} Hz</span>
            </div>
            <input
              type="range"
              min="2"
              max="2500"
              step={params.f0 < 50 ? 1 : 10}
              value={params.f0}
              onChange={(e) =>
                setParams((p) => ({ ...p, f0: Math.max(1, parseInt(e.target.value, 10)) }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Mark Frequency f1 */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                <span>Frecuencia Mark (f1 - Bit 1)</span>
              </span>
              <span className="text-slate-200 font-bold">{params.f1} Hz</span>
            </div>
            <input
              type="range"
              min="2"
              max="2500"
              step={params.f1 < 50 ? 1 : 10}
              value={params.f1}
              onChange={(e) =>
                setParams((p) => ({ ...p, f1: Math.max(1, parseInt(e.target.value, 10)) }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Bit Rate */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-300">Tasa de Bits / Baudios (Rb)</span>
              <span className="text-slate-200 font-bold">{params.bitRate} bps</span>
            </div>
            <input
              type="range"
              min="1"
              max="1500"
              step={params.bitRate < 20 ? 1 : 10}
              value={params.bitRate}
              onChange={(e) =>
                setParams((p) => ({ ...p, bitRate: Math.max(1, parseInt(e.target.value, 10)) }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
            />
          </div>

          {/* Amplitude */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-300">Amplitud de Portadora (Ac)</span>
              <span className="text-slate-200 font-bold">{params.amplitude.toFixed(1)} V</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={params.amplitude}
              onChange={(e) =>
                setParams((p) => ({ ...p, amplitude: parseFloat(e.target.value) }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
            />
          </div>

          {/* Noise SNR */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="flex items-center gap-1 text-slate-300">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Ruido Gaussiano AWGN (SNR)</span>
              </span>
              <span className="font-bold text-slate-200">
                {params.snrDb !== null ? `${params.snrDb} dB` : 'Canal Limpio'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                disabled={params.snrDb === null}
                value={params.snrDb ?? 20}
                onChange={(e) =>
                  setParams((p) => ({ ...p, snrDb: parseInt(e.target.value, 10) }))
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:opacity-30"
              />
              <button
                onClick={() =>
                  setParams((p) => ({ ...p, snrDb: p.snrDb === null ? 15 : null }))
                }
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors whitespace-nowrap border ${
                  params.snrDb === null
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}
              >
                {params.snrDb === null ? 'Sin Ruido' : 'Con Ruido'}
              </button>
            </div>
          </div>

          {/* Continuous Phase CPFSK Switch */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-medium text-slate-200">Fase Continua (CPFSK)</span>
              <span className="text-[10px] text-slate-400">
                Elimina saltos bruscos entre transiciones
              </span>
            </div>
            <button
              onClick={() =>
                setParams((p) => ({ ...p, continuousPhase: !p.continuousPhase }))
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                params.continuousPhase ? 'bg-cyan-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  params.continuousPhase ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Acoustic Audio Modem Playback */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px] font-mono">
            Sintetizador de Audio Acústico
          </span>
          <span className="text-[10px] text-slate-400">Web Audio API</span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleToggleAudio}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded font-medium transition-colors ${
              isPlayingAudio
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Detener Audio FSK</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Escuchar Tono FSK (Módem)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>Volumen:</span>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              value={audioVolume}
              onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded accent-cyan-500 cursor-pointer"
            />
            <span>{(audioVolume * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* 5. CSV Export Button */}
      <button
        onClick={onExportCsv}
        className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg font-medium transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
        <span>Descargar Datos en CSV (Laboratorio)</span>
      </button>
    </div>
  );
};
