'use client';

import { useCallback, useEffect } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – CSS module from xyflow
import '@xyflow/react/dist/style.css';

import { buildGraphFromRoadmap } from '../_lib/layoutUtils';
import type { Roadmap } from '../_lib/api';
import GoalNode from './nodes/GoalNode';
import MilestoneNode from './nodes/MilestoneNode';
import PhaseNode from './nodes/PhaseNode';
import ProjectNode from './nodes/ProjectNode';
import TopicNode from './nodes/TopicNode';

// IMPORTANT: must be defined outside component to avoid infinite re-render loop
const NODE_TYPES = {
  goalNode: GoalNode,
  phaseNode: PhaseNode,
  topicNode: TopicNode,
  projectNode: ProjectNode,
  milestoneNode: MilestoneNode,
};

function Flow({
  roadmap,
  onNodeClick,
}: {
  roadmap: Roadmap;
  onNodeClick: (node: Node) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!roadmap) return;
    const { nodes: layoutNodes, edges: layoutEdges } = buildGraphFromRoadmap(roadmap);
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [roadmap, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_evt: React.MouseEvent, node: Node) => {
      onNodeClick(node);
    },
    [onNodeClick],
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
      <Background color="#2a2a2a" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
      <Controls
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
        }}
      />
      <MiniMap
        nodeColor={(node) => {
          const colors: Record<string, string> = {
            goalNode:      '#2563eb',
            phaseNode:     '#7c3aed',
            topicNode:     '#334155',
            projectNode:   '#ea580c',
            milestoneNode: '#d97706',
          };
          return colors[node.type ?? ''] ?? '#333';
        }}
        maskColor="rgba(0,0,0,0.6)"
        style={{ background: '#111', border: '1px solid #333' }}
      />
    </ReactFlow>
  );
}

export default function RoadmapFlow({
  roadmap,
  onNodeClick,
}: {
  roadmap: Roadmap;
  onNodeClick: (node: Node) => void;
}) {
  return (
    <ReactFlowProvider>
      <Flow roadmap={roadmap} onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
}
