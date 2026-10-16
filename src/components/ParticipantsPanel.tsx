'use client';

import React, { useState } from 'react';
import { X, Users, Crown, Mic, MicOff, Video, VideoOff, Copy, Check, UserX, VolumeX } from 'lucide-react';
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
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 sm:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Participants</h3>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Invite Link Quick Bar */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          Room Code: <span className="font-mono text-white font-bold">{meetingCode}</span>
        </div>
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        
        {/* Local User Tile */}
        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {currentDisplayName ? currentDisplayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-white">{currentDisplayName}</span>
                <span className="text-[10px] text-slate-400">(You)</span>
                {isHost && (
                  <span className="text-amber-400 flex items-center text-[10px]">
                    <Crown className="w-3 h-3 mr-0.5" /> Host
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-400">
            {localAudioMuted ? (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
            )}
            {localVideoOff ? (
              <VideoOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Video className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Remote Peers */}
        {remotePeers.map((peer) => (
          <div
            key={peer.peerId}
            className="flex items-center justify-between p-2.5 bg-slate-950/30 border border-slate-800/60 rounded-xl hover:border-slate-700 transition"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                {peer.displayName ? peer.displayName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <span className="font-semibold text-slate-200">{peer.displayName}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-slate-400">
                {peer.isAudioMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {peer.isVideoOff ? (
                  <VideoOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>

              {/* Host moderation tools */}
              {isHost && (
                <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
                  {onMuteParticipant && (
                    <button
                      onClick={() => onMuteParticipant(peer.peerId)}
                      className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800 transition"
                      title="Mute participant"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onKickParticipant && (
                    <button
                      onClick={() => onKickParticipant(peer.peerId)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
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

      {/* Host Action Bar */}
      {isHost && onMuteAll && (
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onMuteAll}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
          >
            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            <span>Mute All Participants</span>
          </button>
        </div>
      )}

    </aside>
  );
}
