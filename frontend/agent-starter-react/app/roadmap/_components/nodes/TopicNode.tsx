'use client';

import { Handle, Position } from '@xyflow/react';

export default function TopicNode({
  data,
  selected,
}: {
  data: { label: string };
  selected?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[52px] w-[165px] flex-row items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-150 cursor-pointer
        bg-slate-800 border-slate-600
        hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,0.45)]
        ${selected ? 'ring-2 ring-white/75' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-0" />
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
      <div className="text-[0.78rem] font-medium text-slate-100 leading-tight break-words">
        {data.label}
      </div>
    </div>
  );
}
