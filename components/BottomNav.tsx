
import React from 'react';

interface BottomNavProps {
  onOpenDrawer: () => void;
  onOpenStats: () => void;
  isLive: boolean;
  toggleLive: () => void;
  plan: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ onOpenDrawer, onOpenStats, isLive, toggleLive, plan }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-[var(--sab)] pt-2 bg-gradient-to-t from-[#050508] via-[#08080c]/95 to-transparent backdrop-blur-md">
      <div className="max-w-md mx-auto bg-zinc-900/80 border border-zinc-800/50 rounded-[2.5rem] p-2 flex items-center justify-between shadow-2xl overflow-hidden">
        
        {/* System Menu Button */}
        <button 
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center w-14 h-12 gap-0.5 text-zinc-500 active:scale-90 active:text-white transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-tighter">OS</span>
        </button>

        {/* Central Live Button */}
        <button 
          onClick={toggleLive}
          className={`relative flex items-center gap-3 px-6 py-3 rounded-full transition-all active:scale-95 ${
            isLive 
            ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
            : 'bg-white text-black shadow-xl'
          }`}
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isLive && <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>}
          </div>
          <span className="text-xs font-black uppercase tracking-widest">{isLive ? 'LIVE' : 'SYNC'}</span>
        </button>

        {/* Telemetry Button */}
        <button 
          onClick={onOpenStats}
          className="flex flex-col items-center justify-center w-14 h-12 gap-0.5 text-zinc-500 active:scale-90 active:text-white transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[8px] font-black uppercase tracking-tighter">DATA</span>
        </button>

      </div>
    </div>
  );
};

export default BottomNav;
