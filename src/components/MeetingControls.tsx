'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
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
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:p-5 flex items-center justify-center pointer-events-none select-none">
        <div className="surface-dock px-3 py-2 flex items-center space-x-2 sm:space-x-2.5 pointer-events-auto">
          
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
            className="h-10 px-3.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white rounded-lg transition flex items-center space-x-1.5 text-xs font-medium"
            title="Leave meeting"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>

        </div>
      </footer>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="surface-modal p-6 max-w-sm w-full space-y-4">
            
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#f1f2f4]">
                Leave Meeting
              </h3>
              <p className="text-xs text-[#8e929b] leading-relaxed">
                {isHost
                  ? 'As the meeting host, you can end this session for all participants or simply leave the room.'
                  : 'Are you sure you want to leave this meeting?'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {isHost && onEndMeetingForAll && (
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    onEndMeetingForAll();
                  }}
                  className="w-full py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-medium rounded-lg transition"
                >
                  End Meeting for All
                </button>
              )}

              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  onLeaveMeeting();
                }}
                className="w-full py-2.5 bg-[#1e212b] hover:bg-[#282b37] text-[#f1f2f4] text-xs font-medium rounded-lg border border-[#2a2d38] transition"
              >
                Leave Meeting
              </button>

              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-2 text-[#8e929b] hover:text-[#f1f2f4] text-xs font-medium transition"
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
