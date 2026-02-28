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
  const [savedLoading, setSavedLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push('/login');
    }
  }, [sessionLoading, session, router]);

  // Load saved roadmaps on mount
  useEffect(() => {
    if (session?.access_token) {
      loadSavedRoadmaps();
    }
  }, [session?.access_token]);

  const loadSavedRoadmaps = async () => {
    if (!session?.access_token) return;
    setSavedLoading(true);
    try {
      const saved = await listRoadmaps(session.access_token);
      setSavedRoadmaps(saved);
    } catch (err) {
      console.error('Failed to load saved roadmaps:', err);
    } finally {
      setSavedLoading(false);
    }
  };

  const handleGenerate = useCallback(
    async (goalText: string) => {
      if (!session?.access_token) return;
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
        // Refresh saved roadmaps list
        await loadSavedRoadmaps();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate roadmap');
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate(goal);
  };

  const handleLoadRoadmap = async (roadmapId: string) => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const data = await listRoadmaps(session.access_token);
      const found = data.find((r) => r.id === roadmapId);
      if (found) {
        setRoadmap(found);
        setGoal(found.goal);
        setSelectedNode(null);
        setFollowUpA(null);
        setFollowUpQ('');
      }
    } catch (err) {
      setError(`Failed to load roadmap: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoadmap = async (roadmapId: string) => {
    if (!session?.access_token) return;
    setDeletingId(roadmapId);
    try {
      await deleteRoadmap(roadmapId, session.access_token);
      setSavedRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
      if (roadmap?.id === roadmapId) {
        setRoadmap(null);
        setGoal('');
      }
    } catch (err) {
      console.error('Failed to delete roadmap:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAskFollowUp = useCallback(async () => {
    if (!followUpQ.trim() || !roadmap || !session?.access_token) return;
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
  }, [followUpQ, roadmap, session?.access_token]);

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
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
      <div className="flex">
        {/* Saved Roadmaps Sidebar (desktop only) */}
        <div className="hidden h-screen w-64 flex-shrink-0 overflow-y-auto border-r border-slate-700/60 bg-slate-900/40 px-4 py-6 lg:flex flex-col">
          <h3 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Saved Roadmaps
          </h3>
          {savedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : savedRoadmaps.length === 0 ? (
            <p className="text-xs text-slate-500">No saved roadmaps yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {savedRoadmaps.map((r) => (
                <div
                  key={r.id}
                  className="group relative flex items-start gap-2 rounded-lg p-2 hover:bg-slate-800/40 transition-colors"
                >
                  <button
                    onClick={() => handleLoadRoadmap(r.id!)}
                    className="flex-1 cursor-pointer text-left overflow-hidden"
                  >
                    <p className="text-xs font-medium text-slate-300 truncate hover:text-blue-300">
                      {r.goal}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.estimated_duration}
                    </p>
                    {roadmap?.id === r.id && (
                      <span className="text-xs text-blue-400 font-semibold">Viewing</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteRoadmap(r.id!)}
                    disabled={deletingId === r.id}
                    className="flex-shrink-0 invisible group-hover:visible px-1 py-1 hover:bg-red-500/20 rounded transition-colors"
                  >
                    {deletingId === r.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-red-400" />
                    ) : (
                      <Trash2Icon className="h-3 w-3 text-slate-500 hover:text-red-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="mx-auto flex max-w-7xl flex-col px-6 pb-16">
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
                <span
                  className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent"
                >
                  Learning Roadmap Generator
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Enter a skill or career goal — AI builds your personalized roadmap
              </p>
            </div>

            {/* Goal Input */}
            <form
              onSubmit={handleSubmit}
              className="mx-auto mb-4 flex w-full max-w-2xl gap-2.5"
            >
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
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SparklesIcon className="h-4 w-4" />
                )}
                {loading ? 'Generating...' : 'Generate Roadmap'}
              </button>
            </form>

            {/* Example goal chips */}
            {!roadmap && !loading && (
              <div className="mx-auto mb-6 flex max-w-2xl flex-wrap justify-center gap-2">
                {EXAMPLE_GOALS.map((eg) => (
                  <button
                    key={eg}
                    onClick={() => {
                      setGoal(eg);
                      handleGenerate(eg);
                    }}
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

            {/* Loading state */}
            {loading && (
              <div className="my-16 flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />
                <p className="text-sm text-slate-400">Generating your roadmap...</p>
              </div>
            )}

            {/* Roadmap Canvas */}
            {roadmap && !loading && (
              <>
                {/* Roadmap info bar */}
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">{roadmap.goal}</h2>
                    <p className="text-xs text-slate-500">
                      Estimated duration:{' '}
                      <span className="text-slate-300">{roadmap.estimated_duration}</span>
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
                    <DetailPanel
                      node={selectedNode}
                      onClose={() => setSelectedNode(null)}
                    />
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

            {/* Mobile saved roadmaps grid */}
            {!roadmap && savedRoadmaps.length > 0 && (
              <div className="mx-auto mb-6 w-full max-w-4xl lg:hidden">
                <h3 className="mb-3 text-sm font-semibold text-slate-300">Saved Roadmaps</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedRoadmaps.map((r) => (
                    <div
                      key={r.id}
                      className="relative rounded-lg border border-slate-700/60 bg-slate-800/40 p-3 hover:bg-slate-800/60 transition-colors group"
                    >
                      <button
                        onClick={() => handleLoadRoadmap(r.id!)}
                        className="w-full text-left"
                      >
                        <p className="text-xs font-medium text-slate-300 truncate hover:text-blue-300">
                          {r.goal}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {r.estimated_duration}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDeleteRoadmap(r.id!)}
                        disabled={deletingId === r.id}
                        className="absolute top-2 right-2 invisible group-hover:visible p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-red-400" />
                        ) : (
                          <Trash2Icon className="h-3 w-3 text-slate-500 hover:text-red-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
