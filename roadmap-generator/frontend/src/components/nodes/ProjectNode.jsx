import { Handle, Position } from '@xyflow/react';
import '../../styles/nodes.css';

export default function ProjectNode({ data, selected }) {
  return (
    <div className={`node node-project ${selected ? 'node-selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <span className="node-dot node-dot-project" />
      <div className="node-label">{data.label}</div>
      <div className="node-project-tag">PROJECT</div>
    </div>
  );
}
