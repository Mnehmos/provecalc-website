import type { WorksheetCommand } from '../types/commands';
import type { NodePosition, WorksheetDocument, WorksheetNode } from '../types/document';

const GRID_SIZE = 40;
const DEFAULT_X = 100;
const DEFAULT_Y = 100;
const VERTICAL_GAP = 24;
const OVERLAP_MARGIN_X = 16;
const OVERLAP_MARGIN_Y = 16;
const MAX_PLACEMENT_STEPS = 2000;

interface NodeBox {
  width: number;
  height: number;
}

interface Rect extends NodeBox {
  x: number;
  y: number;
}

const STANDARD_BOX: NodeBox = { width: 260, height: 88 };
const TEXT_BOX_WIDTH = 620;
const ANNOTATION_BOX_WIDTH = 620;
const PLOT_BOX: NodeBox = { width: 520, height: 340 };

const NODE_CREATING_ACTIONS = new Set<WorksheetCommand['action']>([
  'add_given',
  'add_equation',
  'add_constraint',
  'add_solve_goal',
  'add_text',
  'add_annotation',
]);

function snapToGrid(value: number): number {
  return Math.ceil(value / GRID_SIZE) * GRID_SIZE;
}

function estimateWrappedLines(text: string, charsPerLine: number): number {
  if (!text.trim()) return 1;
  return text
    .split(/\r?\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.trim().length / charsPerLine)), 0);
}

function estimateTextBox(content: string): NodeBox {
  const lines = estimateWrappedLines(content, 88);
  return {
    width: TEXT_BOX_WIDTH,
    height: Math.max(84, 56 + lines * 24),
  };
}

function estimateAnnotationBox(content: string): NodeBox {
  const lines = estimateWrappedLines(content, 84);
  const hasCodeFence = /```/.test(content);
  const fenceBonus = hasCodeFence ? 40 : 0;
  return {
    width: ANNOTATION_BOX_WIDTH,
    height: Math.max(112, 72 + lines * 20 + fenceBonus),
  };
}

function estimateExistingNodeBox(node: WorksheetNode): NodeBox {
  switch (node.type) {
    case 'text':
      return estimateTextBox(node.content);
    case 'annotation':
      return node.collapsed ? { width: ANNOTATION_BOX_WIDTH, height: 72 } : estimateAnnotationBox(node.content);
    case 'plot':
      return PLOT_BOX;
    default:
      return STANDARD_BOX;
  }
}

function estimateCommandNodeBox(command: WorksheetCommand): NodeBox | null {
  switch (command.action) {
    case 'add_text':
      return estimateTextBox(command.content);
    case 'add_annotation':
      return estimateAnnotationBox(command.content);
    case 'add_given':
    case 'add_equation':
    case 'add_constraint':
    case 'add_solve_goal':
      return STANDARD_BOX;
    default:
      return null;
  }
}

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width + OVERLAP_MARGIN_X &&
    a.x + a.width + OVERLAP_MARGIN_X > b.x &&
    a.y < b.y + b.height + OVERLAP_MARGIN_Y &&
    a.y + a.height + OVERLAP_MARGIN_Y > b.y
  );
}

function findFirstClearY(x: number, startY: number, box: NodeBox, occupied: Rect[]): number {
  let y = snapToGrid(startY);
  for (let i = 0; i < MAX_PLACEMENT_STEPS; i++) {
    const candidate: Rect = { x, y, ...box };
    if (!occupied.some((rect) => overlaps(candidate, rect))) {
      return y;
    }
    y += GRID_SIZE;
  }
  return y;
}

function getBatchStartPosition(document: WorksheetDocument | null): NodePosition {
  if (!document || document.nodes.length === 0) {
    return { x: DEFAULT_X, y: DEFAULT_Y };
  }

  const x = document.nodes[0].position?.x ?? DEFAULT_X;
  let maxBottom = DEFAULT_Y - VERTICAL_GAP;

  for (const node of document.nodes) {
    const pos = node.position ?? { x, y: DEFAULT_Y };
    const box = estimateExistingNodeBox(node);
    maxBottom = Math.max(maxBottom, pos.y + box.height);
  }

  return { x, y: snapToGrid(maxBottom + VERTICAL_GAP) };
}

function buildOccupiedRects(document: WorksheetDocument | null): Rect[] {
  if (!document) return [];
  return document.nodes.map((node) => {
    const pos = node.position ?? { x: DEFAULT_X, y: DEFAULT_Y };
    const box = estimateExistingNodeBox(node);
    return {
      x: pos.x,
      y: pos.y,
      ...box,
    };
  });
}

export function isNodeCreatingCommand(command: WorksheetCommand): boolean {
  return NODE_CREATING_ACTIONS.has(command.action);
}

/**
 * Plan node positions for a command batch using approximate box dimensions.
 * This prevents overlap when the assistant emits long text/annotation nodes.
 */
export function planBatchNodePositions(
  commands: WorksheetCommand[],
  document: WorksheetDocument | null,
): Array<NodePosition | undefined> {
  const positions: Array<NodePosition | undefined> = new Array(commands.length).fill(undefined);
  if (commands.length === 0) return positions;

  const start = getBatchStartPosition(document);
  const occupied = buildOccupiedRects(document);
  let cursorY = start.y;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!isNodeCreatingCommand(command)) continue;

    const box = estimateCommandNodeBox(command);
    if (!box) continue;

    const y = findFirstClearY(start.x, cursorY, box, occupied);
    positions[i] = { x: start.x, y };

    occupied.push({ x: start.x, y, ...box });
    cursorY = snapToGrid(y + box.height + VERTICAL_GAP);
  }

  return positions;
}
