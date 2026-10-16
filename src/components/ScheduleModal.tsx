'use client';

import React, { useState } from 'react';
import { X, Calendar, Lock, Shield, Video, Sparkles } from 'lucide-react';
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
  defaultHostName = 'Host User',
  defaultHostUserId = 'user_1',
}: ScheduleModalProps) {
  const [title, setTitle] = useState('Minor Project Review');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Schedule Meeting</h2>
              <p className="text-xs text-slate-400">Configure meeting parameters and security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Meeting Topic / Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="e.g. IT Department Session 2026-2027"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <span className="font-semibold text-slate-200">Security & Controls</span>

            <div className="flex items-center justify-between">
              <label className="text-slate-300 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Require Meeting Passcode</span>
              </label>
              <input
                type="checkbox"
                checked={requirePasscode}
                onChange={(e) => setRequirePasscode(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-800"
              />
            </div>

            {requirePasscode && (
              <input
                type="text"
                placeholder="Enter room passcode (e.g. 123456)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            )}

            <div className="flex items-center justify-between">
              <label className="text-slate-300">Allow Screen Sharing for Participants</label>
              <input
                type="checkbox"
                checked={allowScreenShare}
                onChange={(e) => setAllowScreenShare(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-300">Mute Participants upon Entry</label>
              <input
                type="checkbox"
                checked={muteOnEntry}
                onChange={(e) => setMuteOnEntry(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <span>Generating Code...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Meeting</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
