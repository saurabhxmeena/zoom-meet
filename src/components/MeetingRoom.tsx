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
  Volume2,
  X as CloseIcon,
  ExternalLink,
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
  onLeave?: () => void;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
}

export default function MeetingRoom({
  meeting,
  userId,
  displayName,
  isHost,
  initialStream,
  initialAudioMuted,
  initialVideoOff,
  onLeave,
}: MeetingRoomProps) {
  const router = useRouter();

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [isAudioMuted, setIsAudioMuted] = useState(initialAudioMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Master tracking of all created tracks to guarantee 100% camera/mic release on exit
  const allMediaTracksRef = useRef<Set<MediaStreamTrack>>(new Set());

  // Screen sharing & Picture-in-Picture state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Peer management
  const [peers, setPeers] = useState<Map<string, IPeerConnection>>(new Map());
  const peerInstanceRef = useRef<any>(null);
  const activeCallsRef = useRef<Map<string, any>>(new Map());

  // Meeting view state (gallery vs speaker)
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);

  // Side panels - PARTICIPANTS PANEL OPEN BY DEFAULT as requested
  const [activePanel, setActivePanel] = useState<'none' | 'chat' | 'participants' | 'info'>('participants');

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

  // Master function to stop and release all media hardware tracks
  const stopAllMediaTracks = useCallback(() => {
    allMediaTracksRef.current.forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
    allMediaTracksRef.current.clear();

    if (localStream) {
      localStream.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
    if (initialStream) {
      initialStream.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => {
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
  }, [localStream, initialStream, screenStream]);

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

  // Ensure working local media with full echo cancellation constraints
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
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          fresh.getTracks().forEach((t) => allMediaTracksRef.current.add(t));

          if (!cancelled) {
            fresh.getAudioTracks().forEach((t) => {
              t.enabled = !isAudioMuted;
            });
            fresh.getVideoTracks().forEach((t) => {
              t.enabled = !isVideoOff;
            });
            setLocalStream(fresh);

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
          console.warn('[MeetingRoom] Fallback media notice:', err);
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
        const myPeerId = `meet_${meeting.meetingCode.replace(/[^a-zA-Z0-9]/g, '')}_${userId.slice(-6)}`;

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
              type: 'peer-joined',
              payload: { userId, displayName, isAudioMuted, isVideoOff, isScreenSharing },
            }),
          }).catch(console.warn);
        });

        peer.on('call', (call: any) => {
          const existingCall = activeCallsRef.current.get(call.peer);
          if (existingCall && existingCall.open) {
            console.debug('[WebRTC] Redundant call from existing peer ignored:', call.peer);
            return;
          }

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
      stopAllMediaTracks();
    };
  }, [meeting.meetingCode, userId, displayName, stopAllMediaTracks]);

  // Signaling & Presence Sync Poll
  useEffect(() => {
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

              // 1. Peer joined -> Deterministic call initiation
              if (sig.type === 'peer-joined') {
                const shouldInitiate = myPeerId && myPeerId.localeCompare(sig.from) < 0;

                if (shouldInitiate && peerInstanceRef.current && !activeCallsRef.current.has(sig.from)) {
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
                if (reactionEmoji) {
                  const newReaction: FloatingReaction = {
                    id: Math.random().toString(36).substring(2, 9),
                    emoji: reactionEmoji,
                    senderName: sender,
                  };
                  setFloatingReactions((prev) => [...prev, newReaction]);
                  setTimeout(() => {
                    setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
                  }, 2800);
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
                    if (activePanel !== 'chat') {
                      setUnreadCount((c) => c + 1);
                    }
                    return [...prev, incomingMsg];
                  });
                }
              }

              // 6. Peer left the room
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

        // Periodic database message synchronization with ID deduplication
        const chatRes = await fetch(`/api/meetings/${meeting.meetingCode}/messages`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          if (chatData.messages && Array.isArray(chatData.messages)) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m._id));
              const newMsgs = chatData.messages.filter((m: IMessage) => !existingIds.has(m._id));
              if (newMsgs.length > 0) {
                if (activePanel !== 'chat') {
                  setUnreadCount((c) => c + newMsgs.length);
                }
                return [...prev, ...newMsgs];
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

    const intervalId = setInterval(syncMeeting, 2200);
    return () => {
      isAlive = false;
      clearInterval(intervalId);
    };
  }, [meeting.meetingCode, userId, displayName, localStream, screenStream, activePanel]);

  // Audio Toggle (Microphone) with AEC constraints
  const handleToggleAudio = async () => {
    let currentAudioTrack = localStream?.getAudioTracks()[0];

    if (!currentAudioTrack || currentAudioTrack.readyState === 'ended') {
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const freshTrack = fresh.getAudioTracks()[0];
        allMediaTracksRef.current.add(freshTrack);

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

    if (!currentVideoTrack || currentVideoTrack.readyState === 'ended') {
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const freshTrack = fresh.getVideoTracks()[0];
        allMediaTracksRef.current.add(freshTrack);

        if (localStream) {
          localStream.addTrack(freshTrack);
        } else {
          setLocalStream(new MediaStream([freshTrack]));
        }
        currentVideoTrack = freshTrack;

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

        displayStream.getTracks().forEach((t) => allMediaTracksRef.current.add(t));
        screenTrackRef.current = screenTrack;
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const savedMessage: IMessage = data.message;

        setMessages((prev) => {
          if (prev.some((m) => m._id === savedMessage._id)) return prev;
          return [...prev, savedMessage];
        });

        const myPeerId = peerInstanceRef.current?.id;
        if (myPeerId) {
          fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: myPeerId,
              type: 'chat-message',
              payload: { message: savedMessage },
            }),
          }).catch(console.warn);
        }
      }
    } catch (err) {
      console.warn('Failed to send message:', err);
    }
  };

  // Send Meeting Reaction
  const handleSendReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      senderName: displayName,
    };

    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2800);

    const myPeerId = peerInstanceRef.current?.id;
    if (myPeerId) {
      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: myPeerId,
          type: 'peer-reaction',
          payload: { emoji, senderName: displayName },
        }),
      }).catch(console.warn);
    }
  };

  // Toggle Hand Raise
  const handleToggleHandRaise = () => {
    const nextState = !isLocalHandRaised;
    setIsLocalHandRaised(nextState);

    const myPeerId = peerInstanceRef.current?.id;
    if (myPeerId) {
      fetch(`/api/meetings/${meeting.meetingCode}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: myPeerId,
          type: 'peer-hand-raise',
          payload: { isHandRaised: nextState },
        }),
      }).catch(console.warn);
    }
  };

  // Complete Leave and Hardware Media Release
  const handleLeaveMeeting = async () => {
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

    // Completely stop every media track so camera and mic indicators shut off
    stopAllMediaTracks();

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

  // Gallery view dynamic grid sizing
  const getGridClass = () => {
    if (totalParticipantCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (totalParticipantCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto';
    if (totalParticipantCount <= 4) return 'grid-cols-2 max-w-6xl mx-auto';
    if (totalParticipantCount <= 6) return 'grid-cols-2 md:grid-cols-3 max-w-7xl mx-auto';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-7xl mx-auto';
  };

  // Determine Active Speaker in Speaker View
  const getSpotlightParticipant = () => {
    if (pinnedPeerId === 'local') return { isLocal: true };
    if (pinnedPeerId) {
      const pinnedPeer = remotePeersList.find((p) => p.peerId === pinnedPeerId);
      if (pinnedPeer) return { isLocal: false, peer: pinnedPeer };
    }
    const speakingRemote = remotePeersList.find((p) => p.isSpeaking && !p.isAudioMuted);
    if (speakingRemote) return { isLocal: false, peer: speakingRemote };
    if (isLocalSpeaking && !isAudioMuted) return { isLocal: true };
    if (remotePeersList.length > 0) return { isLocal: false, peer: remotePeersList[0] };
    return { isLocal: true };
  };

  const spotlight = getSpotlightParticipant();

  return (
    <div className="relative w-screen h-screen bg-[#0e1015] text-[#f8fafc] flex flex-col overflow-hidden select-none">
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

          {/* GALLERY / SPEAKER VIEW TOGGLE */}
          <button
            onClick={() => {
              setViewMode((prev) => (prev === 'gallery' ? 'speaker' : 'gallery'));
              setPinnedPeerId(null);
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-[#1e212b] rounded-lg border border-[#242732] text-xs font-medium transition"
            title={viewMode === 'gallery' ? 'Switch to Speaker View' : 'Switch to Gallery View'}
          >
            {viewMode === 'gallery' ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Speaker View</span>
              </>
            ) : (
              <>
                <Grid className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Gallery View</span>
              </>
            )}
          </button>
        </div>
      </header>

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

      {/* Main Stage & Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto pb-24 flex flex-col items-center justify-center relative">
          {/* FLOATING REACTIONS OVERLAY */}
          {floatingReactions.length > 0 && (
            <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
              {floatingReactions.map((r, i) => (
                <div
                  key={r.id}
                  className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-[#16181f]/90 border border-[#2a2d38] backdrop-blur px-3 py-1.5 rounded-full shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-300"
                  style={{
                    transform: `translate(${Math.sin(i * 1.5) * 60}px, -${i * 45}px)`,
                  }}
                >
                  <span className="text-2xl animate-bounce">{r.emoji}</span>
                  <span className="text-xs text-slate-300 font-medium">{r.senderName}</span>
                </div>
              ))}
            </div>
          )}

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
          ) : viewMode === 'speaker' ? (
            /* 2. SPEAKER VIEW LAYOUT */
            <div className="w-full h-full max-w-7xl flex flex-col space-y-3">
              {/* Primary Active Speaker Focal Stage */}
              <div className="relative flex-1 min-h-[50vh] max-h-[72vh] rounded-xl overflow-hidden border border-[#242732] shadow-2xl flex items-center justify-center">
                {spotlight.isLocal ? (
                  <VideoTile
                    displayName={displayName}
                    stream={localStream}
                    isLocal={true}
                    isHost={isHost}
                    isAudioMuted={isAudioMuted}
                    isVideoOff={isVideoOff}
                    isSpeaking={isLocalSpeaking}
                    isHandRaised={isLocalHandRaised}
                    isPinned={pinnedPeerId === 'local'}
                    onTogglePin={() => setPinnedPeerId(pinnedPeerId === 'local' ? null : 'local')}
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
                    isPinned={pinnedPeerId === spotlight.peer!.peerId}
                    onTogglePin={() =>
                      setPinnedPeerId(pinnedPeerId === spotlight.peer!.peerId ? null : spotlight.peer!.peerId)
                    }
                  />
                )}
              </div>

              {/* Speaker View Filmstrip for Remaining Participants */}
              {totalParticipantCount > 1 && (
                <div className="h-28 sm:h-32 flex items-center space-x-3 overflow-x-auto pb-1 shrink-0">
                  {/* If spotlight is remote, local user goes in filmstrip */}
                  {!spotlight.isLocal && (
                    <div className="w-44 sm:w-48 h-full shrink-0">
                      <VideoTile
                        displayName={displayName}
                        stream={localStream}
                        isLocal={true}
                        isHost={isHost}
                        isAudioMuted={isAudioMuted}
                        isVideoOff={isVideoOff}
                        isSpeaking={isLocalSpeaking}
                        isHandRaised={isLocalHandRaised}
                        isPinned={pinnedPeerId === 'local'}
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
                          isPinned={pinnedPeerId === peer.peerId}
                          onTogglePin={() => setPinnedPeerId(peer.peerId)}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            /* 3. GALLERY VIEW GRID */
            <div className={`w-full h-full max-h-[82vh] grid gap-3 sm:gap-4 ${getGridClass()}`}>
              <VideoTile
                displayName={displayName}
                stream={localStream}
                isLocal={true}
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
        </main>

        {/* Chat Panel */}
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

        {/* Participants Panel - Shown by default */}
        {activePanel === 'participants' && (
          <ParticipantsPanel
            currentUserId={userId}
            currentDisplayName={displayName}
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
            onClose={() => setActivePanel('none')}
          />
        )}

        {/* Meeting Info Panel */}
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
        isHandRaised={isLocalHandRaised}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
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
