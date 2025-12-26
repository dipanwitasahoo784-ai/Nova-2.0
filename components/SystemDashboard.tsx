import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SystemStats } from '../types';
import { ICONS } from '../constants';

interface SystemDashboardProps {
  stats: SystemStats;
}

const HISTORY_LIMIT = 30;

const getStatusColor = (value: number) => {
  if (value > 85) return '#f43f5e'; // rose-500
  if (value > 60) return '#f59e0b'; // amber-500
  return '#0ea5e9'; // sky-500
};

const Sparkline: React.FC<{ data: number[], color: string, height?: number }> = ({ data, color, height = 48 }) => {
  const width = 240;
  const max = 100;
  const min = 0;

  const points = useMemo(() => {
    return data.map((val, i) => {
      const x = (i / (HISTORY_LIMIT - 1)) * width;
      const y = height - ((val - min) / (max - min)) * height;
      return { x, y };
    });
  }, [data, height]);

  const pathData = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x},${points[i].y} ${xc},${yc}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x},${last.y}`;
    return d;
  }, [points]);

  const areaData = useMemo(() => {
    if (!pathData) return "";
    return `${pathData} L ${width},${height} L 0,${height} Z`;
  }, [pathData, height, width]);

  const latestPoint = points[points.length - 1];
  const peak = Math.max(...(data.length ? data : [0]));

  return (
    <div className="w-full mt-4 h-[52px] relative overflow-visible group">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="diag-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diag-grid)" />
        </svg>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="glow-heavy">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Peak Line Indicator */}
        <line 
          x1="0" y1={height - (peak / 100 * height)} 
          x2={width} y2={height - (peak / 100 * height)} 
          stroke={color} 
          strokeWidth="0.5" 
          strokeDasharray="4 4" 
          opacity="0.2"
        />

        <path
          d={areaData}
          fill={`url(#grad-${color})`}
          className="transition-all duration-1000 ease-in-out"
        />
        
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow-heavy)"
          className="transition-all duration-1000 ease-in-out"
        />

        {/* Scanning Playhead */}
        {latestPoint && (
          <g>
            <line x1={latestPoint.x} y1="0" x2={latestPoint.x} y2={height} stroke={color} strokeWidth="1" opacity="0.3" className="animate-pulse" />
            <circle 
              cx={latestPoint.x} 
              cy={latestPoint.y} 
              r="4" 
              fill={color} 
              className="animate-ping opacity-75"
            />
            <circle 
              cx={latestPoint.x} 
              cy={latestPoint.y} 
              r="2.5" 
              fill="white" 
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

const StatCard: React.FC<{ 
  label: string, 
  value: number, 
  history: number[], 
  icon: React.ReactNode, 
  subLabel: string 
}> = ({ label, value, history, icon, subLabel }) => {
  const color = getStatusColor(value);
  const prevValue = history.length > 1 ? history[history.length - 2] : value;
  const trend = value >= prevValue ? 'UP' : 'DOWN';

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 transition-all hover:bg-zinc-900/70 hover:border-zinc-700 group relative overflow-hidden">
      {/* Animated corner accent */}
      <div 
        className="absolute top-0 right-0 w-16 h-16 opacity-10 transition-colors duration-500" 
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent)` }}
      />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl transition-all duration-500" style={{ backgroundColor: `${color}15`, color: color }}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">{label}</p>
            <h4 className="text-xs font-bold text-zinc-400 font-mono tracking-tight">{subLabel}</h4>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <span className={`text-[10px] font-bold ${trend === 'UP' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trend === 'UP' ? '▲' : '▼'}
            </span>
            <span className="text-xl font-mono font-black text-white tabular-nums tracking-tighter">
              {Math.round(value)}%
            </span>
          </div>
        </div>
      </div>
      
      <Sparkline data={history} color={color} />
    </div>
  );
};

const SystemDashboard: React.FC<SystemDashboardProps> = ({ stats }) => {
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [storageHistory, setStorageHistory] = useState<number[]>([]);

  useEffect(() => {
    setCpuHistory(prev => [...prev.slice(-(HISTORY_LIMIT - 1)), stats.cpu]);
    setRamHistory(prev => [...prev.slice(-(HISTORY_LIMIT - 1)), stats.ram]);
    setStorageHistory(prev => [...prev.slice(-(HISTORY_LIMIT - 1)), stats.storage]);
  }, [stats]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.25em]">Telemetry Stream</h3>
        <div className="flex gap-1">
           <div className="w-1 h-1 rounded-full bg-sky-500/40 animate-pulse"></div>
           <div className="w-1 h-1 rounded-full bg-sky-500/40 animate-pulse [animation-delay:0.2s]"></div>
           <div className="w-1 h-1 rounded-full bg-sky-500/40 animate-pulse [animation-delay:0.4s]"></div>
        </div>
      </div>
      
      <StatCard 
        label="Processing Unit" 
        subLabel="XEON-V4_CORE" 
        value={stats.cpu} 
        history={cpuHistory} 
        icon={ICONS.CPU} 
      />

      <StatCard 
        label="Memory Cluster" 
        subLabel="ECC_DDR5_LANE" 
        value={stats.ram} 
        history={ramHistory} 
        icon={ICONS.RAM} 
      />

      <StatCard 
        label="Neural Cache" 
        subLabel="NVME_GEN5_DISK" 
        value={stats.storage} 
        history={storageHistory} 
        icon={ICONS.STORAGE} 
      />

      <div className="pt-2 px-1 flex items-center justify-between opacity-50">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
           <span className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase">Kernel Sync Active</span>
        </div>
        <span className="text-[9px] text-zinc-400 font-mono tracking-tight uppercase">{stats.uptime}</span>
      </div>
    </div>
  );
};

export default SystemDashboard;