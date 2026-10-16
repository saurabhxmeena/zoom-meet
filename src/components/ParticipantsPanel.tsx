'use client';

import React, { useState } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Copy,
  Check,
  VolumeX,
  UserX,
  Crown,
  Users,
  Search,
} from 'lucide-react';
import { IPeerConnection } from '@/lib/types';

interface ParticipantsPanelProps {
  currentUserId: string;
  currentDisplayName: string;
  isHost: boolean;
  localAudioMuted: boolean;
  localVideoOff: boolean;
  localHandRaised?: boolean;
  remotePeers: IPeerConnection[];
  remoteHands?: Map<string, boolean>;
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
  localHandRaised = false,
  remotePeers,
  remoteHands = new Map(),
  meetingCode,
  onMuteParticipant,
  onKickParticipant,
  onMuteAll,
  onClose,
}: ParticipantsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const totalCount = 1 + remotePeers.length;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/meet/${meetingCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const filteredPeers = remotePeers.filter((p) =>
    p.displayName.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <aside className="w-80 sm:w-88 h-full bg-[#16181f] border-l border-[#242732] flex flex-col z-30 shadow-2xl select-none animate-in slide-in-from-right-4 duration-200">
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
          title="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Invite bar */}
      <div className="p-3 border-b border-[#242732] bg-[#12141a] flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
            Meeting ID
          </span>
          <span className="text-xs font-mono text-slate-300 truncate block">
            {meetingCode}
          </span>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#1e212b] hover:bg-[#262a36] active:scale-95 text-slate-200 rounded-md text-xs font-medium border border-[#2a2d38] transition shrink-0"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{copied ? 'Copied' : 'Invite Link'}</span>
        </button>
      </div>

      {/* Search Input (shown when 3+ participants) */}
      {totalCount >= 3 && (
        <div className="p-2.5 border-b border-[#242732] bg-[#16181f]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participants..."
              className="w-full bg-[#101217] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#f8fafc] placeholder-slate-500 transition"
            />
          </div>
        </div>
      )}

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {/* Local user card */}
        <div className="p-2.5 rounded-lg bg-[#1e212b]/80 border border-[#242732] flex items-center justify-between hover:bg-[#1e212b] transition">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs font-semibold shrink-0 shadow">
              {currentDisplayName ? currentDisplayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-[#f8fafc] font-medium truncate">
                  {currentDisplayName}
                </span>
                <span className="text-[10px] text-blue-400 font-medium shrink-0">
                  (You)
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {isHost && (
                  <span className="inline-flex items-center space-x-0.5 text-[10px] text-amber-400 font-medium">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Host</span>
                  </span>
                )}
                {localHandRaised && (
                  <span className="inline-flex items-center space-x-0.5 text-[10px] text-amber-300 bg-amber-500/20 px-1 rounded">
                    <span>✋ Hand Raised</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-slate-400 shrink-0">
            <div
              className={`p-1.5 rounded-md ${
                localAudioMuted
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
              title={localAudioMuted ? 'Muted' : 'Microphone on'}
            >
              {localAudioMuted ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </div>
            <div
              className={`p-1.5 rounded-md ${
                localVideoOff
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-slate-500/10 text-slate-300'
              }`}
              title={localVideoOff ? 'Camera off' : 'Camera on'}
            >
              {localVideoOff ? (
                <VideoOff className="w-3.5 h-3.5" />
              ) : (
                <Video className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        </div>

        {/* Remote participants */}
        {filteredPeers.map((peer) => {
          const isPeerHandRaised = !!remoteHands.get(peer.peerId);

          return (
            <div
              key={peer.peerId}
              className="p-2.5 rounded-lg bg-[#14161c] hover:bg-[#1a1d26] border border-[#242732]/70 flex items-center justify-between transition group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#1e212b] border border-[#2a2d38] text-slate-200 flex items-center justify-center text-xs font-semibold shrink-0">
                  {peer.displayName ? peer.displayName.charAt(0).toUpperCase() : 'P'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[#f8fafc] font-medium truncate block">
                      {peer.displayName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-500">Connected</span>
                    {isPeerHandRaised && (
                      <span className="inline-flex items-center space-x-0.5 text-[10px] text-amber-300 bg-amber-500/20 px-1 rounded">
                        <span>✋ Raised Hand</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-slate-400 shrink-0">
                <div
                  className={`p-1.5 rounded-md ${
                    peer.isAudioMuted
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                  title={peer.isAudioMuted ? 'Muted' : 'Microphone on'}
                >
                  {peer.isAudioMuted ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`p-1.5 rounded-md ${
                    peer.isVideoOff
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-slate-500/10 text-slate-300'
                  }`}
                  title={peer.isVideoOff ? 'Camera off' : 'Camera on'}
                >
                  {peer.isVideoOff ? (
                    <VideoOff className="w-3.5 h-3.5" />
                  ) : (
                    <Video className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Host Moderation Controls */}
                {isHost && (
                  <div className="flex items-center space-x-1 pl-1 opacity-0 group-hover:opacity-100 transition">
                    {onMuteParticipant && (
                      <button
                        onClick={() => onMuteParticipant(peer.peerId)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-[#242732] rounded-md transition"
                        title="Mute participant"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onKickParticipant && (
                      <button
                        onClick={() => onKickParticipant(peer.peerId)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#242732] rounded-md transition"
                        title="Remove from meeting"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state if search yields no results */}
        {filteredPeers.length === 0 && search.trim() && (
          <div className="py-6 text-center text-slate-500 text-xs">
            No participants matching &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Host Mute All Action */}
      {isHost && onMuteAll && remotePeers.length > 0 && (
        <div className="p-3 border-t border-[#242732] bg-[#16181f]">
          <button
            onClick={onMuteAll}
            className="w-full py-2 bg-[#1e212b] hover:bg-[#262a36] active:scale-[0.98] text-slate-200 text-xs font-semibold rounded-lg border border-[#2a2d38] transition flex items-center justify-center space-x-1.5"
          >
            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            <span>Mute All Participants</span>
          </button>
        </div>
      )}
    </aside>
  );
}
