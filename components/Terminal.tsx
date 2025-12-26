
import React, { useEffect, useRef } from 'react';

interface TerminalProps {
  logs: string[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Process Logs</h3>
      <div 
        ref={logRef}
        className="bg-black/80 border border-zinc-800 rounded-xl p-4 h-48 overflow-y-auto font-mono text-[10px] leading-relaxed scroll-smooth shadow-inner"
      >
        <div className="space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-sky-500 opacity-50">&gt;</span>
              <span className={log.includes('ERROR') ? 'text-rose-400' : 'text-zinc-400'}>
                {log}
              </span>
            </div>
          ))}
          <div className="flex gap-2 animate-pulse">
            <span className="text-sky-500 opacity-50">&gt;</span>
            <div className="w-1.5 h-3 bg-sky-500/50"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
