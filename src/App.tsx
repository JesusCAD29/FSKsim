import React, { useState, useMemo, useCallback } from 'react';
import {
  FSKParams,
  simulateFSK,
  textToBits,
} from './utils/fskDsp';
import { MeasurementHUD } from './components/MeasurementHUD';
import { OscilloscopeCanvas } from './components/OscilloscopeCanvas';
import { SpectrumCanvas } from './components/SpectrumCanvas';
import { SignalControls } from './components/SignalControls';
import { EducationalModal } from './components/EducationalModal';
import {
  AudioWaveform,
  Activity,
  BookOpen,
  Download,
  Info,
} from 'lucide-react';

export default function App() {
  // Input bitstream state (default: "FSK" translated to ASCII bits)
  const [bits, setBits] = useState<number[]>(() => textToBits('FSK'));

  // FSK modulation parameters
  const [params, setParams] = useState<FSKParams>({
    f0: 8, // Space frequency (Hz)
    f1: 24, // Mark frequency (Hz)
    bitRate: 4, // 4 bps (slow-mo lab default for clear visual inspection)
    amplitude: 1.0, // 1V
    continuousPhase: true,
    snrDb: null, // clean signal by default
    sampleRate: 2000, // 2000 samples/sec for crisp waveforms
  });

  // Active view tab in main stage: "oscilloscope" | "spectrum" | "dual"
  const [activeStageTab, setActiveStageTab] = useState<'dual' | 'oscilloscope' | 'spectrum'>('dual');

  // Theory Modal open state
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);

  // Cursor measurements state
  const [cursorX1, setCursorX1] = useState<number | null>(null);
  const [cursorX2, setCursorX2] = useState<number | null>(null);
  const [cursorY1, setCursorY1] = useState<number | null>(null);
  const [cursorY2, setCursorY2] = useState<number | null>(null);

  // Compute DSP simulation results
  const simulation = useMemo(() => {
    return simulateFSK(bits, params);
  }, [bits, params]);

  // Handle cursor changes from oscilloscope
  const handleCursorChange = useCallback(
    (x1: number | null, x2: number | null, y1: number | null, y2: number | null) => {
      setCursorX1(x1);
      setCursorX2(x2);
      setCursorY1(y1);
      setCursorY2(y2);
    },
    []
  );

  // CSV Data Export for Laboratory analysis
  const handleExportCsv = useCallback(() => {
    const headers = [
      'Tiempo_s',
      'Dato_Digital',
      'Reloj',
      'Portadora_f0_Space_V',
      'Portadora_f1_Mark_V',
      'FSK_Modulada_s(t)_V',
      'Envolvente_Demodulada',
    ];

    const rows: string[] = [headers.join(',')];
    const totalSamples = simulation.time.length;
    // Export up to 3000 rows to keep download manageable
    const step = Math.max(1, Math.floor(totalSamples / 3000));

    for (let i = 0; i < totalSamples; i += step) {
      rows.push(
        [
          simulation.time[i].toFixed(6),
          simulation.digitalData[i],
          simulation.clockSignal[i],
          simulation.carrier0[i].toFixed(4),
          simulation.carrier1[i].toFixed(4),
          simulation.modulatedSignal[i].toFixed(4),
          simulation.demodulatedAnalog[i].toFixed(4),
        ].join(',')
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `simulacion_fsk_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [simulation]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Universal Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Primary Action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950 shrink-0">
        {/* Zone 1: Brand wordmark (single text element) */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
            <AudioWaveform className="w-5 h-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Simulador de Señales FSK
          </span>
        </div>

        {/* Zone 2: Single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveStageTab('dual')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeStageTab === 'dual' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Vista Sincronizada Dual
          </button>
          <button
            onClick={() => setActiveStageTab('oscilloscope')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeStageTab === 'oscilloscope' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Osciloscopio Temporal
          </button>
          <button
            onClick={() => setActiveStageTab('spectrum')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeStageTab === 'spectrum' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Espectro de Frecuencia FFT
          </button>
        </nav>

        {/* Zone 3: Primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsTheoryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/80 border border-cyan-800 rounded-lg hover:bg-cyan-900 transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guía Teórica FSK</span>
          </button>
        </div>
      </header>

      {/* 2. Top Telemetry HUD */}
      <MeasurementHUD
        f0={params.f0}
        f1={params.f1}
        bitRate={params.bitRate}
        amplitude={params.amplitude}
        snrDb={params.snrDb}
        bitCount={simulation.originalBits.length}
        bitErrors={simulation.bitErrorCount}
        ber={simulation.ber}
        continuousPhase={params.continuousPhase}
        cursorX1={cursorX1}
        cursorX2={cursorX2}
        cursorY1={cursorY1}
        cursorY2={cursorY2}
        timeRangeMs={simulation.totalDuration * 1000}
      />

      {/* 3. Main Workspace: Asymmetric Split Console */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Parameter & Signal Input Controls (Fixed width 360px-400px) */}
        <aside className="w-full lg:w-[380px] xl:w-[420px] bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Panel de Control</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Modulador 2-FSK</span>
                <span aria-hidden="true">·</span>
                <span>DSP en Tiempo Real</span>
              </div>
            </div>
            <button
              onClick={() => setIsTheoryOpen(true)}
              title="Información y Fórmulas"
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded border border-slate-800 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Signal Controls */}
          <SignalControls
            bits={bits}
            setBits={setBits}
            params={params}
            setParams={setParams}
            onExportCsv={handleExportCsv}
          />
        </aside>

        {/* Right Stage: Canvas Viewport & Oscilloscope / Spectrum Analyzer */}
        <section className="flex-1 flex flex-col bg-slate-900/40 p-3 lg:p-4 overflow-y-auto gap-4 min-w-0">
          {/* Stage Viewport Selector Tabs on Mobile / Quick Switch */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveStageTab('dual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeStageTab === 'dual'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AudioWaveform className="w-3.5 h-3.5" />
                <span>Vista Dual (Tiempo + Frecuencia)</span>
              </button>
              <button
                onClick={() => setActiveStageTab('oscilloscope')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeStageTab === 'oscilloscope'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AudioWaveform className="w-3.5 h-3.5" />
                <span>Osciloscopio Solo</span>
              </button>
              <button
                onClick={() => setActiveStageTab('spectrum')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeStageTab === 'spectrum'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Espectro FFT Solo</span>
              </button>
            </div>

            {/* Quick Export action */}
            <button
              onClick={handleExportCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar Datos CSV</span>
            </button>
          </div>

          {/* 1. Oscilloscope Viewport */}
          {(activeStageTab === 'dual' || activeStageTab === 'oscilloscope') && (
            <div
              className={`w-full transition-all ${
                activeStageTab === 'dual' ? 'min-h-[480px] flex-1' : 'h-full min-h-[580px]'
              }`}
            >
              <OscilloscopeCanvas
                simulation={simulation}
                f0={params.f0}
                f1={params.f1}
                bitRate={params.bitRate}
                amplitude={params.amplitude}
                onCursorChange={handleCursorChange}
              />
            </div>
          )}

          {/* 2. FFT Spectrum Analyzer Viewport */}
          {(activeStageTab === 'dual' || activeStageTab === 'spectrum') && (
            <div
              className={`w-full transition-all ${
                activeStageTab === 'dual' ? 'min-h-[260px]' : 'h-full min-h-[480px]'
              }`}
            >
              <SpectrumCanvas
                simulation={simulation}
                f0={params.f0}
                f1={params.f1}
                bitRate={params.bitRate}
              />
            </div>
          )}
        </section>
      </main>

      {/* 4. Educational Theory Modal */}
      <EducationalModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />
    </div>
  );
}
