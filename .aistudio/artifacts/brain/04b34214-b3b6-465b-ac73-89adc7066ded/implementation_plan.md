# Simulador de Señales FSK (Frequency Shift Keying)

Simulador interactivo de telecomunicaciones y procesamiento digital de señales (DSP) para modular, analizar y demodular señales FSK (Binary Frequency Shift Keying), con visualización en tiempo real de señales digitales (datos binarios y reloj) y analógicas (portadoras $f_0, f_1$, onda modulada FSK con ruido y señal demodulada), junto con analizador de espectro FFT e instrumental tipo osciloscopio.

## Decisiones Críticas y Preferencias Confirmadas

> [!IMPORTANT]
> A continuación se resumen las elecciones clave confirmadas para la arquitectura y visualización del simulador:

- **Modo de Entrada de Señal Digital**: Cadena binaria personalizada (editable bit por bit o texto libre '0'/'1'), conversor de texto ASCII a binario (ej. "HOLA" $\to$ bits) y generador de secuencias pseudoaleatorias (PRBS).
- **Esquema de Modulación y Análisis**: 2-FSK binario con frecuencias de portadora Mark ($f_1$) y Space ($f_0$), modulación continua de fase (CPFSK / coherent & non-coherent), inyección de ruido de canal gaussiano blanco (AWGN / SNR en dB), demodulador de detección por envolvente/correlador para recuperar los bits originales y analizador de espectro de potencia (FFT) en tiempo real.
- **Estilo de Interfaz**: Consola de laboratorio tipo osciloscopio digital interactivo con barrido temporal continuo o pausado, zoom horizontal/vertical, regla/cursores de medición temporal ($t$, $\Delta t$, $V$, $\Delta V$), modo monocanal y multicanal apilado, y panel de parámetros técnicos con cálculo de ancho de banda Carson ($B = 2(\Delta f + R_b)$) e índice de modulación ($h$).

---

## 1. Visión General y Concepto Central

- **Propósito**: Permitir a estudiantes, ingenieros y entusiastas de las telecomunicaciones comprender de manera visual e intuitiva cómo una secuencia de datos binarios modula una señal analógica variando su frecuencia entre un estado Space (bit 0 a frecuencia $f_0$) y un estado Mark (bit 1 a frecuencia $f_1$), visualizando el impacto del ruido y el proceso inverso de demodulación.
- **Público Objetivo**: Estudiantes universitarios de ingeniería electrónica, telecomunicaciones, sistemas, así como docentes y profesionales de radiofrecuencia (RF) y transmisión de datos.
- **Valor Principal**: Representación clara y simultánea de las señales en el dominio del tiempo (señales digitales cuadradas vs. señales analógicas sinusoidales continuas) y en el dominio de la frecuencia (densidad espectral FFT), con capacidades de experimentación interactiva inmediata sin requerir software pesado de escritorio.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujo de Interacción
1. **Configuración de la Señal Moduladora**:
   - El usuario selecciona la fuente de datos: texto libre de bits, convertidor de texto a código binario ASCII, o generador aleatorio con longitud configurable.
   - Ajusta la tasa de bits (Baud rate / Bit rate $R_b$) y el tiempo de duración por bit ($T_b$).
2. **Calibración de Parámetros FSK**:
   - Ajuste de frecuencia Mark ($f_1$, bit 1) y Space ($f_0$, bit 0), asegurando una separación ortogonal adecuada $\Delta f = |f_1 - f_0|$.
   - Configuración de amplitud de portadora y conmutación de fase continua (evita discontinuidades abruptas en transiciones de bit).
   - Inyección opcional de ruido AWGN (control de relación señal/ruido SNR de 0 dB a 40 dB o canal limpio).
3. **Visualización en Osciloscopio Multicanal**:
   - **Canal 1 (Digital)**: Señal de datos binarios en banda base $m(t)$ y señal de reloj de sincronismo $clk(t)$.
   - **Canal 2 (Analógico - Portadoras)**: Ondas sinusoidales puras de referencia a frecuencias $f_0$ (Space) y $f_1$ (Mark).
   - **Canal 3 (Analógico - Señal Modulada FSK)**: Onda analógica modulada resultante $s(t)$ en el canal con o sin ruido aditivo.
   - **Canal 4 (Demodulación y Detección)**: Señal filtrada del demodulador y comparación bit-a-bit con la señal original para calcular la tasa de error de bit (BER).
   - **Canal 5 (Espectro FFT)**: Gráfico de magnitud espectral $|S(f)|$ mostrando los picos de potencia en $f_0$ y $f_1$ y lóbulos laterales de modulación.
4. **Herramientas de Osciloscopio**:
   - Controles de Play/Pause (animación de barrido continuo o congelamiento para inspección).
   - Zoom horizontal (Base de tiempo: $\mu s/\text{div}$, $ms/\text{div}$) y zoom vertical ($V/\text{div}$).
   - Cursores interactivos X1/X2 e Y1/Y2 con lectura instantánea de $\Delta t$, frecuencia equivalente $1/\Delta t$, y delta de voltaje $\Delta V$.
   - Exportación de captura gráfica o datos en formato CSV para reportes de laboratorio.

