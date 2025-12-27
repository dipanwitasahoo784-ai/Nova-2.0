
import React, { useState, useEffect, useRef } from 'react';
import { MessageRole, ChatMessage, SystemStats, AssistantState, Emotion, AppView, SubscriptionPlan } from './types';
import { connectLive, decode, decodeAudioData, encode, performSearchQuery, performThinkingQuery, performFastQuery, generateSpeech } from './services/gemini';
import { ICONS } from './constants';
import Terminal from './components/Terminal';
import ChatWindow from './components/ChatWindow';
import SystemDashboard from './components/SystemDashboard';
import NovaVisualizer from './components/NovaVisualizer';
import LoginPage from './components/LoginPage';

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
  const [realtimeInput, setRealtimeInput] = useState('');
  
  const [stats, setStats] = useState<SystemStats>({
    cpu: 12, ram: 45, storage: 68, uptime: "00:00:00", latency: 0, networkStatus: 'optimal'
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] NOVA OS V5.1 KERNEL READY."]);
  
  const sessionPromise = useRef<any>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAnalyser = useRef<AnalyserNode | null>(null);
  const outputAnalyser = useRef<AnalyserNode | null>(null);
  
  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const handleLogin = async (user: string, pass: string) => {
    // Simulated auth delay
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

  const handleError = (err: any) => {
    const msg = err?.message || String(err);
    if (msg.includes("Requested entity was not found")) {
      addLog("AUTH: Key invalid. Redirecting...");
      setView('LOGIN');
      return;
    }
    addLog(`ERROR: ${msg}`);
    setAssistantState('ERROR');
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
      return;
    }

    try {
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAnalyser.current = inputAudioContext.current.createAnalyser();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sessionPromise.current = connectLive({
        onopen: () => {
          setIsLive(true);
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

          // Vision Frame Capture Loop
          frameIntervalRef.current = window.setInterval(() => {
            if (isCameraActive && videoRef.current && canvasRef.current && sessionPromise.current) {
              const canvas = canvasRef.current;
              const video = videoRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
        onerror: handleError,
        onclose: () => {
           setIsLive(false);
           stopCamera();
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

  if (view === 'LOGIN') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (view === 'PLANS') {
    return (
      <div className="min-h-screen w-full bg-[#050508] flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-6xl w-full space-y-8 md:space-y-12 py-8 md:py-12">
          <div className="text-center space-y-4 px-4">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Choose Your Logic Engine</h2>
            <p className="text-zinc-500 max-w-lg mx-auto text-sm">Select the processing tier that matches your workflow requirements.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-4">
            {[
              { id: 'LEGACY', name: 'Original', price: 'Legacy', features: ['Classic Logic', 'Stable Kernel', 'Standard Voice'] },
              { id: 'FREE', name: 'Standard', price: '$0', features: ['Core Intelligence', 'Fast Responses', 'Basic Live Link'] },
              { id: 'PRO', name: 'Deep Pro', price: '$20', features: ['Google Search Grounding', 'Priority Processing', 'Enhanced Live Voice'] },
              { id: 'NEURAL', name: 'Neural Max', price: '$40', features: ['Deep Reasoning (Thinking)', 'Unlimited Search', 'Full Vision Identification'] }
            ].map((p) => (
              <div key={p.id} className="bg-zinc-900/50 border border-zinc-800 p-6 md:p-8 rounded-3xl flex flex-col justify-between hover:border-sky-500/50 transition-colors group">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">{p.name}</h3>
                    <div className="text-3xl font-black text-white mt-2">{p.price}<span className="text-sm font-medium text-zinc-600">/mo</span></div>
                  </div>
                  <ul className="space-y-3">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-xs text-zinc-300">
                        <div className="w-1 h-1 bg-sky-500 rounded-full flex-shrink-0"></div> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => { setPlan(p.id as SubscriptionPlan); setView('DASHBOARD'); }}
                  className="mt-8 w-full py-4 rounded-xl bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest group-hover:bg-white group-hover:text-black transition-all"
                >
                  Select Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#050508] text-zinc-300 overflow-hidden flex-col lg:flex-row relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[85vw] max-w-80 bg-[#08080c] border-r border-zinc-900/50 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center font-black text-white shadow-lg border border-zinc-800">N</div>
            <div>
              <h1 className="font-bold text-lg text-white">NOVA OS</h1>
              <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{plan} TIER</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6 scrollbar-hide">
          <div className="space-y-4">
             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Active Link Control</p>
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={toggleLive}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 text-center ${isLive ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-glow-emerald' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Live Link</span>
                </button>
                <button 
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 text-center ${isCameraActive ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-glow-sky' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                >
                    <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-sky-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">Vision</span>
                </button>
             </div>
             
             {isCameraActive && (
               <div className="relative rounded-xl overflow-hidden border border-zinc-800 aspect-video bg-black group">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-50 contrast-125" />
                  <canvas ref={canvasRef} width="320" height="240" className="hidden" />
                  <div className="absolute inset-0 border-2 border-sky-500/20 pointer-events-none"></div>
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-white uppercase tracking-widest bg-black/40 px-1 rounded">Visual ID Active</span>
                  </div>
               </div>
             )}
          </div>
          <SystemDashboard stats={stats} />
          <Terminal logs={terminalLogs} />
        </div>

        <div className="p-4 md:p-6 border-t border-zinc-900/50 flex gap-2 bg-[#08080c]">
           <button onClick={() => setView('PLANS')} className="flex-1 py-3 bg-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800">Plan</button>
           <button onClick={() => setView('LOGIN')} className="flex-1 py-3 bg-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800">Exit</button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col relative bg-radial-gradient h-full">
        <div className="lg:hidden flex items-center justify-between p-4 bg-[#08080c] border-b border-zinc-900/50 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center font-black text-white text-xs border border-zinc-800">N</div>
            <h1 className="font-black text-white tracking-tight">NOVA</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-zinc-400 active:bg-zinc-800 rounded-lg">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-between lg:justify-center p-4 md:p-6 lg:p-12 relative overflow-hidden pb-8">
          <div className="relative w-full aspect-square max-w-[min(80vw,420px)] flex items-center justify-center my-auto lg:my-0">
            <NovaVisualizer 
              state={assistantState} 
              emotion={emotion} 
              inputAnalyser={inputAnalyser.current} 
              outputAnalyser={outputAnalyser.current} 
            />
            {realtimeInput && (
              <div className="absolute -bottom-8 md:-bottom-12 bg-zinc-900/80 backdrop-blur-xl px-4 md:px-6 py-2 rounded-full border border-zinc-800 text-[9px] md:text-[10px] font-mono italic text-zinc-400 animate-in fade-in slide-in-from-bottom-2 text-center max-w-[90vw] truncate">
                "{realtimeInput}"
              </div>
            )}
          </div>

          <div className="w-full max-w-2xl space-y-4 md:space-y-8 z-10 mt-auto lg:mt-16">
            <div className="h-32 md:h-48 overflow-hidden mask-fade-vertical">
              <ChatWindow messages={messages.slice(-3)} isTyping={isProcessing} />
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-sky-500/20 rounded-2xl md:rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
              <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextQuery()}
                placeholder="Enter neural command protocol..."
                className="relative w-full bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl md:rounded-[2rem] py-4 md:py-5 px-6 md:px-8 outline-none focus:border-sky-500/50 text-white shadow-2xl transition-all text-sm md:text-base placeholder:text-zinc-600"
              />
              <button 
                onClick={handleTextQuery}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-zinc-800 flex items-center justify-center hover:bg-sky-500 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7"/></svg>
              </button>
            </div>

            <div className="flex gap-2 justify-center overflow-x-auto pb-2 scrollbar-hide px-2">
              {[
                { id: 'STANDARD', icon: ICONS.BOLT, label: 'Fast' },
                { id: 'SEARCH', icon: ICONS.SEARCH, label: 'Search', restricted: plan === 'FREE' || plan === 'LEGACY' },
                { id: 'DEEP', icon: ICONS.BRAIN, label: 'Deep', restricted: plan !== 'NEURAL' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => !m.restricted && setMode(m.id as BrainMode)}
                  className={`px-4 md:px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all whitespace-nowrap flex-shrink-0 ${m.restricted ? 'opacity-30 cursor-not-allowed grayscale border-zinc-800 bg-zinc-950' : mode === m.id ? 'bg-sky-500 border-sky-400 text-white shadow-glow-sky' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}`}
                >
                  <span className="scale-75 md:scale-100">{m.icon}</span>
                  {m.label} {m.restricted && '🔒'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mask-fade-vertical { mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); }
        .bg-radial-gradient { background: radial-gradient(circle at center, #0a0a14 0%, #050508 100%); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .shadow-glow-emerald { box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); }
        .shadow-glow-sky { box-shadow: 0 0 20px rgba(14, 165, 233, 0.4); }
      `}</style>
    </div>
  );
};

export default App;
