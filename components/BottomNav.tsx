
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1.5rem+var(--sab))] pt-4">
      {/* Neural Island Container */}
      <div className="max-w-md mx-auto relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/20 via-purple-500/10 to-emerald-500/20 blur-2xl opacity-50 rounded-full"></div>
        <div className="relative bg-[#0d0d15]/90 border-2 border-zinc-800/80 rounded-[3rem] p-2 flex items-center justify-between shadow-3xl backdrop-blur-3xl overflow-hidden">
          
          <button onClick={onOpenDrawer} className="flex flex-col items-center justify-center w-14 h-14 text-zinc-500 active:scale-90 active:text-white transition-all group">
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors group-active:bg-zinc-800">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
          </button>

          {/* Core Synthesis Button */}
          <button onClick={toggleLive} className={`relative flex items-center gap-4 px-10 py-4.5 rounded-full transition-all active:scale-90 ${isLive ? 'bg-emerald-500 text-white shadow-glow-green' : 'bg-white text-black shadow-2xl'}`}>
             <div className="relative flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                {isLive && (
                  <>
                    <div className="absolute -inset-3 bg-white/40 rounded-full animate-ping"></div>
                    <div className="absolute -inset-1 bg-white/60 rounded-full animate-pulse"></div>
                  </>
                )}
             </div>
             <span className="text-xs font-black uppercase tracking-[0.2em]">{isLive ? 'CONNECTED' : 'SYNC_OS'}</span>
          </button>

          <button onClick={onOpenStats} className="flex flex-col items-center justify-center w-14 h-14 text-zinc-500 active:scale-90 active:text-white transition-all group">
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors group-active:bg-zinc-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};

export default BottomNav;
