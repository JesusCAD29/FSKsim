import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FSKSimulationResult } from '../utils/fskDsp';
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
  Layers,
  Crosshair,
} from 'lucide-react';

export type DisplayMode = 'stacked' | 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'overlay';

interface OscilloscopeCanvasProps {
  simulation: FSKSimulationResult;
  f0: number;
  f1: number;
  bitRate: number;
  amplitude: number;
  onCursorChange?: (
    x1: number | null,
    x2: number | null,
    y1: number | null,
    y2: number | null
  ) => void;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({
  simulation,
  f0,
  f1,
  bitRate,
  amplitude,
  onCursorChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // View state
  const [displayMode, setDisplayMode] = useState<DisplayMode>('stacked');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeZoom, setTimeZoom] = useState<number>(1.0);
  const [voltageZoom, setVoltageZoom] = useState<number>(1.0);
  const [timeOffsetRatio, setTimeOffsetRatio] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showBitMarkers, setShowBitMarkers] = useState<boolean>(true);
  const [showCursors, setShowCursors] = useState<boolean>(false);

  // Live sweep animation state
  const animationFrameRef = useRef<number | null>(null);
  const sweepProgressRef = useRef<number>(0);

  // Cursors state (normalized 0 to 1 relative to visible canvas width/height)
  const [cursorX1, setCursorX1] = useState<number>(0.25);
  const [cursorX2, setCursorX2] = useState<number>(0.55);
  const [cursorY1, setCursorY1] = useState<number>(0.3);
  const [cursorY2, setCursorY2] = useState<number>(0.7);
  const draggingCursorRef = useRef<'x1' | 'x2' | 'y1' | 'y2' | null>(null);

