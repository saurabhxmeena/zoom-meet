'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  SwitchCamera,
} from 'lucide-react';
import { IMeeting } from '@/lib/types';
import { createAudioAnalyser, acquireCameraTrack, acquireAudioTrack, hasMultipleCameras } from '@/lib/webrtc';
import Link from 'next/link';

interface LobbyProps {
  meeting: IMeeting;
  initialDisplayName: string;
  isJoining?: boolean;
  onJoin: (options: {
    displayName: string;
    isAudioMuted: boolean;
    isVideoOff: boolean;
    passcode?: string;
    stream: MediaStream | null;
    facingMode?: 'user' | 'environment';
  }) => void;
}

export default function Lobby({
  meeting,
  initialDisplayName,
  isJoining = false,
  onJoin,
}: LobbyProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [passcode, setPasscode] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultiCams, setHasMultiCams] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioCleanupRef = useRef<(() => void) | null>(null);
  const hasJoinedRef = useRef(false);

  // Check for multiple cameras (smartphones)
  useEffect(() => {
    hasMultipleCameras().then(setHasMultiCams).catch(() => {});
  }, []);

  // Keep streamRef updated
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Sync video preview element whenever stream changes
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream && stream.getVideoTracks().length > 0) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch((err) => {
        console.debug('[Lobby] Video play notice:', err?.name);
      });
    } else {
      videoEl.srcObject = null;
    }
  }, [stream]);

  // Audio level monitoring setup
  const setupAudioAnalyser = useCallback((mediaStream: MediaStream) => {
    if (audioCleanupRef.current) {
      audioCleanupRef.current();
      audioCleanupRef.current = null;
    }
    const cleanup = createAudioAnalyser(mediaStream, (speaking) => {
      setIsSpeaking(speaking);
    });
    if (cleanup) audioCleanupRef.current = cleanup;
  }, []);

  // Initialize camera and microphone devices with fallback
  useEffect(() => {
    let cancelled = false;

    async function initMedia() {
      let videoTrack: MediaStreamTrack | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      let videoFailed = false;
      let audioFailed = false;

      // 1. Acquire selfie/user front-facing camera (default for face visibility on smartphones)
      try {
        videoTrack = await acquireCameraTrack('user');
      } catch (vErr) {
        console.warn('[Lobby] Camera acquisition notice:', vErr);
        videoFailed = true;
      }

      // 2. Acquire audio track with echo cancellation
      try {
        audioTrack = await acquireAudioTrack();
      } catch (aErr) {
        console.warn('[Lobby] Audio acquisition notice:', aErr);
        audioFailed = true;
      }

      if (cancelled) {
        if (videoTrack) videoTrack.stop();
        if (audioTrack) audioTrack.stop();
        return;
      }

      const activeTracks: MediaStreamTrack[] = [];
      if (videoTrack) activeTracks.push(videoTrack);
      if (audioTrack) activeTracks.push(audioTrack);

      if (activeTracks.length > 0) {
        const freshStream = new MediaStream(activeTracks);
        streamRef.current = freshStream;
        setStream(freshStream);

        if (audioTrack) {
          setupAudioAnalyser(freshStream);
        }

        if (videoFailed && !audioFailed) {
          setIsVideoOff(true);
          setPermissionError('Camera is unavailable or permission was denied. Microphone is active.');
        } else if (audioFailed && !videoFailed) {
          setIsAudioMuted(true);
          setPermissionError('Microphone is unavailable or permission was denied. Camera is active.');
        } else {
          setPermissionError(null);
        }
      } else {
        setIsVideoOff(true);
        setIsAudioMuted(true);
        setPermissionError('Camera and microphone access could not be acquired. You can still join to view and listen.');
      }
    }

    initMedia();


    const handleBeforeUnload = () => {
      if (!hasJoinedRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (audioCleanupRef.current) audioCleanupRef.current();

      // Only stop tracks if we did NOT transition into the meeting room!
      if (!hasJoinedRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch {}
        });
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [setupAudioAnalyser]);

  // Toggle Microphone
  const toggleMic = async () => {
    const currentStream = streamRef.current;
    const audioTrack = currentStream?.getAudioTracks().find((t) => t.readyState === 'live');

    if (audioTrack) {
      const nextState = !audioTrack.enabled;
      audioTrack.enabled = nextState;
      setIsAudioMuted(!nextState);
    } else {
      // Need fresh audio track
      try {
        const freshTrack = await acquireAudioTrack();
        if (!freshTrack) return;

        const newTracks = [...(currentStream ? currentStream.getTracks().filter((t) => t.kind !== 'audio') : []), freshTrack];
        const newStream = new MediaStream(newTracks);
        streamRef.current = newStream;
        setStream(newStream);
        setIsAudioMuted(false);
        setupAudioAnalyser(newStream);
        setPermissionError(null);
      } catch (err) {
        console.warn('[Lobby] Microphone access error:', err);
        setPermissionError('Microphone permission was denied or device not found.');
      }
    }
  };

  // Toggle Camera
  const toggleVideo = async () => {
    const currentStream = streamRef.current;
    const videoTrack = currentStream?.getVideoTracks().find((t) => t.readyState === 'live');

    if (videoTrack) {
      const nextState = !videoTrack.enabled;
      videoTrack.enabled = nextState;
      setIsVideoOff(!nextState);
      if (nextState && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      // Need fresh video track (using facingMode preference)
      try {
        const freshTrack = await acquireCameraTrack(facingMode);
        if (!freshTrack) return;

        const newTracks = [...(currentStream ? currentStream.getTracks().filter((t) => t.kind !== 'video') : []), freshTrack];
        const newStream = new MediaStream(newTracks);
        streamRef.current = newStream;
        setStream(newStream);
        setIsVideoOff(false);
        setPermissionError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn('[Lobby] Camera access error:', err);
        setPermissionError('Camera permission was denied or device not found.');
      }
    }
  };

  // Switch between front (user) and rear (environment) cameras
  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const freshTrack = await acquireCameraTrack(nextFacing);
      if (!freshTrack) return;

      const currentStream = streamRef.current;
      const nonVideoTracks = currentStream ? currentStream.getTracks().filter((t) => t.kind !== 'video') : [];
      const newStream = new MediaStream([...nonVideoTracks, freshTrack]);
      streamRef.current = newStream;
      setStream(newStream);
      setFacingMode(nextFacing);
      setIsVideoOff(false);
      setPermissionError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('[Lobby] Camera flip notice:', err);
      setPermissionError('Could not switch camera device.');
    }
  };

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || isJoining) return;

    hasJoinedRef.current = true;
    onJoin({
      displayName: displayName.trim(),
      isAudioMuted,
      isVideoOff,
      passcode: passcode.trim(),
      stream: streamRef.current,
      facingMode,
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

  const showVideoPreview = !isVideoOff && Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === 'live'));

  return (
    <div className="min-h-[100dvh] bg-[#0e1015] text-[#f1f2f4] flex flex-col justify-between p-4 sm:p-8 select-none">
      
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
      <main className="max-w-4xl mx-auto w-full my-auto grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center py-4 sm:py-6">
        
        {/* Left: Video Preview */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[48vh] sm:max-h-none bg-[#16181f] rounded-2xl overflow-hidden border border-[#242732] flex items-center justify-center shadow-lg">
            
            {/* Video element - kept in DOM so hardware pipeline is ready */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                facingMode === 'user' ? 'transform -scale-x-100' : ''
              } ${showVideoPreview ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}
            />

            {/* Camera Off Placeholder */}
            {!showVideoPreview && (
              <div className="flex flex-col items-center justify-center space-y-3 z-10">
                <div className="w-20 h-20 rounded-full bg-[#1e212b] border border-[#2a2d38] flex items-center justify-center text-xl font-medium text-[#8e929b]">
                  {initials}
                </div>
                <span className="text-xs text-[#8e929b]">Camera is turned off</span>
              </div>
            )}

            {/* Floating Quick Controls at Bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 sm:space-x-3 bg-[#111217]/90 px-3.5 py-2 rounded-xl border border-[#242732] z-20 shadow-md">
              
              {/* Mic toggle */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-lg transition active:scale-95 ${
                  isAudioMuted
                    ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                    : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
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
                className={`p-2.5 rounded-lg transition active:scale-95 ${
                  isVideoOff
                    ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                    : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
                }`}
                title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
              </button>

              {/* Flip camera toggle (front / back) */}
              {!isVideoOff && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2.5 rounded-lg bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38] transition active:scale-95"
                  title="Flip camera (front / back)"
                >
                  <SwitchCamera className="w-4 h-4 text-[#8e929b] hover:text-[#f1f2f4]" />
                </button>
              )}
            </div>
          </div>

          {permissionError && (
            <div className="mt-3 flex items-start space-x-2 text-xs text-[#d97706] bg-[#16181f] border border-[#d97706]/30 p-3 rounded-xl w-full">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#d97706]" />
              <span>{permissionError}</span>
            </div>
          )}
        </div>

        {/* Right: Join Form */}
        <div className="md:col-span-5 surface-card p-6 sm:p-7 space-y-5 shadow-xl">
          
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
              disabled={!displayName.trim() || isJoining}
              className="w-full h-10 bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 text-white font-medium text-sm rounded-lg transition mt-2 flex items-center justify-center space-x-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Session...</span>
                </>
              ) : (
                <span>Join Meeting</span>
              )}
            </button>
          </form>

        </div>

      </main>

      <footer />
    </div>
  );
}
