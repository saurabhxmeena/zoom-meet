'use client';

import React, { useRef, useEffect } from 'react';
import { MicOff, Pin, Crown, Shield } from 'lucide-react';

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

  // Compute initials
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('') || 'U';

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-200 group flex items-center justify-center ${
        isSpeaking && !isAudioMuted
          ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 active-speaker-ring'
          : isPinned
          ? 'border-blue-500 ring-2 ring-blue-500/40'
          : 'border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${
          isLocal ? 'transform -scale-x-100' : ''
        } ${isVideoOff || !stream ? 'hidden' : 'block'}`}
      />

      {/* Video Off Placeholder Avatar */}
      {(isVideoOff || !stream) && (
        <div className="flex flex-col items-center justify-center space-y-3 z-10 select-none">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-xl shadow-blue-500/20 border border-white/10">
              {initials}
            </div>

            {/* Speaking animation around avatar */}
            {isSpeaking && !isAudioMuted && (
              <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
            )}
          </div>
          <span className="text-xs font-medium text-slate-300 max-w-[150px] truncate">
            {displayName}
          </span>
        </div>
      )}

      {/* Top Left: Speaker Wave Indicator */}
      {isSpeaking && !isAudioMuted && (
        <div className="absolute top-3 left-3 z-20 flex items-center space-x-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-emerald-500/40">
          <span className="w-1 h-2.5 bg-emerald-400 rounded-full wave-bar-1" />
          <span className="w-1 h-3.5 bg-emerald-400 rounded-full wave-bar-2" />
          <span className="w-1 h-2 bg-emerald-400 rounded-full wave-bar-3" />
        </div>
      )}

      {/* Top Right: Pin Button */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          className={`absolute top-3 right-3 z-20 p-1.5 rounded-lg backdrop-blur-md transition opacity-0 group-hover:opacity-100 ${
            isPinned
              ? 'bg-blue-600 text-white opacity-100'
              : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
          }`}
          title={isPinned ? 'Unpin participant' : 'Pin participant'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Name & Status Tag */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/5 text-xs text-white max-w-[85%] truncate">
          {isHost && (
            <span title="Meeting Host" className="text-amber-400">
              <Crown className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="font-medium truncate">{displayName}</span>
          {isLocal && <span className="text-slate-400 font-normal text-[11px]">(You)</span>}
        </div>

        {/* Audio Mute Icon */}
        {isAudioMuted && (
          <div className="p-1.5 rounded-lg bg-red-500/90 text-white shadow-md">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}
