import { Handle, Position } from '@xyflow/react';
import '../../styles/nodes.css';

export default function MilestoneNode({ data, selected }) {
  return (
    <div className={`node node-milestone ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <span className="node-milestone-icon">◆</span>
      <div className="node-label">{data.label}</div>
    </div>
  );
}
