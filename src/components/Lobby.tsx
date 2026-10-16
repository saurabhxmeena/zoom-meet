'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { IMeeting } from '@/lib/types';
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn('Media devices not permitted or unavailable:', err);
        setPermissionError('Camera or microphone access is unavailable. You can still join to view and listen.');
        setIsVideoOff(true);
        setIsAudioMuted(true);
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
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

    onJoin({
      displayName: displayName.trim(),
      isAudioMuted,
      isVideoOff,
      passcode: passcode.trim(),
      stream,
    });
  };

  const initials = displayName
    ? displayName.trim().charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col justify-between p-4 sm:p-8">
      
      {/* Top back link */}
      <header className="max-w-4xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-[#86868b] hover:text-[#f5f5f7] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave lobby</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full my-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
        
        {/* Left: Video Preview Window */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-[16/10] bg-[#161618] rounded-3xl overflow-hidden border border-white/[0.08] shadow-xl flex items-center justify-center">
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isVideoOff ? 'hidden' : 'block'
              }`}
            />

            {/* Camera Off Contact Avatar */}
            {isVideoOff && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-[#1c1c1e] border border-white/[0.08] flex items-center justify-center text-xl font-medium text-[#86868b]">
                  {initials}
                </div>
                <span className="text-xs text-[#86868b]">Camera is off</span>
              </div>
            )}

            {/* Subtle Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/60 backdrop-blur-xl px-3.5 py-2 rounded-full border border-white/[0.08]">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-full transition ${
                  isAudioMuted
                    ? 'bg-[#ff453a] text-white hover:bg-[#d73a31]'
                    : 'bg-white/[0.1] text-[#f5f5f7] hover:bg-white/[0.18]'
                }`}
                title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`p-2.5 rounded-full transition ${
                  isVideoOff
                    ? 'bg-[#ff453a] text-white hover:bg-[#d73a31]'
                    : 'bg-white/[0.1] text-[#f5f5f7] hover:bg-white/[0.18]'
                }`}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {permissionError && (
            <div className="mt-3 flex items-start space-x-2 text-xs text-[#86868b] bg-[#161618] border border-white/[0.06] p-3 rounded-xl w-full">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#ff9f0a]" />
              <span>{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right: Join Form */}
        <div className="md:col-span-5 bg-[#161618] border border-white/[0.06] rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-[#f5f5f7] tracking-tight truncate">
              {meeting.title}
            </h1>
            <p className="text-xs text-[#86868b]">
              Hosted by {meeting.hostName}
            </p>
          </div>

          <form onSubmit={handleJoinClick} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                Your name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-11 px-3.5 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-sm text-[#f5f5f7] placeholder-[#515154] transition"
              />
            </div>

            {meeting.settings.requirePasscode && (
              <div>
                <label className="block text-xs font-medium text-[#86868b] mb-1.5">
                  Meeting passcode
                </label>
                <input
                  type="text"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full h-11 px-3.5 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-sm text-[#f5f5f7] placeholder-[#515154] transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full h-11 bg-[#2997ff] hover:bg-[#0077ed] active:scale-[0.99] disabled:opacity-40 text-white font-medium text-sm rounded-xl transition shadow-sm mt-2"
            >
              Join Meeting
            </button>
          </form>

          <div className="pt-2 border-t border-white/[0.04] text-[11px] text-[#515154] font-mono text-center">
            {meeting.meetingCode}
          </div>
        </div>

      </main>

      <footer />
    </div>
  );
}
