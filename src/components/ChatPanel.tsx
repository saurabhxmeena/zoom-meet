'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp, MessageSquare, Clock, Smile } from 'lucide-react';
import { IMessage } from '@/lib/types';
import EmojiPicker from './EmojiPicker';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const updated = inputText.substring(0, start) + emoji + inputText.substring(end);
      setInputText(updated);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 10);
    } else {
      setInputText((prev) => prev + emoji);
    }
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

      {/* Input bar with Emoji Picker */}
      <div className="relative p-3 border-t border-[#242732] bg-[#16181f]">
        {showEmojiPicker && (
          <EmojiPicker
            onSelectEmoji={handleSelectEmoji}
            onClose={() => setShowEmojiPicker(false)}
            position="top"
          />
        )}

        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`p-2 rounded-lg transition shrink-0 ${
              showEmojiPicker
                ? 'bg-[#2563eb] text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e212b]'
            }`}
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            maxLength={1000}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message everyone (Enter to send)..."
            className="flex-1 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg px-3 py-2 text-xs text-[#f8fafc] placeholder-slate-500 transition"
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-lg bg-[#2563eb] hover:bg-blue-700 active:scale-95 disabled:opacity-30 disabled:hover:bg-[#2563eb] text-white flex items-center justify-center transition shrink-0"
            title="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
