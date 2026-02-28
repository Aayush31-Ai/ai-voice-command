import { Handle, Position } from '@xyflow/react';
import '../../styles/nodes.css';

export default function PhaseNode({ data, selected }) {
  return (
    <div className={`node node-phase ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
      <div className="node-phase-badge">Phase {data.phaseIndex}</div>
      <div className="node-label">{data.label}</div>
      {data.duration && (
        <div className="node-sublabel">{data.duration}</div>
      )}
    </div>
  );
}
