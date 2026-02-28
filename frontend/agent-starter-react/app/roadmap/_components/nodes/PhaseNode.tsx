'use client';

import { Handle, Position } from '@xyflow/react';

interface PhaseNodeData {
  label: string;
  duration?: string;
  phaseIndex: number;
}

export default function PhaseNode({
  data,
  selected,
}: {
  data: PhaseNodeData;
  selected?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[65px] w-[190px] flex-col items-start justify-center rounded-xl border px-3.5 py-2.5 transition-all duration-150 cursor-pointer
        bg-gradient-to-br from-purple-800 to-purple-600 border-purple-400/30 shadow-[0_0_14px_rgba(124,58,237,0.22)]
        hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,0.45)]
        ${selected ? 'ring-2 ring-white/75' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-0" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white/20 !border-0" />
      <div className="mb-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-purple-300/75">
        Phase {data.phaseIndex}
      </div>
      <div className="text-[0.78rem] font-medium text-slate-100 leading-tight max-w-[160px] break-words">
        {data.label}
      </div>
      {data.duration && (
        <div className="mt-0.5 text-[0.65rem] text-white/45">{data.duration}</div>
      )}
    </div>
  );
}
