'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { IMeeting } from '@/lib/types';

interface ScheduleModalProps {
  onClose: () => void;
  onMeetingScheduled: (meeting: IMeeting) => void;
  defaultHostName?: string;
  defaultHostUserId?: string;
}

export default function ScheduleModal({
  onClose,
  onMeetingScheduled,
  defaultHostName = 'Host',
  defaultHostUserId = 'user_1',
}: ScheduleModalProps) {
  const [title, setTitle] = useState('New Meeting');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:00');
  const [passcode, setPasscode] = useState('');
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          hostUserId: defaultHostUserId,
          hostName: defaultHostName,
          passcode: requirePasscode ? passcode : '',
          settings: {
            allowScreenShare,
            muteOnEntry,
            chatEnabled: true,
            requirePasscode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule meeting');
      }

      onMeetingScheduled(data.meeting);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#f5f5f7]">Schedule Meeting</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#86868b] hover:text-[#f5f5f7] rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-[#ff453a]/10 border border-[#ff453a]/20 text-[#ff453a]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[#86868b] font-medium mb-1.5">Topic</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] transition"
              placeholder="Meeting topic"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#86868b] font-medium mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] transition"
              />
            </div>
            <div>
              <label className="block text-[#86868b] font-medium mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] transition"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[#86868b]">Require passcode</span>
              <input
                type="checkbox"
                checked={requirePasscode}
                onChange={(e) => setRequirePasscode(e.target.checked)}
                className="rounded border-white/[0.2] bg-black text-[#2997ff] focus:ring-0"
              />
            </div>

            {requirePasscode && (
              <input
                type="text"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] transition"
              />
            )}

            <div className="flex items-center justify-between">
              <span className="text-[#86868b]">Allow screen sharing</span>
              <input
                type="checkbox"
                checked={allowScreenShare}
                onChange={(e) => setAllowScreenShare(e.target.checked)}
                className="rounded border-white/[0.2] bg-black text-[#2997ff] focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#86868b]">Mute on entry</span>
              <input
                type="checkbox"
                checked={muteOnEntry}
                onChange={(e) => setMuteOnEntry(e.target.checked)}
                className="rounded border-white/[0.2] bg-black text-[#2997ff] focus:ring-0"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#86868b] hover:text-[#f5f5f7] text-xs font-medium rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#2997ff] hover:bg-[#0077ed] active:scale-[0.99] text-white text-xs font-medium rounded-xl transition"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
