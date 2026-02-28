'use client';

import { DownloadCloudIcon, PlayIcon } from 'lucide-react';
import type { PlanResponse, AssistantSummaryContent, RunResult, LanguageType } from '@/lib/voiceforge-api';
import { TabPanel } from '@/components/forge/tab-panel';
import { Button } from '@/components/ui/button';

interface OutputPanelProps {
  plan?: PlanResponse | null;
  summary?: AssistantSummaryContent | null;
  runResult?: RunResult | null;
  runError?: string | null;
  code: string;
  language: LanguageType;
  isRunning: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRun?: () => void;
  onDownload?: () => void;
}

export function OutputPanel({
  plan,
  summary,
  runResult,
  runError,
  code,
  language,
  isRunning,
  activeTab,
  onTabChange,
  onRun,
  onDownload,
}: OutputPanelProps) {
  const planContent = (
    <div className="overflow-y-auto space-y-2 text-slate-200">
      {!plan ? (
        <p className="italic text-slate-500">Planning will appear here...</p>
      ) : (
        <>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Language: {plan.language}
          </p>
          <p className="rounded-md border border-slate-800 bg-slate-950/70 p-2 text-xs font-medium text-slate-300">
            {plan.approach}
          </p>
          <ol className="list-decimal list-inside space-y-1">
            {plan.plan.map((step, i) => (
              <li key={i} className="text-sm">
                {step}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );

  const outputContent = (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Action buttons — always shown when code is present */}
      {code && (
        <div className="flex shrink-0 items-center gap-2">
          {onRun && language === 'python' && (
            <button
              onClick={onRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-md bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              <PlayIcon className="h-3.5 w-3.5" />
              {isRunning ? 'Running…' : 'Run'}
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <DownloadCloudIcon className="h-3.5 w-3.5" />
              Download ZIP
            </button>
          )}
        </div>
      )}
      {language === 'html' && code ? (
        // HTML live preview — needs explicit flex height so iframe fills the panel
        <iframe
          srcDoc={code}
          title="HTML Preview"
          sandbox="allow-scripts"
          className="flex-1 min-h-0 w-full border-0 rounded-md bg-white"
        />
      ) : isRunning ? (
        <div className="flex items-center gap-2 text-cyan-200">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          <p className="italic">Running...</p>
        </div>
      ) : runError ? (
        <div className="overflow-y-auto space-y-2 font-mono text-xs">
          <p className="text-red-400 font-semibold">⚠️ Run failed</p>
          <pre className="whitespace-pre-wrap rounded border border-red-500/30 bg-red-500/10 p-2 text-red-300">
            {runError}
          </pre>
          <p className="text-slate-500 text-[11px]">Make sure the backend is running at the configured URL.</p>
        </div>
      ) : runResult ? (
        <div className="overflow-y-auto font-mono text-xs space-y-2">
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
        <p className="italic text-slate-500">Output will appear here after running...</p>
      )}
    </div>
  );

  const summaryContent = (
    <div className="overflow-y-auto space-y-3 text-slate-200">
      {!summary ? (
        <p className="italic text-slate-500">Summary will appear after code is generated...</p>
      ) : (
        <>
          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2.5">
            <p className="mb-0.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              What it does
            </p>
            <p className="text-sm">{summary.what_it_does}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2.5">
            <p className="mb-0.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Components
            </p>
            <p className="text-sm">{summary.components}</p>
          </div>
          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2.5">
            <p className="mb-0.5 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Flow
            </p>
            <p className="text-sm">{summary.flow}</p>
          </div>
        </>
      )}
    </div>
  );

  const panelActions = (
    <>
      {onRun && (
        <Button
          size="sm"
          onClick={onRun}
          disabled={!code || isRunning}
          className="h-6 rounded px-2 text-[11px] bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
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
          title="Download as ZIP"
        >
          <DownloadCloudIcon className="h-3 w-3 mr-1" />
          ZIP
        </Button>
      )}
    </>
  );

  return (
    <TabPanel
      activeTab={activeTab}
      onTabChange={onTabChange}
      actions={panelActions}
      tabs={[
        { id: 'planning', label: 'Planning', content: planContent },
        { id: 'output', label: 'Output', content: outputContent },
        { id: 'summary', label: 'Summary', content: summaryContent },
      ]}
    />
  );
}