### Estilo e Identidad Visual (Basado en la Guía de Instrumentación Científica)
- **Aesthetic Direction**: Instrumental científico de laboratorio de alta fidelidad, inspirado en osciloscopios digitales modernos (estilo Keysight / Rigol / Rohde & Schwarz) con estética oscura técnica (Dark Slate Lab).
- **Paleta de Colores (60-30-10)**:
  - *Lienzo Base (60%)*: Fondo obsidiana de laboratorio (`#0B0F19` y `#111827`) con rejilla milimétrica cuadriculada suave (`#1F293D`).
  - *Superficies Estructurales (30%)*: Paneles de control y tarjetas en grafito mate (`#161E2E`, borde hairline `border-slate-800`).
  - *Canales y Acentos de Telemetría (10%)*:
    - Canal Digital (Bits): Verde fósforo brillante (`#10B981` / `#34D399`).
    - Canal FSK Modulada: Láser cian (`#06B6D4` / `#38BDF8`).
    - Portadoras de Referencia: Ámbar técnico (`#F59E0B`).
    - Señal Demodulada: Púrpura eléctrico / Magenta (`#A855F7`).
    - Espectro FFT: Cobalto intenso (`#3B82F6`).
- **Tipografía**:
  - Títulos y etiquetas: *Plus Jakarta Sans* o *Inter* limpio para legibilidad.
  - Valores numéricos, frecuencias, cursores y escalas: *JetBrains Mono* / `font-mono tabular-nums`.

---

## 3. Decisiones de Producto y Compensaciones Técnicas

1. **Renderizado de Señales con HTML5 Canvas vs. SVG**:
   - *Decisión*: Motores de dibujo basados en HTML5 Canvas optimizados con `requestAnimationFrame` y doble búfer.
   - *Razón*: El muestreo de señales de alta frecuencia y FFT requiere miles de puntos de datos en tiempo real; Canvas 2D ofrece 60 FPS estables sin saturar el DOM, a diferencia de cientos de nodos SVG.
2. **Cálculo Matemático DSP en el Cliente**:
   - *Decisión*: Motor matemático en TypeScript puro que calcula el vector de tiempo $t$, la modulación continua de fase $s(t) = A \cos(2\pi f_i t + \phi)$, síntesis de ruido Box-Muller para AWGN, correlador de frecuencia para demodulación y algoritmo Cooley-Tukey FFT.
   - *Razón*: Cero latencia, no requiere backend ni consume llamadas de red, permitiendo respuesta inmediata al mover sliders o cambiar bits.
3. **Persistencia Local de Parámetros**:
   - *Decisión*: Almacenamiento local mediante `localStorage` de presets comunes de modulación (ej. Bell 103: 1070/1270 Hz a 300 baudios, Caller ID Bell 202: 1200/2200 Hz a 1200 baudios, HF RTTY: 2125/2295 Hz).

---

## 4. Arquitectura Técnica y Estrategia de Componentes

### Diagrama de Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FSK SIGNAL SIMULATOR                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌───────────────────────┐             ┌─────────────────────────────┐ │
│  │   INPUT CONTROLLER    │             │       DSP ENGINE (MATH)     │ │
│  │  - Bitstream editor   │  Bits $m_k$ │  - Phase accumulator        │ │
│  │  - Text to ASCII bits │ ──────────> │  - FSK continuous synthesis │ │
│  │  - PRBS Random Gen    │             │  - AWGN Noise generator     │ │
│  └───────────────────────┘             │  - Envelope/Coherent Demod  │ │
│                                        │  - Radix-2 FFT Analyzer     │ │
│  ┌───────────────────────┐             └──────────────┬──────────────┘ │
│  │   PARAMETER PANEL     │                            │                │
│  │  - Frequencies f0, f1 │  Params                    │ Render Arrays  │
│  │  - Bit rate & Ampl.   │ ──────────>                │ [t, s(t), FFT] │
│  │  - Noise SNR (dB)     │                            ▼                │
│  │  - Presets (Bell 103) │             ┌─────────────────────────────┐ │
│  └───────────────────────┘             │   OSCILLOSCOPE RENDERER     │ │
│                                        │  - High-res Canvas Grids    │ │
│  ┌───────────────────────┐             │  - Digital baseband track   │ │
│  │  OSCILLOSCOPE TOOLS   │             │  - Analog carrier track     │ │
│  │  - Play / Pause sweep │             │  - Modulated FSK wave track │ │
│  │  - Timebase & V/div   │ ──────────> │  - Demodulated bit track    │ │
│  │  - Cursors & Probes   │             │  - Frequency spectrum (FFT) │ │
│  │  - Multi/Single view  │             │  - Interactive delta cursors│ │
│  └───────────────────────┘             └─────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Componentes Principales y Mapeo de Estados
- `App.tsx`: Contenedor principal del simulador con layout responsivo de dos zonas (Panel de Parámetros/Controles a la izquierda y Consola de Osciloscopio Central a la derecha).
- `src/components/OscilloscopeCanvas.tsx`: Lienzo principal que dibuja la cuadrícula milimétrica, escalas, señales sincronizadas, indicadores de disparo (trigger) y cursores interactivos arrastrables con el ratón.
- `src/components/SpectrumCanvas.tsx`: Lienzo dedicado para el espectro de frecuencias FFT con marcadores en los picos $f_0$ y $f_1$.
- `src/components/SignalControls.tsx`: Controles de configuración de bits (editor visual interactivo de bits 0 y 1, entrada de texto, generador aleatorio) y deslizadores de frecuencia, tasa de baudios y SNR.
- `src/components/MeasurementHUD.tsx`: Barra de telemetría superior que muestra valores calculados en vivo: Ancho de banda de Carson, Desviación de frecuencia ($\Delta f$), Índice de modulación ($h = 2\Delta f / R_b$), BER (Bit Error Rate) estimado y lecturas de cursores.
- `src/components/EducationalModal.tsx`: Guía técnica con teoría resumida sobre FSK, fórmulas fundamentales y estándares industriales históricos (Bell 103, V.23, etc.).
- `src/utils/fskDsp.ts`: Algoritmos matemáticos puros para generación de onda continua FSK, síntesis de ruido gaussiano, demodulación y FFT rápida.
