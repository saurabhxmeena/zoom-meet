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
  Clock,
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
      setJoinError('Please enter a valid meeting code or link');
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
    <div className="min-h-screen bg-[#0e1015] text-[#f1f2f4] flex flex-col selection:bg-[#2563eb] selection:text-white">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-14 sm:py-20 flex flex-col justify-center">
        
        {/* Typographic Hero */}
        <div className="text-center max-w-xl mx-auto space-y-3 mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#f1f2f4]">
            Video meetings for everyone.
          </h1>
          <p className="text-sm sm:text-base text-[#8e929b] font-normal leading-relaxed">
            Connect with crystal-clear audio, HD video, screen sharing, and messaging directly in your browser.
          </p>
        </div>

        {/* Action Card */}
        <div className="max-w-lg mx-auto w-full">
          <div className="surface-card p-5 sm:p-6 space-y-5">
            
            {/* Quick Actions Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Start Meeting Button */}
              <button
                onClick={handleStartInstantMeeting}
                disabled={isCreatingInstant}
                className="flex items-center justify-center space-x-2 w-full h-11 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] text-white text-sm font-medium rounded-lg transition"
              >
                <Video className="w-4 h-4" />
                <span>{isCreatingInstant ? 'Creating...' : 'New Meeting'}</span>
              </button>

              {/* Schedule Button */}
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="flex items-center justify-center space-x-2 w-full h-11 px-4 bg-[#1e212b] hover:bg-[#262a36] active:scale-[0.99] text-[#f1f2f4] text-sm font-medium rounded-lg border border-[#2a2d38] transition"
              >
                <Calendar className="w-4 h-4 text-[#8e929b]" />
                <span>Schedule for Later</span>
              </button>

            </div>

            {/* Separator */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#242732]" />
              <span className="absolute bg-[#16181f] px-3 text-xs text-[#5c606a]">
                or join with code
              </span>
            </div>

            {/* Join Form */}
            <form onSubmit={handleJoinMeeting} className="relative flex items-center">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter meeting code (e.g. 784-920-315)"
                className="w-full h-11 pl-3.5 pr-20 bg-[#101217] border border-[#262934] focus:border-[#3b82f6] focus:outline-none rounded-lg text-sm text-[#f1f2f4] placeholder-[#5c606a] transition"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="absolute right-1.5 h-8 px-3.5 bg-[#1f222b] hover:bg-[#2563eb] hover:text-white disabled:opacity-40 disabled:hover:bg-[#1f222b] disabled:hover:text-[#8e929b] text-[#f1f2f4] text-xs font-medium rounded-md transition"
              >
                Join
              </button>
            </form>

            {joinError && (
              <p className="text-xs text-[#dc2626] text-center mt-1">
                {joinError}
              </p>
            )}

          </div>
        </div>

        {/* Recent Meetings Section */}
        {meetings.length > 0 && (
          <div className="max-w-lg mx-auto w-full mt-12 pt-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-[#8e929b]" />
                <span className="text-xs font-semibold text-[#8e929b] uppercase tracking-wider">
                  Recent Meetings
                </span>
              </div>
              <span className="text-xs text-[#5c606a]">
                {meetings.length} session{meetings.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-[#222530] surface-card overflow-hidden">
              {meetings.slice(0, 5).map((meet) => {
                const isEnded = meet.status === 'ended';
                return (
                  <div
                    key={meet._id}
                    className="flex items-center justify-between p-3.5 hover:bg-[#1c1e26] transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isEnded ? 'bg-[#5c606a]' : 'bg-[#16a34a]'}`} />
                        <span className="text-xs font-medium text-[#f1f2f4] truncate">
                          {meet.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5 pl-4">
                        <span className="text-[11px] font-mono text-[#8e929b]">
                          {meet.meetingCode}
                        </span>
                        <span className="text-[10px] text-[#5c606a]">•</span>
                        <span className="text-[11px] text-[#5c606a] truncate">
                          {meet.hostName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleCopy(meet.meetingCode)}
                        title="Copy meeting link"
                        className="p-1.5 text-[#8e929b] hover:text-[#f1f2f4] hover:bg-[#222530] rounded-md transition"
                      >
                        {copiedCode === meet.meetingCode ? (
                          <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isEnded && (
                        <Link
                          href={`/meet/${meet.meetingCode}`}
                          className="px-2.5 py-1 bg-[#1e212b] hover:bg-[#2563eb] hover:text-white text-[#f1f2f4] text-xs font-medium rounded-md border border-[#2a2d38] transition flex items-center space-x-1"
                        >
                          <span>Join</span>
                          <ArrowRight className="w-3 h-3" />
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

      {/* Understated academic/project footer */}
      <footer className="py-6 border-t border-[#1f222a] text-center text-xs text-[#5c606a] space-y-1">
        <p>Maharaja Agrasen Institute of Technology • Department of Information Technology</p>
        <p className="text-[11px] text-[#424652]">B.Tech Seventh Semester Minor Project • WebRTC Peer-to-Peer Signaling</p>
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
