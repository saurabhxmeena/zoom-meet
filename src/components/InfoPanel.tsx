'use client';

import React, { useState } from 'react';
import { X, Shield, Copy, Check, Lock, Radio, Globe } from 'lucide-react';
import { IMeeting } from '@/lib/types';

interface InfoPanelProps {
  meeting: IMeeting;
  onClose: () => void;
}

export default function InfoPanel({ meeting, onClose }: InfoPanelProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/meet/${meeting.meetingCode}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 sm:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Meeting Information</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        
        {/* Topic */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Topic</span>
          <h4 className="text-sm font-bold text-white">{meeting.title}</h4>
          <p className="text-slate-400 text-[11px]">Host: {meeting.hostName}</p>
        </div>

        {/* Meeting ID */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Meeting ID</span>
          <div className="font-mono text-base font-bold text-blue-400 tracking-wider">
            {meeting.meetingCode}
          </div>
        </div>

        {/* Passcode if present */}
        {meeting.settings.requirePasscode && meeting.passcode && (
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" /> Passcode
            </span>
            <div className="font-mono text-sm font-bold text-amber-300">
              {meeting.passcode}
            </div>
          </div>
        )}

        {/* Invite Link */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Invitation Link</span>
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] break-all select-all">
            {inviteUrl}
          </div>
          <button
            onClick={handleCopy}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Invitation Link'}</span>
          </button>
        </div>

        {/* Encryption & Protocols */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-[11px] text-slate-400">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" /> Security & Protocols
          </span>
          <p>• WebRTC (RFC 8825) Peer-to-Peer Encryption</p>
          <p>• STUN Server: <span className="font-mono text-slate-300">stun.l.google.com:19302</span></p>
          <p>• Department of IT - MAIT 7th Semester Project</p>
        </div>

      </div>

    </aside>
  );
}
