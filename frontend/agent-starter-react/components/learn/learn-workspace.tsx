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
  BookOpenIcon,
  ArrowLeftIcon,
  LogOutIcon,
  WifiIcon,
  WifiOffIcon,
  UploadIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LanguageType, RunResult, LearnCodeResponse, LearnBookRecord } from '@/lib/voiceforge-api';
import { getLearnBook, updateLearnBook, runCode, uploadLearnBookPdf } from '@/lib/voiceforge-api';
import { useDownloadZip } from '@/hooks/useDownloadZip';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { LearnLeftPanel } from '@/components/learn/learn-left-panel';
import { MonacoEditor } from '@/components/forge/monaco-editor';
import { LearnOutputPanel } from '@/components/learn/learn-output-panel';
import { Button } from '@/components/ui/button';

interface LearnWorkspaceProps {
  accessToken: string;
  bookId: string;
}

export function LearnWorkspace({ accessToken, bookId }: LearnWorkspaceProps) {
  const session = useSessionContext();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const { messages } = useSessionMessages();

  // ── Editor state ──────────────────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<LanguageType>('python');

  // ── Learn / pipeline state ────────────────────────────────────────────────
  const [intent, setIntent] = useState<string | null>(null);
  const [learnResponse, setLearnResponse] = useState<LearnCodeResponse | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [activeTab, setActiveTab] = useState('output');
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // ── Book metadata ─────────────────────────────────────────────────────────
  const [currentBook, setCurrentBook] = useState<LearnBookRecord | null>(null);
  const [bookLoaded, setBookLoaded] = useState(false);

  // ── PDF upload state ──────────────────────────────────────────────────────
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfUploadDone, setPdfUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Message tracking refs ─────────────────────────────────────────────────
  const lastProcessedId = useRef<string | null>(
    [...messages].reverse().find((m: ReceivedMessage) => m.from?.isLocal)?.id ?? null
  );
  const lastAgentMsgId = useRef<string | null>(
    [...messages].reverse().find((m: ReceivedMessage) => !m.from?.isLocal)?.id ?? null
  );
  const pendingReplyRef = useRef(false);

  // Channel to push book context (code + language + bookId) to the agent.
  const { send: sendLearnContext } = useDataChannel('learn_book_context');
  // Also keep the standard editor_context channel in sync for debug/explain tools.
  const { send: sendEditorContext } = useDataChannel('editor_context');

  // ── Load book on mount ────────────────────────────────────────────────────
  useEffect(() => {
    getLearnBook(bookId, accessToken)
      .then((book) => {
        setCurrentBook(book);
        setCode(book.code ?? '');
        setLanguage(book.language ?? 'python');
        setBookLoaded(true);
      })
      .catch(console.error);
  }, [bookId, accessToken]);

  // ── Send book_id to agent immediately once book loads ─────────────────────
  useEffect(() => {
    if (!bookLoaded) return;
    const learnPayload = new TextEncoder().encode(
      JSON.stringify({ code, language, book_id: bookId })
    );
    sendLearnContext(learnPayload, { reliable: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookLoaded]); // fire once on load; debounced sync keeps it updated after

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!bookLoaded || !code) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      updateLearnBook(bookId, { code, language }, accessToken).catch(console.error);
    }, 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [code, language, bookId, bookLoaded, accessToken]);

  // ── Sync context to agent (debounced) ─────────────────────────────────────
  const contextSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (contextSyncRef.current) clearTimeout(contextSyncRef.current);
    contextSyncRef.current = setTimeout(() => {
      const learnPayload = new TextEncoder().encode(
        JSON.stringify({ code, language, book_id: bookId })
      );
      sendLearnContext(learnPayload, { reliable: true });
      const editorPayload = new TextEncoder().encode(JSON.stringify({ code, language }));
      sendEditorContext(editorPayload, { reliable: true });
    }, 1500);
    return () => { if (contextSyncRef.current) clearTimeout(contextSyncRef.current); };
  }, [code, language, bookId, sendLearnContext, sendEditorContext]);

  // ── When user speaks: prepare loading ────────────────────────────────────
  useEffect(() => {
    const lastLocal = [...messages].reverse().find((m: ReceivedMessage) => m.from?.isLocal);
    if (!lastLocal || lastLocal.id === lastProcessedId.current) return;
    lastProcessedId.current = lastLocal.id;
    if (!lastLocal.message?.trim()) return;

    const learnPayload = new TextEncoder().encode(
      JSON.stringify({ code, language, book_id: bookId })
    );
    sendLearnContext(learnPayload, { reliable: true });

    setIsLoading(true);
    setLearnResponse(null);
    setRunResult(null);
    setRunError(null);
    setIntent(null);
    setActiveTab('output');
    pendingReplyRef.current = true;
  }, [messages, code, language, bookId, sendLearnContext]);

  // ── Clear loading on text-only agent reply ────────────────────────────────
  useEffect(() => {
    const lastAgent = [...messages].reverse().find((m: ReceivedMessage) => !m.from?.isLocal);
    if (!lastAgent || lastAgent.id === lastAgentMsgId.current) return;
    lastAgentMsgId.current = lastAgent.id;
    if (pendingReplyRef.current) {
      pendingReplyRef.current = false;
      setIsLoading(false);
    }
  }, [messages]);

  // ── Handle learn_code_result from agent ───────────────────────────────────
  const handleLearnCodeResult = useCallback(
    (msg: { payload: Uint8Array }) => {
      try {
        const text = new TextDecoder().decode(msg.payload);
        const data = JSON.parse(text) as {
          type: string;
          code: string;
          language: LanguageType;
          detailed_explanation: string;
          step_by_step: string[];
          key_concepts: string[];
          rag_sources: string[];
        };
        if (data.type !== 'learn_code_result') return;

        setCode(data.code);
        setLanguage(data.language);
        setIntent('generate');
        setLearnResponse({
          language: data.language,
          code: data.code,
          detailed_explanation: data.detailed_explanation,
          step_by_step: data.step_by_step,
          key_concepts: data.key_concepts,
          rag_sources: data.rag_sources?.length ? data.rag_sources : undefined,
        });
        pendingReplyRef.current = false;
        setIsLoading(false);

        // Auto-run Python; HTML live preview
        if (data.language === 'html') {
          setActiveTab('output');
        } else {
          setActiveTab('explanation');
          if (data.code) {
            setIsRunning(true);
            setRunError(null);
            runCode(data.code, accessToken)
              .then(setRunResult)
              .catch((err) => setRunError(err instanceof Error ? err.message : String(err)))
              .finally(() => setIsRunning(false));
          }
        }
      } catch (err) {
        console.error('learn_code_result parse error:', err);
        setIsLoading(false);
      }
    },
    [accessToken],
  );

  useDataChannel('learn_code_result', handleLearnCodeResult);

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
      setRunError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [code, language, accessToken]);

  // ── Download ZIP ──────────────────────────────────────────────────────────
  const downloadZip = useDownloadZip();
  const handleDownload = useCallback(() => {
    downloadZip({
      code,
      language,
      summary: learnResponse
        ? {
            what_it_does: learnResponse.detailed_explanation.slice(0, 200),
            components: learnResponse.key_concepts.join(', '),
            flow: '',
          }
        : null,
      projectName: currentBook?.name,
    });
  }, [code, language, learnResponse, currentBook, downloadZip]);

  // ── PDF upload handler ────────────────────────────────────────────────────
  const handlePdfUpload = useCallback(
    async (file: File) => {
      setUploadingPdf(true);
      try {
        await uploadLearnBookPdf(bookId, file, accessToken);
        setCurrentBook((prev) => prev ? { ...prev, has_pdf: true } : prev);
        setPdfUploadDone(true);
        setTimeout(() => setPdfUploadDone(false), 3000);
      } catch (err) {
        console.error('PDF upload failed:', err);
      } finally {
        setUploadingPdf(false);
      }
    },
    [bookId, accessToken]
  );

  return (
    <div className="relative flex h-svh w-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      {/* Header */}
      <header className="relative z-10 shrink-0 border-b border-slate-800 bg-slate-950/90 px-3 py-2 md:px-4">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-700/70 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <span className="hidden h-4 w-px shrink-0 bg-slate-800 sm:block" />

          {/* Learn mode icon */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-500/20">
            <BookOpenIcon className="h-3 w-3 text-white" />
          </span>

          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-100">
              {currentBook?.name ?? 'Loading...'}
            </h1>
            <span className="hidden text-xs text-slate-500 sm:inline">— Learn Mode</span>
          </div>

          {/* Right-side actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {/* Language badge */}
            <span className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 sm:inline-flex">
              <Code2Icon className="h-3 w-3 text-violet-300" />
              {language.toUpperCase()}
            </span>

            {/* Activity badge */}
            <span className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 md:inline-flex">
              {isLoading
                ? <LoaderCircleIcon className="h-3 w-3 animate-spin text-violet-300" />
                : <ActivityIcon className="h-3 w-3 text-emerald-400" />}
              {isLoading ? 'Thinking...' : 'Ready'}
            </span>

            {/* Connection badge */}
            <span
              className={`hidden items-center gap-1 rounded-md border px-2 py-1 text-[11px] md:inline-flex ${
                session.isConnected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400'
              }`}
            >
              {session.isConnected ? <WifiIcon className="h-3 w-3" /> : <WifiOffIcon className="h-3 w-3" />}
              {session.isConnected ? 'Live' : 'Offline'}
            </span>

            {/* PDF upload button */}
            {!currentBook?.has_pdf && (
              <>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPdf}
                  variant="outline"
                  className="h-7 rounded-md border-violet-600/40 bg-violet-500/10 px-2.5 text-xs text-violet-300 hover:bg-violet-500/20 hover:text-violet-200"
                  title="Upload reference PDF"
                >
                  {uploadingPdf
                    ? <LoaderCircleIcon className="h-3 w-3 animate-spin" />
                    : <UploadIcon className="h-3 w-3" />}
                  <span className="ml-1 hidden sm:inline">{uploadingPdf ? 'Indexing...' : 'Add PDF'}</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                    e.target.value = '';
                  }}
                />
              </>
            )}

            {(currentBook?.has_pdf || pdfUploadDone) && (
              <span className="hidden items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 sm:inline-flex">
                <CheckCircleIcon className="h-3 w-3" />
                PDF Ready
              </span>
            )}

            {/* Run button */}
            {language === 'python' && (
              <Button
                size="sm"
                onClick={handleRun}
                disabled={!code || isRunning}
                className="h-7 rounded-md bg-violet-500 px-3 text-xs text-white shadow-sm hover:bg-violet-400 disabled:opacity-50"
              >
                <PlayIcon className="h-3 w-3" />
                <span className="ml-1 hidden sm:inline">{isRunning ? 'Running...' : 'Run'}</span>
              </Button>
            )}

            {/* Download ZIP */}
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
            >
              <LogOutIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3-panel layout */}
      <ResizablePanelGroup direction="horizontal" className="relative z-10 flex-1 overflow-hidden p-3">
        <ResizablePanel defaultSize={22} minSize={14} maxSize={35}>
          <div className="h-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-slate-700">
            <LearnLeftPanel
              messages={messages}
              intent={intent}
              currentBook={currentBook}
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
              <span className="font-mono text-[11px] text-violet-300">{language}</span>
            </div>
            <MonacoEditor value={code} language={language} onChange={setCode} className="flex-1" />
          </div>
        </ResizablePanel>

        <ResizableHandle className="mx-2 bg-transparent">
          <div className="h-14 w-1 rounded-full bg-slate-700/70" />
        </ResizableHandle>

        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="h-full rounded-xl border border-slate-800 bg-slate-900/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:border-slate-700">
            <LearnOutputPanel
              learnResponse={learnResponse}
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
