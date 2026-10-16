'use client';

import React, { useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Copy, Check, VolumeX, UserX, Crown, Users } from 'lucide-react';
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
    <aside className="w-80 sm:w-88 h-full bg-[#16181f] border-l border-[#242732] flex flex-col z-30 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#242732] bg-[#16181f]">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-slate-300" />
          <h3 className="text-xs font-semibold text-[#f8fafc] tracking-tight">
            Participants
          </h3>
          <span className="text-[10px] font-semibold text-slate-300 bg-[#1e212b] px-2 py-0.5 rounded border border-[#242732]">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Copy link bar */}
      <div className="p-3 border-b border-[#242732] bg-[#16181f] flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">
          {meetingCode}
        </span>
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#1e212b] hover:bg-[#242732] text-slate-200 rounded-md text-xs font-medium border border-[#242732] transition active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? 'Copied' : 'Invite Link'}</span>
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs">
        
        {/* Local user */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e212b] border border-[#242732]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {currentDisplayName ? currentDisplayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="text-[#f8fafc] font-medium truncate">{currentDisplayName}</span>
                <span className="text-[10px] text-slate-400 font-normal">(You)</span>
              </div>
              {isHost && (
                <div className="flex items-center space-x-1 text-[10px] text-amber-400 font-medium">
                  <Crown className="w-2.5 h-2.5" />
                  <span>Host</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1 text-slate-400 shrink-0">
            {localAudioMuted ? (
              <div className="p-1 rounded text-red-400">
                <MicOff className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="p-1 rounded text-emerald-400">
                <Mic className="w-3.5 h-3.5" />
              </div>
            )}
            {localVideoOff ? (
              <div className="p-1 rounded text-red-400">
                <VideoOff className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="p-1 rounded text-slate-400">
                <Video className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Remote peers */}
        {remotePeers.map((peer) => (
          <div
            key={peer.peerId}
            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1e212b] transition group"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#1e212b] border border-[#242732] text-[#f8fafc] flex items-center justify-center text-xs font-semibold shrink-0">
                {peer.displayName ? peer.displayName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="truncate">
                <span className="text-[#f8fafc] font-medium truncate block">{peer.displayName}</span>
                <span className="text-[10px] text-slate-400">Connected</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400 shrink-0">
              {peer.isAudioMuted ? (
                <div className="p-1 rounded text-red-400">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="p-1 rounded text-emerald-400">
                  <Mic className="w-3.5 h-3.5" />
                </div>
              )}
              {peer.isVideoOff ? (
                <div className="p-1 rounded text-red-400">
                  <VideoOff className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="p-1 rounded text-slate-400">
                  <Video className="w-3.5 h-3.5" />
                </div>
              )}

              {isHost && (
                <div className="flex items-center space-x-1 pl-1 opacity-0 group-hover:opacity-100 transition">
                  {onMuteParticipant && (
                    <button
                      onClick={() => onMuteParticipant(peer.peerId)}
                      className="p-1 hover:text-amber-400 hover:bg-[#242732] rounded transition"
                      title="Mute participant"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onKickParticipant && (
                    <button
                      onClick={() => onKickParticipant(peer.peerId)}
                      className="p-1 hover:text-red-400 hover:bg-[#242732] rounded transition"
                      title="Remove participant"
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
        <div className="p-3.5 border-t border-[#242732] bg-[#16181f]">
          <button
            onClick={onMuteAll}
            className="w-full py-2 bg-[#1e212b] hover:bg-[#242732] active:scale-[0.98] text-slate-200 text-xs font-semibold rounded-lg border border-[#242732] transition"
          >
            Mute All Participants
          </button>
        </div>
      )}

    </aside>
  );
}