  // Hover probe
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    timeMs: number;
    voltage: number;
    bitIndex: number;
    currentBit: number;
  } | null>(null);

  const totalTimeMs = simulation.totalDuration * 1000;

  // Handle Play/Pause sweep
  useEffect(() => {
    let lastTimestamp = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        // Advance sweep based on bit rate so it feels synchronized
        const speedMultiplier = Math.max(0.2, Math.min(2.0, bitRate / 10));
        sweepProgressRef.current = (sweepProgressRef.current + elapsed * speedMultiplier) % 1.0;
      }

      drawCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    isPlaying,
    simulation,
    displayMode,
    timeZoom,
    voltageZoom,
    timeOffsetRatio,
    showGrid,
    showBitMarkers,
    showCursors,
    cursorX1,
    cursorX2,
    cursorY1,
    cursorY2,
    hoverInfo,
  ]);

  // Main drawing routine
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    // Background: Lab Obsidian
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const totalSamples = simulation.time.length;
    if (totalSamples === 0) return;

    // Visible window in time
    const visibleWindowRatio = 1 / timeZoom;
    const maxOffset = Math.max(0, 1 - visibleWindowRatio);
    const clampedOffset = Math.min(maxOffset, Math.max(0, timeOffsetRatio));

    const startIndex = Math.floor(clampedOffset * totalSamples);
    const endIndex = Math.min(
      totalSamples - 1,
      Math.floor((clampedOffset + visibleWindowRatio) * totalSamples)
    );
    const visibleSamplesCount = Math.max(2, endIndex - startIndex);

    const startTimeSec = simulation.time[startIndex];
    const endTimeSec = simulation.time[endIndex];
    const visibleTimeSpanSec = Math.max(1e-9, endTimeSec - startTimeSec);

    // Coordinate conversion helpers
    const timeToCanvasX = (t: number) => {
      return ((t - startTimeSec) / visibleTimeSpanSec) * width;
    };

    // Define track viewports based on display mode
    interface TrackConfig {
      id: string;
      title: string;
      color: string;
      top: number;
      height: number;
      minV: number;
      maxV: number;
      unit: string;
    }

    let tracks: TrackConfig[] = [];
    const padding = 6;

    if (displayMode === 'stacked') {
      const trackH = (height - padding * 5) / 4;
      tracks = [
        {
          id: 'ch1',
          title: 'CH1: Señal Digital Moduladora m(t) & Reloj',
          color: '#10B981', // Emerald
          top: padding,
          height: trackH,
          minV: -0.2,
          maxV: 1.2,
          unit: 'TTL (V)',
        },
        {
          id: 'ch2',
          title: `CH2: Portadoras Referencia (f0 = ${f0} Hz / f1 = ${f1} Hz)`,
          color: '#F59E0B', // Amber
          top: padding * 2 + trackH,
          height: trackH,
          minV: -amplitude * 1.25 * voltageZoom,
          maxV: amplitude * 1.25 * voltageZoom,
          unit: 'V',
        },
        {
          id: 'ch3',
          title: 'CH3: Onda Resultante Modulada FSK s(t) [Canal]',
          color: '#06B6D4', // Laser Cyan
          top: padding * 3 + trackH * 2,
          height: trackH,
          minV: -amplitude * 1.35 * voltageZoom,
          maxV: amplitude * 1.35 * voltageZoom,
          unit: 'V',
        },
        {
          id: 'ch4',
          title: 'CH4: Demodulación por Envolvente y Detección de Bits',
          color: '#A855F7', // Electric Purple
          top: padding * 4 + trackH * 3,
          height: trackH,
          minV: -1.3,
          maxV: 1.3,
          unit: 'Env / Bit',
        },
      ];
    } else if (displayMode === 'overlay') {
      tracks = [
        {
          id: 'ch1_ch3',
          title: 'SUPERPOSICIÓN: Modulación Digital m(t) vs Señal Analógica FSK s(t)',
          color: '#06B6D4',
          top: padding,
          height: height - padding * 2,
          minV: -amplitude * 1.35 * voltageZoom,
          maxV: amplitude * 1.35 * voltageZoom,
          unit: 'V',
        },
      ];
    } else {
      // Solo channel
      const activeTitles: Record<string, string> = {
        ch1: 'CH1: Señal Digital Moduladora m(t) y Señal de Reloj CLK',
        ch2: `CH2: Portadoras Senoidales (f0 = ${f0} Hz [Space] / f1 = ${f1} Hz [Mark])`,
        ch3: 'CH3: Onda Resultante Modulada FSK s(t) con Ruido de Canal',
        ch4: 'CH4: Señal de Envolvente Demodulada y Tren de Bits Recuperado',
      };
      const activeColors: Record<string, string> = {
        ch1: '#10B981',
        ch2: '#F59E0B',
        ch3: '#06B6D4',
        ch4: '#A855F7',
      };

      tracks = [
        {
          id: displayMode,
          title: activeTitles[displayMode] || 'Canal Activo',
          color: activeColors[displayMode] || '#06B6D4',
          top: padding,
          height: height - padding * 2,
          minV: -amplitude * 1.35 * voltageZoom,
          maxV: amplitude * 1.35 * voltageZoom,
          unit: 'V',
        },
      ];
    }

    // Helper to map voltage to Y coordinate within a track
    const voltToTrackY = (v: number, track: TrackConfig) => {
      const norm = (v - track.minV) / (track.maxV - track.minV);
      return track.top + track.height - norm * track.height;
    };

    // Draw Grids and Track Headers
    tracks.forEach((track) => {
      // Track background
      ctx.fillStyle = '#0D131F';
      ctx.fillRect(0, track.top, width, track.height);

      // Track border
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, track.top, width, track.height);

      if (showGrid) {
        // Horizontal grid lines (8 divisions)
        ctx.strokeStyle = '#152033';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        const divisions = 6;
        for (let i = 1; i < divisions; i++) {
          const y = track.top + (track.height / divisions) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Center line (zero reference)
        const zeroY = voltToTrackY(0, track);
        if (zeroY >= track.top && zeroY <= track.top + track.height) {
          ctx.strokeStyle = '#25354F';
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(0, zeroY);
          ctx.lineTo(width, zeroY);
          ctx.stroke();
        }

        // Vertical grid lines (10 divisions across time)
        const vDivisions = 10;
        ctx.strokeStyle = '#152033';
        ctx.setLineDash([2, 4]);
        for (let i = 1; i < vDivisions; i++) {
          const x = (width / vDivisions) * i;
          ctx.beginPath();
          ctx.moveTo(x, track.top);
          ctx.lineTo(x, track.top + track.height);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Track Title Badge
      ctx.fillStyle = '#111827';
      ctx.fillRect(8, track.top + 6, ctx.measureText(track.title).width + 24, 18);
      ctx.strokeStyle = '#1E293B';
      ctx.strokeRect(8, track.top + 6, ctx.measureText(track.title).width + 24, 18);

      ctx.fillStyle = track.color;
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(track.title, 14, track.top + 15);

      // Vertical Scale Label
      ctx.fillStyle = '#64748B';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${track.maxV.toFixed(1)} ${track.unit}`, width - 10, track.top + 14);
      ctx.fillText(`${track.minV.toFixed(1)} ${track.unit}`, width - 10, track.top + track.height - 8);
      ctx.textAlign = 'left';
    });

    // Draw Bit Boundaries & Markers across the entire height
    if (showBitMarkers) {
      const bitDuration = simulation.bitDuration;
      for (let b = 0; b < simulation.originalBits.length; b++) {
        const bitStartTime = b * bitDuration;
        const bitEndTime = (b + 1) * bitDuration;
        const xStart = timeToCanvasX(bitStartTime);
        const xEnd = timeToCanvasX(bitEndTime);

        if (xEnd < 0 || xStart > width) continue;

        const currentBit = simulation.originalBits[b];
        const isMark = currentBit === 1;

        // Subtle shaded column tint according to Space (0, amber tint) vs Mark (1, cyan tint)
        ctx.fillStyle = isMark ? 'rgba(6, 182, 212, 0.03)' : 'rgba(245, 158, 11, 0.03)';
        ctx.fillRect(xStart, 0, xEnd - xStart, height);

        // Bit boundary separator line
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xStart, 0);
        ctx.lineTo(xStart, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Bit label indicator at the top
        const labelX = (xStart + xEnd) / 2;
        if (labelX >= 10 && labelX <= width - 10) {
          ctx.fillStyle = isMark ? '#06B6D4' : '#F59E0B';
          ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`Bit: ${currentBit} (${isMark ? `f1=${f1}` : `f0=${f0}`})`, labelX, 16);
          ctx.textAlign = 'left';
        }
      }
    }

    // Step size for rendering signals to maintain smooth 60fps
    const step = Math.max(1, Math.floor(visibleSamplesCount / (width * 1.5)));

    // Function to render a waveform into a specified track
    const renderSignalPath = (
      signalData: Float64Array,
      track: TrackConfig,
      color: string,
      lineWidth = 1.75,
      isSquare = false
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      let started = false;
      for (let i = startIndex; i <= endIndex; i += step) {
        const t = simulation.time[i];
        const x = timeToCanvasX(t);
        const v = signalData[i];
        const y = voltToTrackY(v, track);

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          if (isSquare && i > startIndex) {
            const prevT = simulation.time[i - step];
            const prevV = signalData[i - step];
            if (prevV !== v) {
              const prevX = timeToCanvasX(prevT);
              ctx.lineTo(x, voltToTrackY(prevV, track));
            }
          }
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    // Render channels according to displayMode
    if (displayMode === 'stacked') {
      const ch1 = tracks[0];
      const ch2 = tracks[1];
      const ch3 = tracks[2];
      const ch4 = tracks[3];

      // CH1: Digital Data (green) and Clock (dim green)
      renderSignalPath(simulation.clockSignal, ch1, 'rgba(16, 185, 129, 0.3)', 1, true);
      renderSignalPath(simulation.digitalData, ch1, '#10B981', 2, true);

      // CH2: Reference Carriers (f0 amber, f1 cyan faint)
      renderSignalPath(simulation.carrier0, ch2, 'rgba(245, 158, 11, 0.75)', 1.25);
      renderSignalPath(simulation.carrier1, ch2, 'rgba(6, 182, 212, 0.75)', 1.25);

      // CH3: Modulated FSK Signal
      renderSignalPath(simulation.modulatedSignal, ch3, '#06B6D4', 1.75);

      // CH4: Demodulated Envelope & Recovered Bits
      renderSignalPath(simulation.demodulatedAnalog, ch4, '#C084FC', 1.5);
      // Draw recovered discrete bit line
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let b = 0; b < simulation.demodulatedBits.length; b++) {
        const bitVal = simulation.demodulatedBits[b];
        const origVal = simulation.originalBits[b];
        const hasError = bitVal !== origVal;
        const xS = timeToCanvasX(b * simulation.bitDuration);
        const xE = timeToCanvasX((b + 1) * simulation.bitDuration);
        const y = voltToTrackY(bitVal, ch4);

        ctx.strokeStyle = hasError ? '#F43F5E' : '#A855F7';
        ctx.beginPath();
        ctx.moveTo(xS, y);
        ctx.lineTo(xE, y);
        ctx.stroke();

        if (hasError && (xS + xE) / 2 >= 0 && (xS + xE) / 2 <= width) {
          ctx.fillStyle = '#F43F5E';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillText('ERR', (xS + xE) / 2 - 10, ch4.top + ch4.height - 8);
        }
      }
    } else if (displayMode === 'overlay') {
      const track = tracks[0];
      // Draw analog FSK wave
      renderSignalPath(simulation.modulatedSignal, track, '#06B6D4', 1.75);

      // Superimpose digital signal normalized to wave height
      const digitalScaled = new Float64Array(simulation.digitalData.length);
      for (let i = 0; i < digitalScaled.length; i++) {
        digitalScaled[i] = simulation.digitalData[i] === 1 ? amplitude : -amplitude;
      }
      renderSignalPath(digitalScaled, track, 'rgba(16, 185, 129, 0.85)', 2, true);
    } else {
      // Solo views
      const track = tracks[0];
      if (displayMode === 'ch1') {
        renderSignalPath(simulation.clockSignal, track, 'rgba(16, 185, 129, 0.4)', 1.5, true);
        renderSignalPath(simulation.digitalData, track, '#10B981', 2.5, true);
      } else if (displayMode === 'ch2') {
        renderSignalPath(simulation.carrier0, track, '#F59E0B', 1.5);
        renderSignalPath(simulation.carrier1, track, '#06B6D4', 1.5);
      } else if (displayMode === 'ch3') {
        renderSignalPath(simulation.modulatedSignal, track, '#06B6D4', 2);
      } else if (displayMode === 'ch4') {
        renderSignalPath(simulation.demodulatedAnalog, track, '#C084FC', 1.5);
        // Draw recovered bits
        for (let b = 0; b < simulation.demodulatedBits.length; b++) {
          const bitVal = simulation.demodulatedBits[b];
          const origVal = simulation.originalBits[b];
          const hasError = bitVal !== origVal;
          const xS = timeToCanvasX(b * simulation.bitDuration);
          const xE = timeToCanvasX((b + 1) * simulation.bitDuration);
          const y = voltToTrackY(bitVal === 1 ? amplitude * 0.8 : -amplitude * 0.8, track);

          ctx.strokeStyle = hasError ? '#F43F5E' : '#A855F7';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(xS, y);
          ctx.lineTo(xE, y);
          ctx.stroke();
        }
      }
    }

    // Oscilloscope Live Sweeping Scanline
    if (isPlaying) {
      const sweepX = sweepProgressRef.current * width;
      const grad = ctx.createLinearGradient(sweepX - 25, 0, sweepX + 2, 0);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      grad.addColorStop(0.8, 'rgba(6, 182, 212, 0.15)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.8)');

      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - 25, 0, 27, height);

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sweepX, 0);
      ctx.lineTo(sweepX, height);
      ctx.stroke();
    }

    // Measurement Cursors (X1, X2, Y1, Y2)
    if (showCursors) {
      const pxX1 = cursorX1 * width;
      const pxX2 = cursorX2 * width;
      const pxY1 = cursorY1 * height;
      const pxY2 = cursorY2 * height;

      // X1 Cursor
      ctx.strokeStyle = '#F43F5E'; // Red cursor
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(pxX1, 0);
      ctx.lineTo(pxX1, height);
      ctx.stroke();

      // X2 Cursor
      ctx.strokeStyle = '#38BDF8'; // Blue cursor
      ctx.beginPath();
      ctx.moveTo(pxX2, 0);
      ctx.lineTo(pxX2, height);
      ctx.stroke();

      // Y1 Cursor
      ctx.strokeStyle = '#EAB308'; // Yellow cursor
      ctx.beginPath();
      ctx.moveTo(0, pxY1);
      ctx.lineTo(width, pxY1);
      ctx.stroke();

      // Y2 Cursor
      ctx.strokeStyle = '#A855F7'; // Purple cursor
      ctx.beginPath();
      ctx.moveTo(0, pxY2);
      ctx.lineTo(width, pxY2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cursor Labels
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#F43F5E';
      ctx.fillText('X1', pxX1 + 4, height - 12);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('X2', pxX2 + 4, height - 12);
      ctx.fillStyle = '#EAB308';
      ctx.fillText('Y1', 10, pxY1 - 4);
      ctx.fillStyle = '#A855F7';
      ctx.fillText('Y2', 10, pxY2 - 4);
    }

    // Crosshair Probe on Hover
    if (hoverInfo) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverInfo.x, 0);
      ctx.lineTo(hoverInfo.x, height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoverInfo.y);
      ctx.lineTo(width, hoverInfo.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip Box
      const tipText1 = `t: ${hoverInfo.timeMs.toFixed(2)} ms`;
      const tipText2 = `V: ${hoverInfo.voltage.toFixed(2)} V`;
      const tipText3 = `Bit: ${hoverInfo.currentBit} (#${hoverInfo.bitIndex + 1})`;

      const boxW = 125;
      const boxH = 54;
      const boxX = Math.min(width - boxW - 10, Math.max(10, hoverInfo.x + 12));
      const boxY = Math.min(height - boxH - 10, Math.max(10, hoverInfo.y - boxH - 6));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(tipText1, boxX + 8, boxY + 16);
      ctx.fillText(tipText2, boxX + 8, boxY + 32);
      ctx.fillStyle = hoverInfo.currentBit === 1 ? '#06B6D4' : '#F59E0B';
      ctx.fillText(tipText3, boxX + 8, boxY + 46);
    }
  }, [
    simulation,
    displayMode,
    isPlaying,
    timeZoom,
    voltageZoom,
    timeOffsetRatio,
    showGrid,
    showBitMarkers,
    showCursors,
    cursorX1,
    cursorX2,
    cursorY1,
    cursorY2,
    hoverInfo,
    f0,
    f1,
    amplitude,
    bitRate,
  ]);

  // Mouse interaction for Cursors and Probe
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normX = x / rect.width;
    const normY = y / rect.height;

    if (draggingCursorRef.current) {
      if (draggingCursorRef.current === 'x1') setCursorX1(Math.max(0, Math.min(1, normX)));
      if (draggingCursorRef.current === 'x2') setCursorX2(Math.max(0, Math.min(1, normX)));
      if (draggingCursorRef.current === 'y1') setCursorY1(Math.max(0, Math.min(1, normY)));
      if (draggingCursorRef.current === 'y2') setCursorY2(Math.max(0, Math.min(1, normY)));
      notifyCursorChange();
      return;
    }

    // Compute hover time and sample
    const visibleWindowRatio = 1 / timeZoom;
    const maxOffset = Math.max(0, 1 - visibleWindowRatio);
    const clampedOffset = Math.min(maxOffset, Math.max(0, timeOffsetRatio));
    const totalTimeSec = simulation.totalDuration;
    const tSec = (clampedOffset + normX * visibleWindowRatio) * totalTimeSec;
    const timeMs = tSec * 1000;

    const bitIndex = Math.floor(tSec / simulation.bitDuration);
    const safeBitIdx = Math.max(0, Math.min(simulation.originalBits.length - 1, bitIndex));
    const currentBit = simulation.originalBits[safeBitIdx];

    // Find nearest sample
    const sampleIdx = Math.floor((tSec / totalTimeSec) * simulation.time.length);
    const safeSampleIdx = Math.max(0, Math.min(simulation.modulatedSignal.length - 1, sampleIdx));
    const voltage = simulation.modulatedSignal[safeSampleIdx];

    setHoverInfo({
      x,
      y,
      timeMs,
      voltage,
      bitIndex: safeBitIdx,
      currentBit,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showCursors) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    // Detect closest cursor within 15px threshold
    const tolX = 15 / rect.width;
    const tolY = 15 / rect.height;

    if (Math.abs(normX - cursorX1) < tolX) {
      draggingCursorRef.current = 'x1';
    } else if (Math.abs(normX - cursorX2) < tolX) {
      draggingCursorRef.current = 'x2';
    } else if (Math.abs(normY - cursorY1) < tolY) {
      draggingCursorRef.current = 'y1';
    } else if (Math.abs(normY - cursorY2) < tolY) {
      draggingCursorRef.current = 'y2';
    }
  };

  const handleMouseUp = () => {
    draggingCursorRef.current = null;
  };

  const handleMouseLeave = () => {
    draggingCursorRef.current = null;
    setHoverInfo(null);
  };

  const notifyCursorChange = useCallback(() => {
    if (onCursorChange) {
      const timeMs1 = cursorX1 * totalTimeMs;
      const timeMs2 = cursorX2 * totalTimeMs;
      const v1 = (0.5 - cursorY1) * 2 * amplitude;
      const v2 = (0.5 - cursorY2) * 2 * amplitude;
      onCursorChange(timeMs1, timeMs2, v1, v2);
    }
  }, [cursorX1, cursorX2, cursorY1, cursorY2, totalTimeMs, amplitude, onCursorChange]);

  useEffect(() => {
    notifyCursorChange();
  }, [showCursors, cursorX1, cursorX2, cursorY1, cursorY2, notifyCursorChange]);

  // Export Canvas Snapshot as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `osciloscopio-fsk-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
      {/* Top Oscilloscope Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
          <button
            onClick={() => setDisplayMode('stacked')}
            className={`px-2.5 py-1 font-mono rounded transition-colors whitespace-nowrap ${
              displayMode === 'stacked'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Multicanal (4 Pistas)
          </button>
          <button
            onClick={() => setDisplayMode('overlay')}
            className={`px-2.5 py-1 font-mono rounded transition-colors whitespace-nowrap ${
              displayMode === 'overlay'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Superpuesto (m(t) & s(t))
          </button>
          <button
            onClick={() => setDisplayMode('ch1')}
            className={`px-2 py-1 font-mono rounded transition-colors whitespace-nowrap ${
              displayMode === 'ch1'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH1 Digital
          </button>
          <button
            onClick={() => setDisplayMode('ch2')}
            className={`px-2 py-1 font-mono rounded transition-colors whitespace-nowrap ${
              displayMode === 'ch2'
                ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH2 Portadoras
          </button>
          <button
            onClick={() => setDisplayMode('ch3')}
            className={`px-2 py-1 font-mono rounded transition-colors whitespace-nowrap ${
              displayMode === 'ch3'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH3 FSK Onda
          </button>
          <button
            onClick={() => setDisplayMode('ch4')}
            className={`px-2 py-1 font-mono rounded transition-colors whitespace-nowrap ${
              displayMode === 'ch4'
                ? 'bg-purple-950 text-purple-300 border border-purple-800/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CH4 Demodulador
          </button>
        </div>

        {/* Right: Instrument Controls */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors ${
              isPlaying
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                : 'bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Barrido</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Reanudar</span>
              </>
            )}
          </button>

          {/* Timebase Zoom In / Out */}
          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 mr-1">Base Tiempo:</span>
            <button
              onClick={() => setTimeZoom((z) => Math.min(8.0, z * 1.3))}
              title="Aumentar resolución temporal"
              className="p-1 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-cyan-400 font-semibold px-1">
              {timeZoom.toFixed(1)}x
            </span>
            <button
              onClick={() => setTimeZoom((z) => Math.max(0.4, z / 1.3))}
              title="Disminuir resolución temporal"
              className="p-1 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setTimeZoom(1.0);
                setTimeOffsetRatio(0);
              }}
              title="Restablecer escala"
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Cursors Toggle */}
          <button
            onClick={() => setShowCursors(!showCursors)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border font-mono transition-colors ${
              showCursors
                ? 'bg-cyan-900/40 text-cyan-300 border-cyan-700'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Cursores Δ</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded border font-mono transition-colors ${
              showGrid
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            Rejilla
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            title="Exportar imagen del osciloscopio"
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Captura</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full bg-slate-950 cursor-crosshair overflow-hidden min-h-[460px]">
        <canvas
          ref={canvasRef}
          width={1200}
          height={680}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block"
        />

        {/* Time Slider when Zoomed In */}
        {timeZoom > 1.05 && (
          <div className="absolute bottom-2 left-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-3 text-xs">
            <span className="font-mono text-slate-400 whitespace-nowrap">
              Desplazar tiempo:
            </span>
            <input
              type="range"
              min="0"
              max={1 - 1 / timeZoom}
              step="0.005"
              value={timeOffsetRatio}
              onChange={(e) => setTimeOffsetRatio(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        )}
      </div>

      {/* Canvas Status & Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>CH1: Digital (m(t))</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>CH2: f0 = {f0} Hz</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
            <span>CH3: f1 = {f1} Hz (FSK)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
            <span>CH4: Demodulador</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <span>Tiempo Total: {totalTimeMs.toFixed(1)} ms</span>
          <span>·</span>
          <span>{simulation.originalBits.length} Bits</span>
          <span>·</span>
          <span>{simulation.time.length} Muestras</span>
        </div>
      </div>
    </div>
  );
};
