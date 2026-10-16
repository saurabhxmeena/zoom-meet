'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Shield, ArrowRight, AlertCircle, Sparkles, User } from 'lucide-react';
import { IMeeting } from '@/lib/types';
import { createAudioAnalyser } from '@/lib/webrtc';

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
  const [displayName, setDisplayName] = useState(initialDisplayName || 'Student Participant');
  const [passcode, setPasscode] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera and mic preview
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let cleanupAudio: (() => void) | null = null;

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

        // Setup audio speaking monitor
        const cleanup = createAudioAnalyser(localStream, (speaking) => {
          setIsSpeaking(speaking);
        });
        if (cleanup) cleanupAudio = cleanup;
      } catch (err) {
        console.warn('Media devices not permitted or unavailable:', err);
        setPermissionError('Camera or microphone access was denied or is not connected. You can still join to view and listen!');
        setIsVideoOff(true);
        setIsAudioMuted(true);
      }
    }

    initMedia();

    return () => {
      if (cleanupAudio) cleanupAudio();
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Video Preview Green Room */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className={`relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center ${
            isSpeaking && !isAudioMuted ? 'ring-4 ring-emerald-500/80' : ''
          }`}>
            
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isVideoOff ? 'hidden' : 'block'
              }`}
            />

            {/* Camera Off Avatar Placeholder */}
            {isVideoOff && (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-blue-500/20">
                  {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-medium text-slate-400">Camera is turned off</span>
              </div>
            )}

            {/* Speaking audio wave overlay */}
            {isSpeaking && !isAudioMuted && (
              <div className="absolute top-4 left-4 flex items-center space-x-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-3 bg-emerald-400 rounded-full wave-bar-1" />
                <span className="w-1.5 h-4 bg-emerald-400 rounded-full wave-bar-2" />
                <span className="w-1.5 h-2 bg-emerald-400 rounded-full wave-bar-3" />
                <span className="text-[11px] text-emerald-300 font-medium ml-1">Microphone active</span>
              </div>
            )}

            {/* Top-Right Quick Status */}
            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-[11px] text-slate-300">
              Preview Mode
            </div>

            {/* Bottom Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 shadow-lg">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 rounded-full transition ${
                  isAudioMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                className={`p-3 rounded-full transition ${
                  isVideoOff
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Start Camera' : 'Stop Camera'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {permissionError && (
            <div className="mt-3 flex items-start space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl w-full">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right: Join Configuration Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              Meeting Lobby
            </span>
            <h1 className="text-xl font-bold text-white mt-2 tracking-tight">
              {meeting.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
              <span>Hosted by <strong className="text-slate-300">{meeting.hostName}</strong></span>
              <span>•</span>
              <span className="font-mono text-blue-400">{meeting.meetingCode}</span>
            </p>
          </div>

          <form onSubmit={handleJoinClick} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Your Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Saurabh Sharma"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {meeting.settings.requirePasscode && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Meeting Passcode</span>
                  <span className="text-[11px] text-amber-400">Required by Host</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="Enter room passcode"
                  />
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2 group"
              >
                <span>Join Meeting Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>WebRTC P2P encrypted media stream</span>
              </p>
              <p className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Interactive text chat & reactions enabled</span>
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
