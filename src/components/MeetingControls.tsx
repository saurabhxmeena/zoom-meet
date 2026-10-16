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
  PhoneOff,
  Info,
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
  onLeaveMeeting: () => void;
  onEndMeetingForAll?: () => void;
}

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
  onLeaveMeeting,
  onEndMeetingForAll,
}: MeetingControlsProps) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:p-6 flex items-center justify-center pointer-events-none">
        <div className="bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/[0.08] px-3 py-2 rounded-2xl flex items-center space-x-2 sm:space-x-3 pointer-events-auto shadow-2xl">
          
          {/* Microphone */}
          <button
            onClick={onToggleAudio}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isAudioMuted
                ? 'bg-[#ff453a] text-white hover:bg-[#d73a31]'
                : 'bg-white/[0.08] text-[#f5f5f7] hover:bg-white/[0.14]'
            }`}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Camera */}
          <button
            onClick={onToggleVideo}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isVideoOff
                ? 'bg-[#ff453a] text-white hover:bg-[#d73a31]'
                : 'bg-white/[0.08] text-[#f5f5f7] hover:bg-white/[0.14]'
            }`}
            title={isVideoOff ? 'Start video' : 'Stop video'}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
          </button>

          <div className="w-[1px] h-6 bg-white/[0.08] mx-0.5" />

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isScreenSharing
                ? 'bg-[#2997ff] text-white'
                : 'bg-white/[0.08] text-[#f5f5f7] hover:bg-white/[0.14]'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Chat */}
          <button
            onClick={() => onTogglePanel('chat')}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition ${
              activePanel === 'chat'
                ? 'bg-[#2997ff] text-white'
                : 'bg-white/[0.08] text-[#f5f5f7] hover:bg-white/[0.14]'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && activePanel !== 'chat' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2997ff]" />
            )}
          </button>

          {/* Participants */}
          <button
            onClick={() => onTogglePanel('participants')}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition ${
              activePanel === 'participants'
                ? 'bg-[#2997ff] text-white'
                : 'bg-white/[0.08] text-[#f5f5f7] hover:bg-white/[0.14]'
            }`}
            title="Participants"
          >
            <Users className="w-4 h-4" />
            {participantCount > 1 && (
              <span className="absolute -top-1 -right-1 px-1 bg-white/[0.16] text-[#f5f5f7] text-[10px] font-medium rounded-full">
                {participantCount}
              </span>
            )}
          </button>

          {/* Meeting Info */}
          <button
            onClick={() => onTogglePanel('info')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              activePanel === 'info'
                ? 'bg-[#2997ff] text-white'
                : 'bg-white/[0.08] text-[#f5f5f7] hover:bg-white/[0.14]'
            }`}
            title="Meeting details"
          >
            <Info className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-6 bg-white/[0.08] mx-0.5" />

          {/* Leave Button */}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="h-10 px-3.5 bg-[#ff453a] hover:bg-[#d73a31] active:scale-[0.98] text-white rounded-xl transition flex items-center space-x-1.5 text-xs font-medium"
            title="Leave meeting"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>

        </div>
      </footer>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-[#f5f5f7]">Leave Meeting</h3>
            <p className="text-xs text-[#86868b] leading-relaxed">
              {isHost
                ? 'As host, you can end this meeting for everyone or leave the room.'
                : 'Are you sure you want to leave this meeting?'}
            </p>

            <div className="space-y-2 pt-2">
              {isHost && onEndMeetingForAll && (
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    onEndMeetingForAll();
                  }}
                  className="w-full py-2.5 bg-[#ff453a] hover:bg-[#d73a31] text-white text-xs font-medium rounded-xl transition"
                >
                  End Meeting for All
                </button>
              )}

              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeaveMeeting();
                }}
                className="w-full py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-[#f5f5f7] text-xs font-medium rounded-xl transition"
              >
                Leave Meeting
              </button>

              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-2 text-[#86868b] hover:text-[#f5f5f7] text-xs transition"
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
