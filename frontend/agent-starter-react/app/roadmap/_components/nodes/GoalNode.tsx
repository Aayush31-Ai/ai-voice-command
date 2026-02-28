'use client';

import { Handle, Position } from '@xyflow/react';

interface GoalNodeData {
  label: string;
  estimated_duration?: string;
  next_actions?: string[];
}

export default function GoalNode({
  data,
  selected,
}: {
  data: GoalNodeData;
  selected?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[80px] w-[220px] flex-col items-start justify-center rounded-xl border px-3.5 py-2.5 transition-all duration-150 cursor-pointer
        bg-gradient-to-br from-blue-700 to-blue-600 border-blue-400/40 shadow-[0_0_24px_rgba(37,99,235,0.3)] 
        hover:-translate-y-px hover:shadow-[0_4px_18px_rgba(0,0,0,0.45)]
        ${selected ? 'ring-2 ring-white/75' : ''}`}
    >
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white/20 !border-0" />
      <div className="mb-1 text-[0.65rem] text-white/55">★</div>
      <div className="text-[0.88rem] font-bold text-white leading-tight max-w-[185px] break-words">
        {data.label}
      </div>
      {data.estimated_duration && (
        <div className="mt-1 text-[0.65rem] text-white/45">{data.estimated_duration}</div>
      )}
    </div>
  );
}
