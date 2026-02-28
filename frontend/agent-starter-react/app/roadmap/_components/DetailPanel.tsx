'use client';

import type { Node } from '@xyflow/react';
import { XIcon } from 'lucide-react';

export default function DetailPanel({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  const { type, data } = node;

  const renderContent = () => {
    switch (type) {
      case 'goalNode':
        return (
          <>
            <h2 className="mb-1.5 text-[0.98rem] font-semibold text-slate-100 leading-snug mt-2">
              {data.label as string}
            </h2>
            {data.estimated_duration && (
              <p className="mb-3.5 text-xs text-slate-400">
                Estimated Duration:{' '}
                <strong className="text-slate-200">{data.estimated_duration as string}</strong>
              </p>
            )}
            {(data.next_actions as string[] | undefined)?.length ? (
              <div className="mt-3.5">
                <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-widest text-slate-500">
                  Next Actions
                </p>
                <ul className="flex flex-col gap-1.5">
                  {(data.next_actions as string[]).map((a, i) => (
                    <li
                      key={i}
                      className="rounded-md border-l-2 border-blue-400 bg-white/[0.03] px-2.5 py-1.5 text-[0.82rem] text-slate-300 leading-snug"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        );

      case 'phaseNode':
        return (
          <>
            <span className="inline-block rounded bg-purple-400/20 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-purple-300 mb-2">
              Phase {data.phaseIndex as number}
            </span>
            <h2 className="mb-1.5 text-[0.98rem] font-semibold text-slate-100 leading-snug">
              {data.label as string}
            </h2>
            {data.duration && (
              <p className="text-xs text-slate-400">
                Duration: <strong className="text-slate-200">{data.duration as string}</strong>
              </p>
            )}
          </>
        );

      case 'topicNode':
        return (
          <>
            <span className="inline-block rounded bg-slate-700/40 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Topic
            </span>
            <h2 className="mb-2 text-[0.98rem] font-semibold text-slate-100 leading-snug">
              {data.label as string}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click the connected Phase node to see all topics and projects in that phase.
            </p>
          </>
        );

      case 'projectNode':
        return (
          <>
            <span className="inline-block rounded bg-orange-400/20 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-orange-300 mb-2">
              Project
            </span>
            <h2 className="mb-2 text-[0.98rem] font-semibold text-slate-100 leading-snug">
              {data.label as string}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hands-on project for the parent phase. Build it to solidify the phase&apos;s concepts.
            </p>
          </>
        );

      case 'milestoneNode':
        return (
          <>
            <span className="inline-block rounded bg-amber-400/20 px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-widest text-amber-300 mb-2">
              Milestone {data.index as number}
            </span>
            <h2 className="mb-2 text-[0.98rem] font-semibold text-slate-100 leading-snug">
              {data.label as string}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Reach this milestone to mark a major checkpoint in your learning journey.
            </p>
          </>
        );

      default:
        return <p className="text-xs text-slate-500">{JSON.stringify(data)}</p>;
    }
  };

  return (
    <div className="w-[280px] min-w-[280px] relative animate-in slide-in-from-right-2 overflow-y-auto border-l border-slate-700/60 bg-slate-900 p-5">
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:text-slate-200 transition-colors"
      >
        <XIcon className="h-4 w-4" />
      </button>
      {renderContent()}
    </div>
  );
}
