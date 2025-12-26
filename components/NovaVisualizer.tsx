
import React, { useRef, useEffect } from 'react';
import { AssistantState, Emotion } from '../types';

interface NovaVisualizerProps {
  state: AssistantState;
  emotion: Emotion;
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
}

const NovaVisualizer: React.FC<NovaVisualizerProps> = ({ state, emotion, inputAnalyser, outputAnalyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const particles = useRef<Array<{ x: number, y: number, angle: number, speed: number, size: number, color: string }>>([]);

  // Base state colors
  const STATE_THEME = {
    LISTENING: { r: 14, g: 165, b: 233 }, // BLUE
    SPEAKING: { r: 34, g: 197, b: 94 },  // GREEN
    ERROR: { r: 244, g: 63, b: 94 },     // RED
    IDLE: { r: 113, g: 113, b: 122 }     // NEUTRAL
  };

  const EMOTION_CONFIG: Record<Emotion, { r: number, g: number, b: number, speed: number, intensity: number, jitter: number }> = {
    neutral:    { r: 0,   g: 0,   b: 0,   speed: 1.0, intensity: 1.0, jitter: 0 },
    happy:      { r: 255, g: 215, b: 0,   speed: 1.8, intensity: 1.5, jitter: 1 },
    positive:   { r: 100, g: 255, b: 100, speed: 1.3, intensity: 1.2, jitter: 0.5 },
    calm:       { r: 150, g: 200, b: 255, speed: 0.5, intensity: 0.7, jitter: 0 },
    urgent:     { r: 255, g: 50,  b: 0,   speed: 2.5, intensity: 2.0, jitter: 3 },
    frustrated: { r: 200, g: 0,   b: 50,  speed: 2.0, intensity: 1.8, jitter: 8 },
    confused:   { r: 180, g: 150, b: 255, speed: 0.8, intensity: 1.0, jitter: 4 },
    sad:        { r: 50,  g: 50,  b: 150, speed: 0.4, intensity: 0.5, jitter: 0 }
  };

  const initParticles = () => {
    particles.current = Array.from({ length: 40 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2,
      size: 1 + Math.random() * 3,
      color: 'rgba(255,255,255,0.5)'
    }));
  };

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
    
    const r = Math.round(base.r * 0.7 + modifier.r * 0.3);
    const g = Math.round(base.g * 0.7 + modifier.g * 0.3);
    const b = Math.round(base.b * 0.7 + modifier.b * 0.3);
    const colorStr = `rgba(${r}, ${g}, ${b},`;

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
    }

    // Dynamic Scale Factor based on canvas size vs design resolution (800px)
    const scale = width / 800;

    // 1. EMOTIONAL GLOW
    const baseGlow = (180 + (volume * 1.5 * modifier.intensity)) * scale;
    const glowRadius = baseGlow + (Math.sin(time * 3 * modifier.speed) * 20 * scale);
    const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
    glowGrad.addColorStop(0, `${colorStr} 0.4)`);
    glowGrad.addColorStop(0.7, `${colorStr} 0.05)`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. DATA RINGS
    const ringCount = 3;
    for (let j = 0; j < ringCount; j++) {
      const ringRadius = (110 + (j * 45) + (volume * 0.3 * modifier.intensity)) * scale;
      const ringRotation = time * (0.6 * (j + 1)) * modifier.speed * (state === 'IDLE' ? 1 : 2.5);
      
      ctx.beginPath();
      ctx.lineWidth = (1.5 + (j * 0.5)) * scale;
      ctx.strokeStyle = `${colorStr} ${0.1 + (j * 0.1) * modifier.intensity})`;
      
      const jitterAmount = modifier.jitter * (Math.random() - 0.5) * scale;
      
      for (let a = 0; a < Math.PI * 2; a += 0.15) {
        const offset = Math.sin(a * 4 + time * 2) * (modifier.jitter * 2) * scale;
        const x = centerX + Math.cos(a + ringRotation) * (ringRadius + offset);
        const y = centerY + Math.sin(a + ringRotation) * (ringRadius + offset);
        
        if (Math.sin(a * 6 + ringRotation) > -0.2) {
          ctx.lineTo(x + jitterAmount, y + jitterAmount);
        } else {
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }

    // 3. THE CORE
    const corePulse = Math.sin(time * 4 * modifier.speed) * 5 * scale;
    const coreRadius = (75 + (volume * modifier.intensity) + corePulse) * scale;
    
    ctx.shadowBlur = (state === 'IDLE' ? 20 : 60 + (volume * 0.5)) * modifier.intensity * scale;
    ctx.shadowColor = `${colorStr} 0.8)`;
    
    const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
    coreGrad.addColorStop(0, `${colorStr} 1)`);
    coreGrad.addColorStop(0.8, `${colorStr} 0.9)`);
    coreGrad.addColorStop(1, `${colorStr} 0.5)`);
    
    ctx.beginPath();
    ctx.arc(centerX + (Math.random() - 0.5) * modifier.jitter * scale, centerY + (Math.random() - 0.5) * modifier.jitter * scale, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. FREQUENCY SPECTRUM
    if (state !== 'IDLE' && audioData.length > 0) {
      const barCount = 180;
      const step = Math.floor(audioData.length / barCount);
      ctx.lineWidth = 2.5 * scale;
      
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const val = audioData[i * step] || 0;
        const barHeight = (val / 255) * 160 * modifier.intensity * scale;
        const localJitter = (Math.random() - 0.5) * modifier.jitter * (val / 100) * scale;
        
        const startR = coreRadius + (15 * scale);
        const endR = startR + barHeight + localJitter;
        
        const x1 = centerX + Math.cos(angle) * startR;
        const y1 = centerY + Math.sin(angle) * startR;
        const x2 = centerX + Math.cos(angle) * endR;
        const y2 = centerY + Math.sin(angle) * endR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `${colorStr} ${0.3 + (val / 400)})`;
        ctx.stroke();
        
        const threshold = modifier.intensity > 1.2 ? 180 : 210;
        if (val > threshold && Math.random() > 0.85) {
          particles.current.push({
            x: x2,
            y: y2,
            angle: angle + (Math.random() - 0.5) * 0.5,
            speed: (2 + Math.random() * 5) * modifier.speed * scale,
            size: (1 + Math.random() * 3) * scale,
            color: `${colorStr} 0.9)`
          });
        }
      }
    }

    // 5. PARTICLE SYSTEM
    ctx.lineWidth = 1 * scale;
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;
      p.speed *= 0.95;
      p.size *= 0.94;

      if (p.size < 0.2 * scale) {
        particles.current.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    initParticles();
    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [state, emotion, inputAnalyser, outputAnalyser]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <div 
        className={`absolute inset-0 rounded-full blur-[80px] lg:blur-[140px] opacity-20 lg:opacity-25 transition-all duration-1000 ${
          state === 'LISTENING' ? 'bg-sky-500' :
          state === 'SPEAKING' ? 'bg-emerald-500' :
          state === 'ERROR' ? 'bg-rose-500' :
          'bg-zinc-500'
        }`}
        style={{ transform: `scale(${1 + (EMOTION_CONFIG[emotion]?.intensity || 1) * 0.1})` }}
      ></div>
      
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800} 
        className="w-full h-full scale-[1.05] lg:scale-[1.1] transition-transform duration-500"
      />
    </div>
  );
};

export default NovaVisualizer;
