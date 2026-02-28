'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDataChannel, useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { ReceivedMessage } from '@livekit/components-react';
import {
  ActivityIcon,
  Code2Icon,
  DownloadCloudIcon,
  LoaderCircleIcon,
  PlayIcon,
  SparklesIcon,
  ArrowLeftIcon,
  LogOutIcon,
  WifiIcon,
  WifiOffIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

import type {
  AssistantResponse,
  AssistantSummaryContent,
  LanguageType,
  ProjectRecord,
  RunResult,
} from '@/lib/voiceforge-api';
import {
  getProject,
  runCode,
  updateProject,
} from '@/lib/voiceforge-api';
import { useDownloadZip } from '@/hooks/useDownloadZip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { LeftPanel } from '@/components/forge/left-panel';
import { MonacoEditor } from '@/components/forge/monaco-editor';
import { OutputPanel } from '@/components/forge/output-panel';
import { Button } from '@/components/ui/button';

interface VoiceForgeWorkspaceProps {
  accessToken: string;
  projectId: string;
}

export function VoiceForgeWorkspace({ accessToken, projectId }: VoiceForgeWorkspaceProps) {
  const session = useSessionContext();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  // ── LiveKit messages ──────────────────────────────────────────────────────
  const { messages } = useSessionMessages();

  // ── Editor state ──────────────────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<LanguageType>('python');

  // ── Pipeline state ────────────────────────────────────────────────────────
  const [intent, setIntent] = useState<string | null>(null);
  const [summary, setSummary] = useState<AssistantSummaryContent | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState('output');
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // ── Project metadata ────────────────────────────────────────────────────
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [projectLoaded, setProjectLoaded] = useState(false);

  // ── Track last processed message to avoid duplicate calls ─────────────────
  // Initialise to the most recent local message already in the session so that
  // mounting the workspace a second time never re-runs the pipeline on old msgs.
  const lastProcessedId = useRef<string | null>(
    [...messages].reverse().find((m: ReceivedMessage) => m.from?.isLocal)?.id ?? null
  );
  // Track the last agent (non-local) message so we can clear loading when the
  // agent replies with text only (explain intent — no code_result is published).
  const lastAgentMsgId = useRef<string | null>(
    [...messages].reverse().find((m: ReceivedMessage) => !m.from?.isLocal)?.id ?? null
  );
  // True while waiting for either a code_result or an agent text reply.
  const pendingReplyRef = useRef(false);

  // Channel used to push the current editor code to the agent.
  const { send: sendEditorContext } = useDataChannel('editor_context');

  // Load the specific project on mount
  useEffect(() => {
    getProject(projectId, accessToken)
      .then((proj) => {
        setCurrentProject(proj);
        setCode(proj.code ?? '');
        setLanguage(proj.language ?? 'python');
        setProjectLoaded(true);
      })
      .catch(console.error);
  }, [projectId, accessToken]);

  // Debounced auto-save whenever code or language changes
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!projectLoaded || !code) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      updateProject(projectId, { code, language }, accessToken).catch(console.error);
    }, 2000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [code, language, projectId, projectLoaded, accessToken]);

  // Keep the agent up-to-date with the latest editor contents (debounced).
  const contextSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (contextSyncRef.current) clearTimeout(contextSyncRef.current);
    contextSyncRef.current = setTimeout(() => {
      const payload = new TextEncoder().encode(JSON.stringify({ code, language }));
      sendEditorContext(payload, { reliable: true });
    }, 1500);
    return () => {
      if (contextSyncRef.current) clearTimeout(contextSyncRef.current);
    };
  }, [code, language, sendEditorContext]);

  // When user speaks: send current editor code to agent, show loading, clear results.
  // NOTE: we intentionally do NOT clear the editor code here — if the user asks
  // to explain the code we need it to stay visible. The code is only replaced
  // when the agent publishes a brand-new code_result via the data channel.
  useEffect(() => {
    const lastLocal = [...messages].reverse().find((m: ReceivedMessage) => m.from?.isLocal);
    if (!lastLocal || lastLocal.id === lastProcessedId.current) return;
    lastProcessedId.current = lastLocal.id;
    if (!lastLocal.message?.trim()) return;

    // Push the current editor snapshot to the agent immediately so it has
    // context before it even starts processing the voice request.
    const payload = new TextEncoder().encode(JSON.stringify({ code, language }));
    sendEditorContext(payload, { reliable: true });

    setIsLoading(true);
    setSummary(null);
    setRunResult(null);
    setRunError(null);
    setIntent(null);
    setActiveTab('output');
    pendingReplyRef.current = true;
  }, [messages, code, language, sendEditorContext]);

  // When the agent sends a text reply (transcription) and we're still in a
  // loading state — meaning no code_result arrived — it was an explain/answer
  // and we can safely clear the loading indicator.
  useEffect(() => {
    const lastAgent = [...messages].reverse().find((m: ReceivedMessage) => !m.from?.isLocal);
    if (!lastAgent || lastAgent.id === lastAgentMsgId.current) return;
    lastAgentMsgId.current = lastAgent.id;
    if (pendingReplyRef.current) {
      pendingReplyRef.current = false;
      setIsLoading(false);
    }
  }, [messages]);

  // Stage 2: Agent pushes structured responses via LiveKit data channel.
  const handleAssistantResult = useCallback(
    (msg: { payload: Uint8Array }) => {
      try {
        const text = new TextDecoder().decode(msg.payload);
        const parsed = JSON.parse(text) as AssistantResponse | {
          type: 'code_result';
          code: string;
          language: LanguageType;
          intent?: string;
          summary?: { what_it_does: string; key_components: string; how_to_extend: string };
        };

        if (
          parsed.type !== 'code' &&
          parsed.type !== 'summary' &&
          parsed.type !== 'code_result'
        ) {
          return;
        }

        // Backward compatibility for older `code_result` payloads.
        const data: AssistantResponse = parsed.type === 'code_result'
          ? {
              type: 'code',
              language: parsed.language,
              content: parsed.code,
            }
          : parsed;

        if (parsed.type === 'code_result' && parsed.summary) {
          setSummary({
            what_it_does: parsed.summary.what_it_does,
            components: parsed.summary.key_components,
            flow: parsed.summary.how_to_extend,
          });
        }

        pendingReplyRef.current = false;
        setIsLoading(false);

        if (data.type === 'summary') {
          setSummary(data.content);
          setIntent('explain_code');
          setActiveTab('summary');
          return;
        }

        const lang = data.language;
        const generatedCode = data.content;
        setCode(generatedCode);
        setLanguage(lang);
        setIntent('generate_code');
        setActiveTab('output');

        if (lang === 'python' && generatedCode) {
          setIsRunning(true);
          setRunError(null);
          runCode(generatedCode, accessToken)
            .then((result) => {
              setRunResult(result);
            })
            .catch((err) => {
              console.error('Auto-run error:', err);
              setRunError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => setIsRunning(false));
        }
      } catch (err) {
        console.error('assistant_result parse error:', err);
        setIsLoading(false);
      }
    },
    [accessToken],
  );

  useDataChannel('assistant_result', handleAssistantResult);
  useDataChannel('code_result', handleAssistantResult);

  // ── Run handler ────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!code || language !== 'python') return;
    setIsRunning(true);
    setRunResult(null);
    setRunError(null);
    setActiveTab('output');
    try {
      const result = await runCode(code, accessToken);
      setRunResult(result);
    } catch (err) {
      console.error('Run error:', err);
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [code, language, accessToken]);
  // ── Download handler ─────────────────────────────────────────
  const downloadZip = useDownloadZip();
  const handleDownload = useCallback(() => {
    downloadZip({
      code,
      language,
      summary,
      projectName: currentProject?.name,
    });
  }, [code, language, summary, currentProject, downloadZip]);

  return (
    <div className="relative flex h-svh w-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <header className="relative z-10 shrink-0 border-b border-slate-800 bg-slate-950/90 px-3 py-2 md:px-4">
        <div className="flex items-center gap-2">
          {/* Back navigation */}
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Divider */}
          <span className="hidden h-4 w-px shrink-0 bg-slate-800 sm:block" />

          {/* Brand icon */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-400 to-sky-500 shadow-sm shadow-cyan-500/20">
            <SparklesIcon className="h-3 w-3 text-slate-950" />
          </span>

          {/* Workspace title */}
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-100">
              {currentProject?.name ?? 'Loading...'}
            </h1>
            <span className="hidden text-xs text-slate-500 sm:inline">— VoiceForge Studio</span>
          </div>

          {/* Status badges + actions (pushed right) */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* Language badge */}
            <span className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 sm:inline-flex">
              <Code2Icon className="h-3 w-3 text-cyan-300" />
              {language.toUpperCase()}
            </span>

            {/* Activity badge */}
            <span className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 md:inline-flex">
              {isLoading
                ? <LoaderCircleIcon className="h-3 w-3 animate-spin text-cyan-300" />
                : <ActivityIcon className="h-3 w-3 text-emerald-400" />}
              {isLoading ? 'Working...' : 'Ready'}
            </span>

            {/* Connection badge */}
            <span
              className={`hidden items-center gap-1 rounded-md border px-2 py-1 text-[11px] md:inline-flex ${
                session.isConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              {session.isConnected
                ? <WifiIcon className="h-3 w-3" />
                : <WifiOffIcon className="h-3 w-3" />}
              {session.isConnected ? 'Live' : 'Offline'}
            </span>

            {/* Run button */}
            {language === 'python' && (
              <Button
                size="sm"
                onClick={handleRun}
                disabled={!code || isRunning}
                className="h-7 rounded-md bg-cyan-400 px-3 text-xs text-slate-950 shadow-sm hover:bg-cyan-300 disabled:opacity-50"
              >
                <PlayIcon className="h-3 w-3" />
                <span className="ml-1 hidden sm:inline">{isRunning ? 'Running...' : 'Run'}</span>
              </Button>
            )}

            {/* Download ZIP button */}
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={!code}
              variant="outline"
              className="h-7 rounded-md border-slate-600 bg-slate-900 px-2.5 text-xs text-slate-300 shadow-sm hover:bg-slate-800 hover:text-white disabled:opacity-40"
              title="Download code as ZIP"
            >
              <DownloadCloudIcon className="h-3 w-3" />
              <span className="ml-1 hidden sm:inline">ZIP</span>
            </Button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-red-400"
              title="Logout"
            >
              <LogOutIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="relative z-10 flex-1 overflow-hidden p-3">
        <ResizablePanel defaultSize={22} minSize={14} maxSize={35}>
          <div className="h-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-slate-700">
            <LeftPanel
              messages={messages}
              intent={intent}
              projects={currentProject ? [currentProject] : []}
              selectedProjectId={projectId}
              onSelectProject={() => {}}
              onNewProject={() => {}}
              isLoading={isLoading}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle className="mx-2 bg-transparent">
          <div className="h-14 w-1 rounded-full bg-slate-700/70" />
        </ResizableHandle>

        <ResizablePanel defaultSize={48} minSize={25}>
          <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-slate-700">
            <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300">
              <span className="tracking-wide uppercase">Editor</span>
              <span className="font-mono text-[11px] text-cyan-300">{language}</span>
            </div>
            <MonacoEditor value={code} language={language} onChange={setCode} className="flex-1" />
          </div>
        </ResizablePanel>

        <ResizableHandle className="mx-2 bg-transparent">
          <div className="h-14 w-1 rounded-full bg-slate-700/70" />
        </ResizableHandle>

        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="h-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-slate-700">
            <OutputPanel
              plan={null}
              summary={summary}
              runResult={runResult}
              runError={runError}
              code={code}
              language={language}
              isRunning={isRunning}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRun={language === 'python' ? handleRun : undefined}
              onDownload={handleDownload}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Voice agent control bar */}
      <footer className="relative z-20 shrink-0 border-t border-slate-800 bg-slate-950/95 px-4 py-2">
        <div className="flex items-center justify-center">
          <AgentControlBar
            variant="livekit"
            controls={{ leave: true, microphone: true, chat: false, camera: false, screenShare: false }}
            isChatOpen={false}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={() => {}}
          />
        </div>
      </footer>
    </div>
  );
}
