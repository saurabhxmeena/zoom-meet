'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, ShieldCheck, FileText, CheckCircle2, User, LogOut, Sparkles } from 'lucide-react';
import { IUser } from '@/lib/types';
import PaperDocsModal from './PaperDocsModal';

interface NavbarProps {
  currentUser?: IUser | null;
  onLogout?: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  const [timeStr, setTimeStr] = useState('');
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' • ' +
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Academic Badge */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                    Zoom Meet
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                    MERN + WebRTC
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  MAIT • 7th Sem Minor Project
                </span>
              </div>
            </Link>
          </div>

          {/* Time & Links */}
          <div className="hidden md:flex items-center space-x-6 text-sm text-slate-300">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{timeStr || '10:00 AM • Oct 2026'}</span>
            </div>

            <button
              onClick={() => setIsDocsOpen(true)}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Project Paper (MAIT)</span>
            </button>

            <Link
              href="/evaluation"
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Section 16 Test Suite</span>
            </Link>
          </div>

          {/* Right Action / Auth */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2.5 pl-2 py-1 pr-3 bg-slate-900/90 border border-slate-800 rounded-full">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[120px] truncate">
                    {currentUser.displayName}
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Academic Paper Documentation Modal */}
      {isDocsOpen && <PaperDocsModal onClose={() => setIsDocsOpen(false)} />}
    </>
  );
}
