'use client';

import { DownloadCloudIcon, PlayIcon, BookOpenIcon, LightbulbIcon, ListOrderedIcon, FileTextIcon } from 'lucide-react';
import type { LearnCodeResponse, RunResult, LanguageType } from '@/lib/voiceforge-api';
import { Button } from '@/components/ui/button';

interface LearnOutputPanelProps {
  learnResponse: LearnCodeResponse | null;
  runResult: RunResult | null;
  runError: string | null;
  code: string;
  language: LanguageType;
  isRunning: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRun?: () => void;
  onDownload?: () => void;
}

const TABS = [
  { id: 'output', label: 'Output', icon: PlayIcon },
  { id: 'explanation', label: 'Explanation', icon: BookOpenIcon },
  { id: 'concepts', label: 'Concepts', icon: LightbulbIcon },
  { id: 'steps', label: 'Steps', icon: ListOrderedIcon },
];

export function LearnOutputPanel({
  learnResponse,
  runResult,
  runError,
  code,
  language,
  isRunning,
  activeTab,
  onTabChange,
  onRun,
  onDownload,
}: LearnOutputPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl">
      {/* Tab bar */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-950/80 px-2 pt-2">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'border border-b-0 border-slate-700 bg-slate-900 text-violet-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
              {id === 'explanation' && learnResponse && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </button>
          ))}
          {/* Spacer + action buttons */}
          <div className="ml-auto flex items-center gap-1.5 pb-1.5 pr-1">
            {onRun && (
              <Button
                size="sm"
                onClick={onRun}
                disabled={!code || isRunning}
                className="h-6 rounded px-2 text-[11px] bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-40"
              >
                <PlayIcon className="h-3 w-3 mr-1" />
                {isRunning ? 'Running…' : 'Run'}
              </Button>
            )}
            {onDownload && (
              <Button
                size="sm"
                onClick={onDownload}
                disabled={!code}
                variant="outline"
                className="h-6 rounded border-slate-600 bg-slate-900 px-2 text-[11px] text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-40"
              >
                <DownloadCloudIcon className="h-3 w-3 mr-1" />
                ZIP
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 text-sm">

        {/* ── Output tab ──────────────────────────────────────────────────── */}
        {activeTab === 'output' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {language === 'html' && code ? (
              <iframe
                srcDoc={code}
                title="HTML Preview"
                sandbox="allow-scripts"
                className="flex-1 min-h-0 w-full border-0 rounded-md bg-white"
              />
            ) : isRunning ? (
              <div className="flex items-center gap-2 text-violet-200">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                <p className="italic">Running...</p>
              </div>
            ) : runError ? (
              <div className="space-y-2 font-mono text-xs">
                <p className="text-red-400 font-semibold">⚠️ Run failed</p>
                <pre className="whitespace-pre-wrap rounded border border-red-500/30 bg-red-500/10 p-2 text-red-300">
                  {runError}
                </pre>
              </div>
            ) : runResult ? (
              <div className="font-mono text-xs space-y-2">
                {runResult.timed_out && (
                  <p className="text-yellow-400 font-semibold">⚠️ Execution timed out</p>
                )}
                {runResult.exit_code !== 0 && !runResult.timed_out && (
                  <p className="text-xs text-slate-400">
                    Exit code: <span className="text-red-400">{runResult.exit_code}</span>
                  </p>
                )}
                {runResult.stdout && (
                  <pre className="whitespace-pre-wrap rounded border border-emerald-500/20 bg-emerald-500/10 p-2 text-green-300">
                    {runResult.stdout}
                  </pre>
                )}
                {runResult.stderr && (
                  <pre className="whitespace-pre-wrap rounded border border-red-500/20 bg-red-500/10 p-2 text-red-300">
                    {runResult.stderr}
                  </pre>
                )}
                {!runResult.stdout && !runResult.stderr && (
                  <p className="text-slate-500 italic">(no output)</p>
                )}
              </div>
            ) : (
              <p className="italic text-slate-500">
                Ask a question via voice or text — code will run here automatically.
              </p>
            )}
          </div>
        )}

        {/* ── Explanation tab ──────────────────────────────────────────────── */}
        {activeTab === 'explanation' && (
          <div className="space-y-3">
            {!learnResponse ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <BookOpenIcon className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">
                  Detailed explanation will appear here after you generate code.
                </p>
                <p className="text-xs text-slate-600">
                  Try asking: &quot;Teach me how for loops work&quot; or &quot;How do I build a calculator?&quot;
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3.5 py-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                    Full Explanation
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {learnResponse.detailed_explanation}
                  </p>
                </div>

                {/* RAG sources */}
                {learnResponse.rag_sources && learnResponse.rag_sources.length > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      <FileTextIcon className="h-3 w-3" />
                      From Your PDF
                    </p>
                    <ul className="space-y-0.5">
                      {learnResponse.rag_sources.map((src, i) => (
                        <li key={i} className="text-xs text-emerald-200/80">{src}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Concepts tab ─────────────────────────────────────────────────── */}
        {activeTab === 'concepts' && (
          <div className="space-y-2">
            {!learnResponse ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <LightbulbIcon className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">Key concepts will appear here.</p>
              </div>
            ) : learnResponse.key_concepts.length === 0 ? (
              <p className="italic text-slate-500">No key concepts found.</p>
            ) : (
              learnResponse.key_concepts.map((concept, i) => {
                const [title, ...rest] = concept.split(':');
                const desc = rest.join(':').trim();
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 transition-colors hover:border-violet-500/30"
                  >
                    <p className="mb-0.5 font-semibold text-violet-200">{title.trim()}</p>
                    {desc && <p className="text-xs leading-relaxed text-slate-300">{desc}</p>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Steps tab ────────────────────────────────────────────────────── */}
        {activeTab === 'steps' && (
          <div className="space-y-2">
            {!learnResponse ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ListOrderedIcon className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">Step-by-step breakdown will appear here.</p>
              </div>
            ) : learnResponse.step_by_step.length === 0 ? (
              <p className="italic text-slate-500">No steps found.</p>
            ) : (
              learnResponse.step_by_step.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                    {i + 1}
                  </span>
                  <p className="flex-1 pt-0.5 text-sm leading-relaxed text-slate-200">{step}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
