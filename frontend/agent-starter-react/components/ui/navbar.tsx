'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SparklesIcon, LogOutIcon, LayoutDashboardIcon, HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';

interface NavbarProps {
  variant?: 'default' | 'transparent';
}

export function Navbar({ variant = 'default' }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSupabaseSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-slate-800/60 backdrop-blur-md ${
        variant === 'transparent'
          ? 'bg-slate-950/60'
          : 'bg-slate-950/90'
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2 text-slate-100 transition-opacity hover:opacity-90"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-sky-500 shadow-sm shadow-cyan-500/30">
            <SparklesIcon className="h-3.5 w-3.5 text-slate-950" />
          </span>
          <span className="text-sm font-semibold tracking-tight">VoiceForge</span>
        </Link>

        {/* Center nav links */}
        <div className="hidden items-center gap-1 sm:flex">
          <Link
            href="/"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              isActive('/')
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <HomeIcon className="h-3.5 w-3.5" />
            Home
          </Link>
          {session && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive('/dashboard')
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <LayoutDashboardIcon className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button
                asChild
                size="sm"
                className="hidden bg-cyan-400 text-slate-950 hover:bg-cyan-300 sm:inline-flex"
              >
                <Link href="/dashboard">
                  <LayoutDashboardIcon className="mr-1.5 h-3.5 w-3.5" />
                  Dashboard
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <LogOutIcon className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
