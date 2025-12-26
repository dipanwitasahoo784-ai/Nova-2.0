
import React, { useState, useEffect, useRef } from 'react';
import { MessageRole, ChatMessage, SystemStats, AssistantState, Emotion, MediaState } from './types';
import { connectLive, decode, decodeAudioData, encode, performSearchQuery, performThinkingQuery, performFastQuery, generateSpeech } from './services/gemini';
import { ICONS } from './constants';
import Terminal from './components/Terminal';
import ChatWindow from './components/ChatWindow';
import SystemDashboard from './components/SystemDashboard';
import NovaVisualizer from './components/NovaVisualizer';

type BrainMode = 'STANDARD' | 'SEARCH' | 'DEEP' | 'FAST';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [mode, setMode] = useState<BrainMode>('STANDARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [media, setMedia] = useState<MediaState>({ isPlaying: false, title: '', artist: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [realtimeInput, setRealtimeInput] = useState('');
  
  const [stats, setStats] = useState<SystemStats>({
    cpu: 12,
    ram: 45,
    storage: 68,
    uptime: "02:14:35",
    latency: 0,
    networkStatus: 'optimal'
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] NOVA OS V4.5 KERNEL LOADED.", "[SYSTEM] Neural Link Protocol: READY."]);
  
  const sessionPromise = useRef<any>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const nextStartTime = useRef(0);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const errorCount = useRef(0);

  const inputAnalyser = useRef<AnalyserNode | null>(null);
  const outputAnalyser = useRef<AnalyserNode | null>(null);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const addLog = (log: string) => {
    setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const checkLatency = async () => {
    const start = performance.now();
    try {
      await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });
      const lat = Math.round(performance.now() - start);
      let status: 'optimal' | 'degraded' | 'critical' = lat > 400 ? 'critical' : lat > 150 ? 'degraded' : 'optimal';
      setStats(prev => ({ ...prev, latency: lat, networkStatus: status }));
    } catch (e) {
      setStats(prev => ({ ...prev, networkStatus: 'critical' }));
    }
  };

  useEffect(() => {
    const lTimer = setInterval(checkLatency, 8000);
    checkLatency();
    
    const statsTimer = setInterval(() => {
      setStats(prev => ({
        ...prev,
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 6 - 3))),
        ram: Math.max(30, Math.min(90, prev.ram + (Math.random() * 2 - 1))),
      }));
    }, 1500);

    return () => {
      clearInterval(lTimer);
      clearInterval(statsTimer);
    };
  }, []);

  const handleError = (err: any) => {
    const errorMessage = err?.message || String(err);
    addLog(`ERROR: ${errorMessage}`);
    setAssistantState('ERROR');
    errorCount.current++;
    
    if (errorCount.current > 3) {
      addLog("WATCHDOG: Too many fault signals. Resetting neural link...");
      if (isLive) stopVoiceSession();
      errorCount.current = 0;
    }
  };

  const playB64Audio = async (base64: string, currentEmotion: Emotion = 'neutral') => {
    try {
      if (!outputAudioContext.current) {
        outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAnalyser.current = outputAudioContext.current.createAnalyser();
        gainNode.current = outputAudioContext.current.createGain();
        gainNode.current.connect(outputAudioContext.current.destination);
      }
      
      setAssistantState('SPEAKING');
      const audioBuffer = await decodeAudioData(decode(base64), outputAudioContext.current, 24000, 1);
      const source = outputAudioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAnalyser.current!);
      outputAnalyser.current!.connect(gainNode.current!);

      source.addEventListener('ended', () => {
        activeSources.current.delete(source);
        if (activeSources.current.size === 0) setAssistantState('IDLE');
      });
      
      const startTime = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
      source.start(startTime);
      nextStartTime.current = startTime + audioBuffer.duration;
      activeSources.current.add(source);
    } catch (err) {
      handleError(err);
    }
  };

  const handleTextQuery = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isProcessing) return;

    setIsProcessing(true);
    setInputText('');
    setAssistantState('LISTENING');
    
    const history = [...messages];
    const userMessage: ChatMessage = { role: MessageRole.USER, content: trimmedInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    addLog(`Neural Link (${mode}): Received protocol request.`);

    try {
      let responseText = "";
      let grounding: any[] = [];

      if (mode === 'SEARCH') {
        const result = await performSearchQuery(trimmedInput, history);
        responseText = result.text;
        grounding = result.grounding;
      } else if (mode === 'DEEP') {
        responseText = await performThinkingQuery(trimmedInput, history);
      } else {
        responseText = await performFastQuery(trimmedInput, history);
      }

      const assistantMessage: ChatMessage = { 
        role: MessageRole.ASSISTANT, 
        content: responseText, 
        timestamp: Date.now(), 
        grounding 
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      addLog(`Neural Link: Synthesis complete.`);
      
      const speechData = await generateSpeech(responseText, emotion);
      if (speechData) {
        await playB64Audio(speechData, emotion);
      } else {
        setAssistantState('IDLE');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceSession = async () => {
    try {
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAnalyser.current = inputAudioContext.current.createAnalyser();
      outputAnalyser.current = outputAudioContext.current.createAnalyser();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sessionPromise.current = connectLive({
        onopen: () => {
          setIsLive(true);
          setAssistantState('IDLE');
          addLog("NOVA: LIVE_SYNC_ACTIVE.");
          const source = inputAudioContext.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
          source.connect(inputAnalyser.current!);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            sessionPromise.current?.then((session: any) => {
              session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.current!.destination);
        },
        onmessage: async (message: any) => {
          if (message.serverContent?.inputTranscription) {
            setAssistantState('LISTENING');
            const text = message.serverContent.inputTranscription.text;
            currentInputTranscription.current += text;
            setRealtimeInput(prev => (prev + " " + text).slice(-100));
          }
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
          }
          if (message.serverContent?.turnComplete) {
            setMessages(prev => [
              ...prev,
              { role: MessageRole.USER, content: currentInputTranscription.current, timestamp: Date.now() },
              { role: MessageRole.ASSISTANT, content: currentOutputTranscription.current, timestamp: Date.now() }
            ]);
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
            setRealtimeInput('');
            if (activeSources.current.size === 0) setAssistantState('IDLE');
          }
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            if (assistantState !== 'SPEAKING') setAssistantState('SPEAKING');
            await playB64Audio(base64Audio, emotion);
          }
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              let res = "ok";
              if (fc.name === 'update_ui_state') {
                  if (fc.args.emotion) setEmotion(fc.args.emotion);
                  if (fc.args.state) setAssistantState(fc.args.state);
              } else if (fc.name === 'read_system_logs') {
                  res = terminalLogs.slice(-5).join("\n");
              } else if (fc.name === 'control_laptop') {
                  if (fc.args.action === 'play_music') setMedia({ isPlaying: true, title: fc.args.target || 'Syncing', artist: 'NOVA' });
                  res = `Executed ${fc.args.action}.`;
              }
              sessionPromise.current?.then((session: any) => {
                session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: res } } });
              });
            }
          }
        },
        onerror: (err: any) => handleError(err),
        onclose: () => {
          setIsLive(false);
          setRealtimeInput('');
        }
      }, stats.networkStatus !== 'optimal');
    } catch (err) {
      handleError(err);
    }
  };

  const stopVoiceSession = () => {
    sessionPromise.current?.then((session: any) => session.close());
    setIsLive(false);
    setAssistantState('IDLE');
    setRealtimeInput('');
  };

  return (
    <div className="flex h-screen w-full bg-[#050508] text-zinc-300 font-sans selection:bg-sky-500/30 antialiased overflow-hidden flex-col lg:flex-row">
      
      {/* Neural Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-[#08080c] transition-transform duration-300 transform lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col border-r border-zinc-900/50 shadow-2xl
      `}>
        <div className="p-8 border-b border-zinc-900/50 flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-zinc-800 shadow-inner group">
            <span className="font-black text-white text-2xl group-hover:scale-110 transition-transform">N</span>
          </div>
          <div>
            <h1 className="font-bold text-2xl text-white tracking-tight">NOVA Core</h1>
            <p className="text-[9px] uppercase tracking-widest font-black text-zinc-600">Kernel: V4.5_STABLE</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <SystemDashboard stats={stats} />
          <Terminal logs={terminalLogs} />
        </div>
        <div className="p-6 border-t border-zinc-900/50">
           <button onClick={() => setMode('SEARCH')} className="w-full py-3 mb-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3">
             {ICONS.SEARCH} Deep Search Web
           </button>
        </div>
      </div>

      {/* Main Home Hub */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-radial-gradient">
        
        {/* Mobile Header Nav */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-900/50 bg-[#08080c]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-black">N</div>
             <h1 className="font-black tracking-tighter text-lg">NOVA</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        {/* Home Stage Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 z-10 relative">
          
          {/* Diagnostic HUD (Desktop only) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-[280px] -translate-y-[120px] hidden xl:flex flex-col gap-5 pointer-events-none opacity-40">
             <div className="flex items-center gap-4 px-5 py-2.5 rounded-full border border-zinc-800/50 bg-black/20 backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse shadow-glow-emerald' : 'bg-zinc-700'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Neural_Sync</span>
             </div>
             <div className="flex items-center gap-4 px-5 py-2.5 rounded-full border border-zinc-800/50 bg-black/20 backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${assistantState === 'SPEAKING' ? 'bg-sky-500 animate-pulse shadow-glow-sky' : 'bg-zinc-700'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Audio_Synthesis</span>
             </div>
          </div>

          <div className="relative w-full aspect-square max-w-[min(85vw,460px)] lg:max-w-[580px] flex flex-col items-center justify-center transition-all duration-700">
             <NovaVisualizer state={assistantState} emotion={emotion} inputAnalyser={inputAnalyser.current} outputAnalyser={outputAnalyser.current} />
             
             {/* Central Neural Activation Hub */}
             <div className="absolute bottom-[-10px] lg:bottom-[-30px] z-20">
                <button 
                  onClick={isLive ? stopVoiceSession : startVoiceSession}
                  className={`group relative flex items-center justify-center px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-500 border-2 overflow-hidden ${
                    isLive 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.3)]' 
                    : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95'
                  }`}
                >
                   <span className="relative z-10 flex items-center gap-4">
                     {isLive ? (
                        <>
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                          Neural Link Online
                        </>
                     ) : (
                        <>
                          <div className="group-hover:animate-bounce">{ICONS.MIC}</div>
                          Initialize Neural Link
                        </>
                     )}
                   </span>
                   {isLive && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>}
                </button>
             </div>
          </div>
          
          <div className="mt-16 lg:mt-24 text-center space-y-8 w-full max-w-2xl px-4">
            
            {/* Real-time Transcription Stream */}
            <div className={`h-10 flex items-center justify-center transition-all duration-500 transform ${realtimeInput ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
               <div className="flex items-center gap-5 bg-zinc-900/60 backdrop-blur-xl px-7 py-3 rounded-full border border-zinc-800/80 shadow-2xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-glow-emerald"></div>
                  <p className="text-xs font-mono text-zinc-300 italic tracking-tight truncate max-w-[280px] lg:max-w-md">"{realtimeInput}"</p>
               </div>
            </div>

            {/* Neural Chat Buffer */}
            <div className="w-full h-32 lg:h-44 overflow-hidden mask-fade-vertical">
              <ChatWindow messages={messages.slice(-2)} isTyping={isProcessing} />
            </div>

            {/* Global Input Bar */}
            <div className={`w-full max-w-xl mx-auto relative group transition-all duration-700 ${isLive ? 'opacity-40 hover:opacity-100 scale-95 hover:scale-100' : 'opacity-100'}`}>
              <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/30 to-emerald-500/30 rounded-[2rem] blur opacity-20 group-focus-within:opacity-100 transition duration-1000"></div>
              <input 
                type="text" 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleTextQuery()} 
                placeholder={isLive ? "Speak now or override with text..." : "Type a protocol command for NOVA..."} 
                className="relative w-full bg-[#0d0d12]/90 border-2 border-zinc-800 rounded-[2rem] py-4 lg:py-5 px-7 lg:px-9 text-base lg:text-lg font-medium outline-none focus:border-sky-500/60 text-white shadow-2xl transition-all" 
              />
              <button 
                onClick={handleTextQuery}
                disabled={isProcessing}
                className={`absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all shadow-xl active:scale-90 ${isProcessing ? 'bg-zinc-700 cursor-not-allowed' : 'bg-zinc-800/80 hover:bg-sky-500'}`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7"/></svg>
                )}
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-3 justify-center flex-wrap">
               {['STANDARD', 'SEARCH', 'DEEP', 'FAST'].map(m => (
                 <button 
                  key={m}
                  onClick={() => setMode(m as BrainMode)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${mode === m ? 'bg-sky-500 border-sky-400 text-white shadow-glow-sky' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                 >
                   {m}
                 </button>
               ))}
            </div>
          </div>
        </div>

        {/* Persistent Desktop Media HUD */}
        {media.isPlaying && (
          <div className="absolute top-10 right-10 hidden lg:flex items-center gap-5 bg-black/40 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-zinc-800/80 shadow-[0_30px_60px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-8 duration-700">
             <div className="w-12 h-12 bg-sky-500/20 rounded-2xl flex items-center justify-center text-sky-400 border border-sky-500/30 animate-pulse">
                {ICONS.MUSIC}
             </div>
             <div className="pr-6">
                <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">Stream Active</p>
                <p className="text-sm font-bold text-white max-w-[140px] truncate leading-tight tracking-tight">{media.title}</p>
             </div>
          </div>
        )}
      </div>

      {/* Global Aesthetics Overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-md z-30 animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}

      <style>{`
        .mask-fade-vertical { mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent); }
        .bg-radial-gradient { background: radial-gradient(circle at center, #0a0a14 0%, #050508 100%); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .shadow-glow-emerald { box-shadow: 0 0 15px rgba(16, 185, 129, 0.5); }
        .shadow-glow-sky { box-shadow: 0 0 15px rgba(14, 165, 233, 0.5); }
      `}</style>
    </div>
  );
};

export default App;
