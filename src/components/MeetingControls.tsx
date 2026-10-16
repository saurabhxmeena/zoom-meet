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
  SwitchCamera,
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
  onFlipCamera?: () => void;
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
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '🙌', label: 'Hooray' },
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
  onFlipCamera,
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
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close reactions popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        reactionsRef.current &&
        !reactionsRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setShowReactions(false);
      }
    };
    if (showReactions) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showReactions]);

  return (
    <>
      <footer className={`fixed bottom-0 left-0 right-0 z-30 p-2 sm:p-5 pb-safe flex items-center justify-center pointer-events-none select-none transition-opacity duration-200 ${activePanel !== 'none' ? 'max-sm:opacity-0 max-sm:pointer-events-none max-sm:h-0' : 'opacity-100'}`}>
        <div className="surface-dock px-2 sm:px-3 py-1.5 sm:py-2 flex items-center space-x-1 sm:space-x-2 pointer-events-auto relative max-w-[calc(100vw-0.75rem)] overflow-x-auto sm:overflow-visible no-scrollbar shadow-2xl">
          {/* Microphone */}
          <button
            type="button"
            onClick={onToggleAudio}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${
              isAudioMuted
                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Camera */}
          <button
            type="button"
            onClick={onToggleVideo}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${
              isVideoOff
                ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title={isVideoOff ? 'Start camera' : 'Stop camera'}
          >
            {isVideoOff ? <VideoOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VideoIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Flip Camera (Front / Back) - Especially handy for smartphones */}
          {onFlipCamera && !isVideoOff && (
            <button
              type="button"
              onClick={onFlipCamera}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]"
              title="Flip camera (front / back)"
            >
              <SwitchCamera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8e929b] hover:text-[#f1f2f4]" />
            </button>
          )}

          {/* Screen Share (Desktop only - mobile browsers do not support getDisplayMedia) */}
          <div className="hidden sm:flex items-center space-x-1 sm:space-x-2">
            <div className="w-[1px] h-4 sm:h-5 bg-[#2a2d38] mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${
                isScreenSharing
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
              }`}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
              <MonitorUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Meeting Reactions Popover & Trigger */}
          <div className="relative shrink-0" ref={reactionsRef}>
            {showReactions && (
              <div
                ref={popoverRef}
                className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 bg-[#16181f]/95 border border-[#2a2d38] backdrop-blur-md rounded-2xl p-2.5 shadow-2xl flex flex-col space-y-2 z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 w-max max-w-[92vw]"
              >
                {/* Emoji Row */}
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  {QUICK_REACTIONS.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSendReaction) onSendReaction(item.emoji);
                        setShowReactions(false);
                      }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-[#2563eb]/20 hover:scale-120 active:scale-90 text-lg sm:text-xl flex items-center justify-center transition-transform shrink-0"
                      title={item.label}
                    >
                      <span>{item.emoji}</span>
                    </button>
                  ))}
                </div>

                {/* Raise / Lower Hand Button */}
                {onToggleHandRaise && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHandRaise();
                      setShowReactions(false);
                    }}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-medium border flex items-center justify-center space-x-2 transition active:scale-95 ${
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
              type="button"
              onClick={() => setShowReactions((prev) => !prev)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 ${
                showReactions || isHandRaised
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
              }`}
              title="Meeting reactions"
            >
              {isHandRaised ? <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" /> : <Smile className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          </div>

          {/* Chat */}
          <button
            onClick={() => onTogglePanel('chat')}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${
              activePanel === 'chat'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadCount > 0 && activePanel !== 'chat' && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#2563eb]" />
            )}
          </button>

          {/* Participants */}
          <button
            onClick={() => onTogglePanel('participants')}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${
              activePanel === 'participants'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title="Participants"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {participantCount > 1 && (
              <span className="absolute -top-1 -right-1 px-1 bg-[#282b37] text-[#f1f2f4] text-[9px] sm:text-[10px] font-medium rounded-full border border-[#3b3f4d]">
                {participantCount}
              </span>
            )}
          </button>

          {/* Meeting Info */}
          <button
            onClick={() => onTogglePanel('info')}
            className={`hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center transition active:scale-95 shrink-0 ${
              activePanel === 'info'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#1e212b] text-[#f1f2f4] hover:bg-[#282b37] border border-[#2a2d38]'
            }`}
            title="Meeting details"
          >
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="w-[1px] h-4 sm:h-5 bg-[#2a2d38] mx-0.5 shrink-0" />

          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white text-xs font-medium rounded-lg transition flex items-center space-x-1.5 shrink-0"
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
