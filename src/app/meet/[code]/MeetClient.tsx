'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IMeeting, IUser } from '@/lib/types';
import Lobby from '@/components/Lobby';
import MeetingRoom from '@/components/MeetingRoom';
import { Loader2, ArrowLeft } from 'lucide-react';
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

        const meetRes = await fetch(`/api/meetings/${code}`);
        const meetData = await meetRes.json();

        if (!meetRes.ok || !meetData.meeting) {
          setError(meetData.error || 'Meeting not found. Please verify the code.');
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
      <div className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center space-y-4 text-[#f8fafc]">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-[#16181f] border border-[#242732] flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#f8fafc]">Connecting to Session</p>
          <p className="text-xs text-slate-400">Initializing WebRTC peer configuration...</p>
        </div>
      </div>
    );
  }

  if (error && !joined) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center p-4 text-[#f8fafc]">
        <div className="surface-modal rounded-xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-xl border border-[#242732]">
          <div className="w-10 h-10 rounded-lg bg-[#1e212b] border border-[#242732] text-red-400 flex items-center justify-center mx-auto">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-[#f8fafc]">Unable to Join</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1e212b] hover:bg-[#242732] text-slate-200 rounded-lg text-xs font-medium border border-[#242732] transition active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
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
