
import React, { useEffect, useRef } from 'react';
import { ChatMessage, MessageRole } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isTyping }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div className="space-y-4 md:space-y-6 px-1">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500 pointer-events-auto`}
        >
          <div className={`max-w-[94%] md:max-w-[85%] rounded-[1.75rem] px-5 py-3.5 md:px-7 md:py-4 transition-all shadow-2xl backdrop-blur-2xl ${
            msg.role === MessageRole.USER
              ? 'bg-zinc-800/90 text-white rounded-tr-none border border-zinc-700/50'
              : 'bg-[#0f0f1a]/95 border border-sky-500/30 text-sky-50 rounded-tl-none ring-1 ring-sky-500/10'
          }`}>
            <div className="flex items-center gap-2 mb-1.5 opacity-60">
                <div className={`w-1.5 h-1.5 rounded-full ${msg.role === MessageRole.USER ? 'bg-zinc-500' : 'bg-sky-500'}`} />
                <span className={`text-[8px] uppercase font-black tracking-widest ${msg.role === MessageRole.USER ? 'text-zinc-400' : 'text-sky-400'}`}>
                    {msg.role === MessageRole.USER ? 'USER_INPUT' : 'AGNI_RESPONSE'}
                </span>
            </div>
            <p className="text-sm md:text-base leading-relaxed font-medium tracking-tight">
              {msg.content}
            </p>

            {msg.grounding && msg.grounding.length > 0 && (
              <div className="mt-3 pt-3 border-t border-sky-500/10 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {msg.grounding.map((chunk, cIdx) => (
                    chunk.web && (
                      <a 
                        key={cIdx} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[9px] bg-sky-500/10 text-sky-300 px-3 py-1.5 rounded-full border border-sky-500/20 transition-all hover:bg-sky-500 hover:text-white flex items-center gap-1.5 max-w-full"
                      >
                        <span className="truncate">{chunk.web.title || 'Nexus'}</span>
                        <span className="text-[7px]">↗</span>
                      </a>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-[#0f0f1a]/95 border border-sky-500/30 rounded-2xl rounded-tl-none px-5 py-3.5 shadow-2xl flex gap-1.5 items-center backdrop-blur-xl">
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      )}
      <div ref={scrollRef} />
    </div>
  );
};

export default ChatWindow;
