'use client';

import React, { useRef, useEffect, useState } from 'react';
import { MicOff, Pin, Maximize2, Minimize2 } from 'lucide-react';

interface VideoTileProps {
  displayName: string;
  stream?: MediaStream | null;
  isLocal?: boolean;
  isFrontFacing?: boolean;
  isHost?: boolean;
  isAudioMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  isHandRaised?: boolean;
  onTogglePin?: () => void;
}

export default function VideoTile({
  displayName,
  stream,
  isLocal = false,
  isFrontFacing = true,
  isHost = false,
  isAudioMuted = false,
  isVideoOff = false,
  isSpeaking = false,
  isPinned = false,
  isHandRaised = false,
  onTogglePin,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Allow user to toggle between Fill (cover) and Fit (contain) to prevent cropping on phones
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [hasLiveVideoTrack, setHasLiveVideoTrack] = useState(false);

  // Monitor live video track readiness
  useEffect(() => {
    const evaluateTrack = () => {
      if (!stream) {
        setHasLiveVideoTrack(false);
        return;
      }
      const vTracks = stream.getVideoTracks();
      const isLive = vTracks.length > 0 && vTracks.some((t) => t.readyState === 'live' && t.enabled);
      setHasLiveVideoTrack(isLive);
    };

    evaluateTrack();
    const interval = setInterval(evaluateTrack, 350);
    return () => clearInterval(interval);
  }, [stream]);

  // Attach and play video stream when stream reference changes
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream && stream.getVideoTracks().length > 0) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.muted = isLocal || isAudioMuted;
      videoEl.play().catch((err) => {
        console.debug('[VideoTile] Video play notice:', err?.name);
      });
    } else {
      videoEl.srcObject = null;
    }

    return () => {
      if (!stream && videoEl) {
        try {
          videoEl.pause();
          videoEl.srcObject = null;
        } catch {
          // ignore
        }
      }
    };
  }, [stream, isLocal, isAudioMuted]);

  // For remote streams, also maintain dedicated audio element to guarantee playback
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (stream && !isLocal) {
      if (audioEl.srcObject !== stream) {
        audioEl.srcObject = stream;
      }
      audioEl.muted = isAudioMuted;
      audioEl.play().catch((err) => {
        console.debug('[VideoTile] Audio play notice:', err?.name);
      });
    } else {
      audioEl.srcObject = null;
    }

    return () => {
      if (!stream && audioEl) {
        try {
          audioEl.pause();
          audioEl.srcObject = null;
        } catch {
          // ignore
        }
      }
    };
  }, [stream, isLocal, isAudioMuted]);

  // Synchronize muted states reactively without detaching or pausing stream
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isLocal || isAudioMuted;
    }
    if (audioRef.current) {
      audioRef.current.muted = isLocal || isAudioMuted;
    }
  }, [isLocal, isAudioMuted]);

  // When unhiding video (video becomes active), ensure video element is playing
  useEffect(() => {
    if (!isVideoOff && hasLiveVideoTrack && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVideoOff, hasLiveVideoTrack]);

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('') || 'U';

  const isActuallySpeaking = isSpeaking && !isAudioMuted;
  const showVideo = !isVideoOff && hasLiveVideoTrack;
  const shouldMirror = isLocal && isFrontFacing !== false;

  return (
    <div
      onDoubleClick={() => setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
      className={`relative w-full h-full min-h-[140px] sm:min-h-[200px] bg-[#16181f] rounded-xl overflow-hidden transition group flex items-center justify-center ${
        isActuallySpeaking
          ? 'ring-1.5 ring-[#3b82f6] border-transparent'
          : isPinned
          ? 'ring-1 ring-[#3b82f6]/70 border-transparent'
          : 'border border-[#242732]'
      }`}
    >
      {/* Video Element - kept in DOM so hardware pipeline is never throttled */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isAudioMuted}
        className={`w-full h-full transition-opacity duration-200 ${
          fitMode === 'contain' ? 'object-contain bg-black' : 'object-cover object-center'
        } ${shouldMirror ? 'transform -scale-x-100' : ''} ${
          showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'
        }`}
      />

      {/* Dedicated audio element for remote stream playback */}
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={isAudioMuted}
          className="hidden"
        />
      )}

      {/* Avatar when camera is off or video track not ready */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center space-y-2.5 z-10 select-none p-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1e212b] border border-[#2a2d38] flex items-center justify-center text-lg sm:text-xl font-medium text-[#8e929b]">
            {initials}
          </div>
          <span className="text-xs text-[#8e929b] max-w-[140px] truncate font-normal">
            {displayName}
          </span>
        </div>
      )}

      {/* Top Controls: Raised Hand & Actions */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        {/* Raised Hand Pill */}
        {isHandRaised ? (
          <div className="flex items-center space-x-1.5 bg-[#f59e0b]/20 border border-[#f59e0b]/50 px-2 py-0.5 rounded-md text-xs text-[#fef3c7] pointer-events-auto animate-in fade-in zoom-in duration-150">
            <span className="text-sm">✋</span>
            <span className="font-medium text-[11px]">Raised Hand</span>
          </div>
        ) : (
          <div />
        )}

        {/* Action Buttons: Fit/Fill Toggle & Pin */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          {showVideo && (
            <button
              onClick={() => setFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
              className="p-1.5 rounded-lg bg-[#0e1015]/80 text-[#8e929b] hover:text-[#f1f2f4] border border-[#242732] opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-80 transition"
              title={fitMode === 'cover' ? 'Fit full camera (no crop)' : 'Fill tile'}
            >
              {fitMode === 'cover' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1.5 rounded-lg transition ${
                isPinned
                  ? 'bg-[#2563eb] text-white'
                  : 'opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-80 bg-[#0e1015]/80 text-[#8e929b] hover:text-[#f1f2f4] border border-[#242732]'
              }`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Identity Pill at Bottom Left */}
      <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center space-x-1.5 bg-[#0e1015]/85 px-2.5 py-1 rounded-md border border-[#242732] text-xs text-[#f1f2f4] pointer-events-none max-w-[85%]">
        {/* Speaking Dot */}
        {isActuallySpeaking && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0 animate-pulse" />
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

