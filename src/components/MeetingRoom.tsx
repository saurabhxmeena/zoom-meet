'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MonitorUp,
  Copy,
  Check,
  Clock,
  PhoneOff,
  Volume2,
  X as CloseIcon,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { IMeeting, IMessage, IPeerConnection } from '@/lib/types';
import { createAudioAnalyser, ICE_SERVERS, acquireCameraTrack, acquireAudioTrack } from '@/lib/webrtc';
import VideoTile from './VideoTile';
import MeetingControls from './MeetingControls';
import FloatingSidebar from './FloatingSidebar';

interface MeetingRoomProps {
  meeting: IMeeting;
  userId: string;
  clientSessionId?: string;
  displayName: string;
  isHost: boolean;
  initialStream: MediaStream | null;
  initialAudioMuted: boolean;
  initialVideoOff: boolean;
  initialFacingMode?: 'user' | 'environment';
  onLeave?: () => void;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xOffset: number;
}

export default function MeetingRoom({
  meeting,
  userId,
  clientSessionId,
  displayName,
  isHost,
  initialStream,
  initialAudioMuted,
  initialVideoOff,
  initialFacingMode = 'user',
  onLeave,
}: MeetingRoomProps) {
  const router = useRouter();

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [isAudioMuted, setIsAudioMuted] = useState(initialAudioMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [mediaErrorNotice, setMediaErrorNotice] = useState<string | null>(null);

  // Master tracking of all created tracks to guarantee 100% camera/mic release on exit
  const allMediaTracksRef = useRef<Set<MediaStreamTrack>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Screen sharing & Picture-in-Picture state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // Peer management
  const [peers, setPeers] = useState<Map<string, IPeerConnection>>(new Map());
  const peerInstanceRef = useRef<any>(null);
  const activeCallsRef = useRef<Map<string, any>>(new Map());

  // Meeting view & pin state
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);

  // Floating Sidebar - NONE by default on entering meeting
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants' | 'info'>('none');
  const activePanelRef = useRef<'none' | 'chat' | 'participants' | 'info'>('none');
  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  // Real-time WebRTC DataConnections mesh for peer-to-peer messaging
  const activeDataConnectionsRef = useRef<Map<string, any>>(new Map());

  // Meeting reactions & Hand raise state
  const [isLocalHandRaised, setIsLocalHandRaised] = useState(false);
  const [remoteHands, setRemoteHands] = useState<Map<string, boolean>>(new Map());
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showAcousticHint, setShowAcousticHint] = useState(true);

  // Chat
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Meeting duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [meetingEndedNotice, setMeetingEndedNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const audioCleanupRef = useRef<(() => void) | null>(null);

  // Track initial stream tracks immediately
  useEffect(() => {
    if (initialStream) {
      initialStream.getTracks().forEach((t) => allMediaTracksRef.current.add(t));
    }
  }, [initialStream]);

  // Track local stream tracks
  useEffect(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => allMediaTracksRef.current.add(t));
    }
  }, [localStream]);

  // Master function to stop and release all media hardware tracks on leaving
  const stopAllMediaTracks = useCallback(() => {
    allMediaTracksRef.current.forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
    allMediaTracksRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
    if (screenTrackRef.current) {
      try { screenTrackRef.current.stop(); } catch {}
      screenTrackRef.current = null;
    }

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    if (localScreenVideoRef.current) {
      localScreenVideoRef.current.pause();
      localScreenVideoRef.current.srcObject = null;
    }
    if (remoteScreenVideoRef.current) {
      remoteScreenVideoRef.current.pause();
      remoteScreenVideoRef.current.srcObject = null;
    }
  }, []);

  // Guarantee cleanup on window unload or page hide (e.g. tab close, navigation)
  useEffect(() => {
    const handleUnload = () => {
      stopAllMediaTracks();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      stopAllMediaTracks();
    };
  }, [stopAllMediaTracks]);

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

  // Ensure working local media with echo cancellation and noise suppression
  useEffect(() => {
    let cancelled = false;

    async function ensureMedia() {
      const current = localStreamRef.current;
      const hasLiveVideo =
        current &&
        current.getVideoTracks().length > 0 &&
        current.getVideoTracks().some((t) => t.readyState === 'live');

      const hasLiveAudio =
        current &&
        current.getAudioTracks().length > 0 &&
        current.getAudioTracks().some((t) => t.readyState === 'live');

      // Only attempt acquisition if tracks are truly missing
      if (!hasLiveVideo || !hasLiveAudio) {
        try {
          let freshVideo: MediaStreamTrack | null = null;
          let freshAudio: MediaStreamTrack | null = null;

          if (!hasLiveVideo) {
            freshVideo = await acquireCameraTrack(facingMode);
            if (freshVideo) allMediaTracksRef.current.add(freshVideo);
          }

          if (!hasLiveAudio) {
            freshAudio = await acquireAudioTrack();
            if (freshAudio) allMediaTracksRef.current.add(freshAudio);
          }

          if (!cancelled) {
            if (freshAudio) freshAudio.enabled = !isAudioMuted;
            if (freshVideo) freshVideo.enabled = !isVideoOff;

            const baseTracks = current ? current.getTracks() : [];
            const remainingTracks = baseTracks.filter((t) => {
              if (freshVideo && t.kind === 'video') return false;
              if (freshAudio && t.kind === 'audio') return false;
              return t.readyState === 'live';
            });

            const merged = [...remainingTracks];
            if (freshVideo) merged.push(freshVideo);
            if (freshAudio) merged.push(freshAudio);

            const updatedStream = new MediaStream(merged);
            localStreamRef.current = updatedStream;
            setLocalStream(updatedStream);

            activeCallsRef.current.forEach((call) => {
              const pc = call.peerConnection;
              if (!pc) return;

              if (freshVideo) {
                const videoSender = pc.getSenders()?.find((s: any) => s.track?.kind === 'video');
                if (videoSender) {
                  videoSender.replaceTrack(freshVideo).catch(console.warn);
                } else {
                  try { pc.addTrack(freshVideo, updatedStream); } catch {}
                }
              }

              if (freshAudio) {
                const audioSender = pc.getSenders()?.find((s: any) => s.track?.kind === 'audio');
                if (audioSender) {
                  audioSender.replaceTrack(freshAudio).catch(console.warn);
                } else {
                  try { pc.addTrack(freshAudio, updatedStream); } catch {}
                }
              }
            });
          }
        } catch (err: any) {
          console.warn('[MeetingRoom] Media check notice:', err);
          if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
            setMediaErrorNotice('Camera or microphone device is unavailable or permission was denied.');
          }
        }
      }
    }

    ensureMedia();
    return () => {
      cancelled = true;
    };
  }, [isAudioMuted, isVideoOff]);

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

  // Picture-in-Picture event listeners
  useEffect(() => {
    const videoEl = localScreenVideoRef.current;
    if (!videoEl) return;

    const handleEnterPiP = () => setIsPipActive(true);
    const handleLeavePiP = () => setIsPipActive(false);

    videoEl.addEventListener('enterpictureinpicture', handleEnterPiP);
    videoEl.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      videoEl.removeEventListener('enterpictureinpicture', handleEnterPiP);
      videoEl.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [screenStream]);

  // Toggle Picture-in-Picture floating preview window
  const handleTogglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (localScreenVideoRef.current) {
        await localScreenVideoRef.current.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn('[PiP] Picture-in-Picture failed or denied:', err);
    }
  };

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
        const cleanMeetingCode = meeting.meetingCode.replace(/[^a-zA-Z0-9]/g, '');
        const cleanUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-5);
        const sessionSuffix = (clientSessionId || Math.random().toString(36).substring(2, 8)).slice(-5);
        const myPeerId = `meet_${cleanMeetingCode}_${cleanUserId}_${sessionSuffix}`;

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
          // fallback to Google STUN
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
              senderSessionId: clientSessionId,
              type: 'peer-joined',
              payload: { userId, clientSessionId, displayName, isAudioMuted, isVideoOff, isScreenSharing },
            }),
          }).catch(console.warn);
        });

        // WebRTC P2P DataChannel Connection Handler (Direct zero-latency messaging between phones)
        peer.on('connection', (conn: any) => {
          conn.on('open', () => {
            activeDataConnectionsRef.current.set(conn.peer, conn);
          });
          conn.on('data', (data: any) => {
            if (!isSubscribed || !data) return;
            if (data.type === 'chat-message' && data.message) {
              const incomingMsg = data.message;
              setMessages((prev) => {
                if (prev.some((m) => m._id === incomingMsg._id)) return prev;
                if (activePanelRef.current !== 'chat') {
                  setUnreadCount((c) => c + 1);
                }
                return [...prev, incomingMsg];
              });
            } else if (data.type === 'peer-reaction') {
              const reactionEmoji = data.payload?.emoji;
              const sender = data.payload?.senderName || 'Participant';
              const xOffset = data.payload?.xOffset ?? ((Math.random() - 0.5) * 160);
              if (reactionEmoji) {
                const newReaction: FloatingReaction = {
                  id: Math.random().toString(36).substring(2, 9),
                  emoji: reactionEmoji,
                  senderName: sender,
                  xOffset,
                };
                setFloatingReactions((prev) => [...prev, newReaction]);
                setTimeout(() => {
                  setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
                }, 2600);
              }
            }
          });
          conn.on('close', () => {
            activeDataConnectionsRef.current.delete(conn.peer);
          });
        });

        peer.on('call', (call: any) => {
          const existingCall = activeCallsRef.current.get(call.peer);
          if (existingCall && existingCall.open) {
            console.debug('[WebRTC] Redundant call from existing peer ignored:', call.peer);
            return;
          }

          // Always use active stream ref to prevent stale empty stream
          const outboundStream = screenStreamRef.current || localStreamRef.current;
          call.answer(outboundStream || undefined);

          call.on('stream', (remoteStream: MediaStream) => {
            if (!isSubscribed) return;
            const callerDisplayName = call.metadata?.displayName || 'Participant';
            setPeers((prev) => {
              const updated = new Map(prev);
              const existing = prev.get(call.peer);
              updated.set(call.peer, {
                peerId: call.peer,
                userId: call.metadata?.userId || call.peer,
                displayName: callerDisplayName,
                stream: remoteStream,
                isAudioMuted: existing?.isAudioMuted ?? false,
                isVideoOff: existing?.isVideoOff ?? false,
                isScreenSharing: existing?.isScreenSharing ?? false,
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
      activeDataConnectionsRef.current.forEach((conn) => {
        try {
          conn.close();
        } catch {
          // ignore
        }
      });
      activeDataConnectionsRef.current.clear();
    };
  }, [meeting.meetingCode, userId, clientSessionId, displayName]);

  // Signaling & Presence Sync Poll
  useEffect(() => {
    let lastSignalTime = Date.now() - 60000;
    let isAlive = true;

    const syncMeeting = async () => {
      if (!isAlive) return;

      // 1. Real-time Signaling Sync
      try {
        const myPeerId = peerInstanceRef.current?.id || clientSessionId || userId;
        const res = await fetch(
          `/api/meetings/${meeting.meetingCode}/signal?peerId=${myPeerId || ''}&since=${lastSignalTime}`
        );

        if (res.ok) {
          const data = await res.json();
          lastSignalTime = data.serverTime || Date.now();

          if (data.signals && data.signals.length > 0) {
            for (const sig of data.signals) {
              if (sig.from === myPeerId || (clientSessionId && sig.from === clientSessionId)) continue;

              // 1. Peer joined -> Deterministic call initiation & DataConnection
              if (sig.type === 'peer-joined') {
                const shouldInitiate = myPeerId && myPeerId.localeCompare(sig.from) < 0;

                if (shouldInitiate && peerInstanceRef.current) {
                  if (!activeCallsRef.current.has(sig.from)) {
                    const outboundStream = screenStreamRef.current || localStreamRef.current;
                    const call = peerInstanceRef.current.call(sig.from, outboundStream, {
                      metadata: { userId, clientSessionId, displayName },
                    });

                    if (call) {
                      call.on('stream', (remoteStream: MediaStream) => {
                        setPeers((prev) => {
                          const updated = new Map(prev);
                          const existing = prev.get(sig.from);
                          updated.set(sig.from, {
                            peerId: sig.from,
                            userId: sig.payload?.userId || sig.from,
                            displayName: sig.payload?.displayName || 'Participant',
                            stream: remoteStream,
                            isAudioMuted: sig.payload?.isAudioMuted ?? existing?.isAudioMuted ?? false,
                            isVideoOff: sig.payload?.isVideoOff ?? existing?.isVideoOff ?? false,
                            isScreenSharing: sig.payload?.isScreenSharing ?? existing?.isScreenSharing ?? false,
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

                  // Establish direct WebRTC DataChannel connection
                  if (!activeDataConnectionsRef.current.has(sig.from)) {
                    try {
                      const conn = peerInstanceRef.current.connect(sig.from);
                      conn.on('open', () => {
                        activeDataConnectionsRef.current.set(sig.from, conn);
                      });
                      conn.on('data', (data: any) => {
                        if (!isAlive || !data) return;
                        if (data.type === 'chat-message' && data.message) {
                          const incomingMsg = data.message;
                          setMessages((prev) => {
                            if (prev.some((m) => m._id === incomingMsg._id)) return prev;
                            if (activePanelRef.current !== 'chat') {
                              setUnreadCount((c) => c + 1);
                            }
                            return [...prev, incomingMsg];
                          });
                        }
                      });
                      conn.on('close', () => {
                        activeDataConnectionsRef.current.delete(sig.from);
                      });
                    } catch (dcErr) {
                      console.debug('DataChannel connect notice:', dcErr);
                    }
                  }
                }
              }

              // 2. Peer updated media state
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

              // 3. Peer sent a reaction emoji
              else if (sig.type === 'peer-reaction') {
                const reactionEmoji = sig.payload?.emoji;
                const sender = sig.payload?.senderName || 'Participant';
                const xOffset = sig.payload?.xOffset ?? ((Math.random() - 0.5) * 160);
                if (reactionEmoji) {
                  const newReaction: FloatingReaction = {
                    id: Math.random().toString(36).substring(2, 9),
                    emoji: reactionEmoji,
                    senderName: sender,
                    xOffset,
                  };
                  setFloatingReactions((prev) => [...prev, newReaction]);
                  setTimeout(() => {
                    setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
                  }, 2600);
                }
              }

              // 4. Peer raised/lowered hand
              else if (sig.type === 'peer-hand-raise') {
                const handState = !!sig.payload?.isHandRaised;
                setRemoteHands((prev) => {
                  const updated = new Map(prev);
                  updated.set(sig.from, handState);
                  return updated;
                });
              }

              // 5. Incoming real-time chat message via signal
              else if (sig.type === 'chat-message') {
                const incomingMsg = sig.payload?.message;
                if (incomingMsg && incomingMsg._id) {
                  setMessages((prev) => {
                    if (prev.some((m) => m._id === incomingMsg._id)) return prev;
                    if (activePanelRef.current !== 'chat') {
                      setUnreadCount((c) => c + 1);
                    }
                    return [...prev, incomingMsg];
                  });
                }
              }

              // 5.5 Chat message reaction sync
              else if (sig.type === 'chat-reaction') {
                const { messageId, emoji, userName } = sig.payload || {};
                if (messageId && emoji && userName) {
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg._id !== messageId) return msg;
                      const currentReactions = msg.reactions || {};
                      const userList = currentReactions[emoji] || [];
                      const hasReacted = userList.includes(userName);
                      const updatedList = hasReacted
                        ? userList.filter((name: string) => name !== userName)
                        : [...userList, userName];

                      const updatedReactions = { ...currentReactions };
                      if (updatedList.length > 0) {
                        updatedReactions[emoji] = updatedList;
                      } else {
                        delete updatedReactions[emoji];
                      }
                      return { ...msg, reactions: updatedReactions };
                    })
                  );
                }
              }

              // 6. Peer left the room
              else if (sig.type === 'peer-left') {
                const call = activeCallsRef.current.get(sig.from);
                if (call) {
                  try { call.close(); } catch {}
                  activeCallsRef.current.delete(sig.from);
                }
                const conn = activeDataConnectionsRef.current.get(sig.from);
                if (conn) {
                  try { conn.close(); } catch {}
                  activeDataConnectionsRef.current.delete(sig.from);
                }
                setPeers((prev) => {
                  const updated = new Map(prev);
                  updated.delete(sig.from);
                  return updated;
                });
                setRemoteHands((prev) => {
                  const updated = new Map(prev);
                  updated.delete(sig.from);
                  return updated;
                });
              }

              // 7. Host ended meeting
              else if (sig.type === 'meeting-ended') {
                setMeetingEndedNotice('The meeting was ended by the host.');
              }
            }
          }
        }
      } catch (sigErr) {
        console.debug('Signaling sync notice:', sigErr);
      }

      // 2. Periodic Database Message Sync (independent so signal failure never prevents delivery)
      try {
        const chatRes = await fetch(`/api/meetings/${meeting.meetingCode}/messages`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          if (chatData.messages && Array.isArray(chatData.messages)) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m._id));
              const newMsgs = chatData.messages.filter((m: IMessage) => !existingIds.has(m._id));
              if (newMsgs.length > 0) {
                if (activePanelRef.current !== 'chat') {
                  setUnreadCount((c) => c + newMsgs.length);
                }
                return [...prev, ...newMsgs];
              }
              return prev;
            });
          }
        }
      } catch (chatErr) {
        console.debug('Chat sync notice:', chatErr);
      }

      // 3. Verify meeting lifecycle status
      try {
        const meetRes = await fetch(`/api/meetings/${meeting.meetingCode}`);
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          if (meetData.meeting && meetData.meeting.status === 'ended') {
            setMeetingEndedNotice('This meeting has ended.');
          }
        }
      } catch (meetErr) {
        console.debug('Meeting status check notice:', meetErr);
      }
    };

    // Run initial sync immediately on mount
    syncMeeting();

    const intervalId = setInterval(syncMeeting, 1200);
    return () => {
      isAlive = false;
      clearInterval(intervalId);
    };
  }, [meeting.meetingCode, userId, clientSessionId, displayName]);

  // Audio Toggle (Microphone) with reliable track lifecycle
  const handleToggleAudio = async () => {
    let currentAudioTrack = localStream?.getAudioTracks().find((t) => t.readyState === 'live');

    if (!currentAudioTrack) {
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const freshTrack = fresh.getAudioTracks()[0];
        if (!freshTrack) return;
        allMediaTracksRef.current.add(freshTrack);

        const currentTracks = localStream ? localStream.getTracks() : [];
        const nonAudioTracks = currentTracks.filter((t) => t.kind !== 'audio');
        const newStream = new MediaStream([...nonAudioTracks, freshTrack]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        currentAudioTrack = freshTrack;

        activeCallsRef.current.forEach((call) => {
          const pc = call.peerConnection;
          if (!pc) return;
          const sender = pc.getSenders()?.find((s: any) => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(freshTrack).catch(console.warn);
          } else {
            try { pc.addTrack(freshTrack, newStream); } catch {}
          }
        });
        setMediaErrorNotice(null);
      } catch (err) {
        console.warn('Microphone permission denied or device error:', err);
        setMediaErrorNotice('Microphone permission was denied or device is unavailable.');
        return;
      }
    }

    const nextEnabled = !currentAudioTrack.enabled;
    currentAudioTrack.enabled = nextEnabled;
    const nextMuted = !nextEnabled;
    setIsAudioMuted(nextMuted);

    sendMediaStateSignal(isVideoOff, nextMuted, isScreenSharing);
  };

  // Video Toggle (Camera) with reliable track lifecycle
  const handleToggleVideo = async () => {
    let currentVideoTrack = localStream?.getVideoTracks().find((t) => t.readyState === 'live');

    if (!currentVideoTrack) {
      try {
        const freshTrack = await acquireCameraTrack(facingMode);
        if (!freshTrack) return;
        allMediaTracksRef.current.add(freshTrack);

        const currentTracks = localStream ? localStream.getTracks() : [];
        const nonVideoTracks = currentTracks.filter((t) => t.kind !== 'video');
        const newStream = new MediaStream([...nonVideoTracks, freshTrack]);
        localStreamRef.current = newStream;
        setLocalStream(newStream);
        currentVideoTrack = freshTrack;

        if (!isScreenSharing) {
          activeCallsRef.current.forEach((call) => {
            const pc = call.peerConnection;
            if (!pc) return;
            const sender = pc.getSenders()?.find((s: any) => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(freshTrack).catch(console.warn);
            } else {
              try { pc.addTrack(freshTrack, newStream); } catch {}
            }
          });
        }
        setMediaErrorNotice(null);
      } catch (err) {
        console.warn('Camera permission denied or device error:', err);
        setMediaErrorNotice('Camera permission was denied or camera device is unavailable.');
        return;
      }
    }

    const nextEnabled = !currentVideoTrack.enabled;
    currentVideoTrack.enabled = nextEnabled;
    const nextVideoOff = !nextEnabled;
    setIsVideoOff(nextVideoOff);

    sendMediaStateSignal(nextVideoOff, isAudioMuted, isScreenSharing);
  };

  // Flip camera (front selfie <-> rear environment for smartphones)
  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const freshTrack = await acquireCameraTrack(nextFacing);
      if (!freshTrack) return;
      allMediaTracksRef.current.add(freshTrack);

      const currentTracks = localStreamRef.current ? localStreamRef.current.getTracks() : [];
      const nonVideoTracks = currentTracks.filter((t) => t.kind !== 'video');
      const newStream = new MediaStream([...nonVideoTracks, freshTrack]);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      setFacingMode(nextFacing);
      setIsVideoOff(false);

      if (!isScreenSharing) {
        activeCallsRef.current.forEach((call) => {
          const pc = call.peerConnection;
          if (!pc) return;
          const sender = pc.getSenders()?.find((s: any) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(freshTrack).catch(console.warn);
          } else {
            try { pc.addTrack(freshTrack, newStream); } catch {}
          }
        });
      }
      setMediaErrorNotice(null);
    } catch (err) {
      console.warn('Flip camera error:', err);
      setMediaErrorNotice('Could not switch camera device.');
    }
  };

  // Stop Screen Share helper
  const stopScreenShare = useCallback(() => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    setIsPipActive(false);

    if (screenTrackRef.current) {
      try {
        screenTrackRef.current.stop();
      } catch {
        // ignore
      }
      screenTrackRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      screenStreamRef.current = null;
      setScreenStream(null);
    }

    setIsScreenSharing(false);

    const camVideoTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === 'live');
    activeCallsRef.current.forEach((call) => {
      const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
      if (sender && camVideoTrack) {
        sender.replaceTrack(camVideoTrack).catch(console.warn);
      }
    });

    sendMediaStateSignal(isVideoOff, isAudioMuted, false);
  }, [isVideoOff, isAudioMuted, sendMediaStateSignal]);

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

        displayStream.getTracks().forEach((t) => allMediaTracksRef.current.add(t));
        screenTrackRef.current = screenTrack;
        screenStreamRef.current = displayStream;
        setScreenStream(displayStream);
        setIsScreenSharing(true);

        activeCallsRef.current.forEach((call) => {
          const sender = call.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack).catch(console.warn);
          }
        });

        screenTrack.onended = () => {
          stopScreenShare();
        };

        sendMediaStateSignal(isVideoOff, isAudioMuted, true);
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.warn('Screen share notice:', err);
        }
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
          senderSessionId: clientSessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const savedMessage: IMessage = data.message;

        setMessages((prev) => {
          if (prev.some((m) => m._id === savedMessage._id)) return prev;
          return [...prev, savedMessage];
        });

        // Broadcast directly over active WebRTC DataConnections for instant peer delivery
        activeDataConnectionsRef.current.forEach((conn) => {
          if (conn.open) {
            try {
              conn.send({
                type: 'chat-message',
                payload: { message: savedMessage },
              });
            } catch (err) {
              console.warn('DataConnection send error:', err);
            }
          }
        });

        // Also publish to Signal REST endpoint as guaranteed fallback
        const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
        fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderFrom,
            type: 'chat-message',
            payload: { message: savedMessage },
          }),
        }).catch(console.warn);
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
    }
  };

  // Send Meeting Reaction
  const handleSendReaction = (emoji: string) => {
    const xOffset = (Math.random() - 0.5) * 160;
    const newReaction: FloatingReaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      senderName: displayName,
      xOffset,
    };

    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);

    // Direct WebRTC DataConnection broadcast
    activeDataConnectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({
            type: 'peer-reaction',
            payload: { emoji, senderName: displayName, xOffset },
          });
        } catch (e) {
          console.warn('P2P reaction broadcast error:', e);
        }
      }
    });

    const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderFrom,
        type: 'peer-reaction',
        payload: { emoji, senderName: displayName, xOffset },
      }),
    }).catch(console.warn);
  };

  // React to a chat message
  const handleReactToMessage = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id !== messageId) return msg;
        const currentReactions = msg.reactions || {};
        const userList = currentReactions[emoji] || [];
        const hasReacted = userList.includes(displayName);
        const updatedList = hasReacted
          ? userList.filter((name: string) => name !== displayName)
          : [...userList, displayName];

        const updatedReactions = { ...currentReactions };
        if (updatedList.length > 0) {
          updatedReactions[emoji] = updatedList;
        } else {
          delete updatedReactions[emoji];
        }
        return { ...msg, reactions: updatedReactions };
      })
    );

    // P2P DataChannel broadcast
    activeDataConnectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({
            type: 'chat-reaction',
            payload: { messageId, emoji, userName: displayName },
          });
        } catch (e) {
          console.warn('P2P chat-reaction broadcast error:', e);
        }
      }
    });

    const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderFrom,
        type: 'chat-reaction',
        payload: { messageId, emoji, userName: displayName },
      }),
    }).catch(console.warn);
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = () => {
    const nextState = !isLocalHandRaised;
    setIsLocalHandRaised(nextState);

    // P2P DataChannel broadcast
    activeDataConnectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({
            type: 'peer-hand-raise',
            payload: { isHandRaised: nextState },
          });
        } catch (e) {
          console.warn('P2P hand raise broadcast error:', e);
        }
      }
    });

    const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderFrom,
        type: 'peer-hand-raise',
        payload: { isHandRaised: nextState },
      }),
    }).catch(console.warn);
  };

  // Complete Leave and Hardware Media Release
  const handleLeaveMeeting = async () => {
    const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderFrom,
        type: 'peer-left',
        payload: { userId },
      }),
    }).catch(console.warn);

    // Completely stop every media track so camera and mic indicators shut off
    stopAllMediaTracks();

    // Close and clear all DataConnections
    activeDataConnectionsRef.current.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    activeDataConnectionsRef.current.clear();

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

    if (onLeave) {
      onLeave();
    } else {
      router.push('/');
    }
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

      const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: senderFrom,
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
    const conn = activeDataConnectionsRef.current.get(peerId);
    if (conn && conn.open) {
      try {
        conn.send({ type: 'mute-mic', payload: {} });
      } catch (e) {
        console.warn(e);
      }
    }
    const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderFrom,
        to: peerId,
        type: 'mute-mic',
        payload: {},
      }),
    }).catch(console.warn);

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
    const conn = activeDataConnectionsRef.current.get(peerId);
    if (conn && conn.open) {
      try {
        conn.send({ type: 'kick-peer', payload: {} });
      } catch (e) {
        console.warn(e);
      }
    }
    const senderFrom = peerInstanceRef.current?.id || clientSessionId || userId;
    fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: senderFrom,
        to: peerId,
        type: 'kick-peer',
        payload: {},
      }),
    }).catch(console.warn);

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

  // Dynamic grid sizing optimized for smartphones and desktops
  const getGridClass = () => {
    if (totalParticipantCount === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto';
    if (totalParticipantCount <= 4) return 'grid-cols-2 max-w-6xl mx-auto';
    if (totalParticipantCount <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-7xl mx-auto';
  };

  // Determine Active Spotlight Participant (when pinned)
  const getSpotlightParticipant = () => {
    if (pinnedPeerId === 'local') return { isLocal: true, peer: null };
    if (pinnedPeerId) {
      const pinnedPeer = remotePeersList.find((p) => p.peerId === pinnedPeerId);
      if (pinnedPeer) return { isLocal: false, peer: pinnedPeer };
    }
    return null;
  };

  const spotlight = getSpotlightParticipant();

  return (
    <div className="relative w-screen h-[100dvh] bg-[#0e1015] text-[#f8fafc] flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#242732] bg-[#16181f] z-20 shrink-0">
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

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#1e212b] border border-[#242732] text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* FLOATING REACTIONS OVERLAY */}
      {floatingReactions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="absolute bottom-24 sm:bottom-28 left-1/2 flex items-center space-x-2 bg-[#16181f]/95 border border-[#242732] backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-2xl animate-floating-reaction"
              style={{ ['--x-offset' as any]: `${r.xOffset}px` }}
            >
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-xs text-[#f1f2f4] font-medium">{r.senderName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Media Device Error Notice Banner */}
      {mediaErrorNotice && (
        <div className="bg-[#d97706]/15 border-b border-[#d97706]/35 px-4 py-2 flex items-center justify-between text-xs text-[#fbbf24] z-20 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#fbbf24] shrink-0" />
            <span>{mediaErrorNotice}</span>
          </div>
          <button
            onClick={() => setMediaErrorNotice(null)}
            className="p-1 hover:text-white rounded hover:bg-[#d97706]/20 transition"
            title="Dismiss notice"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unobtrusive acoustic feedback hint */}
      {showAcousticHint && totalParticipantCount > 1 && (
        <div className="bg-[#16181f] border-b border-[#242732] px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 z-20 shrink-0">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>
              Joining with multiple devices in the same room? Use headphones or mute one device to avoid acoustic feedback.
            </span>
          </div>
          <button
            onClick={() => setShowAcousticHint(false)}
            className="p-0.5 hover:text-white rounded hover:bg-[#1e212b] transition"
            title="Dismiss"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Stage & Non-overlapping Floating Sidebar Layout */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative w-full h-full p-2 sm:p-3 pb-24 gap-0 sm:gap-3 transition-all duration-300">
        <main className="meeting-stage-area relative flex flex-col items-center justify-center overflow-y-auto w-full h-full">

          {/* 1. SCREEN SHARING HERO VIEW WITH PICTURE-IN-PICTURE CONTROL */}
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
                    muted
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Presenter Pill & PiP Action */}
                <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
                  <div className="bg-[#16181f]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#242732] flex items-center space-x-2 text-xs text-white shadow">
                    <MonitorUp className="w-3.5 h-3.5 text-[#3b82f6]" />
                    <span className="font-medium">
                      {isScreenSharing ? 'You are sharing your screen' : `${activeSharerPeer?.displayName || 'Participant'} is presenting`}
                    </span>
                  </div>

                  {/* Persistent Floating Picture-in-Picture Preview Button */}
                  {isScreenSharing && (
                    <button
                      onClick={handleTogglePictureInPicture}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition active:scale-95 shadow ${
                        isPipActive
                          ? 'bg-[#2563eb] text-white'
                          : 'bg-[#16181f]/90 hover:bg-[#20232c] text-slate-200 border border-[#242732]'
                      }`}
                      title={isPipActive ? 'Close floating preview' : 'Open persistent floating preview window'}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isPipActive ? 'Floating Active' : 'Floating Preview'}</span>
                    </button>
                  )}
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
                <div className="w-48 sm:w-56 h-full shrink-0">
                  <VideoTile
                    displayName={displayName}
                    stream={localStream}
                    isLocal={true}
                    isFrontFacing={facingMode === 'user'}
                    isHost={isHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isSpeaking={isLocalSpeaking}
                    isHandRaised={isLocalHandRaised}
                    isPinned={pinnedPeerId === 'local'}
                    onTogglePin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                  />
                </div>

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
                      isHandRaised={!!remoteHands.get(peer.peerId)}
                      isPinned={pinnedPeerId === peer.peerId}
                      onTogglePin={() => setPinnedPeerId(pinnedPeerId === peer.peerId ? null : peer.peerId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : pinnedPeerId && spotlight ? (
            /* 2. PINNED PARTICIPANT SPOTLIGHT VIEW */
            <div className="w-full h-full max-w-7xl flex flex-col space-y-3">
              {/* Primary Focused Stage */}
              <div className="relative flex-1 aspect-[4/3] sm:aspect-video min-h-[36vh] sm:min-h-[50vh] max-h-[68vh] rounded-xl overflow-hidden border border-[#242732] shadow-2xl flex items-center justify-center mx-auto w-full">
                {spotlight.isLocal ? (
                  <VideoTile
                    displayName={displayName}
                    stream={localStream}
                    isLocal={true}
                    isFrontFacing={facingMode === 'user'}
                    isHost={isHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isSpeaking={isLocalSpeaking}
                    isHandRaised={isLocalHandRaised}
                    isPinned={true}
                    onTogglePin={() => setPinnedPeerId(null)}
                  />
                ) : (
                  <VideoTile
                    displayName={spotlight.peer!.displayName}
                    stream={spotlight.peer!.stream}
                    isLocal={false}
                    isHost={spotlight.peer!.userId === meeting.hostUserId}
                    isAudioMuted={spotlight.peer!.isAudioMuted}
                    isVideoOff={spotlight.peer!.isVideoOff}
                    isSpeaking={spotlight.peer!.isSpeaking}
                    isHandRaised={!!remoteHands.get(spotlight.peer!.peerId)}
                    isPinned={true}
                    onTogglePin={() => setPinnedPeerId(null)}
                  />
                )}
              </div>

              {/* Filmstrip for Remaining Participants */}
              {totalParticipantCount > 1 && (
                <div className="h-28 sm:h-32 flex items-center space-x-3 overflow-x-auto pb-1 shrink-0">
                  {/* If spotlight is remote, local user goes in filmstrip */}
                  {!spotlight.isLocal && (
                    <div className="w-44 sm:w-48 h-full shrink-0">
                      <VideoTile
                        displayName={displayName}
                        stream={localStream}
                        isLocal={true}
                        isFrontFacing={facingMode === 'user'}
                        isHost={isHost}
                        isAudioMuted={isAudioMuted}
                        isVideoOff={isVideoOff}
                        isSpeaking={isLocalSpeaking}
                        isHandRaised={isLocalHandRaised}
                        isPinned={false}
                        onTogglePin={() => setPinnedPeerId('local')}
                      />
                    </div>
                  )}

                  {/* Remote peers that are not in spotlight */}
                  {remotePeersList
                    .filter((p) => spotlight.isLocal || p.peerId !== spotlight.peer?.peerId)
                    .map((peer) => (
                      <div key={peer.peerId} className="w-44 sm:w-48 h-full shrink-0">
                        <VideoTile
                          displayName={peer.displayName}
                          stream={peer.stream}
                          isLocal={false}
                          isHost={peer.userId === meeting.hostUserId}
                          isAudioMuted={peer.isAudioMuted}
                          isVideoOff={peer.isVideoOff}
                          isSpeaking={peer.isSpeaking}
                          isHandRaised={!!remoteHands.get(peer.peerId)}
                          isPinned={false}
                          onTogglePin={() => setPinnedPeerId(peer.peerId)}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            /* 3. RESPONSIVE PARTICIPANT GRID */
            <div className="w-full h-full flex flex-col items-center justify-center">
              {totalParticipantCount === 1 ? (
                <div className="w-full max-w-sm sm:max-w-3xl md:max-w-4xl aspect-[3/4] sm:aspect-video max-h-[75vh] sm:max-h-[82vh] mx-auto flex items-center justify-center p-1 sm:p-0">
                  <VideoTile
                    displayName={displayName}
                    stream={localStream}
                    isLocal={true}
                    isFrontFacing={facingMode === 'user'}
                    isHost={isHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isSpeaking={isLocalSpeaking}
                    isHandRaised={isLocalHandRaised}
                    isPinned={pinnedPeerId === 'local'}
                    onTogglePin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
                  />
                </div>
              ) : (
                <div className={`w-full h-full max-h-[82vh] grid gap-2 sm:gap-4 ${getGridClass()}`}>
                  <VideoTile
                    displayName={displayName}
                    stream={localStream}
                    isLocal={true}
                    isFrontFacing={facingMode === 'user'}
                    isHost={isHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isSpeaking={isLocalSpeaking}
                    isHandRaised={isLocalHandRaised}
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
                      isHandRaised={!!remoteHands.get(peer.peerId)}
                      isPinned={pinnedPeerId === peer.peerId}
                      onTogglePin={() => setPinnedPeerId(pinnedPeerId === peer.peerId ? null : peer.peerId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Desktop Sidebar Layout Slot - Sits side-by-side with video grid on sm+ screens */}
        <div
          className={`hidden sm:flex meeting-sidebar-slot shrink-0 flex-col ${
            activePanel !== 'none'
              ? 'w-80 md:w-88 lg:w-96 opacity-100 h-full'
              : 'w-0 opacity-0 pointer-events-none h-full overflow-hidden'
          }`}
        >
          {activePanel !== 'none' && (
            <FloatingSidebar
              className="h-full w-full surface-floating-panel rounded-2xl flex flex-col overflow-hidden border border-[#242732] shadow-xl"
              activePanel={activePanel}
              onSwitchPanel={(panel) => {
                setActivePanel(panel);
                if (panel === 'chat') setUnreadCount(0);
              }}
              onClose={() => setActivePanel('none')}
              messages={messages}
              currentUserId={userId}
              currentDisplayName={displayName}
              clientSessionId={clientSessionId}
              onSendMessage={handleSendMessage}
              onReactToMessage={handleReactToMessage}
              unreadCount={unreadCount}
              isHost={isHost}
              localAudioMuted={isAudioMuted}
              localVideoOff={isVideoOff}
              localHandRaised={isLocalHandRaised}
              remotePeers={remotePeersList}
              remoteHands={remoteHands}
              meetingCode={meeting.meetingCode}
              onMuteParticipant={handleMuteParticipant}
              onKickParticipant={handleKickParticipant}
              onMuteAll={() => remotePeersList.forEach((p) => handleMuteParticipant(p.peerId))}
              meeting={meeting}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom-Sheet Drawer Overlay - Elevates above controls without clipping or shrinking video */}
      {activePanel !== 'none' && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0" onClick={() => setActivePanel('none')} />

          {/* Drawer Container */}
          <div className="relative z-10 w-full max-h-[88dvh] h-[85dvh] bg-[#16181f] border-t border-[#242732] rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drag Handle Pill */}
            <div className="w-full flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-600/70" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <FloatingSidebar
                className="h-full w-full bg-transparent flex flex-col overflow-hidden"
                activePanel={activePanel}
                onSwitchPanel={(panel) => {
                  setActivePanel(panel);
                  if (panel === 'chat') setUnreadCount(0);
                }}
                onClose={() => setActivePanel('none')}
                messages={messages}
                currentUserId={userId}
                currentDisplayName={displayName}
                clientSessionId={clientSessionId}
                onSendMessage={handleSendMessage}
                onReactToMessage={handleReactToMessage}
                unreadCount={unreadCount}
                isHost={isHost}
                localAudioMuted={isAudioMuted}
                localVideoOff={isVideoOff}
                localHandRaised={isLocalHandRaised}
                remotePeers={remotePeersList}
                remoteHands={remoteHands}
                meetingCode={meeting.meetingCode}
                onMuteParticipant={handleMuteParticipant}
                onKickParticipant={handleKickParticipant}
                onMuteAll={() => remotePeersList.forEach((p) => handleMuteParticipant(p.peerId))}
                meeting={meeting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Control Bar */}
      <MeetingControls
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isHost={isHost}
        participantCount={totalParticipantCount}
        unreadCount={unreadCount}
        activePanel={activePanel}
        isHandRaised={isLocalHandRaised}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onFlipCamera={handleFlipCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onTogglePanel={(panel) => {
          setActivePanel(activePanel === panel ? 'none' : panel);
          if (panel === 'chat') setUnreadCount(0);
        }}
        onSendReaction={handleSendReaction}
        onToggleHandRaise={handleToggleHandRaise}
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
                  stopAllMediaTracks();
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
