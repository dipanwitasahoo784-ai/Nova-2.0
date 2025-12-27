
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#08080c]/90 backdrop-blur-2xl border-t border-zinc-900/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-4">
        <button 
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-zinc-400 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">System</span>
        </button>

        <button 
          onClick={toggleLive}
          className={`flex flex-col items-center justify-center w-20 h-full gap-1 active:scale-95 transition-all ${isLive ? 'text-emerald-400' : 'text-zinc-400'}`}
        >
          <div className={`relative p-2 rounded-2xl ${isLive ? 'bg-emerald-500/10' : 'bg-zinc-800/50'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isLive && <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">{isLive ? 'Live' : 'Link'}</span>
        </button>

        <button 
          onClick={onOpenStats}
          className="flex flex-col items-center justify-center w-16 h-full gap-1 text-zinc-400 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-tighter">Stats</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
