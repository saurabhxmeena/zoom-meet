'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp } from 'lucide-react';
import { IMessage } from '@/lib/types';

interface ChatPanelProps {
  messages: IMessage[];
  currentUserId: string;
  currentDisplayName: string;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export default function ChatPanel({
  messages,
  currentUserId,
  onSendMessage,
  onClose,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <aside className="w-80 sm:w-88 h-full bg-[#161618] border-l border-white/[0.06] flex flex-col z-30 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-xs font-semibold text-[#f5f5f7] tracking-tight">Chat</h3>
        <button
          onClick={onClose}
          className="p-1 text-[#86868b] hover:text-[#f5f5f7] rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#515154]">
            <p className="text-xs">No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUserId === currentUserId;
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg._id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[11px] text-[#86868b] mb-1 px-1">
                    {msg.senderName}
                  </span>
                )}

                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed text-xs ${
                    isMe
                      ? 'bg-[#2997ff] text-white rounded-tr-sm'
                      : 'bg-[#242426] text-[#f5f5f7] rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>

                <span className="text-[10px] text-[#515154] mt-0.5 px-1">
                  {time}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.06] flex items-center space-x-2">
        <input
          type="text"
          maxLength={1000}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl px-3 py-2 text-xs text-[#f5f5f7] placeholder-[#515154] transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-8 h-8 rounded-full bg-[#2997ff] hover:bg-[#0077ed] disabled:opacity-30 disabled:hover:bg-[#2997ff] text-white flex items-center justify-center transition shrink-0"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>

    </aside>
  );
}
