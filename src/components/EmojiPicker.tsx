'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Smile, ThumbsUp, Heart, Sparkles } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: Array<{ char: string; name: string }>;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    emojis: [
      { char: '😀', name: 'grinning face' },
      { char: '😃', name: 'smiling face' },
      { char: '😄', name: 'laughing face' },
      { char: '😂', name: 'face with tears of joy' },
      { char: '🤣', name: 'rolling on the floor laughing' },
      { char: '😊', name: 'smiling face with smiling eyes' },
      { char: '😇', name: 'smiling face with halo' },
      { char: '🥰', name: 'smiling face with hearts' },
      { char: '😍', name: 'heart eyes' },
      { char: '🤩', name: 'star struck' },
      { char: '😎', name: 'smiling face with sunglasses' },
      { char: '🥳', name: 'partying face' },
      { char: '🤔', name: 'thinking face' },
      { char: '🤫', name: 'shushing face' },
      { char: '🙄', name: 'face with rolling eyes' },
      { char: '😴', name: 'sleeping face' },
      { char: '🥺', name: 'pleading face' },
      { char: '😭', name: 'loudly crying face' },
      { char: '🤯', name: 'exploding head' },
      { char: '🫠', name: 'melting face' },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: '👍',
    emojis: [
      { char: '👍', name: 'thumbs up' },
      { char: '👎', name: 'thumbs down' },
      { char: '👏', name: 'clapping hands' },
      { char: '🙌', name: 'raising hands' },
      { char: '🤝', name: 'handshake' },
      { char: '✌️', name: 'victory hand' },
      { char: '🤞', name: 'crossed fingers' },
      { char: '👊', name: 'oncoming fist' },
      { char: '✋', name: 'raised hand' },
      { char: '👋', name: 'waving hand' },
      { char: '🫡', name: 'saluting face' },
      { char: '🙏', name: 'folded hands' },
      { char: '💪', name: 'flexed biceps' },
      { char: '👌', name: 'OK hand' },
      { char: '👈', name: 'point left' },
      { char: '👉', name: 'point right' },
    ],
  },
  {
    id: 'celebrations',
    name: 'Reactions',
    icon: '🎉',
    emojis: [
      { char: '❤️', name: 'red heart' },
      { char: '💖', name: 'sparkling heart' },
      { char: '🔥', name: 'fire' },
      { char: '✨', name: 'sparkles' },
      { char: '🎉', name: 'party popper' },
      { char: '🎊', name: 'confetti ball' },
      { char: '🚀', name: 'rocket' },
      { char: '💯', name: 'hundred points' },
      { char: '🌟', name: 'glowing star' },
      { char: '🎈', name: 'balloon' },
      { char: '🥂', name: 'clinking glasses' },
      { char: '🏆', name: 'trophy' },
      { char: '🎯', name: 'bullseye' },
      { char: '💡', name: 'light bulb' },
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: '💬',
    emojis: [
      { char: '💬', name: 'speech balloon' },
      { char: '📌', name: 'pushpin' },
      { char: '💻', name: 'laptop' },
      { char: '📱', name: 'mobile phone' },
      { char: '⏰', name: 'alarm clock' },
      { char: '⚡', name: 'high voltage' },
      { char: '☕', name: 'hot beverage' },
      { char: '🍕', name: 'pizza' },
      { char: '✅', name: 'check mark' },
      { char: '❌', name: 'cross mark' },
      { char: '⚠️', name: 'warning' },
      { char: '📢', name: 'loudspeaker' },
    ],
  },
];

export default function EmojiPicker({
  onSelectEmoji,
  onClose,
  position = 'top',
}: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('smileys');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase().trim())
      )
    : null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-3 bottom-24 sm:absolute sm:inset-x-auto sm:bottom-full sm:mb-2 sm:right-0 sm:w-80 max-h-[260px] sm:max-h-[320px] bg-[#16181f] border border-[#2a2d38] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Top Search & Close */}
      <div className="p-2.5 border-b border-[#242732] flex items-center space-x-2 bg-[#12141a]">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full bg-[#1e212b] border border-[#2a2d38] focus:border-[#2563eb] focus:outline-none rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#f8fafc] placeholder-slate-500 transition"
            autoFocus
          />
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md transition"
          title="Close emoji picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs (shown when not searching) */}
      {!search.trim() && (
        <div className="flex items-center px-2 py-1 border-b border-[#242732] bg-[#16181f] space-x-1 overflow-x-auto text-xs no-scrollbar">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center space-x-1 shrink-0 ${
                activeTab === cat.id
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e212b]'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline text-[11px]">{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-2.5 max-h-40 sm:max-h-52 overflow-y-auto">
        {filteredEmojis ? (
          filteredEmojis.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No emojis found for &quot;{search}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {filteredEmojis.map((e, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectEmoji(e.char);
                    onClose();
                  }}
                  className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-[#2563eb]/20 hover:scale-110 active:scale-95 transition"
                  title={e.name}
                >
                  {e.char}
                </button>
              ))}
            </div>
          )
        ) : (
          <div>
            {EMOJI_CATEGORIES.filter((c) => c.id === activeTab).map((cat) => (
              <div key={cat.id} className="grid grid-cols-7 gap-1">
                {cat.emojis.map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectEmoji(e.char);
                      onClose();
                    }}
                    className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-[#2563eb]/20 hover:scale-110 active:scale-95 transition"
                    title={e.name}
                  >
                    {e.char}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
