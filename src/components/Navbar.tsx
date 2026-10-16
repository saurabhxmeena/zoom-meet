'use client';

import React from 'react';
import Link from 'next/link';
import { Video, LogOut } from 'lucide-react';
import { IUser } from '@/lib/types';

interface NavbarProps {
  currentUser?: IUser | null;
  onLogout?: () => void;
}

export default function Navbar({ currentUser, onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1f222a] bg-[#0e1015]/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <Link 
          href="/" 
          className="flex items-center space-x-2.5 text-[#f1f2f4] hover:opacity-90 transition"
        >
          <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center text-white">
            <Video className="w-4 h-4 stroke-[2]" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#f1f2f4]">
            Zoom Meet
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center space-x-4 text-xs">

          {currentUser ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#1f222a]">
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#181a20] border border-[#242732]">
                <div className="w-5 h-5 rounded-full bg-[#2563eb]/20 text-[#3b82f6] flex items-center justify-center font-medium text-[10px]">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-[#f1f2f4] font-medium text-xs max-w-[120px] truncate">
                  {currentUser.displayName}
                </span>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 text-[#8e929b] hover:text-[#f1f2f4] hover:bg-[#181a20] rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-[#181a20] hover:bg-[#20232c] text-[#f1f2f4] font-medium text-xs border border-[#242732] transition"
            >
              Sign In
            </Link>
          )}

        </div>

      </div>
    </header>
  );
}
