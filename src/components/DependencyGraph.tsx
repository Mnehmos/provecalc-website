/**
 * DependencyGraph - Visual dependency and timeline tracker
 *
 * Shows the flow: Given → Equation → SolveGoal → Result
 * With lines connecting dependencies and a timeline view.
 */

import { useMemo, useState, useCallback } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { WorksheetNode, NodeId } from '../types/document';

interface GraphNode {
  id: NodeId;
  type: WorksheetNode['type'];
  label: string;
  x: number;
  y: number;
  depth: number;
  dependencies: NodeId[];
  dependents: NodeId[];
}

interface GraphEdge {
  from: NodeId;
  to: NodeId;
  type: 'dependency' | 'computed';
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 60;
const PADDING = 40;

// Node type colors and icons
const NODE_STYLES: Record<string, { color: string; icon: string; bg: string }> = {
  given: { color: '#22c55e', icon: '📥', bg: '#22c55e20' },
  equation: { color: '#3b82f6', icon: '📐', bg: '#3b82f620' },
  solve_goal: { color: '#f59e0b', icon: '🎯', bg: '#f59e0b20' },
  result: { color: '#d4956a', icon: '✓', bg: '#d4956a20' },
  text: { color: '#6b7280', icon: '📝', bg: '#6b728020' },
  constraint: { color: '#ef4444', icon: '🔒', bg: '#ef444420' },
  plot: { color: '#06b6d4', icon: '📊', bg: '#06b6d420' },
};

// Get short label for a node
function getNodeLabel(node: WorksheetNode): string {
  switch (node.type) {
    case 'given':
      return `${node.symbol} = ${node.value.value}${node.value.unit?.expression ? ' ' + node.value.unit.expression : ''}`;
    case 'equation':
      return node.lhs + ' = ...';
    case 'solve_goal':
      return `Solve: ${node.target_symbol}`;
    case 'result':
      return `${node.symbol} = ${node.value.value.toFixed(2)}`;
    case 'text':
      return node.content.slice(0, 20) + (node.content.length > 20 ? '...' : '');
    case 'constraint':
      return 'Constraint';
    case 'plot':
      return node.options?.title || 'Plot';
    default:
      return 'Node';
  }
}

// Build the graph layout using topological sorting
function buildGraphLayout(nodes: WorksheetNode[]): { graphNodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) return { graphNodes: [], edges: [] };

  // Calculate depth for each node (longest path from any root)
  const depths = new Map<NodeId, number>();
  const visited = new Set<NodeId>();

  function calculateDepth(nodeId: NodeId, nodeMap: Map<NodeId, WorksheetNode>): number {
    if (depths.has(nodeId)) return depths.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // Cycle detection

    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    const deps = node.dependencies || [];
    if (deps.length === 0) {
      depths.set(nodeId, 0);
      return 0;
    }

    const maxDepth = Math.max(...deps.map((d) => calculateDepth(d, nodeMap)));
    const depth = maxDepth + 1;
    depths.set(nodeId, depth);
    return depth;
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Calculate depths
  nodes.forEach((n) => calculateDepth(n.id, nodeMap));

  // Group nodes by depth
  const nodesByDepth = new Map<number, WorksheetNode[]>();
  nodes.forEach((n) => {
    const depth = depths.get(n.id) || 0;
    if (!nodesByDepth.has(depth)) nodesByDepth.set(depth, []);
    nodesByDepth.get(depth)!.push(n);
  });

  // Position nodes
  const graphNodes: GraphNode[] = [];
  const maxDepth = Math.max(...Array.from(depths.values()), 0);

  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    const x = PADDING + depth * (NODE_WIDTH + HORIZONTAL_GAP);

    nodesAtDepth.forEach((node, index) => {
      const y = PADDING + index * (NODE_HEIGHT + VERTICAL_GAP);
      graphNodes.push({
        id: node.id,
        type: node.type,
        label: getNodeLabel(node),
        x,
        y,
        depth,
        dependencies: node.dependencies || [],
        dependents: node.dependents || [],
      });
    });
  }

