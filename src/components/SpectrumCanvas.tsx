import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FSKSimulationResult, calculateCarsonBandwidth } from '../utils/fskDsp';
import { Activity, Radio } from 'lucide-react';

interface SpectrumCanvasProps {
  simulation: FSKSimulationResult;
  f0: number;
  f1: number;
  bitRate: number;
}

export const SpectrumCanvas: React.FC<SpectrumCanvasProps> = ({
  simulation,
  f0,
  f1,
  bitRate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverFreq, setHoverFreq] = useState<{ freq: number; db: number; x: number; y: number } | null>(null);

  const carson = calculateCarsonBandwidth(f0, f1, bitRate);
  const maxDisplayFreq = Math.max(30, Math.max(f0, f1) * 2.2);

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    // Background
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 30, right: 25, bottom: 35, left: 55 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Draw Grids
    ctx.strokeStyle = '#152033';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    // dB horizontal grid lines (0 dB, -10 dB, -20 dB, -30 dB, -40 dB, -50 dB, -60 dB)
    const minDb = -60;
    const maxDb = 0;
    const dbSteps = [0, -10, -20, -30, -40, -50, -60];

    dbSteps.forEach((db) => {
      const normY = (db - minDb) / (maxDb - minDb);
      const y = padding.top + plotH - normY * plotH;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + plotW, y);
      ctx.stroke();

      // dB Label
      ctx.fillStyle = '#64748B';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${db} dB`, padding.left - 8, y);
    });

    // Frequency vertical grid lines
    const freqStep = maxDisplayFreq > 1000 ? 500 : maxDisplayFreq > 200 ? 50 : 5;
    for (let f = 0; f <= maxDisplayFreq; f += freqStep) {
      const normX = f / maxDisplayFreq;
      const x = padding.left + normX * plotW;

      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + plotH);
      ctx.stroke();

      // Freq Label
      ctx.fillStyle = '#64748B';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${f} Hz`, x, padding.top + plotH + 8);
    }
    ctx.setLineDash([]);

    // Carson Bandwidth Highlight Zone
    const carsonStartFreq = Math.max(0, carson.centerFrequency - carson.bandwidth / 2);
    const carsonEndFreq = carson.centerFrequency + carson.bandwidth / 2;
    const carsonX1 = padding.left + (carsonStartFreq / maxDisplayFreq) * plotW;
    const carsonX2 = padding.left + (Math.min(maxDisplayFreq, carsonEndFreq) / maxDisplayFreq) * plotW;

    if (carsonX2 > carsonX1) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(carsonX1, padding.top, carsonX2 - carsonX1, plotH);

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(carsonX1, padding.top, carsonX2 - carsonX1, plotH);
      ctx.setLineDash([]);

      // Carson label at top of zone
      ctx.fillStyle = '#34D399';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `B_Carson = ${carson.bandwidth} Hz`,
        (carsonX1 + carsonX2) / 2,
        padding.top + 8
      );
    }

    // Mark f0 and f1 vertical frequency lines
    const f0X = padding.left + (f0 / maxDisplayFreq) * plotW;
    const f1X = padding.left + (f1 / maxDisplayFreq) * plotW;

    // f0 (Space)
    if (f0X >= padding.left && f0X <= padding.left + plotW) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f0X, padding.top);
      ctx.lineTo(f0X, padding.top + plotH);
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`f0: ${f0}Hz`, f0X, padding.top - 14);
    }

    // f1 (Mark)
    if (f1X >= padding.left && f1X <= padding.left + plotW) {
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f1X, padding.top);
      ctx.lineTo(f1X, padding.top + plotH);
      ctx.stroke();

      ctx.fillStyle = '#06B6D4';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`f1: ${f1}Hz`, f1X, padding.top - 14);
    }

    // Draw FFT Magnitude Curve
    const freqs = simulation.fftFrequencies;
    const mags = simulation.fftMagnitudeDb;
    if (freqs.length > 0 && mags.length > 0) {
      // Area gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      gradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.1)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.beginPath();
      let started = false;

      for (let i = 0; i < freqs.length; i++) {
        const freq = freqs[i];
        if (freq > maxDisplayFreq) break;

        const normX = freq / maxDisplayFreq;
        const x = padding.left + normX * plotW;

        const db = Math.max(minDb, Math.min(maxDb, mags[i]));
        const normY = (db - minDb) / (maxDb - minDb);
        const y = padding.top + plotH - normY * plotH;

        if (!started) {
          ctx.moveTo(x, padding.top + plotH);
          ctx.lineTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineTo(padding.left + plotW, padding.top + plotH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke Line
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      started = false;
      for (let i = 0; i < freqs.length; i++) {
        const freq = freqs[i];
        if (freq > maxDisplayFreq) break;
        const normX = freq / maxDisplayFreq;
        const x = padding.left + normX * plotW;
        const db = Math.max(minDb, Math.min(maxDb, mags[i]));
        const normY = (db - minDb) / (maxDb - minDb);
        const y = padding.top + plotH - normY * plotH;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Hover Probe
    if (hoverFreq) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoverFreq.x, padding.top);
      ctx.lineTo(hoverFreq.x, padding.top + plotH);
      ctx.moveTo(padding.left, hoverFreq.y);
      ctx.lineTo(padding.left + plotW, hoverFreq.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(hoverFreq.x, hoverFreq.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip
      const tipText = `${hoverFreq.freq.toFixed(1)} Hz | ${hoverFreq.db.toFixed(1)} dB`;
      const tipW = ctx.measureText(tipText).width + 16;
      const tipX = Math.min(width - tipW - 10, Math.max(10, hoverFreq.x - tipW / 2));
      const tipY = Math.max(10, hoverFreq.y - 28);

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(tipX, tipY, tipW, 20);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(tipX, tipY, tipW, 20);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(tipText, tipX + 8, tipY + 14);
    }
  }, [simulation, f0, f1, bitRate, maxDisplayFreq, carson, hoverFreq]);

  useEffect(() => {
    drawSpectrum();
  }, [drawSpectrum]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 30, right: 25, bottom: 35, left: 55 };
    const plotW = canvas.width - padding.left - padding.right;
    const plotH = canvas.height - padding.top - padding.bottom;

    if (x >= padding.left && x <= padding.left + plotW && y >= padding.top && y <= padding.top + plotH) {
      const normX = (x - padding.left) / plotW;
      const freq = normX * maxDisplayFreq;

      const normY = (padding.top + plotH - y) / plotH;
      const db = -60 + normY * 60;

      setHoverFreq({ freq, db, x, y });
    } else {
      setHoverFreq(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverFreq(null);
  };

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            Analizador de Espectro FFT (Dominio de la Frecuencia)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            <span>f0 = {f0} Hz</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>f1 = {f1} Hz</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Radio className="w-3 h-3" />
            <span>Δf = {carson.deltaF} Hz</span>
          </span>
        </div>
      </div>

      <div className="relative flex-1 w-full bg-slate-950 cursor-crosshair min-h-[220px]">
        <canvas
          ref={canvasRef}
          width={1200}
          height={320}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block"
        />
      </div>

      <div className="px-3 py-1.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>Resolución FFT: 1024 puntos con ventana Hann</span>
        <span>Rango dinámico: 0 dB a -60 dB</span>
      </div>
    </div>
  );
};
