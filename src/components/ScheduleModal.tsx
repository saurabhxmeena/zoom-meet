'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, Lock, Shield, ArrowRight } from 'lucide-react';
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
  // Compute local today's date and default time (next hour)
  const getInitialDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;

    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const localTime = `${String(nextHour.getHours()).padStart(2, '0')}:00`;
    return { localToday, localTime };
  };

  const { localToday, localTime } = getInitialDateTime();
  const [title, setTitle] = useState('Discussion Session');
  const [date, setDate] = useState(localToday);
  const [time, setTime] = useState(localTime);
  const [passcode, setPasscode] = useState('');
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a meeting topic.');
      return;
    }

    if (!date || !time) {
      setError('Please select both a date and a time.');
      return;
    }

    // Parse local date & time accurately without unexpected UTC day shifting
    const [yearStr, monthStr, dayStr] = date.split('-');
    const [hourStr, minStr] = time.split(':');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hours = parseInt(hourStr, 10);
    const minutes = parseInt(minStr, 10);

    const scheduledDate = new Date(year, month, day, hours, minutes, 0, 0);

    if (isNaN(scheduledDate.getTime())) {
      setError('Please select a valid date and time.');
      return;
    }

    // Prevent scheduling meetings in the past (allow 1-minute margin for form completion)
    if (scheduledDate.getTime() < Date.now() - 60000) {
      setError('Please select a future date and time for the meeting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          hostUserId: defaultHostUserId,
          hostName: defaultHostName,
          passcode: requirePasscode ? passcode.trim() : '',
          scheduledFor: scheduledDate.toISOString(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150">
      <div className="surface-modal rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-[#242732]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#242732] bg-[#16181f]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#1e212b] text-slate-300 border border-[#242732]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f8fafc]">Schedule Meeting</h2>
              <p className="text-[11px] text-slate-400">Generate a meeting link for an upcoming session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e212b] rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Meeting Topic</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] placeholder-slate-500 transition"
              placeholder="e.g. Design Review & Planning"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Date</label>
              <input
                type="date"
                required
                min={localToday}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full h-10 px-3 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] [color-scheme:dark] transition"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full h-10 px-3 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] [color-scheme:dark] transition"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#242732] space-y-2.5">
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e212b] border border-[#242732] cursor-pointer hover:border-slate-600 transition">
              <span className="text-slate-300 font-medium">Require meeting passcode</span>
              <input
                type="checkbox"
                checked={requirePasscode}
                onChange={(e) => setRequirePasscode(e.target.checked)}
                className="rounded border-[#333745] bg-[#0e1015] text-[#2563eb] focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </label>

            {requirePasscode && (
              <div className="animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Enter custom passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] placeholder-slate-500 transition"
                />
              </div>
            )}

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e212b] border border-[#242732] cursor-pointer hover:border-slate-600 transition">
              <span className="text-slate-300 font-medium">Allow screen sharing</span>
              <input
                type="checkbox"
                checked={allowScreenShare}
                onChange={(e) => setAllowScreenShare(e.target.checked)}
                className="rounded border-[#333745] bg-[#0e1015] text-[#2563eb] focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e212b] border border-[#242732] cursor-pointer hover:border-slate-600 transition">
              <span className="text-slate-300 font-medium">Mute participants on entry</span>
              <input
                type="checkbox"
                checked={muteOnEntry}
                onChange={(e) => setMuteOnEntry(e.target.checked)}
                className="rounded border-[#333745] bg-[#0e1015] text-[#2563eb] focus:ring-0 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white hover:bg-[#1e212b] text-xs font-semibold rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
            >
              <span>{isSubmitting ? 'Scheduling...' : 'Confirm & Schedule'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
