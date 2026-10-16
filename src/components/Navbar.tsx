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
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-black/60 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2.5 text-[#f5f5f7] hover:opacity-85 transition">
          <div className="w-7 h-7 rounded-lg bg-[#2997ff] flex items-center justify-center text-white shadow-sm">
            <Video className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#f5f5f7]">
            Meetings
          </span>
        </Link>

        {/* User Account / Navigation */}
        <div className="flex items-center space-x-3 text-xs">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <div className="w-5 h-5 rounded-full bg-[#2997ff]/20 text-[#2997ff] flex items-center justify-center font-medium text-[10px]">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-[#f5f5f7] font-medium text-xs max-w-[120px] truncate">
                  {currentUser.displayName}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 text-[#86868b] hover:text-[#f5f5f7] hover:bg-white/[0.06] rounded-md transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-[#86868b] hover:text-[#f5f5f7] transition font-medium"
            >
              Sign In
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
