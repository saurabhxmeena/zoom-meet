'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid,
  Maximize2,
  MonitorUp,
  AlertCircle,
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

  // Chat
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Meeting duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingEndedNotice, setMeetingEndedNotice] = useState<string | null>(null);

  const audioCleanupRef = useRef<(() => void) | null>(null);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !initialAudioMuted;
      });
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

  useEffect(() => {
    let peer: any = null;
    let isSubscribed = true;

    async function initWebRTC() {
      try {
        const PeerClass = (await import('peerjs')).default;
        const myPeerId = `meet_${meeting.meetingCode.replace(/[^a-zA-Z0-9]/g, '')}_${userId.slice(-6)}`;

        peer = new PeerClass(myPeerId, {
          config: {
            iceServers: ICE_SERVERS,
          },
          debug: 1,
        });

        peerInstanceRef.current = peer;

        peer.on('open', (id: string) => {
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

        peer.on('call', (call: any) => {
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
          console.warn('[WebRTC]:', err.type || err);
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

  useEffect(() => {
    let lastSignalTime = Date.now();
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
              if (sig.type === 'peer-joined' && sig.from !== myPeerId) {
                if (peerInstanceRef.current && localStream && !activeCallsRef.current.has(sig.from)) {
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
              } else if (sig.type === 'meeting-ended') {
                setMeetingEndedNotice('The meeting was ended by the host.');
              }
            }
          }
        }

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

        const meetRes = await fetch(`/api/meetings/${meeting.meetingCode}`);
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          if (meetData.meeting && meetData.meeting.status === 'ended') {
            setMeetingEndedNotice('This meeting has ended.');
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

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
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
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
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

  const getGridClass = () => {
    if (pinnedPeerId) return 'grid-cols-1';
    if (totalParticipantCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (totalParticipantCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipantCount <= 4) return 'grid-cols-1 sm:grid-cols-2';
    if (totalParticipantCount <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
  };

  return (
    <div className="relative w-screen h-screen bg-black text-[#f5f5f7] flex flex-col overflow-hidden select-none">
      
      {/* Apple-style Top Header Bar */}
      <header className="h-12 px-4 sm:px-6 flex items-center justify-between border-b border-white/[0.06] bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-[#30d158]" />
          <h2 className="text-xs sm:text-sm font-medium text-[#f5f5f7] max-w-[200px] sm:max-w-[360px] truncate">
            {meeting.title}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs font-mono text-[#86868b]">
            {formatDuration(elapsedSeconds)}
          </span>

          <button
            onClick={() => {
              setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery');
              setPinnedPeerId(null);
            }}
            className="p-1.5 text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] rounded-md transition"
            title={viewMode === 'gallery' ? 'Speaker view' : 'Gallery view'}
          >
            {viewMode === 'gallery' ? <Grid className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Screen Share Notice */}
      {isScreenSharing && (
        <div className="bg-[#2997ff] px-4 py-1.5 flex items-center justify-between text-xs text-white z-20">
          <div className="flex items-center space-x-2">
            <MonitorUp className="w-3.5 h-3.5" />
            <span>You are sharing your screen</span>
          </div>
          <button
            onClick={handleToggleScreenShare}
            className="px-2 py-0.5 bg-white text-[#0077ed] font-medium rounded text-[11px] hover:bg-white/90 transition"
          >
            Stop
          </button>
        </div>
      )}

      {/* Main Video Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto pb-24 flex items-center justify-center">
          <div className={`w-full h-full max-h-[84vh] grid gap-3 sm:gap-4 ${getGridClass()}`}>
            
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
          <InfoPanel
            meeting={meeting}
            onClose={() => setActivePanel('none')}
          />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-[#f5f5f7]">Meeting Ended</h3>
            <p className="text-xs text-[#86868b] leading-relaxed">{meetingEndedNotice}</p>
            <button
              onClick={() => {
                if (localStream) localStream.getTracks().forEach((t) => t.stop());
                router.push('/');
              }}
              className="w-full py-2.5 bg-[#2997ff] hover:bg-[#0077ed] text-white text-xs font-medium rounded-xl transition"
            >
              Return Home
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
