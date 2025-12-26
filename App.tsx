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
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [mode, setMode] = useState<BrainMode>('STANDARD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [media, setMedia] = useState<MediaState>({ isPlaying: false, title: '', artist: '' });
  
  const [stats, setStats] = useState<SystemStats>({
    cpu: 12,
    ram: 45,
    storage: 68,
    uptime: "02:14:35",
    latency: 0,
    networkStatus: 'optimal'
  });
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[SYSTEM] NOVA OS V4.5 - Full Control ACTIVE."]);
  
  const sessionPromise = useRef<any>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const nextStartTime = useRef(0);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isAisSpeaking = useRef(false);

  const inputAnalyser = useRef<AnalyserNode | null>(null);
  const outputAnalyser = useRef<AnalyserNode | null>(null);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio?.hasSelectedApiKey) {
          const selected = await (window as any).aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } else {
          // If aistudio is not yet initialized, we default to false to show the link screen
          setHasKey(false);
        }
      } catch (err) {
        console.error("Failed to check API key status:", err);
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        setHasKey(true);
      } else {
        addLog("SYSTEM ERROR: AI Studio Link unavailable.");
      }
    } catch (err) {
      handleError(err);
    }
  };

  const addLog = (log: string) => {
    setTerminalLogs(prev => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const checkLatency = async () => {
    const start = performance.now();
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      const end = performance.now();
      const lat = Math.round(end - start);
      
      let status: 'optimal' | 'degraded' | 'critical' = 'optimal';
      if (lat > 400) status = 'critical';
      else if (lat > 150) status = 'degraded';
      
      setStats(prev => ({ ...prev, latency: lat, networkStatus: status }));
      
      if (status === 'critical' && mode !== 'FAST') {
        setMode('FAST');
        addLog("NETWORK CRITICAL: Switching to Fast Mode (concise).");
      }
    } catch (e) {
      setStats(prev => ({ ...prev, networkStatus: 'critical' }));
    }
  };

  useEffect(() => {
    const lTimer = setInterval(checkLatency, 5000);
    checkLatency();
    return () => clearInterval(lTimer);
  }, [mode]);

  const handleError = (err: any) => {
    const errorMessage = err?.message || String(err);
    addLog(`ERROR: ${errorMessage}`);
    setAssistantState('ERROR');
    if (errorMessage.includes("Requested entity was not found")) {
      handleOpenKeySelector();
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
      
      const clarityBoost = (currentEmotion === 'urgent' || currentEmotion === 'frustrated') ? 1.2 : 1.0;
      gainNode.current!.gain.setTargetAtTime(clarityBoost, outputAudioContext.current.currentTime, 0.1);

      setAssistantState('SPEAKING');
      isAisSpeaking.current = true;
      
      const audioBuffer = await decodeAudioData(decode(base64), outputAudioContext.current, 24000, 1);
      const source = outputAudioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAnalyser.current!);
      outputAnalyser.current!.connect(gainNode.current!);

      source.addEventListener('ended', () => {
        activeSources.current.delete(source);
        if (activeSources.current.size === 0) {
          setAssistantState('IDLE');
          isAisSpeaking.current = false;
        }
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
    if (!inputText.trim()) return;
    const userQuery = inputText;
    const currentLat = stats.latency || 0;
    
    setInputText('');
    
    if (currentLat > 150) {
      setAssistantState('LISTENING');
    }
    
    setIsProcessing(true);
    // Optimization: Capture current messages for history before updating state
    const history = [...messages];
    setMessages(prev => [...prev, { role: MessageRole.USER, content: userQuery, timestamp: Date.now() }]);
    addLog(`Neural Link (${mode}): ${userQuery.slice(0, 30)}...`);

    try {
      let responseText = "";
      let grounding: any[] = [];
      const isConcise = currentLat > 400;
      const targetMode = currentLat > 400 ? 'FAST' : mode;

      if (targetMode === 'SEARCH') {
        const result = await performSearchQuery(userQuery, history);
        responseText = result.text;
        grounding = result.grounding;
      } else if (targetMode === 'DEEP') {
        responseText = await performThinkingQuery(userQuery, history);
      } else {
        responseText = await performFastQuery(userQuery, history, isConcise);
      }

      setAssistantState('SPEAKING');
      setMessages(prev => [...prev, { 
        role: MessageRole.ASSISTANT, 
        content: responseText, 
        timestamp: Date.now(),
        grounding: grounding.length > 0 ? grounding : undefined
      }]);
      
      const speechData = await generateSpeech(responseText, emotion);
      if (speechData) await playB64Audio(speechData, emotion);

    } catch (err) {
      handleError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceSession = async () => {
    try {
      const isDegraded = stats.networkStatus !== 'optimal';
      addLog(`Initializing NOVA Live (Network: ${stats.networkStatus})...`);
      
      inputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAnalyser.current = inputAudioContext.current.createAnalyser();
      outputAnalyser.current = outputAudioContext.current.createAnalyser();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sessionPromise.current = connectLive({
        onopen: () => {
          setIsLive(true);
          setAssistantState('IDLE');
          addLog("NOVA: LIVE_SESSION_ESTABLISHED.");
          
          const source = inputAudioContext.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContext.current!.createScriptProcessor(4096, 1, 1);
          source.connect(inputAnalyser.current!);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
            const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
            
            sessionPromise.current?.then((session: any) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContext.current!.destination);
        },
        onmessage: async (message: any) => {
          if (message.serverContent?.inputTranscription) {
            setAssistantState('LISTENING');
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
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
              } else if (fc.name === 'control_laptop') {
                  const { action, target } = fc.args;
                  addLog(`SYSTEM COMMAND: ${action} ${target || ''}`);
                  if (action === 'play_music') setMedia({ isPlaying: true, title: target || 'Untitled Sync', artist: 'NOVA AI' });
                  else if (action === 'stop_music') setMedia({ isPlaying: false, title: '', artist: '' });
                  res = `Executed ${action}.`;
              }
              sessionPromise.current?.then((session: any) => {
                session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: res } } });
              });
            }
          }
        },
        onerror: (err: any) => handleError(err),
        onclose: () => setIsLive(false)
      }, isDegraded);
    } catch (err) {
      handleError(err);
    }
  };

  const stopVoiceSession = () => {
    sessionPromise.current?.then((session: any) => session.close());
    setIsLive(false);
    setAssistantState('IDLE');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 4 - 2))),
        ram: Math.max(30, Math.min(90, prev.ram + (Math.random() * 0.8 - 0.4))),
      }));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  if (hasKey === false) {
    return (
      <div className="h-screen w-full bg-[#050508] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-12 rounded-[2.5rem] text-center shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-sky-500 rounded-3xl mx-auto mb-8 flex items-center justify-center">
            <span className="text-white text-4xl font-black">N</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Initialize Link</h1>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-sky-50"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#050508] text-zinc-300 font-sans selection:bg-sky-500/30 antialiased overflow-hidden">
      <div className="w-80 border-r border-zinc-900/50 flex flex-col bg-[#08080c] z-20 shadow-2xl">
        <div className="p-8 border-b border-zinc-900/50 flex items-center gap-6">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-700 ${
            assistantState === 'LISTENING' ? 'bg-sky-500 shadow-[0_0_50px_rgba(14,165,233,0.8)]' :
            assistantState === 'SPEAKING' ? 'bg-emerald-500 shadow-[0_0_50px_rgba(34,197,94,0.8)]' :
            'bg-zinc-800'
          }`}>
            <span className="font-black text-white text-2xl">N</span>
          </div>
          <div>
            <h1 className="font-bold text-2xl text-white mb-1">NOVA Core</h1>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${stats.networkStatus === 'optimal' ? 'bg-emerald-500' : stats.networkStatus === 'degraded' ? 'bg-amber-500' : 'bg-rose-500'}`} />
               <p className="text-[9px] uppercase tracking-widest font-black text-zinc-600">
                 Net: {stats.latency}ms
               </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {media.isPlaying && (
            <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl">
              <div className="flex items-center gap-3 text-sky-400">
                {ICONS.MUSIC} <p className="text-sm font-bold truncate">{media.title}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Processing Modes</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'STANDARD', icon: ICONS.MIC, label: 'Live' },
                { id: 'SEARCH', icon: ICONS.SEARCH, label: 'Search' },
                { id: 'DEEP', icon: ICONS.BRAIN, label: 'Compute' },
                { id: 'FAST', icon: ICONS.BOLT, label: 'Fast' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as BrainMode)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
                    mode === m.id ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-500'
                  }`}
                >
                  {m.icon} <span className="text-[10px] font-bold uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <SystemDashboard stats={stats} />
          <Terminal logs={terminalLogs} />
        </div>

        <div className="p-6 border-t border-zinc-900/50">
           <button 
             onClick={isLive ? stopVoiceSession : startVoiceSession}
             className={`w-full py-5 rounded-[2rem] flex items-center justify-center gap-4 font-black text-sm uppercase tracking-widest transition-all ${
               isLive ? 'bg-rose-500/5 text-rose-500 border border-rose-500/20' : 'bg-white text-black hover:bg-sky-50'
             }`}
           >
             {isLive ? 'End Live Session' : 'Go Live'}
             {ICONS.MIC}
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden items-center justify-center bg-radial-gradient">
        <div className="relative flex flex-col items-center z-10 w-full max-w-4xl">
          <NovaVisualizer state={assistantState} emotion={emotion} inputAnalyser={inputAnalyser.current} outputAnalyser={outputAnalyser.current} />
          
          <div className="mt-8 text-center space-y-8 px-6 w-full">
            <div className="space-y-4">
              <h2 className="text-8xl font-black tracking-tighter text-white">NOVA</h2>
              <p className="text-zinc-500 text-xl font-light tracking-tight">
                {isProcessing ? 'Processing...' : assistantState === 'LISTENING' ? 'Listening...' : assistantState === 'SPEAKING' ? 'Speaking...' : 'Ready.'}
              </p>
            </div>

            <div className="w-full max-w-2xl mx-auto h-48 overflow-hidden mask-fade-vertical">
              <ChatWindow messages={messages.slice(-2)} isTyping={isProcessing} />
            </div>

            <div className="w-full max-w-xl mx-auto relative group">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextQuery()}
                placeholder={`Type or click 'Go Live' for voice...`}
                className="w-full bg-zinc-900/40 border-2 border-zinc-800 rounded-3xl py-5 px-8 text-lg font-medium outline-none focus:border-sky-500 text-white shadow-2xl"
              />
              <button onClick={handleTextQuery} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mask-fade-vertical { mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .bg-radial-gradient { background: radial-gradient(circle at center, #0a0a10 0%, #050508 100%); }
      `}</style>
    </div>
  );
};

export default App;
