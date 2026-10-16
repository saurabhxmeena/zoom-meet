'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScheduleModal from '@/components/ScheduleModal';
import {
  Video,
  Calendar,
  Copy,
  Check,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { IMeeting, IUser } from '@/lib/types';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isCreatingInstant, setIsCreatingInstant] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load session & user meetings
  useEffect(() => {
    async function init() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            setCurrentUser(userData.user);
          }
        }
      } catch {
        // ignore
      }

      try {
        const meetRes = await fetch('/api/meetings');
        if (meetRes.ok) {
          const meetData = await meetRes.json();
          if (meetData.meetings) {
            setMeetings(meetData.meetings);
          }
        }
      } catch {
        // ignore
      }
    }
    init();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setCurrentUser(null);
    router.refresh();
  };

  const handleStartInstantMeeting = async () => {
    try {
      setIsCreatingInstant(true);
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentUser ? `${currentUser.displayName}'s Meeting` : 'Instant Meeting',
          hostUserId: currentUser?._id || 'guest_host',
          hostName: currentUser?.displayName || 'Host',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create meeting');

      router.push(`/meet/${data.meeting.meetingCode}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsCreatingInstant(false);
    }
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinCode.trim()) return;

    let code = joinCode.trim();
    if (code.includes('/meet/')) {
      code = code.split('/meet/')[1].split('?')[0];
    }
    code = code.replace(/[^a-zA-Z0-9-]/g, '');

    if (!code) {
      setJoinError('Enter a valid meeting code or link');
      return;
    }

    router.push(`/meet/${code}`);
  };

  const handleCopy = (code: string) => {
    const url = `${window.location.origin}/meet/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col selection:bg-[#2997ff] selection:text-white">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col justify-center">
        
        {/* Minimal Hero */}
        <div className="text-center max-w-xl mx-auto space-y-3 mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#f5f5f7]">
            Video meetings, simplified.
          </h1>
          <p className="text-sm sm:text-base text-[#86868b] font-normal leading-relaxed">
            Connect, collaborate, and share with crystal-clear audio and video directly in your browser.
          </p>
        </div>

        {/* Primary Action Controls */}
        <div className="max-w-xl mx-auto w-full space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Start Meeting Button */}
            <button
              onClick={handleStartInstantMeeting}
              disabled={isCreatingInstant}
              className="flex items-center justify-center space-x-2 w-full h-12 px-5 bg-[#2997ff] hover:bg-[#0077ed] active:scale-[0.99] text-white text-sm font-medium rounded-xl transition shadow-sm"
            >
              <Video className="w-4 h-4" />
              <span>{isCreatingInstant ? 'Starting...' : 'New Meeting'}</span>
            </button>

            {/* Schedule Button */}
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="flex items-center justify-center space-x-2 w-full h-12 px-5 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99] text-[#f5f5f7] text-sm font-medium rounded-xl border border-white/[0.08] transition"
            >
              <Calendar className="w-4 h-4 text-[#86868b]" />
              <span>Schedule for Later</span>
            </button>

          </div>

          {/* Join Meeting Inline Input */}
          <form onSubmit={handleJoinMeeting} className="relative flex items-center">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter meeting code (e.g. 784-920-315)"
              className="w-full h-12 pl-4 pr-24 bg-[#161618] border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-sm text-[#f5f5f7] placeholder-[#515154] transition"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="absolute right-1.5 h-9 px-4 bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-30 disabled:hover:bg-white/[0.08] text-[#f5f5f7] text-xs font-medium rounded-lg transition"
            >
              Join
            </button>
          </form>

          {joinError && (
            <p className="text-xs text-[#ff453a] text-center mt-1">
              {joinError}
            </p>
          )}
        </div>

        {/* Recent Meetings */}
        {meetings.length > 0 && (
          <div className="max-w-xl mx-auto w-full mt-14 pt-8 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                Recent Meetings
              </span>
              <span className="text-xs text-[#515154]">
                {meetings.length} meeting{meetings.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-white/[0.04] bg-[#161618] rounded-2xl border border-white/[0.06] overflow-hidden">
              {meetings.map((meet) => {
                const isEnded = meet.status === 'ended';
                return (
                  <div
                    key={meet._id}
                    className="flex items-center justify-between p-3.5 sm:px-4 hover:bg-white/[0.02] transition"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isEnded ? 'bg-[#515154]' : 'bg-[#30d158]'}`} />
                        <span className="text-xs font-medium text-[#f5f5f7] truncate">
                          {meet.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#86868b] block mt-0.5">
                        {meet.meetingCode}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleCopy(meet.meetingCode)}
                        title="Copy link"
                        className="p-2 text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] rounded-lg transition"
                      >
                        {copiedCode === meet.meetingCode ? (
                          <Check className="w-3.5 h-3.5 text-[#30d158]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isEnded && (
                        <Link
                          href={`/meet/${meet.meetingCode}`}
                          className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] text-xs font-medium rounded-lg transition"
                        >
                          Join
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Subtle minimal footer */}
      <footer className="py-6 border-t border-white/[0.04] text-center text-xs text-[#515154]">
        <span>WebRTC Peer-to-Peer Encrypted Media</span>
      </footer>

      {/* Schedule Modal */}
      {isScheduleOpen && (
        <ScheduleModal
          onClose={() => setIsScheduleOpen(false)}
          defaultHostName={currentUser?.displayName || 'Host'}
          defaultHostUserId={currentUser?._id || 'user_1'}
          onMeetingScheduled={(newMeet) => {
            setMeetings((prev) => [newMeet, ...prev]);
          }}
        />
      )}
    </div>
  );
}
