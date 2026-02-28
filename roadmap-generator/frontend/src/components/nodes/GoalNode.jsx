import { Handle, Position } from '@xyflow/react';
import '../../styles/nodes.css';

export default function GoalNode({ data, selected }) {
  return (
    <div className={`node node-goal ${selected ? 'node-selected' : ''}`}>
      <Handle type="source" position={Position.Right} className="node-handle" />
      <div className="node-goal-icon">★</div>
      <div className="node-label">{data.label}</div>
      {data.estimated_duration && (
        <div className="node-sublabel">{data.estimated_duration}</div>
      )}
    </div>
  );
}
