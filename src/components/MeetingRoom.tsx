'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Users,
  Grid,
  Maximize2,
  Minimize2,
  Radio,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  MonitorUp,
} from 'lucide-react';
import { IMeeting, IMessage, IPeerConnection, IReaction } from '@/lib/types';
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // Peer management
  const [peers, setPeers] = useState<Map<string, IPeerConnection>>(new Map());
  const peerInstanceRef = useRef<any>(null);
  const activeCallsRef = useRef<Map<string, any>>(new Map());

  // Meeting view state
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants' | 'info'>('none');

  // Chat & Reactions
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reactions, setReactions] = useState<IReaction[]>([]);

  // Meeting duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingEndedNotice, setMeetingEndedNotice] = useState<string | null>(null);

  // Sound analyzer cleanup
  const audioCleanupRef = useRef<(() => void) | null>(null);

  // Format timer
  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Duration Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Local Media Setup & Speaking Analyser
  useEffect(() => {
    if (localStream) {
      // Set audio muted initial state
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !initialAudioMuted;
      });
      // Set video off initial state
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !initialVideoOff;
      });

      const cleanup = createAudioAnalyser(localStream, (speaking) => {
        setIsLocalSpeaking(speaking);
      });
      if (cleanup) audioCleanupRef.current = cleanup;
    }

    return () => {
      if (audioCleanupRef.current) audioCleanupRef.current();
    };
  }, [localStream, initialAudioMuted, initialVideoOff]);

  // 3. WebRTC PeerJS Mesh Setup
  useEffect(() => {
    let peer: any = null;
    let isSubscribed = true;

    async function initWebRTC() {
      try {
        const PeerClass = (await import('peerjs')).default;
        const myPeerId = `zoom_${meeting.meetingCode.replace(/[^a-zA-Z0-9]/g, '')}_${userId.slice(-6)}`;

        peer = new PeerClass(myPeerId, {
          config: {
            iceServers: ICE_SERVERS,
          },
          debug: 1,
        });

        peerInstanceRef.current = peer;

        peer.on('open', (id: string) => {
          console.log('[WebRTC] Peer connected with ID:', id);

          // Broadcast peer arrival via signaling channel
          fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: id,
              type: 'peer-joined',
              payload: { userId, displayName, isAudioMuted, isVideoOff },
            }),
          }).catch(console.warn);
        });

        // Answer incoming calls from other participants
        peer.on('call', (call: any) => {
          console.log('[WebRTC] Receiving call from:', call.peer);
          call.answer(localStream || undefined);

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

          activeCallsRef.current.set(call.peer, call);
        });

        peer.on('error', (err: any) => {
          console.warn('[WebRTC Peer Warning]:', err.type || err);
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
      activeCallsRef.current.forEach((call) => call.close());
    };
  }, [meeting.meetingCode, userId, displayName, localStream]);

  // 4. Signaling & Polling Relay (Fallback mesh sync & meeting status check)
  useEffect(() => {
    let lastSignalTime = Date.now();
    let isAlive = true;

    const syncMeeting = async () => {
      if (!isAlive) return;
      try {
        // Poll for meeting status & signaling
        const myPeerId = peerInstanceRef.current?.id;
        const res = await fetch(
          `/api/meetings/${meeting.meetingCode}/signal?peerId=${myPeerId || ''}&since=${lastSignalTime}`
        );
        if (res.ok) {
          const data = await res.json();
          lastSignalTime = data.serverTime || Date.now();

          // Process incoming signals
          if (data.signals && data.signals.length > 0) {
            for (const sig of data.signals) {
              if (sig.type === 'peer-joined' && sig.from !== myPeerId) {
                // Call this peer if not already connected
                if (peerInstanceRef.current && localStream && !activeCallsRef.current.has(sig.from)) {
                  console.log('[WebRTC] Initiating call to new peer:', sig.from);
                  const call = peerInstanceRef.current.call(sig.from, localStream, {
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
                          isScreenSharing: false,
                        });
                        return updated;
                      });
                    });
                    activeCallsRef.current.set(sig.from, call);
                  }
                }
              } else if (sig.type === 'reaction') {
                triggerFloatingReaction(sig.payload.emoji, sig.payload.senderName);
              } else if (sig.type === 'meeting-ended') {
                setMeetingEndedNotice('The host has ended this meeting for all participants.');
              }
            }
          }
        }

        // Poll chat messages
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

        // Check meeting status (FR-07 check)
        const meetRes = await fetch(`/api/meetings/${meeting.meetingCode}`);
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          if (meetData.meeting && meetData.meeting.status === 'ended') {
            setMeetingEndedNotice('This meeting was concluded by the host.');
          }
        }
      } catch (err) {
        console.warn('Signaling sync poll error:', err);
      }
    };

    const intervalId = setInterval(syncMeeting, 3000);
    return () => {
      isAlive = false;
      clearInterval(intervalId);
    };
  }, [meeting.meetingCode, userId, displayName, localStream, activePanel]);

  // Trigger floating emoji reaction
  const triggerFloatingReaction = useCallback((emoji: string, sender: string) => {
    const reaction: IReaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      senderName: sender,
      createdAt: Date.now(),
    };

    setReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2800);

    if (emoji === '🎉') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  }, []);

  // Send Reaction
  const handleSendReaction = async (emoji: string) => {
    triggerFloatingReaction(emoji, displayName);
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        type: 'reaction',
        payload: { emoji, senderName: displayName },
      }),
    }).catch(console.warn);
  };

  // Toggle Microphone
  const handleToggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    } else {
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Toggle Camera Video
  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera video
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
      if (localStream) {
        const camVideoTrack = localStream.getVideoTracks()[0];
        activeCallsRef.current.forEach((call) => {
          const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
          if (sender && camVideoTrack) {
            sender.replaceTrack(camVideoTrack);
          }
        });
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Replace track in peer connections
        activeCallsRef.current.forEach((call) => {
          const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        setIsScreenSharing(true);

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStream) {
            const camVideoTrack = localStream.getVideoTracks()[0];
            activeCallsRef.current.forEach((call) => {
              const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
              if (sender && camVideoTrack) {
                sender.replaceTrack(camVideoTrack);
              }
            });
          }
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Send Chat Message
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

  // Leave Meeting (FR-06)
  const handleLeaveMeeting = async () => {
    // Release client-side media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
    }
    // Record departure in DB
    fetch(`/api/meetings/${meeting.meetingCode}/join?userId=${userId}`, {
      method: 'DELETE',
    }).catch(console.warn);

    router.push('/');
  };

  // End Meeting for All (FR-07: Host only)
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

      // Broadcast meeting-ended signal
      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: userId,
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

  // Host Moderation: Mute Participant
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

  // Host Moderation: Kick Participant
  const handleKickParticipant = (peerId: string) => {
    const call = activeCallsRef.current.get(peerId);
    if (call) {
      call.close();
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

  // Compute Grid layout classes dynamically based on participant count
  const getGridClass = () => {
    if (pinnedPeerId) return 'grid-cols-1';
    if (totalParticipantCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (totalParticipantCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipantCount <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (totalParticipantCount <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
  };

  return (
    <div className="relative w-screen h-screen bg-[#070b12] text-white flex flex-col overflow-hidden select-none">
      
      {/* Top Header Bar */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-bold text-white max-w-[200px] sm:max-w-[320px] truncate">
              {meeting.title}
            </h2>
          </div>
          <span className="hidden sm:inline font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
            {meeting.meetingCode}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Duration Clock */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          {/* WebRTC P2P Status Pill */}
          <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Radio className="w-3 h-3" />
            <span>WebRTC P2P Mesh</span>
          </div>

          {/* View Toggle */}
          <button
            onClick={() => {
              setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery');
              setPinnedPeerId(null);
            }}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            title={viewMode === 'gallery' ? 'Switch to Speaker View' : 'Switch to Gallery View'}
          >
            {viewMode === 'gallery' ? <Grid className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Screen Sharing Notification Banner */}
      {isScreenSharing && (
        <div className="bg-emerald-600 px-4 py-1.5 flex items-center justify-between text-xs text-white z-20">
          <div className="flex items-center space-x-2">
            <MonitorUp className="w-4 h-4 animate-bounce" />
            <span>You are sharing your screen with all participants</span>
          </div>
          <button
            onClick={handleToggleScreenShare}
            className="px-2.5 py-0.5 bg-white text-emerald-700 font-bold rounded hover:bg-slate-100 transition text-[11px]"
          >
            Stop Sharing
          </button>
        </div>
      )}

      {/* Center Video Area + Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Video Grid */}
        <main className="flex-1 p-3 sm:p-4 overflow-y-auto pb-24 flex items-center justify-center">
          <div className={`w-full h-full max-h-[82vh] grid gap-3 sm:gap-4 ${getGridClass()}`}>
            
            {/* Local User Tile */}
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

            {/* Remote Peer Video Tiles */}
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
        </main>

        {/* Floating Emoji Reactions Stream */}
        <div className="absolute bottom-24 left-10 pointer-events-none z-30 flex flex-col space-y-2">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="floating-reaction flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-xl"
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-[11px] font-medium text-slate-300">{r.senderName}</span>
            </div>
          ))}
        </div>

        {/* Side Panels */}
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
          <InfoPanel
            meeting={meeting}
            onClose={() => setActivePanel('none')}
          />
        )}

      </div>

      {/* Bottom Floating Control Bar */}
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
        onSendReaction={handleSendReaction}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeetingForAll={isHost ? handleEndMeetingForAll : undefined}
      />

      {/* Meeting Concluded Notice Modal */}
      {meetingEndedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Meeting Ended</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{meetingEndedNotice}</p>
            <button
              onClick={() => {
                if (localStream) localStream.getTracks().forEach((t) => t.stop());
                router.push('/');
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
