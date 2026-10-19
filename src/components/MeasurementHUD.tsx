import React from 'react';
import { calculateCarsonBandwidth } from '../utils/fskDsp';

interface MeasurementHUDProps {
  f0: number;
  f1: number;
  bitRate: number;
  amplitude: number;
  snrDb: number | null;
  bitCount: number;
  bitErrors: number;
  ber: number;
  continuousPhase: boolean;
  cursorX1: number | null;
  cursorX2: number | null;
  cursorY1: number | null;
  cursorY2: number | null;
  timeRangeMs: number;
}

export const MeasurementHUD: React.FC<MeasurementHUDProps> = ({
  f0,
  f1,
  bitRate,
  amplitude,
  snrDb,
  bitCount,
  bitErrors,
  ber,
  continuousPhase,
  cursorX1,
  cursorX2,
  cursorY1,
  cursorY2,
}) => {
  const metrics = calculateCarsonBandwidth(f0, f1, bitRate);
  const bitDurationMs = (1 / bitRate) * 1000;

  // Cursor delta calculations
  const deltaX =
    cursorX1 !== null && cursorX2 !== null ? Math.abs(cursorX2 - cursorX1) : null;
  const cursorFreq = deltaX && deltaX > 0 ? (1 / (deltaX / 1000)).toFixed(1) : null;
  const deltaY =
    cursorY1 !== null && cursorY2 !== null ? Math.abs(cursorY2 - cursorY1) : null;

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 text-xs">
        {/* Frequencies */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Frecuencias (f0 / f1)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-amber-400">
              {f0.toLocaleString()}
            </span>
            <span className="text-slate-500">/</span>
            <span className="font-mono tabular-nums font-semibold text-cyan-400">
              {f1.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Hz</span>
          </div>
        </div>

        {/* Delta F */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Desviación (Δf)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-slate-100">
              {metrics.deltaF.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Hz</span>
          </div>
        </div>

        {/* Carson Bandwidth */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Ancho Banda (Carson)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-emerald-400">
              {metrics.bandwidth.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Hz</span>
          </div>
        </div>

        {/* Modulation Index */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Índice Modulación (h)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-slate-100">
              {metrics.modulationIndex.toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {metrics.modulationIndex >= 1 ? '(FSK Ancho)' : '(FSK Estrecho)'}
            </span>
          </div>
        </div>

        {/* Bit Rate & Tb */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Tasa de Bits (Rb / Tb)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-slate-100">
              {bitRate}
            </span>
            <span className="text-[10px] font-mono text-slate-400">bps</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              {bitDurationMs.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">ms</span>
          </div>
        </div>

        {/* Channel Noise & BER */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Canal SNR / BER
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono tabular-nums font-semibold text-slate-100">
              {snrDb !== null ? `${snrDb} dB` : 'Limpio'}
            </span>
            <span className="text-slate-500">/</span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                ber > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {(ber * 100).toFixed(1)}%
            </span>
            {bitErrors > 0 && (
              <span className="text-[10px] font-mono text-rose-400">
                ({bitErrors}/{bitCount} err)
              </span>
            )}
          </div>
        </div>

        {/* Phase Type */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Fase de Señal
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span
              className={`font-medium text-xs ${
                continuousPhase ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {continuousPhase ? 'CPFSK Continua' : 'Discontinua'}
            </span>
          </div>
        </div>

        {/* Cursor Measurements */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Medición Cursores
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            {deltaX !== null ? (
              <>
                <span className="font-mono tabular-nums text-cyan-300 font-semibold">
                  Δt: {deltaX.toFixed(2)} ms
                </span>
                {cursorFreq && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ({cursorFreq} Hz)
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-500 font-mono text-xs">Sin cursores</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
