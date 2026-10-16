'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Info, ShieldCheck, Lock, Hash } from 'lucide-react';
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
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <aside className="w-80 sm:w-88 h-full bg-[#16181f] border-l border-[#242732] flex flex-col z-30 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#242732] bg-[#16181f]">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-slate-300" />
          <h3 className="text-xs font-semibold text-[#f8fafc] tracking-tight">Meeting Details</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        
        {/* Title & Host Card */}
        <div className="p-3.5 rounded-lg bg-[#1e212b] border border-[#242732] space-y-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Topic</span>
          <h4 className="text-sm font-semibold text-[#f8fafc]">{meeting.title}</h4>
          <p className="text-slate-400 text-xs">Organized by <span className="text-slate-200 font-medium">{meeting.hostName}</span></p>
        </div>

        {/* Meeting ID */}
        <div className="p-3.5 rounded-lg bg-[#1e212b] border border-[#242732] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Hash className="w-3 h-3 text-slate-400" />
              <span>Meeting Code</span>
            </span>
          </div>
          <p className="font-mono text-base font-bold text-[#f8fafc] tracking-wider">{meeting.meetingCode}</p>
        </div>

        {/* Passcode if set */}
        {meeting.settings.requirePasscode && meeting.passcode && (
          <div className="p-3.5 rounded-lg bg-[#1e212b] border border-[#242732] space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Room Passcode</span>
            </span>
            <p className="font-mono text-xs font-semibold text-[#f8fafc]">{meeting.passcode}</p>
          </div>
        )}

        {/* Share Link Card */}
        <div className="p-3.5 rounded-lg bg-[#1e212b] border border-[#242732] space-y-2.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Invite Link</span>
          <div className="p-2.5 bg-[#0e1015] rounded-md border border-[#242732] font-mono text-[11px] text-slate-300 break-all select-all">
            {inviteUrl}
          </div>
          <button
            onClick={handleCopy}
            className="w-full py-2 bg-[#2563eb] hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-xs rounded-md transition flex items-center justify-center space-x-2"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Meeting Link'}</span>
          </button>
        </div>

        {/* Security Note */}
        <div className="p-3 rounded-lg bg-[#1e212b] border border-[#242732] text-[11px] text-slate-400 flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Direct peer-to-peer WebRTC encrypted via DTLS-SRTP.</span>
        </div>

      </div>

    </aside>
  );
}
