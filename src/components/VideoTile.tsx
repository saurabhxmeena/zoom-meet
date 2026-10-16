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
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.muted = isLocal;
      if (!isVideoOff) {
        videoEl.play().catch((err) => {
          // Playback might need a user gesture if unmuted remote stream
          console.debug('[VideoTile] play interrupted or pending gesture:', err?.name);
        });
      }
    } else {
      videoEl.srcObject = null;
    }
  }, [stream, isVideoOff, isLocal]);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('') || 'U';

  const isActuallySpeaking = isSpeaking && !isAudioMuted;

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-[#16181f] rounded-xl overflow-hidden transition group flex items-center justify-center ${
        isActuallySpeaking
          ? 'ring-1.5 ring-[#3b82f6] border-transparent'
          : isPinned
          ? 'ring-1 ring-[#3b82f6]/70 border-transparent'
          : 'border border-[#242732]'
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
        <div className="flex flex-col items-center justify-center space-y-2.5 z-10 select-none p-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1e212b] border border-[#2a2d38] flex items-center justify-center text-lg sm:text-xl font-medium text-[#8e929b]">
            {initials}
          </div>
          <span className="text-xs text-[#8e929b] max-w-[140px] truncate font-normal">
            {displayName}
          </span>
        </div>
      )}

      {/* Pin Button */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg transition ${
            isPinned
              ? 'bg-[#2563eb] text-white'
              : 'opacity-0 group-hover:opacity-100 bg-[#0e1015]/80 text-[#8e929b] hover:text-[#f1f2f4] border border-[#242732]'
          }`}
          title={isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Identity Pill at Bottom Left */}
      <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center space-x-1.5 bg-[#0e1015]/85 px-2.5 py-1 rounded-md border border-[#242732] text-xs text-[#f1f2f4] pointer-events-none max-w-[85%]">
        
        {/* Speaking Dot */}
        {isActuallySpeaking && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0" />
        )}

        <span className="font-normal truncate">{displayName}</span>
        {isLocal && <span className="text-[#8e929b] text-[11px]">(You)</span>}
        {isHost && <span className="text-[#8e929b] text-[11px]">• Host</span>}

        {/* Muted Icon */}
        {isAudioMuted && (
          <MicOff className="w-3 h-3 text-[#dc2626] ml-1 shrink-0" />
        )}
      </div>
    </div>
  );
}
