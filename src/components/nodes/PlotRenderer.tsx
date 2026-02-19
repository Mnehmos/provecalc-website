/**
 * PlotRenderer - Stub for web demo
 * Full chart.js rendering is a post-hackathon feature.
 */

import type { PlotNode } from '../../types/document';

export interface PlotRendererProps {
  node: PlotNode;
  width?: number;
  height?: number;
}

export function PlotRenderer({ node, width, height }: PlotRendererProps) {
  return (
    <div className="p-4 border border-stone-700 rounded-lg bg-stone-900/50 text-stone-400 text-sm text-center">
      <p>Plot: {node.expressions?.map(e => e.expr).join(', ') || 'No expression'}</p>
      <p className="text-xs mt-1 text-stone-500">Interactive plots available in desktop app</p>
    </div>
  );
}

export default PlotRenderer;
