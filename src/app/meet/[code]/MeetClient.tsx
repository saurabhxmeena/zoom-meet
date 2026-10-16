'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IMeeting, IUser } from '@/lib/types';
import Lobby from '@/components/Lobby';
import MeetingRoom from '@/components/MeetingRoom';
import { AlertCircle, ArrowLeft, Loader2, Video } from 'lucide-react';
import Link from 'next/link';

interface MeetClientProps {
  code: string;
}

export default function MeetClient({ code }: MeetClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<IMeeting | null>(null);
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // In-meeting state once Lobby completed
  const [joined, setJoined] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [joinedDisplayName, setJoinedDisplayName] = useState('');
  const [joinedUserId, setJoinedUserId] = useState('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch current user session
        try {
          const userRes = await fetch('/api/auth/me');
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.user) {
              setCurrentUser(userData.user);
            }
          }
        } catch {
          // ignore session fetch error
        }

        // 2. Fetch meeting details
        const meetRes = await fetch(`/api/meetings/${code}`);
        const meetData = await meetRes.json();

        if (!meetRes.ok || !meetData.meeting) {
          setError(meetData.error || 'Meeting not found. Please verify the meeting ID.');
          setLoading(false);
          return;
        }

        setMeeting(meetData.meeting);
      } catch (err) {
        setError('Error loading meeting: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadData();
    }
  }, [code]);

  const handleLobbyJoin = async (options: {
    displayName: string;
    isAudioMuted: boolean;
    isVideoOff: boolean;
    passcode?: string;
    stream: MediaStream | null;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const userId = currentUser?._id || 'guest_' + Math.random().toString(36).substring(2, 9);

      const res = await fetch(`/api/meetings/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          displayName: options.displayName,
          passcode: options.passcode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join meeting');
      }

      setJoinedDisplayName(options.displayName);
      setJoinedUserId(userId);
      setIsHost(data.isHost || (currentUser?._id === meeting?.hostUserId));
      setIsAudioMuted(options.isAudioMuted);
      setIsVideoOff(options.isVideoOff);
      setActiveStream(options.stream);
      setJoined(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !joined) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
          <Video className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          <span>Connecting to meeting room...</span>
        </div>
      </div>
    );
  }

  if (error && !joined) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Unable to Join Meeting</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) return null;

  if (joined) {
    return (
      <MeetingRoom
        meeting={meeting}
        userId={joinedUserId}
        displayName={joinedDisplayName}
        isHost={isHost}
        initialStream={activeStream}
        initialAudioMuted={isAudioMuted}
        initialVideoOff={isVideoOff}
      />
    );
  }

  return (
    <Lobby
      meeting={meeting}
      initialDisplayName={currentUser?.displayName || ''}
      onJoin={handleLobbyJoin}
    />
  );
}
