'use client';

import React, { useEffect } from 'react';
import {
  X,
  MessageSquare,
  Users,
  Info,
} from 'lucide-react';
import { IMeeting, IMessage, IPeerConnection } from '@/lib/types';
import ChatPanel from './ChatPanel';
import ParticipantsPanel from './ParticipantsPanel';
import InfoPanel from './InfoPanel';

interface FloatingSidebarProps {
  activePanel: 'chat' | 'participants' | 'info';
  onSwitchPanel: (panel: 'chat' | 'participants' | 'info') => void;
  onClose: () => void;
  // Chat props
  messages: IMessage[];
  currentUserId: string;
  clientSessionId?: string;
  currentDisplayName: string;
  onSendMessage: (text: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  unreadCount?: number;
  // Participants props
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
  // Info props
  meeting: IMeeting;
  className?: string;
}

export default function FloatingSidebar({
  activePanel,
  onSwitchPanel,
  onClose,
  messages,
  currentUserId,
  clientSessionId,
  currentDisplayName,
  onSendMessage,
  onReactToMessage,
  unreadCount = 0,
  isHost,
  localAudioMuted,
  localVideoOff,
  localHandRaised,
  remotePeers,
  remoteHands,
  meetingCode,
  onMuteParticipant,
  onKickParticipant,
  onMuteAll,
  meeting,
  className = '',
}: FloatingSidebarProps) {
  // Allow closing via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const totalParticipantCount = 1 + remotePeers.length;

  return (
    <aside
      role="complementary"
      aria-label="Meeting sidebar"
      className={`relative h-full w-full surface-floating-panel rounded-2xl flex flex-col overflow-hidden border border-[#242732] shadow-xl ${className}`}
    >
      {/* Floating Header with Section Switcher Tabs & Close Button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#242732] bg-[#16181f]/95 shrink-0 select-none">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 p-0.5 bg-[#101217] rounded-lg border border-[#242732]">
          {/* Participants Tab */}
          <button
            type="button"
            onClick={() => onSwitchPanel('participants')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition active:scale-95 ${
              activePanel === 'participants'
                ? 'bg-[#1e212b] text-[#f8fafc] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#16181f]'
            }`}
            title="View participants"
          >
            <Users className="w-3.5 h-3.5" />
            <span>People</span>
            <span className="text-[10px] font-semibold text-slate-300 bg-[#262a36] px-1.5 py-0.2 rounded-full">
              {totalParticipantCount}
            </span>
          </button>

          {/* Chat Tab */}
          <button
            type="button"
            onClick={() => onSwitchPanel('chat')}
            className={`relative flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition active:scale-95 ${
              activePanel === 'chat'
                ? 'bg-[#1e212b] text-[#f8fafc] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#16181f]'
            }`}
            title="Open meeting chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
            {unreadCount > 0 && activePanel !== 'chat' ? (
              <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
            ) : messages.length > 0 ? (
              <span className="text-[10px] font-medium text-slate-400 bg-[#262a36] px-1.5 py-0.2 rounded-full">
                {messages.length}
              </span>
            ) : null}
          </button>

          {/* Details / Info Tab */}
          <button
            type="button"
            onClick={() => onSwitchPanel('info')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition active:scale-95 ${
              activePanel === 'info'
                ? 'bg-[#1e212b] text-[#f8fafc] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#16181f]'
            }`}
            title="Meeting details and invite info"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Info</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md border border-transparent hover:border-[#242732] transition active:scale-95 ml-2"
          title="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Content Panel based on active selection */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activePanel === 'chat' && (
          <ChatPanel
            messages={messages}
            currentUserId={currentUserId}
            clientSessionId={clientSessionId}
            currentDisplayName={currentDisplayName}
            onSendMessage={onSendMessage}
            onReactToMessage={onReactToMessage}
            onClose={onClose}
            hideHeader={true}
          />
        )}

        {activePanel === 'participants' && (
          <ParticipantsPanel
            currentUserId={currentUserId}
            currentDisplayName={currentDisplayName}
            isHost={isHost}
            localAudioMuted={localAudioMuted}
            localVideoOff={localVideoOff}
            localHandRaised={localHandRaised}
            remotePeers={remotePeers}
            remoteHands={remoteHands}
            meetingCode={meetingCode}
            onMuteParticipant={onMuteParticipant}
            onKickParticipant={onKickParticipant}
            onMuteAll={onMuteAll}
            onClose={onClose}
            hideHeader={true}
          />
        )}

        {activePanel === 'info' && (
          <InfoPanel
            meeting={meeting}
            onClose={onClose}
            hideHeader={true}
          />
        )}
      </div>
    </aside>
  );
}
