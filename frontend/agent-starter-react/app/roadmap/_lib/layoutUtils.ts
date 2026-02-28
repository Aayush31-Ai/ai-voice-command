import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { Roadmap } from './api';

// Pixel dimensions must match the CSS/Tailwind of each node
const NODE_DIMS: Record<string, { width: number; height: number }> = {
  goal:      { width: 220, height: 80 },
  phase:     { width: 190, height: 65 },
  topic:     { width: 165, height: 52 },
  project:   { width: 165, height: 52 },
  milestone: { width: 165, height: 52 },
};

export function buildGraphFromRoadmap(roadmap: Roadmap): {
  nodes: Node[];
  edges: Edge[];
} {
  const rawNodes: Node[] = [];
  const rawEdges: Edge[] = [];

  // Goal node
  rawNodes.push({
    id: 'goal',
    type: 'goalNode',
    data: {
      label: roadmap.goal,
      estimated_duration: roadmap.estimated_duration,
      next_actions: roadmap.next_actions,
    },
    position: { x: 0, y: 0 },
  });

  // Phase nodes + children
  (roadmap.phases ?? []).forEach((phase, phaseIdx) => {
    const phaseId = `phase-${phaseIdx}`;

    rawNodes.push({
      id: phaseId,
      type: 'phaseNode',
      data: {
        label: phase.title,
        duration: phase.duration,
        phaseIndex: phaseIdx + 1,
      },
      position: { x: 0, y: 0 },
    });

    rawEdges.push({
      id: `e-goal-${phaseId}`,
      source: 'goal',
      target: phaseId,
      animated: false,
      style: { stroke: '#7c3aed', strokeWidth: 2 },
    });

    (phase.topics ?? []).forEach((topic, topicIdx) => {
      const topicId = `${phaseId}-topic-${topicIdx}`;
      rawNodes.push({
        id: topicId,
        type: 'topicNode',
        data: { label: topic },
        position: { x: 0, y: 0 },
      });
      rawEdges.push({
        id: `e-${phaseId}-${topicId}`,
        source: phaseId,
        target: topicId,
        style: { stroke: '#475569', strokeWidth: 1.5 },
      });
    });

    (phase.projects ?? []).forEach((project, projIdx) => {
      const projId = `${phaseId}-project-${projIdx}`;
      rawNodes.push({
        id: projId,
        type: 'projectNode',
        data: { label: project },
        position: { x: 0, y: 0 },
      });
      rawEdges.push({
        id: `e-${phaseId}-${projId}`,
        source: phaseId,
        target: projId,
        style: { stroke: '#ea580c', strokeWidth: 1.5, strokeDasharray: '4 3' },
      });
    });
  });

  // Milestone nodes
  (roadmap.milestones ?? []).forEach((milestone, msIdx) => {
    const msId = `milestone-${msIdx}`;
    rawNodes.push({
      id: msId,
      type: 'milestoneNode',
      data: { label: milestone, index: msIdx + 1 },
      position: { x: 0, y: 0 },
    });
    rawEdges.push({
      id: `e-goal-${msId}`,
      source: 'goal',
      target: msId,
      style: { stroke: '#d97706', strokeWidth: 1.5, strokeDasharray: '5 4' },
    });
  });

  return applyDagreLayout(rawNodes, rawEdges);
}

function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranksep: 90,
    nodesep: 28,
    edgesep: 10,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    const key = (node.type ?? '').replace('Node', '');
    const dims = NODE_DIMS[key] ?? { width: 165, height: 52 };
    g.setNode(node.id, { width: dims.width, height: dims.height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const positionedNodes = nodes.map((node) => {
    const key = (node.type ?? '').replace('Node', '');
    const dims = NODE_DIMS[key] ?? { width: 165, height: 52 };
    const dagreNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagreNode.x - dims.width / 2,
        y: dagreNode.y - dims.height / 2,
      },
    };
  });

  return { nodes: positionedNodes, edges };
}
