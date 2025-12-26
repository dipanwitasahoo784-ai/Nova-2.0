
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
    <div className="space-y-6">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
        >
          <div className={`max-w-[90%] rounded-[1.5rem] px-6 py-4 ${
            msg.role === MessageRole.USER
              ? 'bg-zinc-800/80 text-white rounded-tr-none border border-zinc-700/50 shadow-xl'
              : 'bg-zinc-900/90 border border-sky-500/20 text-sky-50 rounded-tl-none shadow-2xl backdrop-blur-md'
          }`}>
            <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] uppercase font-black tracking-widest opacity-60 ${msg.role === MessageRole.USER ? 'text-zinc-400' : 'text-sky-400'}`}>
                    {msg.role === MessageRole.USER ? 'USER_INPUT' : 'NOVA_SYNTHESIS'}
                </span>
            </div>
            <p className="text-base leading-relaxed whitespace-pre-wrap font-medium tracking-tight">
              {msg.content}
            </p>

            {/* Render grounding chunks (sources) for search queries */}
            {msg.grounding && msg.grounding.length > 0 && (
              <div className="mt-4 pt-4 border-t border-sky-500/20 space-y-2">
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Sources</p>
                <div className="flex flex-wrap gap-2">
                  {msg.grounding.map((chunk, cIdx) => (
                    chunk.web && (
                      <a 
                        key={cIdx} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 px-2 py-1 rounded border border-sky-500/30 transition-colors flex items-center gap-1"
                      >
                        {chunk.web.title || 'Source'} ↗
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
          <div className="bg-zinc-900/90 border border-sky-500/20 rounded-2xl rounded-tl-none px-6 py-4 shadow-2xl flex gap-1.5 items-center">
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