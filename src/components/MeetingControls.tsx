'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Share2,
  Users,
  MessageSquare,
  Smile,
  PhoneOff,
  Shield,
  Copy,
  Check,
  ChevronUp,
  Settings,
  Sparkles,
} from 'lucide-react';

interface MeetingControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  participantCount: number;
  unreadCount: number;
  activePanel: 'none' | 'chat' | 'participants' | 'info';
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onTogglePanel: (panel: 'chat' | 'participants' | 'info') => void;
  onSendReaction: (emoji: string) => void;
  onLeaveMeeting: () => void;
  onEndMeetingForAll?: () => void;
  onOpenSettings?: () => void;
}

const EMOJI_REACTIONS = ['👏', '❤️', '👍', '🙋‍♂️', '🎉', '😂', '🔥'];

export default function MeetingControls({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  isHost,
  participantCount,
  unreadCount,
  activePanel,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onTogglePanel,
  onSendReaction,
  onLeaveMeeting,
  onEndMeetingForAll,
  onOpenSettings,
}: MeetingControlsProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-4 flex items-center justify-center pointer-events-none">
        <div className="glass-toolbar px-4 py-2.5 rounded-2xl flex items-center space-x-2 sm:space-x-3 pointer-events-auto shadow-2xl">
          
          {/* Microphone */}
          <button
            onClick={onToggleAudio}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
              isAudioMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
            }`}
            title={isAudioMuted ? 'Unmute (Cmd/Ctrl + D)' : 'Mute'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Camera */}
          <button
            onClick={onToggleVideo}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
              isVideoOff
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
            }`}
            title={isVideoOff ? 'Start Video (Cmd/Ctrl + E)' : 'Stop Video'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            <span className="text-[10px] mt-0.5">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>

          <div className="w-[1px] h-8 bg-slate-800 mx-1 hidden sm:block" />

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
              isScreenSharing
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/50'
                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Share2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>

          {/* Participants */}
          <button
            onClick={() => onTogglePanel('participants')}
            className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
              activePanel === 'participants'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
            }`}
            title="Participants"
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">People</span>
            {participantCount > 0 && (
              <span className="absolute top-1 right-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                {participantCount}
              </span>
            )}
          </button>

          {/* Chat */}
          <button
            onClick={() => onTogglePanel('chat')}
            className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
              activePanel === 'chat'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
            }`}
            title="In-Meeting Chat"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Chat</span>
            {unreadCount > 0 && activePanel !== 'chat' && (
              <span className="absolute top-1 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Reactions Popover */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
                showReactions
                  ? 'bg-slate-700 text-amber-400'
                  : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
              }`}
              title="Send Reaction"
            >
              <Smile className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">React</span>
            </button>

            {showReactions && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-2 rounded-2xl shadow-2xl flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-150">
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactions(false);
                    }}
                    className="p-2 text-xl hover:scale-125 transition-transform duration-150 rounded-xl hover:bg-slate-800"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info & Invite Link */}
          <button
            onClick={() => onTogglePanel('info')}
            className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition ${
              activePanel === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
            }`}
            title="Meeting Details & Invite"
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Info</span>
          </button>

          <div className="w-[1px] h-8 bg-slate-800 mx-1 hidden sm:block" />

          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex flex-col items-center justify-center px-4 h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 transition group"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] mt-0.5 font-semibold">End</span>
          </button>
        </div>
      </footer>

      {/* Leave / End Meeting Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Leave or End Meeting</h3>
            <p className="text-xs text-slate-400">
              {isHost
                ? 'As the host, you can end the meeting for all participants or leave while allowing others to continue.'
                : 'Are you sure you want to exit this meeting?'}
            </p>

            <div className="space-y-2 pt-2">
              {isHost && onEndMeetingForAll && (
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    onEndMeetingForAll();
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-red-600/25 transition"
                >
                  End Meeting for All (FR-07)
                </button>
              )}

              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeaveMeeting();
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition"
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
