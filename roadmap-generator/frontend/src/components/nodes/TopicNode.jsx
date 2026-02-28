import { Handle, Position } from '@xyflow/react';
import '../../styles/nodes.css';

export default function TopicNode({ data, selected }) {
  return (
    <div className={`node node-topic ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <span className="node-dot node-dot-topic" />
      <div className="node-label">{data.label}</div>
    </div>
  );
}
