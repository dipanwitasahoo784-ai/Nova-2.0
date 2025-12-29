
import React from 'react';

interface BottomNavProps {
  onOpenDrawer: () => void;
  onOpenStats: () => void;
  isLive: boolean;
  toggleLive: () => void;
  plan: string;
  onToggleWrite: () => void;
  isWriteOpen: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ 
  onOpenDrawer, 
  onOpenStats, 
  isLive, 
  toggleLive, 
  plan, 
  onToggleWrite,
  isWriteOpen
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
      {/* Neural Island Container */}
      <div className="max-w-md mx-auto relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 blur-2xl opacity-50 rounded-full"></div>
        <div className="relative bg-[#0d0d15]/90 border-2 border-zinc-800/80 rounded-[3.5rem] p-2 flex items-center justify-between shadow-3xl backdrop-blur-3xl overflow-hidden">
          
          {/* Menu Drawer */}
          <button onClick={onOpenDrawer} className="flex flex-col items-center justify-center w-12 h-12 text-zinc-500 active:scale-90 active:text-white transition-all">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Neural Writing Toggle (NEW) */}
          <button 
            onClick={onToggleWrite} 
            className={`flex flex-col items-center justify-center w-12 h-12 transition-all active:scale-90 ${isWriteOpen ? 'text-sky-400 bg-sky-500/10 rounded-full' : 'text-zinc-500'}`}
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
             </svg>
          </button>

          {/* Core Synthesis Button */}
          <button 
            onClick={toggleLive} 
            className={`relative flex items-center gap-3 px-6 py-4 rounded-full transition-all active:scale-90 ${isLive ? 'bg-emerald-500 text-white shadow-glow-green' : 'bg-white text-black shadow-2xl'}`}
          >
             <div className="relative flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                {isLive && (
                  <div className="absolute -inset-2 bg-white/40 rounded-full animate-ping"></div>
                )}
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.1em]">{isLive ? 'LIVE' : 'SYNC'}</span>
          </button>

          {/* Telemetry Stats */}
          <button onClick={onOpenStats} className="flex flex-col items-center justify-center w-12 h-12 text-zinc-500 active:scale-90 active:text-white transition-all">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>

        </div>
      </div>
    </div>
  );
};

export default BottomNav;
