/**
 * Auto layout for worksheet nodes.
 *
 * Nodes are positioned absolutely, but their heights depend on their content (a long text node,
 * a table, a diagram), so fixed template coordinates overlap or leave large gaps. This packs the
 * nodes from the measured sizes: reading order is kept (top to bottom, then left to right), each
 * node keeps its column, and each node starts just below the lowest node above it that shares
 * any of its horizontal span.
 */
import type { NodePosition } from '../types/document';

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** A section start (for example a text node opening with a heading) gets extra space above it. */
  section?: boolean;
}

export interface LayoutOptions {
  /** The first row starts here (below the worksheet header). */
  top: number;
  /** Space between stacked nodes. */
  gap: number;
  /** Extra space above a section start, on top of `gap`. */
  sectionGap: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { top: 160, gap: 16, sectionGap: 24 };

export function packLayout(items: LayoutItem[], options: LayoutOptions = DEFAULT_LAYOUT): Record<string, NodePosition> {
  const ordered = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: Array<{ left: number; right: number; bottom: number }> = [];
  const positions: Record<string, NodePosition> = {};

  for (const item of ordered) {
    const left = item.x;
    const right = item.x + item.width;
    let y = options.top;
    for (const other of placed) {
      if (other.left < right && left < other.right) {
        y = Math.max(y, other.bottom + options.gap + (item.section ? options.sectionGap : 0));
      }
    }
    y = Math.round(y);
    positions[item.id] = { x: Math.round(item.x), y };
    placed.push({ left, right, bottom: y + item.height });
  }
  return positions;
}

/** True when a text node's markdown opens with a heading, which marks a new section. */
export function startsSection(content: string | undefined): boolean {
  return /^\s*#{1,3}\s/.test(content ?? '');
}
