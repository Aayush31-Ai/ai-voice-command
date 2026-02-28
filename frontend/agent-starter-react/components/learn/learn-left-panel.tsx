'use client';

import Link from 'next/link';
import type { ReceivedMessage } from '@livekit/components-react';
import { MicIcon, BotIcon, LayoutDashboardIcon, BookOpenIcon, FileTextIcon } from 'lucide-react';
import type { LearnBookRecord } from '@/lib/voiceforge-api';

interface LearnLeftPanelProps {
  messages: ReceivedMessage[];
  intent: string | null;
  currentBook: LearnBookRecord | null;
  isLoading: boolean;
}

const INTENT_STYLES: Record<string, { pill: string; label: string }> = {
  generate: { pill: 'border border-violet-400/40 bg-violet-400/15 text-violet-200', label: 'Learn Generate' },
  debug:    { pill: 'border border-red-400/40 bg-red-400/15 text-red-200', label: 'Debug' },
  explain:  { pill: 'border border-amber-400/40 bg-amber-400/15 text-amber-200', label: 'Explain' },
  run:      { pill: 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-200', label: 'Run' },
  refactor: { pill: 'border border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200', label: 'Refactor' },
};

export function LearnLeftPanel({ messages, intent, currentBook, isLoading }: LearnLeftPanelProps) {
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-y-auto p-3">
      {/* Learning Mode badge */}
      <div className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2">
        <BookOpenIcon className="h-3.5 w-3.5 text-violet-300 shrink-0" />
        <span className="text-xs font-semibold text-violet-200">Learning Mode</span>
        <span className="ml-auto rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
          EDU
        </span>
      </div>

      {/* Voice Transcript */}
      <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MicIcon className="h-3.5 w-3.5 text-violet-400" />
            <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Voice Transcript
            </h2>
          </div>
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            {messages.length}
          </span>
        </div>

        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
          {messages.length === 0 ? (
            <p className="py-2 text-center text-xs italic text-slate-600">
              Say &quot;Teach me how loops work&quot; to start learning...
            </p>
          ) : (
            [...messages].reverse().map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-2.5 py-2 text-xs leading-relaxed ${
                  m.from?.isLocal
                    ? 'border border-violet-400/20 bg-violet-400/5'
                    : 'border border-slate-800 bg-slate-900'
                }`}
              >
                <span
                  className={`mb-0.5 block text-[10px] font-semibold uppercase tracking-wider ${
                    m.from?.isLocal ? 'text-violet-400' : 'text-slate-500'
                  }`}
                >
                  {m.from?.isLocal ? 'You' : 'Teacher'}
                </span>
                <span className="text-slate-200">{m.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Intent + loading */}
        {(intent || isLoading) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
            {intent && (
              <>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Mode</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                    INTENT_STYLES[intent]?.pill ?? 'border border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  {INTENT_STYLES[intent]?.label ?? intent}
                </span>
              </>
            )}
            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-violet-300">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                Preparing explanation...
              </span>
            )}
          </div>
        )}
      </section>

      {/* Book info */}
      {currentBook && (
        <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center gap-1.5">
            <LayoutDashboardIcon className="h-3.5 w-3.5 text-slate-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current Book
            </h2>
          </div>

          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-2.5 py-2">
            <p className="text-xs font-semibold text-slate-200">{currentBook.name}</p>
            {currentBook.description && (
              <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{currentBook.description}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase">{currentBook.language}</span>
              {currentBook.has_pdf && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <FileTextIcon className="h-2.5 w-2.5" />
                  PDF indexed
                </span>
              )}
            </div>
          </div>

          <Link
            href="/dashboard"
            onClick={() => { /* switch to learn-books tab */ }}
            className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-2 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
          >
            <BookOpenIcon className="h-3 w-3" />
            All Learn Books
          </Link>
        </section>
      )}

      {/* Tips section */}
      <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center gap-1.5">
          <BotIcon className="h-3.5 w-3.5 text-slate-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Voice Tips
          </h2>
        </div>
        <ul className="space-y-1.5">
          {[
            'Teach me how for loops work',
            'How do I build a calculator?',
            'Explain what a function is',
            'Show me how to sort a list',
          ].map((tip) => (
            <li key={tip} className="rounded-md bg-slate-900/50 px-2 py-1.5 text-[11px] text-slate-400 leading-relaxed">
              &quot;{tip}&quot;
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
