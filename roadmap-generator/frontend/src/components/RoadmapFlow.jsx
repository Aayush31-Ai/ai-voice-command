import { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { buildGraphFromRoadmap } from '../utils/layoutUtils.js';
import GoalNode from './nodes/GoalNode.jsx';
import PhaseNode from './nodes/PhaseNode.jsx';
import TopicNode from './nodes/TopicNode.jsx';
import ProjectNode from './nodes/ProjectNode.jsx';
import MilestoneNode from './nodes/MilestoneNode.jsx';

// IMPORTANT: nodeTypes must be defined OUTSIDE the component.
// Defining inside causes React Flow to re-register on every render → infinite loop.
const NODE_TYPES = {
  goalNode: GoalNode,
  phaseNode: PhaseNode,
  topicNode: TopicNode,
  projectNode: ProjectNode,
  milestoneNode: MilestoneNode,
};

function Flow({ roadmap, onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!roadmap) return;
    const { nodes: layoutedNodes, edges: layoutedEdges } = buildGraphFromRoadmap(roadmap);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [roadmap]);

  const handleNodeClick = useCallback(
    (_event, node) => {
      onNodeClick(node);
    },
    [onNodeClick]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#2a2a2a" gap={24} size={1.5} variant="dots" />
      <Controls
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
        }}
      />
      <MiniMap
        nodeColor={(node) => {
          const colors = {
            goalNode:      '#2563eb',
            phaseNode:     '#7c3aed',
            topicNode:     '#334155',
            projectNode:   '#ea580c',
            milestoneNode: '#d97706',
          };
          return colors[node.type] || '#333';
        }}
        maskColor="rgba(0,0,0,0.6)"
        style={{ background: '#111', border: '1px solid #333' }}
      />
    </ReactFlow>
  );
}

export default function RoadmapFlow({ roadmap, onNodeClick }) {
  return (
    <ReactFlowProvider>
      <Flow roadmap={roadmap} onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
}
