'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';

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
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#2997ff] text-white shadow-sm mb-1">
            <Video className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-[#f5f5f7]">
            Create Account
          </h1>
          <p className="text-xs text-[#86868b]">
            Sign up to host and schedule meetings.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-[#ff453a]/10 border border-[#ff453a]/20 text-[#ff453a] rounded-xl text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[#86868b] font-medium mb-1.5">Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] placeholder-[#515154] transition text-xs"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-[#86868b] font-medium mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] placeholder-[#515154] transition text-xs"
                placeholder="name@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#86868b] font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] placeholder-[#515154] transition text-xs"
                  placeholder="Min 6 chars"
                />
              </div>
              <div>
                <label className="block text-[#86868b] font-medium mb-1.5">Confirm</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-black border border-white/[0.08] focus:border-[#2997ff] focus:outline-none rounded-xl text-[#f5f5f7] placeholder-[#515154] transition text-xs"
                  placeholder="Re-enter"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-[#2997ff] hover:bg-[#0077ed] active:scale-[0.99] disabled:opacity-40 text-white font-medium rounded-xl transition shadow-sm text-xs"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-white/[0.04] text-center text-xs text-[#86868b]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#2997ff] hover:underline">
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
