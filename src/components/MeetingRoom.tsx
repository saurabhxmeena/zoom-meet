'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid,
  Maximize2,
  MonitorUp,
  Copy,
  Check,
  Clock,
  PhoneOff,
} from 'lucide-react';
import { IMeeting, IMessage, IPeerConnection } from '@/lib/types';
import { createAudioAnalyser, ICE_SERVERS } from '@/lib/webrtc';
import VideoTile from './VideoTile';
import MeetingControls from './MeetingControls';
import ChatPanel from './ChatPanel';
import ParticipantsPanel from './ParticipantsPanel';
import InfoPanel from './InfoPanel';

interface MeetingRoomProps {
  meeting: IMeeting;
  userId: string;
  displayName: string;
  isHost: boolean;
  initialStream: MediaStream | null;
  initialAudioMuted: boolean;
  initialVideoOff: boolean;
}

export default function MeetingRoom({
  meeting,
  userId,
  displayName,
  isHost,
  initialStream,
  initialAudioMuted,
  initialVideoOff,
}: MeetingRoomProps) {
  const router = useRouter();

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [isAudioMuted, setIsAudioMuted] = useState(initialAudioMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Peer management
  const [peers, setPeers] = useState<Map<string, IPeerConnection>>(new Map());
  const peerInstanceRef = useRef<any>(null);
  const activeCallsRef = useRef<Map<string, any>>(new Map());

  // Meeting view state
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants' | 'info'>('none');

  // Chat
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Meeting duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingEndedNotice, setMeetingEndedNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const audioCleanupRef = useRef<(() => void) | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`${window.location.origin}/meet/${meeting.meetingCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ensure working local media (fallback reacquisition if stream tracks ended)
  useEffect(() => {
    let cancelled = false;

    async function ensureMedia() {
      const hasLiveVideo =
        localStream &&
        localStream.getVideoTracks().length > 0 &&
        localStream.getVideoTracks().some((t) => t.readyState === 'live');

      const hasLiveAudio =
        localStream &&
        localStream.getAudioTracks().length > 0 &&
        localStream.getAudioTracks().some((t) => t.readyState === 'live');

      if (!hasLiveVideo || !hasLiveAudio) {
        try {
          const fresh = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });

          if (!cancelled) {
            fresh.getAudioTracks().forEach((t) => {
              t.enabled = !isAudioMuted;
            });
            fresh.getVideoTracks().forEach((t) => {
              t.enabled = !isVideoOff;
            });
            setLocalStream(fresh);

            // Update peer connection senders if any exist
            activeCallsRef.current.forEach((call) => {
              const videoSender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
              const freshVideoTrack = fresh.getVideoTracks()[0];
              if (videoSender && freshVideoTrack) videoSender.replaceTrack(freshVideoTrack).catch(console.warn);

              const audioSender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'audio');
              const freshAudioTrack = fresh.getAudioTracks()[0];
              if (audioSender && freshAudioTrack) audioSender.replaceTrack(freshAudioTrack).catch(console.warn);
            });
          }
        } catch (err) {
          console.warn('[MeetingRoom] Fallback media acquisition notice:', err);
        }
      }
    }

    ensureMedia();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync track enabled flags with isAudioMuted and isVideoOff
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioMuted;
      });
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoOff;
      });

      if (audioCleanupRef.current) audioCleanupRef.current();
      const cleanup = createAudioAnalyser(localStream, (speaking) => {
        setIsLocalSpeaking(speaking);
      });
      if (cleanup) audioCleanupRef.current = cleanup;
    }

    return () => {
      if (audioCleanupRef.current) audioCleanupRef.current();
    };
  }, [localStream, isAudioMuted, isVideoOff]);

  // Attach local screen share stream to video element
  useEffect(() => {
    if (localScreenVideoRef.current && screenStream) {
      localScreenVideoRef.current.srcObject = screenStream;
      localScreenVideoRef.current.play().catch(() => {});
    }
  }, [screenStream]);

  // Send real-time media state signal to all peers
  const sendMediaStateSignal = useCallback(
    (videoOff: boolean, audioMuted: boolean, screenSharing: boolean) => {
      const myPeerId = peerInstanceRef.current?.id;
      if (!myPeerId) return;

      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: myPeerId,
          type: 'peer-media-state',
          payload: {
            userId,
            displayName,
            isAudioMuted: audioMuted,
            isVideoOff: videoOff,
            isScreenSharing: screenSharing,
          },
        }),
      }).catch(console.warn);
    },
    [meeting.meetingCode, userId, displayName]
  );

  // Initialize WebRTC Peer connection
  useEffect(() => {
    let peer: any = null;
    let isSubscribed = true;

    async function initWebRTC() {
      try {
        const PeerClass = (await import('peerjs')).default;
        const myPeerId = `meet_${meeting.meetingCode.replace(/[^a-zA-Z0-9]/g, '')}_${userId.slice(-6)}`;

        // Fetch configured ICE servers (STUN & optional TURN)
        let resolvedIceServers = ICE_SERVERS;
        try {
          const iceRes = await fetch('/api/webrtc/ice-servers');
          if (iceRes.ok) {
            const iceData = await iceRes.json();
            if (iceData.iceServers && iceData.iceServers.length > 0) {
              resolvedIceServers = iceData.iceServers;
            }
          }
        } catch {
          // fallback to public Google STUN
        }

        peer = new PeerClass(myPeerId, {
          config: {
            iceServers: resolvedIceServers,
          },
          debug: 1,
        });

        peerInstanceRef.current = peer;

        peer.on('open', (id: string) => {
          if (!isSubscribed) return;
          fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: id,
              type: 'peer-joined',
              payload: { userId, displayName, isAudioMuted, isVideoOff, isScreenSharing },
            }),
          }).catch(console.warn);
        });

        // Answer incoming calls from other participants
        peer.on('call', (call: any) => {
          // Answer with localStream or screen stream if sharing
          const outboundStream = screenStream || localStream;
          call.answer(outboundStream || undefined);

          call.on('stream', (remoteStream: MediaStream) => {
            if (!isSubscribed) return;
            const callerDisplayName = call.metadata?.displayName || 'Participant';
            setPeers((prev) => {
              const updated = new Map(prev);
              updated.set(call.peer, {
                peerId: call.peer,
                userId: call.metadata?.userId || call.peer,
                displayName: callerDisplayName,
                stream: remoteStream,
                isAudioMuted: false,
                isVideoOff: false,
                isScreenSharing: false,
              });
              return updated;
            });
          });

          call.on('close', () => {
            if (!isSubscribed) return;
            setPeers((prev) => {
              const updated = new Map(prev);
              updated.delete(call.peer);
              return updated;
            });
            activeCallsRef.current.delete(call.peer);
          });

          activeCallsRef.current.set(call.peer, call);
        });

        peer.on('error', (err: any) => {
          console.warn('[WebRTC Peer]:', err.type || err);
        });
      } catch (err) {
        console.error('Failed to initialize WebRTC Peer:', err);
      }
    }

    initWebRTC();

    return () => {
      isSubscribed = false;
      if (peer) {
        try {
          peer.destroy();
        } catch {
          // ignore
        }
      }
      activeCallsRef.current.forEach((call) => {
        try {
          call.close();
        } catch {
          // ignore
        }
      });
      activeCallsRef.current.clear();
    };
  }, [meeting.meetingCode, userId, displayName]);

  // Signaling & Presence Sync Poll
  useEffect(() => {
    // Start with 60s ago to discover anyone who joined recently
    let lastSignalTime = Date.now() - 60000;
    let isAlive = true;

    const syncMeeting = async () => {
      if (!isAlive) return;
      try {
        const myPeerId = peerInstanceRef.current?.id;
        const res = await fetch(
          `/api/meetings/${meeting.meetingCode}/signal?peerId=${myPeerId || ''}&since=${lastSignalTime}`
        );

        if (res.ok) {
          const data = await res.json();
          lastSignalTime = data.serverTime || Date.now();

          if (data.signals && data.signals.length > 0) {
            for (const sig of data.signals) {
              if (sig.from === myPeerId) continue;

              // 1. Peer joined -> Initiate WebRTC Call to the peer
              if (sig.type === 'peer-joined') {
                if (peerInstanceRef.current && !activeCallsRef.current.has(sig.from)) {
                  const outboundStream = screenStream || localStream;
                  const call = peerInstanceRef.current.call(sig.from, outboundStream, {
                    metadata: { userId, displayName },
                  });

                  if (call) {
                    call.on('stream', (remoteStream: MediaStream) => {
                      setPeers((prev) => {
                        const updated = new Map(prev);
                        updated.set(sig.from, {
                          peerId: sig.from,
                          userId: sig.payload?.userId || sig.from,
                          displayName: sig.payload?.displayName || 'Participant',
                          stream: remoteStream,
                          isAudioMuted: sig.payload?.isAudioMuted ?? false,
                          isVideoOff: sig.payload?.isVideoOff ?? false,
                          isScreenSharing: sig.payload?.isScreenSharing ?? false,
                        });
                        return updated;
                      });
                    });

                    call.on('close', () => {
                      setPeers((prev) => {
                        const updated = new Map(prev);
                        updated.delete(sig.from);
                        return updated;
                      });
                      activeCallsRef.current.delete(sig.from);
                    });

                    activeCallsRef.current.set(sig.from, call);
                  }
                }
              }

              // 2. Peer updated media state (mute, camera, screen share)
              else if (sig.type === 'peer-media-state') {
                setPeers((prev) => {
                  const updated = new Map(prev);
                  const existing = updated.get(sig.from);
                  if (existing) {
                    updated.set(sig.from, {
                      ...existing,
                      isAudioMuted: sig.payload?.isAudioMuted ?? existing.isAudioMuted,
                      isVideoOff: sig.payload?.isVideoOff ?? existing.isVideoOff,
                      isScreenSharing: sig.payload?.isScreenSharing ?? existing.isScreenSharing,
                    });
                  }
                  return updated;
                });
              }

              // 3. Peer left the room
              else if (sig.type === 'peer-left') {
                const call = activeCallsRef.current.get(sig.from);
                if (call) {
                  try {
                    call.close();
                  } catch {
                    // ignore
                  }
                  activeCallsRef.current.delete(sig.from);
                }
                setPeers((prev) => {
                  const updated = new Map(prev);
                  updated.delete(sig.from);
                  return updated;
                });
              }

              // 4. Host ended meeting
              else if (sig.type === 'meeting-ended') {
                setMeetingEndedNotice('The meeting was ended by the host.');
              }
            }
          }
        }

        // Sync chat messages
        const chatRes = await fetch(`/api/meetings/${meeting.meetingCode}/messages`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          if (chatData.messages) {
            setMessages((prev) => {
              if (chatData.messages.length > prev.length) {
                if (activePanel !== 'chat') {
                  setUnreadCount((c) => c + (chatData.messages.length - prev.length));
                }
                return chatData.messages;
              }
              return prev;
            });
          }
        }

        // Verify meeting lifecycle status
        const meetRes = await fetch(`/api/meetings/${meeting.meetingCode}`);
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          if (meetData.meeting && meetData.meeting.status === 'ended') {
            setMeetingEndedNotice('This meeting has ended.');
          }
        }
      } catch (err) {
        console.warn('Signaling sync notice:', err);
      }
    };

    const intervalId = setInterval(syncMeeting, 2500);
    return () => {
      isAlive = false;
      clearInterval(intervalId);
    };
  }, [meeting.meetingCode, userId, displayName, localStream, screenStream, activePanel]);

  // Audio Toggle (Microphone)
  const handleToggleAudio = async () => {
    let currentAudioTrack = localStream?.getAudioTracks()[0];

    // If audio track is missing or ended, acquire a fresh track
    if (!currentAudioTrack || currentAudioTrack.readyState === 'ended') {
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({ audio: true });
        const freshTrack = fresh.getAudioTracks()[0];
        if (localStream) {
          localStream.addTrack(freshTrack);
        } else {
          setLocalStream(new MediaStream([freshTrack]));
        }
        currentAudioTrack = freshTrack;

        activeCallsRef.current.forEach((call) => {
          const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'audio');
          if (sender) sender.replaceTrack(freshTrack).catch(console.warn);
        });
      } catch (err) {
        console.warn('Microphone permission denied or device error:', err);
        return;
      }
    }

    const nextEnabled = !currentAudioTrack.enabled;
    currentAudioTrack.enabled = nextEnabled;
    const nextMuted = !nextEnabled;
    setIsAudioMuted(nextMuted);

    sendMediaStateSignal(isVideoOff, nextMuted, isScreenSharing);
  };

  // Video Toggle (Camera)
  const handleToggleVideo = async () => {
    let currentVideoTrack = localStream?.getVideoTracks()[0];

    // If video track is missing or ended, acquire a fresh camera track
    if (!currentVideoTrack || currentVideoTrack.readyState === 'ended') {
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const freshTrack = fresh.getVideoTracks()[0];
        if (localStream) {
          localStream.addTrack(freshTrack);
        } else {
          setLocalStream(new MediaStream([freshTrack]));
        }
        currentVideoTrack = freshTrack;

        // If not currently screen sharing, replace track on peer senders
        if (!isScreenSharing) {
          activeCallsRef.current.forEach((call) => {
            const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(freshTrack).catch(console.warn);
          });
        }
      } catch (err) {
        console.warn('Camera permission denied or device error:', err);
        return;
      }
    }

    const nextEnabled = !currentVideoTrack.enabled;
    currentVideoTrack.enabled = nextEnabled;
    const nextVideoOff = !nextEnabled;
    setIsVideoOff(nextVideoOff);

    sendMediaStateSignal(nextVideoOff, isAudioMuted, isScreenSharing);
  };

  // Stop Screen Share helper
  const stopScreenShare = useCallback(() => {
    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.stop();
      } catch {
        // ignore
      }
      screenTrackRef.current = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      setScreenStream(null);
    }

    setIsScreenSharing(false);

    // Restore camera video track on peer senders
    const camVideoTrack = localStream?.getVideoTracks()[0];
    activeCallsRef.current.forEach((call) => {
      const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
      if (sender && camVideoTrack) {
        sender.replaceTrack(camVideoTrack).catch(console.warn);
      }
    });

    sendMediaStateSignal(isVideoOff, isAudioMuted, false);
  }, [localStream, isVideoOff, isAudioMuted, screenStream, sendMediaStateSignal]);

  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: true,
        });

        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) return;

        screenTrackRef.current = screenTrack;
        setScreenStream(displayStream);
        setIsScreenSharing(true);

        // Replace video track with screen track on active peer calls
        activeCallsRef.current.forEach((call) => {
          const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack).catch(console.warn);
          }
        });

        // Detect native browser stop sharing bar click
        screenTrack.onended = () => {
          stopScreenShare();
        };

        sendMediaStateSignal(isVideoOff, isAudioMuted, true);
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.warn('Screen share error:', err);
        }
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    try {
      const res = await fetch(`/api/meetings/${meeting.meetingCode}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          senderName: displayName,
          senderUserId: userId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
    }
  };

  const handleLeaveMeeting = async () => {
    // 1. Broadcast peer-left signal
    const myPeerId = peerInstanceRef.current?.id;
    if (myPeerId) {
      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: myPeerId,
          type: 'peer-left',
          payload: { userId },
        }),
      }).catch(console.warn);
    }

    // 2. Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    // 3. Destroy peer connection
    if (peerInstanceRef.current) {
      try {
        peerInstanceRef.current.destroy();
      } catch {
        // ignore
      }
    }

    fetch(`/api/meetings/${meeting.meetingCode}/join?userId=${userId}`, {
      method: 'DELETE',
    }).catch(console.warn);

    router.push('/');
  };

  const handleEndMeetingForAll = async () => {
    try {
      await fetch(`/api/meetings/${meeting.meetingCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ended',
          hostUserId: userId,
        }),
      });

      const myPeerId = peerInstanceRef.current?.id || userId;
      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: myPeerId,
          type: 'meeting-ended',
          payload: {},
        }),
      }).catch(console.warn);

      handleLeaveMeeting();
    } catch (err) {
      console.warn('Error ending meeting:', err);
      handleLeaveMeeting();
    }
  };

  const handleMuteParticipant = (peerId: string) => {
    setPeers((prev) => {
      const updated = new Map(prev);
      const peer = updated.get(peerId);
      if (peer) {
        updated.set(peerId, { ...peer, isAudioMuted: true });
      }
      return updated;
    });
  };

  const handleKickParticipant = (peerId: string) => {
    const call = activeCallsRef.current.get(peerId);
    if (call) {
      try {
        call.close();
      } catch {
        // ignore
      }
      activeCallsRef.current.delete(peerId);
    }
    setPeers((prev) => {
      const updated = new Map(prev);
      updated.delete(peerId);
      return updated;
    });
  };

  const remotePeersList = Array.from(peers.values());
  const totalParticipantCount = 1 + remotePeersList.length;

  // Active screen share state detection
  const activeSharerPeer = remotePeersList.find((p) => p.isScreenSharing);
  const isAnyoneScreenSharing = isScreenSharing || !!activeSharerPeer;

  // Remote screen video attachment
  useEffect(() => {
    if (remoteScreenVideoRef.current && activeSharerPeer?.stream) {
      remoteScreenVideoRef.current.srcObject = activeSharerPeer.stream;
      remoteScreenVideoRef.current.play().catch(() => {});
    }
  }, [activeSharerPeer?.stream]);

  const getGridClass = () => {
    if (pinnedPeerId) return 'grid-cols-1 max-w-5xl mx-auto';
    if (totalParticipantCount === 1) return 'grid-cols-1 max-w-5xl mx-auto';
    if (totalParticipantCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto';
    if (totalParticipantCount <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto';
    if (totalParticipantCount <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-7xl mx-auto';
  };

  return (
    <div className="relative w-screen h-screen bg-[#0e1015] text-[#f8fafc] flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#242732] bg-[#16181f] z-20">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[#1e212b] border border-[#242732] text-xs font-medium text-slate-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Connected</span>
          </div>
          <h2 className="text-xs sm:text-sm font-semibold text-[#f8fafc] truncate max-w-[180px] sm:max-w-[320px]">
            {meeting.title}
          </h2>
          <div className="hidden md:flex items-center space-x-1.5 pl-2.5 border-l border-[#242732]">
            <span className="text-xs font-mono text-slate-400">{meeting.meetingCode}</span>
            <button
              onClick={handleCopyCode}
              title="Copy meeting link"
              className="p-1 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#1e212b] border border-[#242732] text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => {
              setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery');
              setPinnedPeerId(null);
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-lg border border-[#242732] transition"
            title={viewMode === 'gallery' ? 'Switch to Speaker view' : 'Switch to Gallery view'}
          >
            {viewMode === 'gallery' ? <Grid className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Stage & Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto pb-24 flex flex-col items-center justify-center">
          {/* SCREEN SHARING HERO VIEW */}
          {isAnyoneScreenSharing ? (
            <div className="w-full h-full max-w-7xl flex flex-col space-y-3">
              {/* Screen Share Stage */}
              <div className="relative flex-1 min-h-[50vh] bg-black rounded-xl overflow-hidden border border-[#242732] flex items-center justify-center shadow-2xl">
                {isScreenSharing ? (
                  <video
                    ref={localScreenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    ref={remoteScreenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Presenter Pill */}
                <div className="absolute top-3 left-3 bg-[#16181f]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#242732] flex items-center space-x-2 text-xs text-white z-10 shadow">
                  <MonitorUp className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span className="font-medium">
                    {isScreenSharing ? 'You are sharing your screen' : `${activeSharerPeer?.displayName || 'Participant'} is presenting`}
                  </span>
                </div>

                {/* Sharer Stop Button */}
                {isScreenSharing && (
                  <button
                    onClick={stopScreenShare}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-lg shadow transition active:scale-95 z-10"
                  >
                    Stop Sharing
                  </button>
                )}
              </div>

              {/* Participant Filmstrip */}
              <div className="h-32 sm:h-36 flex items-center space-x-3 overflow-x-auto pb-1 shrink-0">
                {/* Local Camera Tile in Filmstrip */}
                <div className="w-48 sm:w-56 h-full shrink-0">
                  <VideoTile
                    displayName={displayName}
                    stream={localStream}
                    isLocal={true}
                    isHost={isHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isSpeaking={isLocalSpeaking}
                    isPinned={pinnedPeerId === 'local'}
                    onTogglePin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                  />
                </div>

                {/* Remote Participants in Filmstrip */}
                {remotePeersList.map((peer) => (
                  <div key={peer.peerId} className="w-48 sm:w-56 h-full shrink-0">
                    <VideoTile
                      displayName={peer.displayName}
                      stream={peer.stream}
                      isLocal={false}
                      isHost={peer.userId === meeting.hostUserId}
                      isAudioMuted={peer.isAudioMuted}
                      isVideoOff={peer.isVideoOff}
                      isSpeaking={peer.isSpeaking}
                      isPinned={pinnedPeerId === peer.peerId}
                      onTogglePin={() => setPinnedPeerId(pinnedPeerId === peer.peerId ? null : peer.peerId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STANDARD GALLERY / SPEAKER GRID */
            <div className={`w-full h-full max-h-[82vh] grid gap-3 sm:gap-4 ${getGridClass()}`}>
              <VideoTile
                displayName={displayName}
                stream={localStream}
                isLocal={true}
                isHost={isHost}
                isAudioMuted={isAudioMuted}
                isVideoOff={isVideoOff}
                isSpeaking={isLocalSpeaking}
                isPinned={pinnedPeerId === 'local'}
                onTogglePin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
              />

              {remotePeersList.map((peer) => (
                <VideoTile
                  key={peer.peerId}
                  displayName={peer.displayName}
                  stream={peer.stream}
                  isLocal={false}
                  isHost={peer.userId === meeting.hostUserId}
                  isAudioMuted={peer.isAudioMuted}
                  isVideoOff={peer.isVideoOff}
                  isSpeaking={peer.isSpeaking}
                  isPinned={pinnedPeerId === peer.peerId}
                  onTogglePin={() => setPinnedPeerId(pinnedPeerId === peer.peerId ? null : peer.peerId)}
                />
              ))}
            </div>
          )}
        </main>

        {activePanel === 'chat' && (
          <ChatPanel
            messages={messages}
            currentUserId={userId}
            currentDisplayName={displayName}
            onSendMessage={handleSendMessage}
            onClose={() => {
              setActivePanel('none');
              setUnreadCount(0);
            }}
          />
        )}

        {activePanel === 'participants' && (
          <ParticipantsPanel
            currentUserId={userId}
            currentDisplayName={displayName}
            isHost={isHost}
            localAudioMuted={isAudioMuted}
            localVideoOff={isVideoOff}
            remotePeers={remotePeersList}
            meetingCode={meeting.meetingCode}
            onMuteParticipant={handleMuteParticipant}
            onKickParticipant={handleKickParticipant}
            onMuteAll={() => remotePeersList.forEach((p) => handleMuteParticipant(p.peerId))}
            onClose={() => setActivePanel('none')}
          />
        )}

        {activePanel === 'info' && (
          <InfoPanel meeting={meeting} onClose={() => setActivePanel('none')} />
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <MeetingControls
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHost={isHost}
        participantCount={totalParticipantCount}
        unreadCount={unreadCount}
        activePanel={activePanel}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onTogglePanel={(panel) => {
          setActivePanel(activePanel === panel ? 'none' : panel);
          if (panel === 'chat') setUnreadCount(0);
        }}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeetingForAll={isHost ? handleEndMeetingForAll : undefined}
      />

      {/* Meeting Concluded Modal */}
      {meetingEndedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150">
          <div className="surface-modal rounded-xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-2xl border border-[#242732]">
            <div className="w-12 h-12 rounded-lg bg-[#1e212b] border border-[#242732] text-slate-400 flex items-center justify-center mx-auto">
              <PhoneOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#f8fafc]">Meeting Concluded</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{meetingEndedNotice}</p>
            <div className="pt-2">
              <button
                onClick={() => {
                  if (localStream) localStream.getTracks().forEach((t) => t.stop());
                  router.push('/');
                }}
                className="w-full py-2.5 bg-[#2563eb] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
