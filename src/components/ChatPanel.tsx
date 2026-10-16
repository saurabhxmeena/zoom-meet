'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp, MessageSquare, Clock } from 'lucide-react';
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
    <aside className="w-80 sm:w-88 h-full bg-[#16181f] border-l border-[#242732] flex flex-col z-30 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#242732] bg-[#16181f]">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-slate-300" />
          <h3 className="text-xs font-semibold text-[#f8fafc] tracking-tight">Meeting Chat</h3>
          <span className="text-[10px] font-medium text-slate-400 bg-[#1e212b] px-2 py-0.5 rounded border border-[#242732]">
            {messages.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
            <div className="w-10 h-10 rounded-lg bg-[#1e212b] border border-[#242732] flex items-center justify-center text-slate-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">No messages yet</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Send a message to everyone in the meeting.
              </p>
            </div>
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
                  <span className="text-[11px] font-medium text-slate-400 mb-1 px-1">
                    {msg.senderName}
                  </span>
                )}

                <div
                  className={`px-3 py-2 rounded-lg max-w-[85%] break-words leading-relaxed text-xs ${
                    isMe
                      ? 'bg-[#2563eb] text-white rounded-tr-none'
                      : 'bg-[#1e212b] text-slate-200 border border-[#242732] rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>

                <div className="flex items-center space-x-1 text-[10px] text-slate-500 mt-1 px-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{time}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#242732] bg-[#16181f] flex items-center space-x-2">
        <input
          type="text"
          maxLength={1000}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message everyone..."
          className="flex-1 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#f8fafc] placeholder-slate-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-8 h-8 rounded-lg bg-[#2563eb] hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:hover:bg-[#2563eb] text-white flex items-center justify-center transition shrink-0"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>

    </aside>
  );
}
