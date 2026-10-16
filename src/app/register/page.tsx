'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1015] text-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2.5">
          <Link href="/" className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 transition">
            <Video className="w-5 h-5 stroke-[2.2]" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-[#f8fafc]">
              Create an Account
            </h1>
            <p className="text-xs text-slate-400">
              Host HD meetings and schedule recurring rooms
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="surface-card rounded-xl p-6 sm:p-7 shadow-xl space-y-4 border border-[#242732]">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs animate-in fade-in duration-150">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium text-xs mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] placeholder-slate-500 transition text-xs"
                  placeholder="Aarav Sharma"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium text-xs mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] placeholder-slate-500 transition text-xs"
                  placeholder="aarav@mait.ac.in"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium text-xs mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-8 pr-2 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] placeholder-slate-500 transition text-xs"
                    placeholder="Min 6 chars"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium text-xs mb-1.5">Confirm</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 pl-8 pr-2 bg-[#0e1015] border border-[#242732] focus:border-[#2563eb] focus:outline-none rounded-lg text-[#f8fafc] placeholder-slate-500 transition text-xs"
                    placeholder="Re-enter"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-[#2563eb] hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 text-white font-medium rounded-lg transition text-xs flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-[#242732] text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
