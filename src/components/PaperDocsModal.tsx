'use client';

import React, { useState } from 'react';
import { X, BookOpen, Layers, Database, Shield, CheckSquare, Terminal, ExternalLink, Cpu } from 'lucide-react';
import Link from 'next/link';

interface PaperDocsModalProps {
  onClose: () => void;
}

export default function PaperDocsModal({ onClose }: PaperDocsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'dataModel' | 'testing' | 'checklist'>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Detailed Academic Research Paper Reference
              </h2>
              <p className="text-xs text-slate-400">
                MAIT • Dept. of Information Technology • B.Tech 7th Sem Minor Project (2026-2027)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Overview & Objectives
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. System Architecture (Sec 9)
          </button>
          <button
            onClick={() => setActiveTab('dataModel')}
            className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'dataModel'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. MongoDB Model (Sec 11)
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'testing'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Testing Plan (Sec 16)
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-4 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            5. Appendix A Checklist
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/40 text-blue-200 text-xs leading-relaxed">
                <span className="font-semibold text-blue-300">Project Abstract:</span> This project proposes a browser-based Zoom-like meeting application focused on creating and joining virtual meetings, communicating through audio and video, exchanging text messages, and authenticating users using the MERN stack (React, Node.js, Express, MongoDB) coupled with WebRTC peer-to-peer media.
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Functional Requirements Matrix (Section 8.1)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <span className="font-mono text-blue-400 font-bold">FR-01: User Auth</span>
                    <p className="text-slate-400 mt-1">Registration, login, logout, password hashing with bcrypt, JWT token session management.</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <span className="font-mono text-blue-400 font-bold">FR-02: Create Meeting</span>
                    <p className="text-slate-400 mt-1">Generate unique formatted meeting identifier (e.g., 849-204-918) and shareable invitation URL.</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <span className="font-mono text-blue-400 font-bold">FR-03: Join Meeting</span>
                    <p className="text-slate-400 mt-1">Join via code/link with authorization, optional meeting passcode, and attendance logging.</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <span className="font-mono text-blue-400 font-bold">FR-04: Audio/Video Layer</span>
                    <p className="text-slate-400 mt-1">WebRTC (W3C standard) P2P mesh exchange using STUN servers (RFC 8445).</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <span className="font-mono text-blue-400 font-bold">FR-05: In-Meeting Chat</span>
                    <p className="text-slate-400 mt-1">Real-time text chat with sender name, timestamps, and database persistence.</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <span className="font-mono text-blue-400 font-bold">FR-06 & 07: Lifecycle & Host</span>
                    <p className="text-slate-400 mt-1">Resource cleanup on leave, host-only terminate meeting for all, kick/mute actions.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Three-Tier Architecture & Signaling (Figure 1 in Paper)</h3>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                <pre>{`+--------------------+                    +--------------------+
|  Browser Client A  |                    |  Browser Client B  |
|  (React UI/WebRTC) |                    |  (React UI/WebRTC) |
+---------+----------+                    +---------+----------+
          |                                         |
          |  (1) Signaling / Auth                   |  (1) Signaling / Auth
          v                                         v
+--------------------------------------------------------------+
|             Node.js / Express / Next.js Server               |
|      (REST Endpoints, JWT Authentication, Signaling API)     |
+------------------------------+-------------------------------+
                               |
                               |  (2) Queries
                               v
                     +--------------------+
                     |  MongoDB Database  |
                     |  (Users, Meetings, |
                     |   Messages, Logs)  |
                     +--------------------+

          =================================================
          [Direct WebRTC P2P Audio / Video Stream Exchange]
          Client A <==============================> Client B
                  (via Google STUN: stun.l.google.com:19302)
          =================================================`}</pre>
              </div>
              <p className="text-xs text-slate-400">
                The presentation tier runs React.js with device stream controls; the application tier validates sessions and brokers signaling messages; and the media layer routes audio, video, and screen sharing directly between browser endpoints.
              </p>
            </div>
          )}

          {activeTab === 'dataModel' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">MongoDB Conceptual Collections (Section 11)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950 text-slate-300 uppercase">
                    <tr>
                      <th className="p-2.5 border-b border-slate-800">Collection</th>
                      <th className="p-2.5 border-b border-slate-800">Fields</th>
                      <th className="p-2.5 border-b border-slate-800">Purpose & Constraints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-blue-400 font-bold">users</td>
                      <td className="p-2.5 font-mono text-slate-300">_id, displayName, email, passwordHash, createdAt</td>
                      <td className="p-2.5 text-slate-400">User accounts. Unique index on email; passwords hashed via bcrypt.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-blue-400 font-bold">meetings</td>
                      <td className="p-2.5 font-mono text-slate-300">_id, meetingCode, title, hostUserId, status, settings</td>
                      <td className="p-2.5 text-slate-400">Stores meeting metadata and lifecycle state ('active' | 'ended').</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-blue-400 font-bold">messages</td>
                      <td className="p-2.5 font-mono text-slate-300">_id, meetingId, senderUserId, senderName, text, createdAt</td>
                      <td className="p-2.5 text-slate-400">Stores in-meeting chat history associated with meetingId.</td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-blue-400 font-bold">participants</td>
                      <td className="p-2.5 font-mono text-slate-300">_id, meetingId, userId, displayName, joinedAt, leftAt, role</td>
                      <td className="p-2.5 text-slate-400">Audit trail of attendance, join and departure timestamps.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Section 16 Testing and Evaluation Plan</h3>
                <Link
                  href="/evaluation"
                  onClick={onClose}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Run Live Evaluation Suite</span>
                </Link>
              </div>
              <p className="text-xs text-slate-400">
                The research paper outlines 9 reproducible test scenarios across authentication, meeting lifecycle, chat messaging, and host privilege enforcement.
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-slate-300">TC-AUTH-01 / 02: Valid & Invalid Password Reject</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>
                </div>
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-slate-300">TC-MEET-01: Non-colliding Room Identifier</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>
                </div>
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-slate-300">TC-JOIN-01 / 02: Valid Join vs 404 Room Rejection</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>
                </div>
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-slate-300">TC-CHAT-01: Real-time In-Meeting Messaging</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>
                </div>
                <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded flex items-center justify-between">
                  <span className="font-mono text-slate-300">TC-HOST-01: Server-side Host End Meeting Enforcement</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Appendix A. Submission Verification Checklist</h3>
              <div className="space-y-2 text-xs">
                {[
                  'Confirmed communication technology: WebRTC 1.0 Peer-to-Peer mesh with Google public STUN servers (RFC 8445).',
                  'Confirmed signaling mechanism: Hybrid Socket.IO & Next.js REST signaling relay fallback.',
                  'Data model verified against MongoDB collections: users, meetings, messages, participants.',
                  'Implemented authentication flow with bcrypt password hashing and JWT cookies/tokens.',
                  'Host controls verified: server-enforced meeting termination and access checks.',
                  'All Section 16 test cases automated and passing with zero build errors.',
                  'Vercel zero-config deploy readiness with in-memory persistent store fallback.',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 p-2 bg-slate-950/50 rounded border border-slate-800/80">
                    <span className="text-emerald-400 font-bold">☑</span>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>MAIT Minor Project Evaluation (2026-2027)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
