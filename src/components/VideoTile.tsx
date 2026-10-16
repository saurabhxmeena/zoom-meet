'use client';

import React, { useRef, useEffect } from 'react';
import { MicOff, Pin } from 'lucide-react';

interface VideoTileProps {
  displayName: string;
  stream?: MediaStream | null;
  isLocal?: boolean;
  isHost?: boolean;
  isAudioMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export default function VideoTile({
  displayName,
  stream,
  isLocal = false,
  isHost = false,
  isAudioMuted = false,
  isVideoOff = false,
  isSpeaking = false,
  isPinned = false,
  onTogglePin,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('') || 'U';

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-[#161618] rounded-2xl overflow-hidden border transition-all duration-200 group flex items-center justify-center ${
        isSpeaking && !isAudioMuted
          ? 'border-[#2997ff]/70'
          : isPinned
          ? 'border-[#2997ff]/40'
          : 'border-white/[0.06]'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${
          isLocal ? 'transform -scale-x-100' : ''
        } ${isVideoOff || !stream ? 'hidden' : 'block'}`}
      />

      {/* Avatar when camera is off */}
      {(isVideoOff || !stream) && (
        <div className="flex flex-col items-center justify-center space-y-2 z-10 select-none">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1c1c1e] border border-white/[0.08] flex items-center justify-center text-lg sm:text-xl font-medium text-[#86868b]">
            {initials}
          </div>
          <span className="text-xs text-[#86868b] max-w-[140px] truncate font-normal">
            {displayName}
          </span>
        </div>
      )}

      {/* Pin Button */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg backdrop-blur-md transition ${
            isPinned
              ? 'bg-white/20 text-white'
              : 'opacity-0 group-hover:opacity-100 bg-black/40 text-[#86868b] hover:text-white'
          }`}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Identity Pill */}
      <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/[0.06] text-xs text-[#f5f5f7] pointer-events-none max-w-[85%]">
        <span className="font-normal truncate">{displayName}</span>
        {isLocal && <span className="text-[#86868b] text-[11px]">(You)</span>}
        {isHost && <span className="text-[#86868b] text-[11px]">• Host</span>}
        {isAudioMuted && <MicOff className="w-3 h-3 text-[#ff453a] ml-1 shrink-0" />}
      </div>
    </div>
  );
}