  // Build edges
  const edges: GraphEdge[] = [];
  nodes.forEach((node) => {
    (node.dependencies || []).forEach((depId) => {
      edges.push({
        from: depId,
        to: node.id,
        type: 'dependency',
      });
    });

    // Add computed provenance edges
    if (node.provenance.type === 'computed') {
      node.provenance.from_nodes.forEach((sourceId) => {
        // Only add if not already a dependency edge
        if (!node.dependencies?.includes(sourceId)) {
          edges.push({
            from: sourceId,
            to: node.id,
            type: 'computed',
          });
        }
      });
    }
  });

  return { graphNodes, edges };
}

export function DependencyGraph() {
  const { document, selectedNodeId, selectNode } = useDocumentStore();
  const [viewMode, setViewMode] = useState<'graph' | 'timeline'>('graph');
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null);

  // Build graph layout
  const { graphNodes, edges } = useMemo(() => {
    if (!document) return { graphNodes: [], edges: [] };
    return buildGraphLayout(document.nodes);
  }, [document]);

  // Calculate SVG dimensions
  const svgWidth = useMemo(() => {
    if (graphNodes.length === 0) return 400;
    return Math.max(...graphNodes.map((n) => n.x + NODE_WIDTH)) + PADDING;
  }, [graphNodes]);

  const svgHeight = useMemo(() => {
    if (graphNodes.length === 0) return 200;
    return Math.max(...graphNodes.map((n) => n.y + NODE_HEIGHT)) + PADDING;
  }, [graphNodes]);

  // Get node position by ID
  const getNodePos = useCallback(
    (nodeId: NodeId) => {
      const node = graphNodes.find((n) => n.id === nodeId);
      return node ? { x: node.x, y: node.y } : null;
    },
    [graphNodes]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: NodeId) => {
      selectNode(nodeId);
    },
    [selectNode]
  );

  // Render edge path
  const renderEdge = useCallback(
    (edge: GraphEdge, index: number) => {
      const fromPos = getNodePos(edge.from);
      const toPos = getNodePos(edge.to);

      if (!fromPos || !toPos) return null;

      // Calculate bezier curve control points
      const startX = fromPos.x + NODE_WIDTH;
      const startY = fromPos.y + NODE_HEIGHT / 2;
      const endX = toPos.x;
      const endY = toPos.y + NODE_HEIGHT / 2;

      const midX = (startX + endX) / 2;

      const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

      const isHighlighted =
        hoveredNode === edge.from ||
        hoveredNode === edge.to ||
        selectedNodeId === edge.from ||
        selectedNodeId === edge.to;

      return (
        <g key={`edge-${index}`}>
          <path
            d={path}
            fill="none"
            stroke={edge.type === 'computed' ? '#d4956a' : '#64748b'}
            strokeWidth={isHighlighted ? 2.5 : 1.5}
            strokeDasharray={edge.type === 'computed' ? '5,3' : undefined}
            opacity={isHighlighted ? 1 : 0.5}
            markerEnd="url(#arrowhead)"
          />
        </g>
      );
    },
    [getNodePos, hoveredNode, selectedNodeId]
  );

  // Render graph node
  const renderNode = useCallback(
    (node: GraphNode) => {
      const style = NODE_STYLES[node.type] || NODE_STYLES.text;
      const isSelected = selectedNodeId === node.id;
      const isHovered = hoveredNode === node.id;

      return (
        <g
          key={node.id}
          transform={`translate(${node.x}, ${node.y})`}
          onClick={() => handleNodeClick(node.id)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
          style={{ cursor: 'pointer' }}
        >
          {/* Node background */}
          <rect
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            rx={6}
            fill={style.bg}
            stroke={isSelected ? style.color : isHovered ? style.color : '#334155'}
            strokeWidth={isSelected ? 2 : 1}
          />

          {/* Node icon */}
          <text x={8} y={NODE_HEIGHT / 2 + 5} fontSize={14}>
            {style.icon}
          </text>

          {/* Node label */}
          <text
            x={28}
            y={NODE_HEIGHT / 2 + 4}
            fontSize={11}
            fill="#e2e8f0"
            fontFamily="monospace"
          >
            {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
          </text>

          {/* Depth indicator */}
          <text
            x={NODE_WIDTH - 8}
            y={12}
            fontSize={9}
            fill="#64748b"
            textAnchor="end"
          >
            {node.depth}
          </text>
        </g>
      );
    },
    [selectedNodeId, hoveredNode, handleNodeClick]
  );

  // Timeline view (simpler horizontal layout)
  const renderTimeline = useCallback(() => {
    if (!document) return null;

    const timelineNodes = document.nodes.map((node, index) => ({
      ...node,
      x: PADDING + index * (NODE_WIDTH + 20),
      y: PADDING,
    }));

    const timelineWidth = timelineNodes.length * (NODE_WIDTH + 20) + PADDING * 2;

    return (
      <svg width={timelineWidth} height={NODE_HEIGHT + PADDING * 2} className="dependency-timeline">
        {/* Timeline axis */}
        <line
          x1={PADDING}
          y1={NODE_HEIGHT + PADDING + 20}
          x2={timelineWidth - PADDING}
          y2={NODE_HEIGHT + PADDING + 20}
          stroke="#334155"
          strokeWidth={2}
        />

        {/* Timeline nodes */}
        {timelineNodes.map((node, index) => {
          const style = NODE_STYLES[node.type] || NODE_STYLES.text;
          const isSelected = selectedNodeId === node.id;

          return (
            <g key={node.id}>
              {/* Connector to axis */}
              <line
                x1={node.x + NODE_WIDTH / 2}
                y1={NODE_HEIGHT + PADDING}
                x2={node.x + NODE_WIDTH / 2}
                y2={NODE_HEIGHT + PADDING + 20}
                stroke="#334155"
                strokeWidth={1}
              />

              {/* Node */}
              <g
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node.id)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={6}
                  fill={style.bg}
                  stroke={isSelected ? style.color : '#334155'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <text x={8} y={NODE_HEIGHT / 2 + 5} fontSize={14}>
                  {style.icon}
                </text>
                <text
                  x={28}
                  y={NODE_HEIGHT / 2 + 4}
                  fontSize={11}
                  fill="#e2e8f0"
                  fontFamily="monospace"
                >
                  {getNodeLabel(node).slice(0, 12)}
                </text>
              </g>

              {/* Index label */}
              <text
                x={node.x + NODE_WIDTH / 2}
                y={NODE_HEIGHT + PADDING + 35}
                fontSize={10}
                fill="#64748b"
                textAnchor="middle"
              >
                #{index + 1}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [document, selectedNodeId, handleNodeClick]);

  if (!document || document.nodes.length === 0) {
    return (
      <div className="dependency-graph empty">
        <div className="empty-state">
          <span className="icon">🔗</span>
          <p>No nodes to visualize</p>
          <p className="hint">Add some Given values and equations to see the dependency graph.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-graph">
      {/* Header */}
      <div className="graph-header">
        <h3>
          <span className="icon">🔗</span>
          Dependency Graph
        </h3>
        <div className="view-toggle">
          <button
            className={viewMode === 'graph' ? 'active' : ''}
            onClick={() => setViewMode('graph')}
            title="Graph view"
          >
            🕸️
          </button>
          <button
            className={viewMode === 'timeline' ? 'active' : ''}
            onClick={() => setViewMode('timeline')}
            title="Timeline view"
          >
            📅
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        {Object.entries(NODE_STYLES).slice(0, 4).map(([type, style]) => (
          <div key={type} className="legend-item">
            <span className="icon">{style.icon}</span>
            <span className="label">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Graph/Timeline View */}
      <div className="graph-container">
        {viewMode === 'graph' ? (
          <svg width={svgWidth} height={svgHeight} className="dependency-svg">
            {/* Definitions */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>

            {/* Edges (render first so they're behind nodes) */}
            <g className="edges">{edges.map(renderEdge)}</g>

            {/* Nodes */}
            <g className="nodes">{graphNodes.map(renderNode)}</g>
          </svg>
        ) : (
          renderTimeline()
        )}
      </div>

      {/* Stats */}
      <div className="graph-stats">
        <span>{document.nodes.length} nodes</span>
        <span>•</span>
        <span>{edges.length} connections</span>
      </div>
    </div>
  );
}
