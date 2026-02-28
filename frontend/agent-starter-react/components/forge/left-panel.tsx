'use client';

import Link from 'next/link';
import type { ReceivedMessage } from '@livekit/components-react';
import { MicIcon, BotIcon, LayoutDashboardIcon, FolderIcon } from 'lucide-react';

import type { LanguageType, ProjectRecord } from '@/lib/voiceforge-api';

interface LeftPanelProps {
  messages: ReceivedMessage[];
  intent: string | null;
  projects: ProjectRecord[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onNewProject: (name: string, language: LanguageType) => void;
  isLoading: boolean;
}

const INTENT_STYLES: Record<string, { pill: string; label: string }> = {
  generate: { pill: 'border border-blue-400/40 bg-blue-400/15 text-blue-200', label: 'Generate' },
  generate_code: { pill: 'border border-blue-400/40 bg-blue-400/15 text-blue-200', label: 'Generate' },
  debug:    { pill: 'border border-red-400/40 bg-red-400/15 text-red-200', label: 'Debug' },
  debug_code: { pill: 'border border-red-400/40 bg-red-400/15 text-red-200', label: 'Debug' },
  explain:  { pill: 'border border-amber-400/40 bg-amber-400/15 text-amber-200', label: 'Explain' },
  explain_code: { pill: 'border border-amber-400/40 bg-amber-400/15 text-amber-200', label: 'Explain' },
  run:      { pill: 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-200', label: 'Run' },
  run_code: { pill: 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-200', label: 'Run' },
  refactor: { pill: 'border border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200', label: 'Refactor' },
};

export function LeftPanel({
  messages,
  intent,
  projects,
  selectedProjectId: _selectedProjectId,
  onSelectProject: _onSelectProject,
  onNewProject: _onNewProject,
  isLoading,
}: LeftPanelProps) {
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-y-auto p-3">
      {/* Voice Transcript */}
      <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MicIcon className="h-3.5 w-3.5 text-cyan-400" />
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
              Connect and start speaking...
            </p>
          ) : (
            [...messages].reverse().map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-2.5 py-2 text-xs leading-relaxed ${
                  m.from?.isLocal
                    ? 'border border-cyan-400/20 bg-cyan-400/5'
                    : 'border border-slate-800 bg-slate-900'
                }`}
              >
                <span
                  className={`mb-0.5 block text-[10px] font-semibold uppercase tracking-wider ${
                    m.from?.isLocal ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                >
                  {m.from?.isLocal ? 'You' : 'Agent'}
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
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Intent</span>
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
              <span className="flex items-center gap-1.5 text-xs text-cyan-300">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                Processing...
              </span>
            )}
          </div>
        )}
      </section>

      {/* Project info */}
      <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FolderIcon className="h-3.5 w-3.5 text-cyan-400" />
            <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Projects
            </h2>
          </div>
          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            {projects.length}
          </span>
        </div>

        <div className="space-y-1">
          {projects.length === 0 ? (
            <p className="py-1 text-xs italic text-slate-600">No project loaded.</p>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-2.5 py-2"
              >
                <span className="truncate text-xs font-medium text-cyan-200">{p.name}</span>
                <span
                  className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                    p.language === 'python'
                      ? 'bg-blue-400/10 text-blue-300 ring-blue-400/20'
                      : 'bg-amber-400/10 text-amber-300 ring-amber-400/20'
                  }`}
                >
                  {p.language === 'python' ? 'PY' : 'HTML'}
                </span>
              </div>
            ))
          )}
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
        >
          <LayoutDashboardIcon className="h-3 w-3" />
          All projects
        </Link>
      </section>

      {/* Agent info */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <BotIcon className="h-3.5 w-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            AI Agent
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Speak a request or type a command. The agent will plan, generate, and optionally run your code.
        </p>
      </section>
    </div>
  );
}
