'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScheduleModal from '@/components/ScheduleModal';
import PaperDocsModal from '@/components/PaperDocsModal';
import {
  Video,
  Plus,
  Users,
  Calendar,
  Share2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Terminal,
  Database,
  Radio,
  ExternalLink,
  BookOpen,
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
  const [isDocsOpen, setIsDocsOpen] = useState(false);
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

  // Handle Logout
  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setCurrentUser(null);
    router.refresh();
  };

  // Start Instant Meeting (FR-02)
  const handleStartInstantMeeting = async () => {
    try {
      setIsCreatingInstant(true);
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentUser ? `${currentUser.displayName}'s Instant Meeting` : 'Instant Zoom Meeting',
          hostUserId: currentUser?._id || 'guest_host',
          hostName: currentUser?.displayName || 'Host',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start meeting');

      router.push(`/meet/${data.meeting.meetingCode}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsCreatingInstant(false);
    }
  };

  // Join Existing Meeting (FR-03)
  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinCode.trim()) return;

    // Clean user input: handle raw code or full URL
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
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        
        {/* Top Hero / Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MAIT IT Department • Session 2026-2027</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Zoom Meeting Application
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A MERN-Stack Web Application for Online Meetings and Real-Time Peer Collaboration.
              Engineered with WebRTC 1.0 (RFC 8825), Google STUN servers, MongoDB persistence, and server-side JWT authentication.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => setIsDocsOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition"
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>View Minor Project Paper</span>
              </button>
              <Link
                href="/evaluation"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-xs font-semibold text-emerald-400 rounded-xl border border-emerald-500/30 transition"
              >
                <Terminal className="w-4 h-4" />
                <span>Run Section 16 Verification Tests</span>
              </Link>
            </div>
          </div>

          {/* Decorative Background Glow */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* 4 Main Action Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* 1. New Meeting */}
          <div
            onClick={handleStartInstantMeeting}
            className="group cursor-pointer p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                <Video className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  New Meeting
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Start an instant conference and share the room invitation.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-orange-400">
              <span>{isCreatingInstant ? 'Initializing Room...' : 'Start Instant'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Join Meeting Form */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Plus className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Join Meeting</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter meeting ID or invite URL to join a session.
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinMeeting} className="mt-4 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. 784-920-315"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              {joinError && <p className="text-[10px] text-red-400">{joinError}</p>}
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition"
              >
                Join Room
              </button>
            </form>
          </div>

          {/* 3. Schedule Meeting */}
          <div
            onClick={() => setIsScheduleOpen(true)}
            className="group cursor-pointer p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  Schedule
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Plan ahead, set passcodes, and customize attendee settings.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-indigo-400">
              <span>Set Date & Time</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Verification & Testing Suite */}
          <Link
            href="/evaluation"
            className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                <Terminal className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Evaluation Suite
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Run automated Section 16 test cases for academic evaluation.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-emerald-400">
              <span>Run 9 Test Cases</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </section>

        {/* Recent & Upcoming Meetings Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">
                Meetings & Evaluation Rooms
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {meetings.length} Recorded Meeting{meetings.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Topic / Title</th>
                  <th className="p-3">Meeting Code</th>
                  <th className="p-3">Host</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {meetings.map((meet) => {
                  const isEnded = meet.status === 'ended';
                  return (
                    <tr key={meet._id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${isEnded ? 'bg-slate-600' : 'bg-emerald-400 animate-pulse'}`} />
                          <span>{meet.title}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-blue-400 font-semibold">
                        {meet.meetingCode}
                      </td>
                      <td className="p-3 text-slate-400">{meet.hostName}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isEnded
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isEnded ? 'ENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center space-x-2">
                          <button
                            onClick={() => handleCopy(meet.meetingCode)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                            title="Copy Invitation Link"
                          >
                            {copiedCode === meet.meetingCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {!isEnded && (
                            <Link
                              href={`/meet/${meet.meetingCode}`}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs shadow-sm transition"
                            >
                              Join
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Academic Architecture & Specifications Showcase */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs uppercase tracking-wider">
              <Radio className="w-4 h-4" />
              <span>WebRTC Mesh & STUN</span>
            </div>
            <h4 className="text-sm font-bold text-white">Browser-to-Browser Media</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time low-latency audio, video, and screen sharing using standard WebRTC 1.0 PeerConnections (RFC 8825) with Google public STUN NAT traversal.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>MongoDB Data Model</span>
            </div>
            <h4 className="text-sm font-bold text-white">Mongoose Schemas (Sec 11)</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Collections for users, meeting metadata, attendance records, and persistent chat messages. Equipped with zero-config in-memory fallback for instant Vercel demos.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Security & Host Moderation</span>
            </div>
            <h4 className="text-sm font-bold text-white">Server-side Authorization</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bcrypt password hashing, short-lived JWT sessions, room passcodes, and server-enforced meeting conclusion rules (FR-07).
            </p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>Maharaja Agrasen Institute of Technology • Department of Information Technology</p>
        <p className="mt-1 text-slate-600">B.Tech. Seventh Semester Minor Project • Session 2026-2027</p>
      </footer>

      {/* Schedule Modal */}
      {isScheduleOpen && (
        <ScheduleModal
          onClose={() => setIsScheduleOpen(false)}
          defaultHostName={currentUser?.displayName || 'Host User'}
          defaultHostUserId={currentUser?._id || 'user_1'}
          onMeetingScheduled={(newMeet) => {
            setMeetings((prev) => [newMeet, ...prev]);
          }}
        />
      )}

      {/* Academic Docs Modal */}
      {isDocsOpen && <PaperDocsModal onClose={() => setIsDocsOpen(false)} />}
    </div>
  );
}
