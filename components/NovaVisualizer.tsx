
import React, { useRef, useEffect } from 'react';
import { AssistantState, Emotion, SystemStats } from '../types';

interface NovaVisualizerProps {
  state: AssistantState;
  emotion: Emotion;
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  stats: SystemStats;
}

const VERTEX_COUNT = 40; // Slightly reduced for mobile peak performance

const NovaVisualizer: React.FC<NovaVisualizerProps> = ({ state, emotion, inputAnalyser, outputAnalyser, stats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTime = useRef<number>(performance.now());
  const colorLerp = useRef({ r: 14, g: 165, b: 233 }); // Initialize with Sky Blue
  
  const vertices = useRef(Array.from({ length: VERTEX_COUNT }).map(() => ({
    angle: Math.random() * Math.PI * 2,
    radius: 40 + Math.random() * 180,
    speed: 0.15 + Math.random() * 0.6,
    jitter: Math.random(),
    drift: Math.random() * 0.05
  })));

  const STATE_THEME = {
    LISTENING: { r: 14, g: 165, b: 233 },
    SPEAKING: { r: 16, g: 185, b: 129 }, // Emerald
    THINKING: { r: 139, g: 92, b: 246 }, // Purple
    ERROR: { r: 244, g: 63, b: 94 },
    WAKING: { r: 255, g: 255, b: 255 },
    IDLE: { r: 63, g: 63, b: 70 } // Zinc-700
  };

  const EMOTION_MOD = {
    neutral:    { s: 1.0, i: 1.0 },
    happy:      { s: 1.8, i: 1.4 },
    positive:   { s: 1.2, i: 1.2 },
    calm:       { s: 0.4, i: 0.7 },
    urgent:     { s: 2.5, i: 2.0 },
    frustrated: { s: 1.8, i: 1.5 },
    confused:   { s: 0.8, i: 1.0 },
    sad:        { s: 0.3, i: 0.5 }
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const draw = (now: number) => {
    const dt = (now - lastTime.current) / 1000;
    lastTime.current = now;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const time = now / 1000;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = width / 800;

    const cpu = (stats.cpu || 0) / 100;
    const base = STATE_THEME[state] || STATE_THEME.IDLE;
    const mod = EMOTION_MOD[emotion] || EMOTION_MOD.neutral;

    // Smooth Color Interpolation
    const lS = Math.min(1, dt * 5);
    colorLerp.current.r = lerp(colorLerp.current.r, base.r, lS);
    colorLerp.current.g = lerp(colorLerp.current.g, base.g, lS);
    colorLerp.current.b = lerp(colorLerp.current.b, base.b, lS);

    const { r, g, b } = colorLerp.current;
    const colorStr = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)},`;

    ctx.clearRect(0, 0, width, height);

    // Audio Sampling
    let volume = 0;
    const analyzer = state === 'SPEAKING' ? outputAnalyser : (state === 'LISTENING' ? inputAnalyser : null);
    if (analyzer) {
      const data = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(data);
      volume = data.reduce((a, v) => a + v, 0) / data.length;
    } else if (state === 'THINKING') {
      volume = 40 + Math.sin(time * 8) * 20;
    } else if (state === 'WAKING') {
      volume = 120 + Math.random() * 80;
    }
    
    const vN = volume / 255;

    // 1. NEURAL LATTICE RENDERER
    ctx.save();
    ctx.translate(centerX, centerY);
    const pF = (1 + vN * 1.5 * mod.i) * (1 + cpu * 0.1);
    
    ctx.lineWidth = 1.2 * scale;
    const conDist = 160 * scale * (1 + (stats.ram/100) * 0.5);
    const points: {x: number, y: number}[] = [];

    vertices.current.forEach((v) => {
      const angle = v.angle + time * v.speed * mod.s + v.drift;
      const radius = (v.radius + Math.sin(time * 3 + v.jitter * 10) * 15) * scale * pF;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      points.push({x, y});

      // Draw Node
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = `${colorStr} ${0.3 + vN * 0.7})`;
      ctx.fill();
    });

    // Connectivity Pass (O(n^2) optimized for vertex subset)
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const distSq = dx * dx + dy * dy;
        const thresh = conDist * conDist;

        if (distSq < thresh) {
          const op = (1 - Math.sqrt(distSq) / conDist) * 0.35 * (0.6 + vN);
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.strokeStyle = `${colorStr} ${op})`;
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // 2. CORE BLOOM
    const cR = (90 + vN * 130 * scale) * (state === 'WAKING' ? 1.6 : 1);
    const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, cR);
    grad.addColorStop(0, `${colorStr} 0.9)`);
    grad.addColorStop(0.3, `${colorStr} 0.4)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.shadowBlur = (30 + volume * 0.4) * scale;
    ctx.shadowColor = `rgba(${r},${g},${b}, 0.7)`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, cR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(requestRef.current);
  }, [state, emotion, inputAnalyser, outputAnalyser, stats]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Dynamic Background Pulse */}
      <div className={`absolute inset-0 rounded-full blur-[200px] opacity-25 transition-all duration-1000 ${
        state === 'LISTENING' ? 'bg-sky-500' : 
        state === 'SPEAKING' ? 'bg-emerald-500' : 
        state === 'THINKING' ? 'bg-violet-500' : 
        state === 'WAKING' ? 'bg-white' : 'bg-zinc-900'
      }`} />
      <canvas ref={canvasRef} width={1000} height={1000} className="w-full h-full aspect-square pointer-events-none drop-shadow-3xl" />
    </div>
  );
};

export default NovaVisualizer;
