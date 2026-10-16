'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  Smile,
  Users,
  MessageSquare,
  PhoneOff,
  Info,
  Hand,
} from 'lucide-react';

interface MeetingControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  participantCount: number;
  unreadCount: number;
  activePanel: 'none' | 'chat' | 'participants' | 'info';
  isHandRaised?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onTogglePanel: (panel: 'chat' | 'participants' | 'info') => void;
  onSendReaction?: (emoji: string) => void;
  onToggleHandRaise?: () => void;
  onLeaveMeeting: () => void;
  onEndMeetingForAll?: () => void;
}

const QUICK_REACTIONS = [
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Joy' },
  { emoji: '🎉', label: 'Celebrate' },
];

export default function MeetingControls({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  isHost,
  participantCount,
  unreadCount,
  activePanel,
  isHandRaised = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onTogglePanel,
  onSendReaction,
  onToggleHandRaise,
  onLeaveMeeting,
  onEndMeetingForAll,
}: MeetingControlsProps) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const reactionsRef = useRef<HTMLDivElement | null>(null);

  // Close reactions popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (reactionsRef.current && !reactionsRef.current.contains(e.target as Node)) {
        setShowReactions(false);
      }
    };
    if (showReactions) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showReactions]);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-center justify-center pointer-events-none select-none">
        <div className="surface-dock px-3 py-2 flex items-center space-x-2 sm:space-x-2.5 pointer-events-auto relative">
          {/* Microphone */}
          <button
            onClick={onToggleAudio}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
              isAudioMuted
                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Camera */}
          <button
            onClick={onToggleVideo}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
              isVideoOff
                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title={isVideoOff ? 'Start camera' : 'Stop camera'}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
          </button>

          <div className="w-[1px] h-5 bg-[#2a2d38] mx-0.5" />

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
              isScreenSharing
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <MonitorUp className="w-4 h-4" />
          </button>

          {/* Meeting Reactions Popover & Trigger */}
          <div className="relative" ref={reactionsRef}>
            {showReactions && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#16181f] border border-[#2a2d38] rounded-xl p-2 shadow-2xl flex flex-col space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Emoji Row */}
                <div className="flex items-center space-x-1.5">
                  {QUICK_REACTIONS.map((item) => (
                    <button
                      key={item.emoji}
                      onClick={() => {
                        if (onSendReaction) onSendReaction(item.emoji);
                        setShowReactions(false);
                      }}
                      className="w-9 h-9 rounded-lg hover:bg-[#2563eb]/20 hover:scale-115 active:scale-95 text-lg flex items-center justify-center transition"
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>

                {/* Raise / Lower Hand Button */}
                {onToggleHandRaise && (
                  <button
                    onClick={() => {
                      onToggleHandRaise();
                      setShowReactions(false);
                    }}
                    className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center space-x-1.5 transition active:scale-95 ${
                      isHandRaised
                        ? 'bg-[#f59e0b]/20 border-[#f59e0b]/50 text-[#fef3c7] hover:bg-[#f59e0b]/30'
                        : 'bg-[#1e212b] border-[#2a2d38] text-slate-200 hover:bg-[#262a36]'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setShowReactions((prev) => !prev)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
                showReactions || isHandRaised
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
              }`}
              title="Meeting reactions"
            >
              {isHandRaised ? <Hand className="w-4 h-4 text-amber-300" /> : <Smile className="w-4 h-4" />}
            </button>
          </div>

          {/* Chat */}
          <button
            onClick={() => onTogglePanel('chat')}
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
              activePanel === 'chat'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && activePanel !== 'chat' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563eb]" />
            )}
          </button>

          {/* Participants */}
          <button
            onClick={() => onTogglePanel('participants')}
            className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
              activePanel === 'participants'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title="Participants"
          >
            <Users className="w-4 h-4" />
            {participantCount > 1 && (
              <span className="absolute -top-1 -right-1 px-1 bg-[#282b37] text-[#f1f2f4] text-[10px] font-medium rounded-full border border-[#3b3f4d]">
                {participantCount}
              </span>
            )}
          </button>

          {/* Meeting Info */}
          <button
            onClick={() => onTogglePanel('info')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
              activePanel === 'info'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title="Meeting details"
          >
            <Info className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-[#2a2d38] mx-0.5" />

          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="h-10 px-3.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white text-xs font-medium rounded-lg transition flex items-center space-x-1.5 shrink-0"
            title="Leave meeting"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </footer>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150">
          <div className="surface-modal rounded-xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl border border-[#242732]">
            <h3 className="text-sm font-semibold text-[#f8fafc]">Leave Meeting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to exit? You can re-join anytime using the meeting code.
            </p>

            <div className="flex flex-col space-y-2 pt-2">
              {isHost && onEndMeetingForAll && (
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    onEndMeetingForAll();
                  }}
                  className="w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-lg transition"
                >
                  End Meeting for All
                </button>
              )}

              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeaveMeeting();
                }}
                className="w-full py-2 bg-[#1e212b] hover:bg-[#282b37] text-white text-xs font-medium rounded-lg border border-[#2a2d38] transition"
              >
                Leave Meeting
              </button>

              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-2 text-slate-400 hover:text-white text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
