'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeftIcon,
  CalendarIcon,
  Loader2,
  MapIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
} from 'lucide-react';
import type { Node } from '@xyflow/react';

import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  askFollowUp,
  deleteRoadmap,
  generateRoadmap,
  listRoadmaps,
  type Roadmap,
} from './_lib/api';
import DetailPanel from './_components/DetailPanel';

const RoadmapFlow = dynamic(() => import('./_components/RoadmapFlow'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-slate-500 text-sm">
      Loading canvas...
    </div>
  ),
});

const EXAMPLE_GOALS = [
  'Become a Python developer',
  'Learn full-stack web development',
  'Become a Machine Learning engineer',
  'Learn DevOps & Cloud engineering',
  'Master React and frontend development',
];

export default function RoadmapPage() {
  const { session, isLoading: sessionLoading } = useSupabaseSession();
  const router = useRouter();

  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [followUpQ, setFollowUpQ] = useState('');
  const [followUpA, setFollowUpA] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Saved roadmaps list
  const [savedRoadmaps, setSavedRoadmaps] = useState<Roadmap[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/login');
    }
  }, [session, sessionLoading, router]);

  // Load saved roadmaps
  useEffect(() => {
    if (!session) return;
    setLoadingSaved(true);
    listRoadmaps(session.access_token)
      .then(setSavedRoadmaps)
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
  }, [session]);

  const handleGenerate = useCallback(
    async (goalText: string) => {
      if (!session) return;
      const trimmed = goalText.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      setRoadmap(null);
      setSelectedNode(null);
      setFollowUpA(null);
      setFollowUpQ('');
      try {
        const data = await generateRoadmap(trimmed, session.access_token);
        setRoadmap(data);
        // Prepend to saved list
        setSavedRoadmaps((prev) => [data, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate roadmap');
      } finally {
        setLoading(false);
      }
    },
    [session],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate(goal);
  };

  const handleLoadSaved = (saved: Roadmap) => {
    setRoadmap(saved);
    setSelectedNode(null);
    setFollowUpA(null);
    setFollowUpQ('');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) return;
    setDeletingId(id);
    try {
      await deleteRoadmap(id, session.access_token);
      setSavedRoadmaps((prev) => prev.filter((r) => r.id !== id));
      if (roadmap?.id === id) setRoadmap(null);
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleAskFollowUp = useCallback(async () => {
    if (!followUpQ.trim() || !roadmap || !session) return;
    setFollowUpLoading(true);
    setFollowUpA(null);
    try {
      const result = await askFollowUp(followUpQ, roadmap, session.access_token);
      setFollowUpA(result.answer);
    } catch (err) {
      setFollowUpA(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFollowUpLoading(false);
    }
  }, [followUpQ, roadmap, session]);

  if (sessionLoading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0f0f0f] text-slate-100"
      style={{
        backgroundImage:
          'radial-gradient(circle at center, #1a1a1a 0%, #0f0f0f 70%), radial-gradient(#222 1px, transparent 1px)',
        backgroundSize: '100% 100%, 28px 28px',
      }}
    >
      <div className="mx-auto flex max-w-7xl gap-6 px-6 pb-16">
        {/* ── Saved roadmaps sidebar ── */}
        <aside className="hidden w-64 shrink-0 pt-6 lg:flex lg:flex-col">
          <div className="sticky top-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Saved Roadmaps
            </p>
            {loadingSaved ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            ) : savedRoadmaps.length === 0 ? (
              <p className="text-xs text-slate-600">No roadmaps yet. Generate one to get started.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
                {savedRoadmaps.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => handleLoadSaved(r)}
                      className={`group w-full rounded-lg border px-3 py-2.5 text-left transition-all hover:border-blue-500/40 hover:bg-blue-500/8
                        ${roadmap?.id === r.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-700/60 bg-slate-800/40'}`}
                    >
                      <p className="truncate text-xs font-medium text-slate-200">{r.goal}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[0.65rem] text-slate-500">{r.estimated_duration}</span>
                        <div className="flex items-center gap-1.5">
                          {r.created_at && (
                            <span className="flex items-center gap-0.5 text-[0.6rem] text-slate-600">
                              <CalendarIcon className="h-2.5 w-2.5" />
                              {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <button
                            onClick={(e) => r.id && handleDelete(r.id, e)}
                            disabled={deletingId === r.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-slate-500 hover:text-red-400"
                            aria-label="Delete roadmap"
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2Icon className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="flex items-center justify-between py-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-blue-400" />
              <span className="text-base font-semibold text-slate-100">Roadmap Generator</span>
            </div>
            <div className="w-24" />
          </header>

          {/* Hero */}
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
                Learning Roadmap Generator
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Enter a skill or career goal — AI builds your personalized roadmap and saves it automatically
            </p>
          </div>

          {/* Goal Input */}
          <form onSubmit={handleSubmit} className="mx-auto mb-4 flex w-full max-w-2xl gap-2.5">
            <input
              ref={inputRef}
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Become a Python developer, Learn full-stack AI engineering..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !goal.trim()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
              {loading ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </form>

          {/* Example goal chips */}
          {!roadmap && !loading && (
            <div className="mx-auto mb-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {EXAMPLE_GOALS.map((eg) => (
                <button
                  key={eg}
                  onClick={() => { setGoal(eg); handleGenerate(eg); }}
                  className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  {eg}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-auto mb-4 w-full max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="my-16 flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
              <p className="text-sm text-slate-400">Generating your roadmap...</p>
            </div>
          )}

          {/* Roadmap Canvas */}
          {roadmap && !loading && (
            <>
              {/* Info bar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">{roadmap.goal}</h2>
                  <p className="text-xs text-slate-500">
                    Duration: <span className="text-slate-300">{roadmap.estimated_duration}</span>
                    {roadmap.id && (
                      <span className="ml-3 rounded bg-green-500/10 px-1.5 py-0.5 text-[0.65rem] text-green-400 ring-1 ring-green-500/20">
                        Saved
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Goal
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500" /> Phase
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-orange-500" /> Project
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Milestone
                  </span>
                </div>
              </div>

              {/* Flow canvas */}
              <div className="flex h-[580px] overflow-hidden rounded-xl border border-slate-700/60 bg-[#111]">
                <div className="flex-1">
                  <RoadmapFlow roadmap={roadmap} onNodeClick={setSelectedNode} />
                </div>
                {selectedNode && (
                  <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
                )}
              </div>

              {/* Follow-up section */}
              <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900 p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-300">
                  Ask a follow-up question
                </h3>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={followUpQ}
                    onChange={(e) => setFollowUpQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskFollowUp()}
                    placeholder="e.g. Explain Phase 2 · Give resources for OOP · Create a weekly plan"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-blue-500"
                  />
                  <button
                    onClick={handleAskFollowUp}
                    disabled={followUpLoading || !followUpQ.trim()}
                    className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {followUpLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <SendIcon className="h-3.5 w-3.5" />
                    )}
                    {followUpLoading ? 'Asking...' : 'Ask'}
                  </button>
                </div>
                {followUpA && (
                  <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {followUpA}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile: saved roadmaps below canvas */}
          <div className="mt-8 lg:hidden">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Saved Roadmaps
            </p>
            {loadingSaved ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : savedRoadmaps.length === 0 ? (
              <p className="text-xs text-slate-600">No roadmaps yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {savedRoadmaps.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleLoadSaved(r)}
                    className={`group rounded-lg border px-3 py-2.5 text-left transition-all
                      ${roadmap?.id === r.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-700/60 bg-slate-800/40'}`}
                  >
                    <p className="truncate text-xs font-medium text-slate-200">{r.goal}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[0.65rem] text-slate-500">{r.estimated_duration}</span>
                      <button
                        onClick={(e) => r.id && handleDelete(r.id, e)}
                        disabled={deletingId === r.id}
                        className="text-slate-500 hover:text-red-400"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2Icon className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
