
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
    <div className="min-h-screen w-full bg-[#050508] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
      
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="z-10 w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-700">
        {/* Logo Section */}
        <div className="mb-8 relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-sky-500 to-purple-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
          <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-[1.5rem] flex items-center justify-center shadow-2xl relative">
            <span className="text-4xl font-black text-white tracking-tighter italic">N</span>
          </div>
        </div>

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">NOVA LOGIN</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Protocol Identity</label>
            <input 
              type="text" 
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 px-5 outline-none focus:border-sky-500/50 text-white transition-all text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Neural Keyphrase</label>
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 px-5 outline-none focus:border-sky-500/50 text-white transition-all text-sm"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-sky-500 hover:text-white transition-all shadow-xl active:scale-[0.98] text-[11px] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Initialize Secure Link'}
            {!isLoading && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-2">
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-zinc-500 hover:text-sky-400 font-bold uppercase tracking-widest underline underline-offset-4 transition-colors"
          >
            API Billing Documentation ↗
          </a>
          <p className="text-[9px] text-zinc-700 font-mono">ENCRYPT_TLS_1.3_ACTIVE</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
