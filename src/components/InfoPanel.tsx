'use client';

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
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
    <aside className="w-80 sm:w-88 h-full bg-[#161618] border-l border-white/[0.06] flex flex-col z-30 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-xs font-semibold text-[#f5f5f7] tracking-tight">Meeting Details</h3>
        <button
          onClick={onClose}
          className="p-1 text-[#86868b] hover:text-[#f5f5f7] rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        
        {/* Title & Host */}
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-[#86868b]">Topic</span>
          <p className="text-sm font-medium text-[#f5f5f7]">{meeting.title}</p>
          <p className="text-[#86868b] text-xs">Hosted by {meeting.hostName}</p>
        </div>

        {/* Meeting ID */}
        <div className="space-y-1 pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] font-medium text-[#86868b]">Meeting Code</span>
          <p className="font-mono text-sm font-semibold text-[#f5f5f7]">{meeting.meetingCode}</p>
        </div>

        {/* Passcode if set */}
        {meeting.settings.requirePasscode && meeting.passcode && (
          <div className="space-y-1 pt-3 border-t border-white/[0.04]">
            <span className="text-[11px] font-medium text-[#86868b]">Passcode</span>
            <p className="font-mono text-xs text-[#f5f5f7]">{meeting.passcode}</p>
          </div>
        )}

        {/* Share Link */}
        <div className="space-y-2 pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] font-medium text-[#86868b]">Invite Link</span>
          <div className="p-2.5 bg-black rounded-xl border border-white/[0.06] font-mono text-[11px] text-[#86868b] break-all select-all">
            {inviteUrl}
          </div>
          <button
            onClick={handleCopy}
            className="w-full py-2 bg-white/[0.08] hover:bg-white/[0.14] text-[#f5f5f7] font-medium text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to clipboard' : 'Copy link'}</span>
          </button>
        </div>

      </div>

    </aside>
  );
}
