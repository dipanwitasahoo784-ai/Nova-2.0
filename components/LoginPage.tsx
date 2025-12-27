
import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (user: string, pass: string) => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    await onLogin(username, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#050508] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-sky-500/10 rounded-full blur-[160px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-500/10 rounded-full blur-[160px] animate-pulse [animation-delay:3s]"></div>
      
      <div className="z-10 w-full max-w-sm flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* M3 Style Surface Logo */}
        <div className="mb-12 relative">
          <div className="absolute -inset-6 bg-sky-500/20 rounded-[3rem] blur-2xl"></div>
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative">
            <span className="text-5xl font-black text-white tracking-tighter italic">A</span>
          </div>
        </div>

        <div className="text-center space-y-3 mb-12">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Agni Engine</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Neural Interface Terminal</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Protocol Identity</label>
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-900/80 border-2 border-zinc-800/80 rounded-[1.5rem] py-5 px-7 outline-none focus:border-sky-500/50 text-white transition-all text-base placeholder:text-zinc-700"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Neural Keyphrase</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/80 border-2 border-zinc-800/80 rounded-[1.5rem] py-5 px-7 outline-none focus:border-sky-500/50 text-white transition-all text-base placeholder:text-zinc-700"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-sky-500 hover:text-white transition-all shadow-[0_20px_40px_rgba(255,255,255,0.05)] active:scale-95 text-xs flex items-center justify-center gap-4 disabled:opacity-50"
          >
            {isLoading ? 'SYNCING...' : 'INITIALIZE LINK'}
            {!isLoading && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        </form>

        <div className="mt-12 flex flex-col items-center gap-6">
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-zinc-500 font-black uppercase tracking-widest border-b border-zinc-800 pb-1 hover:text-sky-400 transition-colors"
          >
            Billing Protocols ↗
          </a>
          <div className="flex items-center gap-3 opacity-20">
            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Authorized Secure Line</span>
            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
