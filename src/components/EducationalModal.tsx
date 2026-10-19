import React from 'react';
import { X, BookOpen, Radio, Cpu, AudioWaveform, ShieldCheck } from 'lucide-react';

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">
              Fundamentos de Modulación FSK (Frequency Shift Keying)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {/* Section 1: Concept */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              1. ¿Qué es la Modulación por Desplazamiento de Frecuencia (FSK)?
            </h3>
            <p>
              La modulación <strong>FSK (Frequency Shift Keying)</strong> es una técnica de modulación digital angular en la que los datos binarios discretos (bits 0 y 1) se transmiten variando la <strong>frecuencia instantánea</strong> de una onda portadora analógica sinusoidal entre dos valores predefinidos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-950 rounded-lg border border-amber-900/40">
                <div className="font-bold text-amber-400 font-mono text-xs">
                  Bit 0 → Frecuencia Space (f0)
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Representa el espacio o nivel bajo digital transmitido a la frecuencia portadora inferior o alternativa.
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-cyan-900/40">
                <div className="font-bold text-cyan-400 font-mono text-xs">
                  Bit 1 → Frecuencia Mark (f1)
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Representa la marca o nivel alto digital transmitido a la frecuencia portadora superior.
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Mathematical Formulation */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <AudioWaveform className="w-4 h-4" />
              2. Formulación Matemática de la Señal FSK
            </h3>
            <p>
              La ecuación analítica de la señal modulada en el tiempo para el intervalo del k-ésimo bit (k·Tb ≤ t &lt; (k+1)·Tb) se expresa como:
            </p>
            <div className="p-3 bg-slate-950 font-mono text-center text-xs text-cyan-300 rounded border border-slate-800">
              s(t) = Ac · cos(2π · fi · t + φ0)
            </div>
            <p className="text-xs text-slate-400">
              Donde <em>Ac</em> es la amplitud de la portadora, <em>fi</em> corresponde a <em>f0</em> o <em>f1</em> según el bit transmitido, y <em>φ0</em> es la fase inicial. En <strong>CPFSK (Continuous Phase FSK)</strong>, la fase se acumula continuamente sin saltos de discontinuidad, lo que evita generar armónicos de alta frecuencia no deseados y reduce el ancho de banda ocupado.
            </p>
          </section>

          {/* Section 3: Carson's Bandwidth & Modulation Index */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              3. Regla del Ancho de Banda de Carson e Índice de Modulación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-200 block">
                  Regla de Carson (Ancho de Banda B)
                </span>
                <div className="font-mono text-emerald-400 text-xs">
                  B = 2 · (Δf + Rb)
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Donde Δf = |f1 - f0| / 2 es la desviación de frecuencia y Rb = 1/Tb es la tasa de bits en baudios.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <span className="text-xs font-semibold text-slate-200 block">
                  Índice de Modulación (h)
                </span>
                <div className="font-mono text-cyan-400 text-xs">
                  h = (2 · Δf) / Rb = |f1 - f0| / Rb
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Si h &lt; 1, es FSK de banda estrecha; si h ≥ 1, es FSK de banda ancha. Para ortogonalidad óptima en detección no coherente se suele fijar h = 1.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Demodulation */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              4. Demodulación y Recuperación de Datos
            </h3>
            <p>
              Para recuperar los bits a partir de la señal analógica ruidosa s(t) + n(t), el receptor emplea dos ramas de filtros acoplados a f0 y f1, detectores de envolvente y un comparador de umbral:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
              <li>
                <strong>Filtro Space</strong>: Extrae la energía en torno a $f_0$.
              </li>
              <li>
                <strong>Filtro Mark</strong>: Extrae la energía en torno a $f_1$.
              </li>
              <li>
                <strong>Decisión</strong>: Si la energía en $f_1$ supera a $f_0$, el bit regenerado es 1; en caso contrario, se decide bit 0.
              </li>
            </ul>
          </section>

          {/* Section 5: Historical & Real-world Standards */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
              5. Aplicaciones en el Mundo Real
            </h3>
            <p className="text-xs text-slate-400">
              FSK es ampliamente utilizada por su robustez ante variaciones de amplitud y ruido:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-slate-200 block">Módems Bell 103</span>
                <span className="text-slate-400">
                  Primer módem comercial de 300 baudios (1070 Hz / 1270 Hz) que conectaba terminales a través de la red telefónica conmutada.
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-slate-200 block">Identificador Caller ID</span>
                <span className="text-slate-400">
                  Estándar Bell 202 (1200 Hz / 2200 Hz a 1200 baudios) transmitido entre el primer y segundo timbre telefónico para enviar el número de llamada.
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-slate-200 block">Telemetría y Satélites</span>
                <span className="text-slate-400">
                  Común en CubeSats, boyas oceanográficas y radiosondas meteorológicas por su bajo consumo y tolerancia al desvanecimiento del canal.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Entendido, volver al simulador
          </button>
        </div>
      </div>
    </div>
  );
};
