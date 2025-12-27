
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
    <div className="space-y-2 md:space-y-6 px-1">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
        >
          <div className={`max-w-[92%] md:max-w-[90%] rounded-[1.25rem] md:rounded-[1.5rem] px-4 md:px-6 py-3 md:py-4 ${
            msg.role === MessageRole.USER
              ? 'bg-zinc-800/80 text-white rounded-tr-none border border-zinc-700/50 shadow-lg'
              : 'bg-zinc-900/90 border border-sky-500/20 text-sky-50 rounded-tl-none shadow-xl backdrop-blur-md'
          }`}>
            <div className="flex items-center gap-2 mb-1">
                <span className={`text-[7px] md:text-[9px] uppercase font-black tracking-widest opacity-60 ${msg.role === MessageRole.USER ? 'text-zinc-400' : 'text-sky-400'}`}>
                    {msg.role === MessageRole.USER ? 'USER_INPUT' : 'AGNI_SYNTHESIS'}
                </span>
            </div>
            <p className="text-xs md:text-base leading-relaxed whitespace-pre-wrap font-medium tracking-tight">
              {msg.content}
            </p>

            {msg.grounding && msg.grounding.length > 0 && (
              <div className="mt-3 pt-3 border-t border-sky-500/10 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {msg.grounding.map((chunk, cIdx) => (
                    chunk.web && (
                      <a 
                        key={cIdx} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[8px] md:text-[10px] bg-sky-500/10 text-sky-300 px-2 py-1 rounded-full border border-sky-500/20 transition-colors flex items-center gap-1 max-w-full truncate"
                      >
                        <span className="truncate">{chunk.web.title || 'Source'}</span>
                        <span className="flex-shrink-0">↗</span>
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
          <div className="bg-zinc-900/90 border border-sky-500/20 rounded-2xl rounded-tl-none px-4 py-3 shadow-2xl flex gap-1.5 items-center">
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
