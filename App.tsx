
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageRole, ChatMessage, SystemStats, AssistantState, Emotion, AppView, SubscriptionPlan, PLAN_DETAILS } from './types';
import { connectLive, decode, decodeAudioData, encode, performSearchQuery, performThinkingQuery, performFastQuery, performOllamaQuery, generateSpeech } from './services/gemini';
import { ICONS } from './constants';
import Terminal from './components/Terminal';
import ChatWindow from './components/ChatWindow';
import SystemDashboard from './components/SystemDashboard';
import NovaVisualizer from './components/NovaVisualizer';
import LoginPage from './components/LoginPage';
import BottomNav from './components/BottomNav';

type BrainMode = 'STANDARD' | 'SEARCH' | 'DEEP' | 'FAST' | 'LOCAL';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('LOGIN');
  const [plan, setPlan] = useState<SubscriptionPlan>('FREE');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [mode, setMode] = useState<BrainMode>('STANDARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [realtimeInput, setRealtimeInput] = useState('');
  const [queryCount, setQueryCount] = useState(0);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  const [stats, setStats] = useState<SystemStats>({
    cpu: 12, ram: 45, storage: 68, uptime: "00:00:00", latency: 0, networkStatus: 'optimal'
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[KERNEL] AGNI ULTIMATE CORE V5.2 READY."]);
  
  const sessionPromise = useRef<any>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAnalyser = useRef<AnalyserNode | null>(null);
  const outputAnalyser = useRef<AnalyserNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionActive = useRef(false);

  // Advanced Self-Correction Diagnostics
  const runDiagnostic = useCallback(async () => {
    setShowDiagnostic(true);
    addLog("SENTINEL: Identifying neural bottlenecks...");
    await new Promise(r => setTimeout(r, 600));
    addLog("SENTINEL: Flushing audio buffer chains...");
    nextStartTime.current = 0;
    activeSources.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSources.current.clear();
    await new Promise(r => setTimeout(r, 800));
    addLog("SENTINEL: Protocol 'Radha Radha' fully synchronized.");
    setShowDiagnostic(false);
    setAssistantState('IDLE');
  }, []);

  // Zero-Error Wake Word Watchdog
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (view === 'DASHBOARD' && !isLive && SpeechRecognition) {
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('').toLowerCase();
          if (transcript.includes('agni')) handleWakeEvent();
        };
        recognitionRef.current.onstart = () => { recognitionActive.current = true; };
        recognitionRef.current.onend = () => { recognitionActive.current = false; };
      }
      
      const watchdog = setInterval(() => {
        if (!isLive && !recognitionActive.current && view === 'DASHBOARD') {
          try { recognitionRef.current.start(); recognitionActive.current = true; } catch (e) {}
        }
      }, 5000);

      return () => clearInterval(watchdog);
    }
  }, [view, isLive]);

  const handleWakeEvent = async () => {
    if (assistantState === 'WAKING' || assistantState === 'SPEAKING') return; 
    setAssistantState('WAKING');
    setEmotion('happy');
    const greeting = "Radha Radha. I am AGNI. How can i help you today ?. ";
    setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: greeting, timestamp: Date.now() }]);
    const audio = await generateSpeech(greeting, 'positive');
    if (audio) await playB64Audio(audio);
    setTimeout(() => { setAssistantState('IDLE'); }, 2000);
  };

  const handleStopAll = () => {
    activeSources.current.forEach(source => { try { source.stop(); } catch (e) {} });
    activeSources.current.clear();
    nextStartTime.current = 0;
    if (isLive) { sessionPromise.current?.then((s: any) => s.close()); setIsLive(false); stopCamera(); }
    setAssistantState('IDLE');
    setIsProcessing(false);
    setRealtimeInput('');
    setEmotion('neutral');
    addLog("SYSTEM: Neural link safely terminated.");
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        cpu: Math.min(99, Math.max(5, prev.cpu + (Math.random() - 0.5) * 10)),
        ram: Math.min(99, Math.max(20, prev.ram + (Math.random() - 0.5) * 2)),
        uptime: new Date().toLocaleTimeString('en-GB', { hour12: false })
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (user: string, pass: string) => {
    addLog(`AUTH: Establishing secure tunnel for ${user}...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey();
    setView('PLANS');
  };

  const addLog = (log: string) => {
    setTerminalLogs(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const handleError = async (err: any) => {
    const msg = err?.message || String(err);
    addLog(`CRITICAL: ${msg}`);
    setAssistantState('ERROR');
    if (msg.includes("Requested entity was not found") || msg.includes("API key")) {
      if (window.aistudio?.openSelectKey) await window.aistudio.openSelectKey();
    } else {
      await runDiagnostic();
    }
  };

  const playB64Audio = async (base64: string) => {
    try {
      if (!outputAudioContext.current) {
        outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAnalyser.current = outputAudioContext.current.createAnalyser();
      }
      setAssistantState('SPEAKING');
      const audioBuffer = await decodeAudioData(decode(base64), outputAudioContext.current, 24000, 1);
      const source = outputAudioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAnalyser.current!);
      outputAnalyser.current!.connect(outputAudioContext.current.destination);
      source.onended = () => { activeSources.current.delete(source); if (activeSources.current.size === 0) setAssistantState('IDLE'); };
      const startTime = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
      source.start(startTime);
      nextStartTime.current = startTime + audioBuffer.duration;
      activeSources.current.add(source);
    } catch (err) { handleError(err); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); addLog("OPTICS: Neural feed active."); }
    } catch (err) { handleError("Camera feed rejected."); }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
    setIsCameraActive(false);
  };

  const toggleLive = async () => {
    if (isLive) { handleStopAll(); return; }
    const limit = PLAN_DETAILS[plan].queryLimit;
    if (queryCount >= limit) { addLog("LIMIT: Link capacity reached."); setView('UPGRADE_REQUIRED'); return; }

    try {
      addLog("SYSTEM: Synchronizing Radha Radha Link...");
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAnalyser.current = inputAudioContext.current.createAnalyser();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sessionPromise.current = connectLive({
        onopen: () => { setIsLive(true); addLog("LINK: High-bandwidth stream active."); setAssistantState('LISTENING'); },
        onmessage: async (msg: any) => {
          if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) await playB64Audio(msg.serverContent.modelTurn.parts[0].inlineData.data);
          if (msg.serverContent?.inputTranscription) setRealtimeInput(msg.serverContent.inputTranscription.text);
        },
        onerror: (e: any) => handleError(e),
        onclose: () => { setIsLive(false); stopCamera(); addLog("LINK: Terminal connection closed."); }
      });
    } catch (err) { handleError(err); }
  };

  const handleTextQuery = async () => {
    if (isProcessing || !inputText.trim()) return;
    const limit = PLAN_DETAILS[plan].queryLimit;
    if (queryCount >= limit) { addLog("LIMIT: Query budget depleted."); setView('UPGRADE_REQUIRED'); return; }

    setIsProcessing(true);
    const query = inputText;
    setInputText('');
    setAssistantState('THINKING');
    setMessages(prev => [...prev, { role: MessageRole.USER, content: query, timestamp: Date.now() }]);
    setQueryCount(prev => prev + 1);

    try {
      let response = "";
      if (mode === 'SEARCH' && plan !== 'FREE') { const res = await performSearchQuery(query, messages); response = res.text; }
      else if (mode === 'DEEP' && plan === 'NEURAL') response = await performThinkingQuery(query, messages);
      else response = await performFastQuery(query, messages);
      
      if (!response.toLowerCase().includes("radha radha")) response = "Radha Radha. " + response;

      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: response, timestamp: Date.now() }]);
      const audio = await generateSpeech(response, emotion);
      if (audio) await playB64Audio(audio);
      else setAssistantState('IDLE');
    } catch (err) { handleError(err); }
    finally { setIsProcessing(false); }
  };

  if (view === 'LOGIN') return <LoginPage onLogin={handleLogin} />;
  
  if (view === 'PLANS' || view === 'UPGRADE_REQUIRED') {
    return (
      <div className="h-[100dvh] w-full bg-[#050508] overflow-y-auto smooth-scroll flex flex-col items-center justify-center p-6 gap-10">
        <div className="text-center animate-in fade-in duration-1000">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Neural Tiering</h2>
          <p className="text-sky-500 text-[10px] font-black uppercase tracking-[0.4em]">Optimized Protocol Capacity</p>
        </div>
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['FREE', 'PRO', 'NEURAL'] as SubscriptionPlan[]).map((p) => {
            const detail = PLAN_DETAILS[p];
            const isSelected = plan === p;
            return (
              <div key={p} className={`bg-zinc-900/40 border-2 p-8 rounded-[2.5rem] flex flex-col justify-between transition-all duration-500 active:scale-95 group ${isSelected ? 'border-sky-500 shadow-glow-sky' : 'border-zinc-800'}`}>
                <div>
                  <div className="flex justify-between items-baseline mb-6">
                    <h3 className="text-white font-black text-2xl uppercase">{detail.name}</h3>
                    <span className="text-sky-500 font-mono font-black text-lg">{detail.price}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {detail.features.map(f => (
                      <li key={f} className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => { setPlan(p); setView('DASHBOARD'); if(p === 'FREE') setQueryCount(0); }} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-sky-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {isSelected ? 'ACTIVE_LINK' : 'INITIALIZE'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#050508] text-zinc-300 overflow-hidden flex-col lg:flex-row relative">
      {showDiagnostic && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-500">
           <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto shadow-glow-sky"></div>
              <h2 className="text-white font-black uppercase tracking-[0.4em] text-xs">Diagnostic Watchdog Active</h2>
              <p className="text-sky-500 font-mono text-[9px] animate-pulse">REPAIRING_NEURAL_LINKS...</p>
           </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-80 bg-[#08080c]/98 backdrop-blur-2xl border-r border-zinc-900/50 flex flex-col transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center gap-4 safe-area-top">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center font-black text-white shadow-glow-sky text-xl">A</div>
          <div className="flex flex-col">
            <h1 className="font-black text-white tracking-tight text-sm mb-1 uppercase">AGNI ULTIMATE</h1>
            <span className="text-[7px] text-zinc-500 font-mono tracking-widest">KERNEL_ALPHA_V5.2</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-24 lg:pb-8 scrollbar-hide">
          <button onClick={isCameraActive ? stopCamera : startCamera} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center gap-4 active:scale-95 ${isCameraActive ? 'bg-sky-500/10 border-sky-500/50 text-sky-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-sky-500 animate-pulse' : 'bg-zinc-700'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">Neural Optics</span>
          </button>
          <Terminal logs={terminalLogs} />
          <button onClick={() => setView('PLANS')} className="w-full p-5 rounded-[2rem] bg-zinc-900/30 border border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Tier Selection</button>
        </div>
      </div>

      {/* CENTER IMMERSIVE STAGE */}
      <div className="flex-1 flex flex-col relative bg-radial-gradient h-full">
        {/* Immersive Mobile Header */}
        <div className="flex lg:hidden items-center justify-between px-6 py-5 bg-gradient-to-b from-black/80 to-transparent safe-area-top z-40">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center font-black text-white" onClick={() => setIsSidebarOpen(true)}>A</div>
             <div>
               <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none mb-0.5">AGNI</h1>
               <div className="flex items-center gap-1.5">
                 <div className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
                 <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase">{plan}_LINK_SYNC</span>
               </div>
             </div>
           </div>
           <div className="flex items-center gap-2">
              <div className="bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800 text-[8px] font-mono text-zinc-400 uppercase tracking-tighter">Budget: {PLAN_DETAILS[plan].queryLimit === Infinity ? '∞' : `${queryCount}/${PLAN_DETAILS[plan].queryLimit}`}</div>
              <button className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800" onClick={() => setIsStatsOpen(true)}>
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between p-4 md:p-8 lg:p-12 pb-[calc(7rem+var(--sab))] lg:pb-12 overflow-hidden relative">
          <div className="flex-1 w-full flex flex-col items-center justify-center relative">
            <div className="w-full max-w-[min(90vw,520px)] aspect-square relative group">
               <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover rounded-full opacity-20 blur-xl pointer-events-none transition-opacity duration-1000 ${isCameraActive ? 'opacity-30' : 'opacity-0'}`} />
               <NovaVisualizer state={assistantState} emotion={emotion} inputAnalyser={inputAnalyser.current} outputAnalyser={outputAnalyser.current} stats={stats} />
               
               {(assistantState !== 'IDLE' || isLive || isProcessing) && (
                 <button onClick={handleStopAll} className="absolute bottom-4 right-4 md:bottom-10 md:right-10 w-14 h-14 md:w-20 md:h-20 bg-rose-600/90 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 z-50 animate-in zoom-in duration-300 backdrop-blur-md border border-rose-500/50">
                   <svg className="w-6 h-6 md:w-8 md:h-8 fill-current" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                 </button>
               )}

               {realtimeInput && (
                 <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 bg-[#0a0a0f]/95 backdrop-blur-3xl px-8 py-5 rounded-3xl border border-zinc-800 text-[10px] md:text-xs font-mono italic text-zinc-300 text-center max-w-[92vw] shadow-3xl animate-in slide-in-from-bottom-4 duration-500">
                   "{realtimeInput}"
                 </div>
               )}
            </div>
          </div>

          {/* Desktop/Wide Input Bar (Hidden on small mobile) */}
          <div className="hidden lg:block w-full max-w-3xl space-y-6 z-10">
            <div className="h-40 overflow-hidden mask-fade-vertical">
              <ChatWindow messages={messages.slice(-3)} isTyping={isProcessing} />
            </div>
            <div className="space-y-4">
              <div className="relative group flex items-center gap-3">
                <button onClick={toggleLive} className={`flex-shrink-0 w-16 h-16 rounded-full border-2 transition-all flex items-center justify-center shadow-2xl ${isLive ? 'bg-emerald-500 border-emerald-400 text-white shadow-glow-green animate-pulse' : 'bg-zinc-900/90 border-zinc-800 text-zinc-500 hover:text-white'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <div className="relative flex-1">
                  <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextQuery()} placeholder="Radha Radha..." className="w-full bg-zinc-900/90 border-2 border-zinc-800 rounded-[2rem] py-5 pl-8 pr-20 outline-none focus:border-sky-500/50 text-white shadow-2xl transition-all text-base backdrop-blur-2xl placeholder:text-zinc-700" />
                  <button onClick={handleTextQuery} className="absolute right-3 top-3 bottom-3 w-12 h-12 rounded-full bg-zinc-800 hover:bg-sky-500 transition-all text-white flex items-center justify-center active:scale-90 shadow-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7"/></svg></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Neural Floating Command Center (Mobile Only) */}
        <BottomNav onOpenDrawer={() => setIsSidebarOpen(true)} onOpenStats={() => setIsStatsOpen(true)} isLive={isLive} toggleLive={toggleLive} plan={plan} />
        
        {/* Overlay Chat Popover for Mobile */}
        {messages.length > 0 && (
          <div className="lg:hidden absolute bottom-32 left-0 right-0 px-6 z-20 pointer-events-none overflow-hidden h-40">
             <div className="mask-fade-vertical">
                <ChatWindow messages={messages.slice(-2)} isTyping={isProcessing} />
             </div>
          </div>
        )}
      </div>

      {/* RIGHT TELEMETRY DRAWER */}
      <div className={`fixed inset-y-0 right-0 z-[70] w-[85vw] max-w-80 bg-[#08080c]/98 backdrop-blur-2xl border-l border-zinc-900/50 flex flex-col transition-transform duration-500 lg:relative lg:translate-x-0 ${isStatsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 safe-area-top"><h2 className="text-xl font-black text-white uppercase tracking-tighter">DATA CLUSTER</h2></div>
        <div className="flex-1 overflow-y-auto px-6 pb-24 lg:pb-8 scrollbar-hide"><SystemDashboard stats={stats} /></div>
      </div>

      {(isSidebarOpen || isStatsOpen) && <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] lg:hidden animate-in fade-in duration-500" onClick={() => { setIsSidebarOpen(false); setIsStatsOpen(false); }} />}
      
      <style>{`
        .mask-fade-vertical { mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent); }
        .shadow-glow-sky { box-shadow: 0 0 35px rgba(14, 165, 233, 0.4); }
        .shadow-glow-green { box-shadow: 0 0 35px rgba(16, 185, 129, 0.4); }
        .bg-radial-gradient { background: radial-gradient(circle at center, #0d0d18 0%, #050508 100%); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
