'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { IMeeting } from '@/lib/types';
import { createAudioAnalyser } from '@/lib/webrtc';
import Link from 'next/link';

interface LobbyProps {
  meeting: IMeeting;
  initialDisplayName: string;
  onJoin: (options: {
    displayName: string;
    isAudioMuted: boolean;
    isVideoOff: boolean;
    passcode?: string;
    stream: MediaStream | null;
  }) => void;
}

export default function Lobby({ meeting, initialDisplayName, onJoin }: LobbyProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [passcode, setPasscode] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioCleanupRef = useRef<(() => void) | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
          videoRef.current.play().catch(() => {});
        }

        const cleanup = createAudioAnalyser(localStream, (speaking) => {
          setIsSpeaking(speaking);
        });
        if (cleanup) audioCleanupRef.current = cleanup;
      } catch (err) {
        console.warn('Media devices not permitted or unavailable:', err);
        setPermissionError('Camera or microphone access is unavailable. You can still join to view and listen.');
        setIsVideoOff(true);
        setIsAudioMuted(true);
      }
    }

    const handleBeforeUnload = () => {
      if (!hasJoinedRef.current) {
        localStream?.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (audioCleanupRef.current) audioCleanupRef.current();
      if (!hasJoinedRef.current) {
        localStream?.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
      }
    };
  }, []);

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    } else {
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    hasJoinedRef.current = true;
    onJoin({
      displayName: displayName.trim(),
      isAudioMuted,
      isVideoOff,
      passcode: passcode.trim(),
      stream,
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/meet/${meeting.meetingCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const initials = displayName
    ? displayName.trim().charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-[#0e1015] text-[#f1f2f4] flex flex-col justify-between p-4 sm:p-8 select-none">
      
      {/* Top Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#8e929b] hover:text-[#f1f2f4] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        {/* Meeting ID */}
        <div className="flex items-center space-x-1.5 text-xs text-[#8e929b]">
          <span className="font-mono bg-[#16181f] px-2.5 py-1 rounded-md border border-[#242732]">
            {meeting.meetingCode}
          </span>
          <button
            onClick={handleCopyLink}
            title="Copy invite link"
            className="p-1.5 text-[#8e929b] hover:text-[#f1f2f4] hover:bg-[#181a20] rounded-md transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-[#16a34a]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full my-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
        
        {/* Left: Video Preview */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-[16/10] bg-[#16181f] rounded-2xl overflow-hidden border border-[#242732] flex items-center justify-center">
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isVideoOff ? 'hidden' : 'block'
              }`}
            />

            {/* Camera Off Placeholder */}
            {isVideoOff && (
              <div className="flex flex-col items-center justify-center space-y-3 z-10">
                <div className="w-20 h-20 rounded-full bg-[#1e212b] border border-[#2a2d38] flex items-center justify-center text-xl font-medium text-[#8e929b]">
                  {initials}
                </div>
                <span className="text-xs text-[#5c606a]">Camera is turned off</span>
              </div>
            )}

            {/* Floating Quick Controls at Bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-[#111217]/90 px-3.5 py-2 rounded-xl border border-[#242732] z-20">
              
              {/* Mic toggle */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-lg transition ${
                  isAudioMuted
                    ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                    : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37]'
                }`}
                title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Natural Speaking Indicator Dot */}
              {!isAudioMuted && (
                <div className="flex items-center space-x-1 px-1">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      isSpeaking ? 'bg-[#16a34a]' : 'bg-[#3b3f4d]'
                    }`}
                    title={isSpeaking ? 'Detecting audio' : 'Microphone ready'}
                  />
                </div>
              )}

              {/* Video toggle */}
              <button
                type="button"
                onClick={toggleVideo}
                className={`p-2.5 rounded-lg transition ${
                  isVideoOff
                    ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                    : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37]'
                }`}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {permissionError && (
            <div className="mt-3 flex items-start space-x-2 text-xs text-[#8e929b] bg-[#16181f] border border-[#2e2316] p-3 rounded-xl w-full">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#d97706]" />
              <span>{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right: Join Form */}
        <div className="md:col-span-5 surface-card p-6 sm:p-7 space-y-5">
          
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-[#f1f2f4] tracking-tight truncate">
              {meeting.title}
            </h1>
            <p className="text-xs text-[#8e929b]">
              Hosted by {meeting.hostName}
            </p>
          </div>

          <form onSubmit={handleJoinClick} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8e929b] mb-1.5">
                Your name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-10 px-3.5 bg-[#101217] border border-[#262934] focus:border-[#3b82f6] focus:outline-none rounded-lg text-sm text-[#f1f2f4] placeholder-[#5c606a] transition"
              />
            </div>

            {meeting.settings.requirePasscode && (
              <div>
                <label className="block text-xs font-medium text-[#8e929b] mb-1.5">
                  Meeting passcode
                </label>
                <input
                  type="text"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full h-10 px-3.5 bg-[#101217] border border-[#262934] focus:border-[#3b82f6] focus:outline-none rounded-lg text-sm text-[#f1f2f4] placeholder-[#5c606a] transition"
                />
              </div>
            )}

            {/* Natural device status feedback */}
            <div className="text-[11px] text-[#8e929b] pt-1 flex items-center space-x-3">
              <span>Mic: {isAudioMuted ? 'Muted' : 'Ready'}</span>
              <span>•</span>
              <span>Camera: {isVideoOff ? 'Off' : 'Ready'}</span>
            </div>

            <button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full h-10 bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 text-white font-medium text-sm rounded-lg transition mt-2"
            >
              Join Meeting
            </button>
          </form>

        </div>

      </main>

      <footer />
    </div>
  );
}
