'use client';

import { Handle, Position } from '@xyflow/react';

export default function ProjectNode({
  data,
  selected,
}: {
  data: { label: string };
  selected?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[52px] w-[165px] flex-row flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2 transition-all duration-150 cursor-pointer
        bg-gradient-to-br from-orange-900 to-orange-800 border-orange-400/32
        hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,0.45)]
        ${selected ? 'ring-2 ring-white/75' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-0" />
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
      <div className="flex-1 min-w-0 text-[0.78rem] font-medium text-slate-100 leading-tight break-words">
        {data.label}
      </div>
      <span className="self-end rounded px-1 py-0.5 text-[0.54rem] font-bold uppercase tracking-widest text-orange-400/65 bg-orange-400/10">
        PROJECT
      </span>
    </div>
  );
}
