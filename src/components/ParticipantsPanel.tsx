'use client';

import React, { useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Copy, Check, VolumeX, UserX } from 'lucide-react';
import { IPeerConnection } from '@/lib/types';

interface ParticipantsPanelProps {
  currentUserId: string;
  currentDisplayName: string;
  isHost: boolean;
  localAudioMuted: boolean;
  localVideoOff: boolean;
  remotePeers: IPeerConnection[];
  meetingCode: string;
  onMuteParticipant?: (peerId: string) => void;
  onKickParticipant?: (peerId: string) => void;
  onMuteAll?: () => void;
  onClose: () => void;
}

export default function ParticipantsPanel({
  currentUserId,
  currentDisplayName,
  isHost,
  localAudioMuted,
  localVideoOff,
  remotePeers,
  meetingCode,
  onMuteParticipant,
  onKickParticipant,
  onMuteAll,
  onClose,
}: ParticipantsPanelProps) {
  const [copied, setCopied] = useState(false);
  const totalCount = 1 + remotePeers.length;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/meet/${meetingCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <aside className="w-80 sm:w-88 h-full bg-[#161618] border-l border-white/[0.06] flex flex-col z-30 shadow-2xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-xs font-semibold text-[#f5f5f7] tracking-tight">
          Participants ({totalCount})
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-[#86868b] hover:text-[#f5f5f7] rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Copy link bar */}
      <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[11px] font-mono text-[#86868b]">
          {meetingCode}
        </span>
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#f5f5f7] rounded-lg text-xs transition"
        >
          {copied ? <Check className="w-3 h-3 text-[#30d158]" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
        
        {/* Local user */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#1c1c1e] border border-white/[0.08] flex items-center justify-center text-xs font-medium text-[#86868b]">
              {currentDisplayName ? currentDisplayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <span className="text-[#f5f5f7] truncate">{currentDisplayName}</span>
              <span className="text-[11px] text-[#86868b] ml-1.5 font-normal">(You)</span>
              {isHost && <span className="text-[11px] text-[#86868b] ml-1">• Host</span>}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[#86868b]">
            {localAudioMuted ? <MicOff className="w-3.5 h-3.5 text-[#ff453a]" /> : <Mic className="w-3.5 h-3.5" />}
            {localVideoOff ? <VideoOff className="w-3.5 h-3.5 text-[#ff453a]" /> : <Video className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Remote peers */}
        {remotePeers.map((peer) => (
          <div
            key={peer.peerId}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition group"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#1c1c1e] border border-white/[0.08] flex items-center justify-center text-xs font-medium text-[#86868b]">
                {peer.displayName ? peer.displayName.charAt(0).toUpperCase() : 'P'}
              </div>
              <span className="text-[#f5f5f7] truncate">{peer.displayName}</span>
            </div>

            <div className="flex items-center space-x-2 text-[#86868b]">
              {peer.isAudioMuted ? <MicOff className="w-3.5 h-3.5 text-[#ff453a]" /> : <Mic className="w-3.5 h-3.5" />}
              {peer.isVideoOff ? <VideoOff className="w-3.5 h-3.5 text-[#ff453a]" /> : <Video className="w-3.5 h-3.5" />}

              {isHost && (
                <div className="flex items-center space-x-1 pl-1 opacity-0 group-hover:opacity-100 transition">
                  {onMuteParticipant && (
                    <button
                      onClick={() => onMuteParticipant(peer.peerId)}
                      className="p-1 hover:text-[#ff9f0a] rounded transition"
                      title="Mute"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onKickParticipant && (
                    <button
                      onClick={() => onKickParticipant(peer.peerId)}
                      className="p-1 hover:text-[#ff453a] rounded transition"
                      title="Remove"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Host Mute All */}
      {isHost && onMuteAll && (
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={onMuteAll}
            className="w-full py-2 bg-white/[0.06] hover:bg-white/[0.1] text-[#f5f5f7] text-xs font-medium rounded-xl transition"
          >
            Mute All
          </button>
        </div>
      )}

    </aside>
  );
}
