
import React, { useRef, useEffect } from 'react';
import { AssistantState, Emotion } from '../types';

interface NovaVisualizerProps {
  state: AssistantState;
  emotion: Emotion;
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const NovaVisualizer: React.FC<NovaVisualizerProps> = ({ state, emotion, inputAnalyser, outputAnalyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const colorLerp = useRef({ r: 113, g: 113, b: 122 });

  const STATE_THEME = {
    LISTENING: { r: 14, g: 165, b: 233 }, // BLUE
    SPEAKING: { r: 34, g: 197, b: 94 },  // GREEN
    THINKING: { r: 168, g: 85, b: 247 }, // PURPLE
    ERROR: { r: 244, g: 63, b: 94 },     // RED
    IDLE: { r: 113, g: 113, b: 122 }     // NEUTRAL
  };

  const EMOTION_CONFIG: Record<Emotion, { r: number, g: number, b: number, speed: number, intensity: number, jitter: number, particleChance: number }> = {
    neutral:    { r: 0,   g: 0,   b: 0,   speed: 1.0, intensity: 1.0, jitter: 0,   particleChance: 0.05 },
    happy:      { r: 255, g: 215, b: 0,   speed: 1.8, intensity: 1.5, jitter: 1,   particleChance: 0.3 },
    positive:   { r: 100, g: 255, b: 100, speed: 1.3, intensity: 1.2, jitter: 0.5, particleChance: 0.15 },
    calm:       { r: 150, g: 200, b: 255, speed: 0.5, intensity: 0.7, jitter: 0,   particleChance: 0.02 },
    urgent:     { r: 255, g: 50,  b: 0,   speed: 2.8, intensity: 2.2, jitter: 5,   particleChance: 0.6 },
    frustrated: { r: 200, g: 0,   b: 50,  speed: 2.2, intensity: 1.8, jitter: 8,   particleChance: 0.4 },
    confused:   { r: 180, g: 150, b: 255, speed: 0.8, intensity: 1.0, jitter: 4,   particleChance: 0.1 },
    sad:        { r: 50,  g: 50,  b: 150, speed: 0.4, intensity: 0.5, jitter: 0,   particleChance: 0.01 }
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const time = Date.now() / 1000;
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const base = STATE_THEME[state] || STATE_THEME.IDLE;
    const modifier = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.neutral;
    
    // Smooth color transitions
    const targetR = Math.round(base.r * 0.7 + modifier.r * 0.3);
    const targetG = Math.round(base.g * 0.7 + modifier.g * 0.3);
    const targetB = Math.round(base.b * 0.7 + modifier.b * 0.3);
    
    colorLerp.current.r = lerp(colorLerp.current.r, targetR, 0.1);
    colorLerp.current.g = lerp(colorLerp.current.g, targetG, 0.1);
    colorLerp.current.b = lerp(colorLerp.current.b, targetB, 0.1);

    const { r, g, b } = colorLerp.current;
    const colorStr = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)},`;

    ctx.clearRect(0, 0, width, height);

    let audioData = new Uint8Array(0);
    let volume = 0;

    if (state === 'LISTENING' && inputAnalyser) {
      audioData = new Uint8Array(inputAnalyser.frequencyBinCount);
      inputAnalyser.getByteFrequencyData(audioData);
    } else if (state === 'SPEAKING' && outputAnalyser) {
      audioData = new Uint8Array(outputAnalyser.frequencyBinCount);
      outputAnalyser.getByteFrequencyData(audioData);
    }

    if (audioData.length > 0) {
      volume = audioData.reduce((a, b) => a + b) / audioData.length;
    } else if (state === 'THINKING') {
      volume = 35 + Math.sin(time * 8) * 15; 
    }

    const scale = width / 800;
    const volNorm = volume / 255;

    // 1. Particle System Update
    if (Math.random() < modifier.particleChance + (volNorm * 0.5)) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 4 + volNorm * 10) * scale;
      particles.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 1.5,
        size: (2 + Math.random() * 4) * scale,
        color: `${colorStr} ${0.3 + Math.random() * 0.5})`
      });
    }

    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.016; 
      if (p.life <= 0) {
        particles.current.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    // 2. Background Glow
    const baseGlow = (140 + (volume * 1.5 * modifier.intensity)) * scale;
    const glowRadius = baseGlow + (Math.sin(time * 4 * modifier.speed) * 30 * scale);
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
    glowGrad.addColorStop(0, `${colorStr} 0.35)`);
    glowGrad.addColorStop(0.6, `${colorStr} 0.05)`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Reactive Concentric Rings
    const ringCount = 3;
    for (let j = 0; j < ringCount; j++) {
      const ringRadius = (80 + (j * 50) + (volume * 0.3 * modifier.intensity)) * scale;
      const ringRotation = time * (0.3 * (j + 1)) * modifier.speed;
      
      ctx.beginPath();
      ctx.lineWidth = (1 + (j * 0.6)) * scale;
      ctx.strokeStyle = `${colorStr} ${0.04 + (j * 0.07) * modifier.intensity})`;
      
      const segments = 90;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const noise = Math.sin(a * 6 + time * 3 + j) * (modifier.jitter * 2 + volume * 0.08) * scale;
        const x = centerX + Math.cos(a + ringRotation) * (ringRadius + noise);
        const y = centerY + Math.sin(a + ringRotation) * (ringRadius + noise);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 4. Central Neural Core
    const corePulse = Math.sin(time * 5 * modifier.speed) * 6 * scale;
    const coreRadius = (60 + (volume * 1.0 * modifier.intensity * scale) + corePulse);
    
    ctx.shadowBlur = (state === 'IDLE' ? 20 : 40 + (volume * 0.5)) * modifier.intensity * scale;
    ctx.shadowColor = `${colorStr} 0.6)`;
    
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    coreGrad.addColorStop(0, `${colorStr} 1)`);
    coreGrad.addColorStop(0.7, `${colorStr} 0.9)`);
    coreGrad.addColorStop(1, `${colorStr} 0.4)`);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Audio Frequency Visualizer (Radial bars)
    if (state !== 'IDLE' && (audioData.length > 0 || state === 'THINKING')) {
      const barCount = 80;
      const step = audioData.length > 0 ? Math.floor(audioData.length / barCount) : 1;
      ctx.lineWidth = 2.0 * scale;
      
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const val = audioData.length > 0 ? (audioData[i * step] || 0) : (volume + Math.sin(time * 10 + i) * 12);
        const barHeight = (val / 255) * 140 * modifier.intensity * scale;
        
        const startR = coreRadius + (12 * scale);
        const endR = startR + barHeight;
        
        const x1 = centerX + Math.cos(angle) * startR;
        const y1 = centerY + Math.sin(angle) * startR;
        const x2 = centerX + Math.cos(angle) * endR;
        const y2 = centerY + Math.sin(angle) * endR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        
        const barOpacity = 0.2 + (val / 512);
        ctx.strokeStyle = `${colorStr} ${barOpacity})`;
        ctx.stroke();
      }
    }

    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(requestRef.current);
  }, [state, emotion, inputAnalyser, outputAnalyser]);

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none overflow-hidden">
      <div 
        className={`absolute inset-0 rounded-full blur-[80px] md:blur-[120px] opacity-10 md:opacity-15 transition-all duration-1000 ${
          state === 'LISTENING' ? 'bg-sky-500' :
          state === 'SPEAKING' ? 'bg-emerald-500' :
          state === 'THINKING' ? 'bg-purple-500' :
          state === 'ERROR' ? 'bg-rose-500' :
          'bg-zinc-500'
        }`}
      ></div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800} 
        className="w-full h-full aspect-square transition-transform duration-500 hover:scale-105 drop-shadow-2xl" 
      />
    </div>
  );
};

export default NovaVisualizer;
