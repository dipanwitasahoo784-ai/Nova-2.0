
import React, { useState, useEffect, useRef } from 'react';
import { MessageRole, ChatMessage, SystemStats, AssistantState, Emotion, AppView, SubscriptionPlan } from './types';
import { connectLive, decode, decodeAudioData, encode, performSearchQuery, performThinkingQuery, performFastQuery, generateSpeech } from './services/gemini';
import { ICONS } from './constants';
import Terminal from './components/Terminal';
import ChatWindow from './components/ChatWindow';
import SystemDashboard from './components/SystemDashboard';
import NovaVisualizer from './components/NovaVisualizer';
import LoginPage from './components/LoginPage';
import BottomNav from './components/BottomNav';

type BrainMode = 'STANDARD' | 'SEARCH' | 'DEEP' | 'FAST';

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
  
  const [stats, setStats] = useState<SystemStats>({
    cpu: 12, ram: 45, storage: 68, uptime: "00:00:00", latency: 0, networkStatus: 'optimal'
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] AGNI OS V5.0 KERNEL READY."]);
  
  const sessionPromise = useRef<any>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAnalyser = useRef<AnalyserNode | null>(null);
  const outputAnalyser = useRef<AnalyserNode | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkKeyStatus = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey && view !== 'LOGIN') {
          addLog("SYSTEM: API Key missing. Requesting authorization...");
          await window.aistudio.openSelectKey();
        }
      }
    };
    checkKeyStatus();
  }, [view]);

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
    await new Promise(resolve => setTimeout(resolve, 800));
    addLog(`AUTH: Authenticated as ${user}.`);
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
    setView('PLANS');
  };

  const addLog = (log: string) => {
    setTerminalLogs(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const handleError = async (err: any) => {
    const msg = err?.message || String(err);
    addLog(`ERROR: ${msg}`);
    setAssistantState('ERROR');

    if (msg.includes("Requested entity was not found") || msg.includes("API key")) {
      addLog("RECOVERY: API Key issue detected. Re-authorizing via system dialog...");
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
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
      source.onended = () => {
        activeSources.current.delete(source);
        if (activeSources.current.size === 0) setAssistantState('IDLE');
      };
      const startTime = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
      source.start(startTime);
      nextStartTime.current = startTime + audioBuffer.duration;
      activeSources.current.add(source);
    } catch (err) { handleError(err); }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    addLog("SYSTEM: Neural optics offline.");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        addLog("SYSTEM: Neural optics online.");
      }
    } catch (err) {
      handleError("Camera access denied.");
    }
  };

  const toggleLive = async () => {
    if (isLive) {
      sessionPromise.current?.then((s: any) => s.close());
      stopCamera();
      setIsLive(false);
      setAssistantState('IDLE');
      addLog("SYSTEM: Live Link disconnected.");
      return;
    }

    try {
      addLog("SYSTEM: Establishing high-speed Live Link...");
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAnalyser.current = inputAudioContext.current.createAnalyser();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sessionPromise.current = connectLive({
        onopen: () => {
          setIsLive(true);
          addLog("SYSTEM: Live Link active. Listening...");
          setAssistantState('LISTENING');
          const source = inputAudioContext.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(data.length);
            for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
            sessionPromise.current?.then((s: any) => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
          };
          source.connect(inputAnalyser.current!);
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.current!.destination);

          frameIntervalRef.current = window.setInterval(() => {
            if (isCameraActive && videoRef.current && canvasRef.current && sessionPromise.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                sessionPromise.current.then((s: any) => {
                   s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } });
                });
              }
            }
          }, 1000);
        },
        onmessage: async (msg: any) => {
          if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
             await playB64Audio(msg.serverContent.modelTurn.parts[0].inlineData.data);
          }
          if (msg.serverContent?.inputTranscription) {
            setRealtimeInput(msg.serverContent.inputTranscription.text);
          }
        },
        onerror: (e: any) => handleError(e),
        onclose: () => {
           setIsLive(false);
           stopCamera();
           addLog("SYSTEM: Live Link closed by server.");
        }
      });
    } catch (err) { handleError(err); }
  };

  const handleTextQuery = async () => {
    if (isProcessing || !inputText.trim()) return;
    setIsProcessing(true);
    const query = inputText;
    setInputText('');
    setAssistantState('THINKING');
    setMessages(prev => [...prev, { role: MessageRole.USER, content: query, timestamp: Date.now() }]);

    try {
      let response = "";
      let grounding: any[] = [];
      const history = [...messages];

      if (mode === 'SEARCH' && (plan !== 'FREE' && plan !== 'LEGACY')) {
        const res = await performSearchQuery(query, history);
        response = res.text;
        grounding = res.grounding;
      } else if (mode === 'DEEP' && plan === 'NEURAL') {
        response = await performThinkingQuery(query, history);
      } else {
        response = await performFastQuery(query, history);
      }

      setMessages(prev => [...prev, { role: MessageRole.ASSISTANT, content: response, timestamp: Date.now(), grounding }]);
      const audio = await generateSpeech(response, emotion);
      if (audio) await playB64Audio(audio);
      else setAssistantState('IDLE');
    } catch (err) { handleError(err); }
    finally { setIsProcessing(false); }
  };

  if (view === 'LOGIN') return <LoginPage onLogin={handleLogin} />;

  if (view === 'PLANS') {
    return (
      <div className="h-[100dvh] w-full bg-[#050508] overflow-y-auto smooth-scroll overflow-x-hidden">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-12">
          <div className="max-w-6xl w-full space-y-8 md:space-y-12 py-12 safe-area-bottom">
            <div className="text-center space-y-4 px-4 animate-in fade-in slide-in-from-top-4 duration-700">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Choose Your Logic Engine</h2>
              <p className="text-zinc-500 max-w-lg mx-auto text-sm md:text-base font-medium">Select the processing tier that matches your neural interface requirements.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
              {[
                { id: 'LEGACY', name: 'Original', price: 'Legacy', features: ['Classic Stable Kernel', 'Standard Logic', 'Standard Voice Synthesis'] },
                { id: 'FREE', name: 'Standard', price: '$0', features: ['Core Neural Intelligence', 'Priority Fast Mode', 'Basic Live Sync Link'] },
                { id: 'PRO', name: 'Deep Pro', price: '$20', features: ['Google Search Grounding', 'Optimized Processing', 'Enhanced Live Interaction'] },
                { id: 'NEURAL', name: 'Neural Max', price: '$40', features: ['Full Cognitive Reasoning', 'Deep Knowledge Graph', 'Advanced Vision Identification'] }
              ].map((p, idx) => (
                <div key={p.id} 
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] flex flex-col justify-between hover:border-sky-500/50 transition-all group animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                >
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px]">{p.name}</h3>
                      <div className="text-3xl font-black text-white mt-2">{p.price}<span className="text-sm font-medium text-zinc-600">/mo</span></div>
                    </div>
                    <ul className="space-y-4">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-3 text-xs text-zinc-300">
                          <div className="w-1.5 h-1.5 bg-sky-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setPlan(p.id as SubscriptionPlan); setView('DASHBOARD'); }}
                    className="mt-8 w-full py-4 rounded-2xl bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest group-hover:bg-sky-500 active:scale-95 transition-all shadow-xl"
                  >
                    Sync Logic
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#050508] text-zinc-300 overflow-hidden flex-col lg:flex-row relative">
      {(isSidebarOpen || isStatsOpen) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] lg:hidden transition-opacity duration-300 animate-in fade-in" 
             onClick={() => { setIsSidebarOpen(false); setIsStatsOpen(false); }} />
      )}

      <div className={`fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-80 bg-[#08080c] border-r border-zinc-900/50 flex flex-col transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center font-black text-white shadow-lg border border-zinc-800">A</div>
            <div><h1 className="font-bold text-lg text-white">AGNI OS</h1><span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{plan}</span></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 space-y-8 smooth-scroll pb-24">
           <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Optics Module</p>
              <button onClick={isCameraActive ? stopCamera : startCamera} className={`w-full p-6 rounded-3xl border transition-all flex items-center gap-4 active:scale-95 ${isCameraActive ? 'bg-sky-500/10 border-sky-500/50 text-sky-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                    <div className={`w-3 h-3 rounded-full ${isCameraActive ? 'bg-sky-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                    <span className="text-xs font-black uppercase tracking-widest">Vision Sensor</span>
                </button>
                {isCameraActive && (
                  <div className="relative rounded-3xl overflow-hidden border border-zinc-800 aspect-video bg-black group shadow-2xl"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-50 contrast-125" /><canvas ref={canvasRef} width="320" height="240" className="hidden" /></div>
                )}
           </div>
           <Terminal logs={terminalLogs} />
        </div>
        <div className="p-6 border-t border-zinc-900/50 bg-[#08080c] grid grid-cols-2 gap-3 safe-area-bottom">
           <button onClick={() => setView('PLANS')} className="py-4 bg-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 active:bg-zinc-800 transition-colors">Plan</button>
           <button onClick={() => setView('LOGIN')} className="py-4 bg-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 active:bg-zinc-800 transition-colors">Exit</button>
        </div>
      </div>

      <div className={`fixed inset-y-0 right-0 z-[70] w-[85vw] max-w-80 bg-[#08080c] border-l border-zinc-900/50 flex flex-col transition-transform duration-500 lg:hidden ${isStatsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-8 safe-area-top"><h2 className="text-xl font-black text-white tracking-tighter uppercase">Neural Telemetry</h2></div>
          <div className="flex-1 overflow-y-auto px-6 pb-24 smooth-scroll"><SystemDashboard stats={stats} /></div>
      </div>

      <div className="flex-1 flex flex-col relative bg-radial-gradient h-[100dvh]">
        <div className="flex items-center justify-between p-5 md:p-6 bg-[#08080c]/50 backdrop-blur-xl border-b border-zinc-900/50 z-20 safe-area-top">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center font-black text-white text-xs border border-zinc-800 shadow-glow-sky">A</div>
            <h1 className="font-black text-white tracking-tighter text-xl">AGNI</h1>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>KERNEL_STABLE</div>
            <span>v5.0.0_RELEASE</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between p-6 relative overflow-hidden pb-24 lg:pb-8">
          <div className="flex-1 flex flex-col items-center justify-center w-full relative">
            <div className="relative w-full aspect-square max-w-[min(70vw,360px)] lg:max-w-[480px] flex items-center justify-center">
              <NovaVisualizer state={assistantState} emotion={emotion} inputAnalyser={inputAnalyser.current} outputAnalyser={outputAnalyser.current} />
              {realtimeInput && <div className="absolute -bottom-10 md:-bottom-16 bg-zinc-900/95 backdrop-blur-2xl px-6 py-3 rounded-full border border-zinc-800 text-[10px] md:text-xs font-mono italic text-zinc-300 animate-in fade-in slide-in-from-bottom-4 text-center max-w-[85vw] truncate shadow-[0_10px_40px_rgba(0,0,0,0.5)]">"{realtimeInput}"</div>}
            </div>
          </div>

          <div className="w-full max-w-3xl space-y-6 lg:space-y-8 z-10">
            <div className="h-24 lg:h-48 overflow-hidden mask-fade-vertical"><ChatWindow messages={messages.slice(-3)} isTyping={isProcessing} /></div>
            <div className="relative group"><div className="absolute -inset-2 bg-sky-500/10 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-700"></div><div className="relative flex items-center"><input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextQuery()} placeholder="Sync command protocol..." className="w-full bg-zinc-900/60 border-2 border-zinc-800/50 rounded-[2rem] lg:rounded-[2.5rem] py-5 lg:py-6 pl-8 pr-16 outline-none focus:border-sky-500/30 text-white shadow-2xl transition-all text-sm lg:text-lg placeholder:text-zinc-600 backdrop-blur-md" /><button onClick={handleTextQuery} className="absolute right-3 lg:right-4 w-12 h-12 lg:w-14 lg:h-14 rounded-3xl bg-zinc-800 flex items-center justify-center hover:bg-sky-500 active:scale-95 transition-all text-white shadow-xl"><svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7"/></svg></button></div></div>
            <div className="flex gap-2 justify-center overflow-x-auto pb-4 scrollbar-hide">
              {[ { id: 'STANDARD', icon: ICONS.BOLT, label: 'Fast' }, { id: 'SEARCH', icon: ICONS.SEARCH, label: 'Search', restricted: plan === 'FREE' || plan === 'LEGACY' }, { id: 'DEEP', icon: ICONS.BRAIN, label: 'Deep', restricted: plan !== 'NEURAL' } ].map(m => (
                <button key={m.id} onClick={() => !m.restricted && setMode(m.id as BrainMode)} className={`px-6 lg:px-8 py-3 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-[0.15em] flex items-center gap-2 border transition-all whitespace-nowrap active:scale-95 ${m.restricted ? 'opacity-30 grayscale border-zinc-900 bg-zinc-950 text-zinc-600' : mode === m.id ? 'bg-sky-500 border-sky-400 text-white shadow-glow-sky' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>{m.icon}{m.label} {m.restricted && '🔒'}</button>
              ))}
            </div>
          </div>
        </div>
        <BottomNav onOpenDrawer={() => setIsSidebarOpen(true)} onOpenStats={() => setIsStatsOpen(true)} isLive={isLive} toggleLive={toggleLive} plan={plan} />
      </div>

      <style>{`
        .mask-fade-vertical { mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent); }
        .bg-radial-gradient { background: radial-gradient(circle at center, #0d0d15 0%, #050508 100%); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .shadow-glow-sky { box-shadow: 0 0 30px rgba(14, 165, 233, 0.3); }
        @supports (height: 100dvh) { .h-screen { height: 100dvh; } }
      `}</style>
    </div>
  );
};

export default App;
