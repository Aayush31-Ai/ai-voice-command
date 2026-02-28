'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SparklesIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex h-14 items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-6 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-300 transition-colors hover:text-slate-100"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to home</span>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-sky-500">
            <SparklesIcon className="h-3.5 w-3.5 text-slate-950" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-100">VoiceForge</span>
        </Link>
      </header>

      {/* Form section */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-black/40 backdrop-blur">
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">Welcome back</h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Sign in to continue to your workspace
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300" htmlFor="email">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-700 bg-slate-950 pr-10 text-slate-100 focus-visible:ring-cyan-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 focus-visible:ring-cyan-500/40"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-cyan-400 transition-colors hover:text-cyan-300">
                Create one
              </Link>
            </p>
          </div>

          {/* Built-with note */}
          <p className="mt-6 text-center text-xs text-slate-600">
            Powered by LiveKit · LangGraph · Groq
          </p>
        </div>
      </main>
    </div>
  );
}
