/**
 * Shared helpers for documentStore slices (WEB VERSION)
 *
 * Node factories, position helpers, verification helpers, and
 * common utilities used across multiple slices.
 *
 * Changes from desktop: removed Tauri invoke in runHistoryOperation
 */

import { v4 as uuidv4 } from 'uuid';
import { startTimer } from '../../utils/logger';
import type {
  WorksheetDocument,
  WorksheetNode,
  TextNode,
  GivenNode,
  EquationNode,
  ConstraintNode,
  SolveGoalNode,
  ResultNode,
  PlotNode,
  AnnotationNode,
  NodeId,
  NodePosition,
  Provenance,
  VerificationStatus,
  VerificationResult,
  VerificationAuditEntry,
} from '../../types/document';

// ─── Node type literal ──────────────────────────────────────────────
export type NodeType = 'text' | 'given' | 'equation' | 'constraint' | 'solve_goal' | 'result' | 'plot' | 'annotation';

// ─── Positioning ────────────────────────────────────────────────────

const DEFAULT_X = 100;
const DEFAULT_Y = 100;
const NODE_SPACING = 80;

export function getNextNodePosition(document: WorksheetDocument | null): NodePosition {
  if (!document || document.nodes.length === 0) {
    return { x: DEFAULT_X, y: DEFAULT_Y };
  }
  const columnX = document.nodes[0].position?.x ?? DEFAULT_X;
  let maxY = DEFAULT_Y;
  for (const node of document.nodes) {
    const y = node.position?.y ?? DEFAULT_Y;
    if (y > maxY) maxY = y;
  }
  return { x: columnX, y: maxY + NODE_SPACING };
}

export function getResultNodePosition(
  sourcePosition: NodePosition,
  document: WorksheetDocument | null,
): NodePosition {
  const targetX = sourcePosition.x + 300;
  let targetY = sourcePosition.y;

  if (document) {
    const occupiedYs = document.nodes
      .filter(n => n.position && Math.abs(n.position.x - targetX) < 200)
      .map(n => n.position!.y);

    while (occupiedYs.some(y => Math.abs(y - targetY) < NODE_SPACING)) {
      targetY += NODE_SPACING;
    }
  }

  return { x: targetX, y: targetY };
}

// ─── Node factories ─────────────────────────────────────────────────

function createBaseNode(position?: NodePosition) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    provenance: { type: 'user', timestamp: now } as Provenance,
    verification: { status: 'unverified' } as VerificationStatus,
    dependencies: [] as NodeId[],
    dependents: [] as NodeId[],
    assumptions: [] as string[],
    position: position || { x: 100, y: 100 },
  };
}

export function createTextNode(content: string, position?: NodePosition): TextNode {
  return { ...createBaseNode(position), type: 'text', content, format: 'plain' };
}

export function createAnnotationNode(
  content: string,
  title?: string,
  position?: NodePosition,
): AnnotationNode {
  return { ...createBaseNode(position), type: 'annotation', content, title, collapsed: false };
}

export function createGivenNode(
  symbol: string,
  value: number,
  unit?: string,
  position?: NodePosition,
): GivenNode {
  return {
    ...createBaseNode(position),
    type: 'given',
    symbol,
    value: { value, unit: unit ? { expression: unit } : undefined },
  };
}

export function createEquationNode(
  latex: string,
  lhs: string,
  rhs: string,
  position?: NodePosition,
): EquationNode {
  return { ...createBaseNode(position), type: 'equation', latex, lhs, rhs };
}

export function createConstraintNode(
  latex: string,
  sympy: string,
  position?: NodePosition,
): ConstraintNode {
  return { ...createBaseNode(position), type: 'constraint', latex, sympy, applies_to: [] };
}

export function createSolveGoalNode(
  targetSymbol: string,
  method?: 'symbolic' | 'numeric' | 'auto',
  position?: NodePosition,
): SolveGoalNode {
  return { ...createBaseNode(position), type: 'solve_goal', target_symbol: targetSymbol, method };
}

export function createResultNode(
  symbol: string,
  value: number,
  unit?: string,
  solveGoalId?: string,
  symbolicForm?: string,
  position?: NodePosition,
): ResultNode {
  return {
    ...createBaseNode(position),
    type: 'result',
    symbol,
    value: { value, unit: unit ? { expression: unit } : undefined },
    solve_goal_id: solveGoalId || '',
    symbolic_form: symbolicForm,
  };
}

export function createPlotNode(
  expression: string,
  variable: string = 'x',
  xMin: number = -10,
  xMax: number = 10,
  position?: NodePosition,
): PlotNode {
  return {
    ...createBaseNode(position),
    type: 'plot',
    plot_type: 'function',
    expressions: [{ id: uuidv4(), expr: expression, variable, label: expression }],
    x_range: { min: xMin, max: xMax, variable },
    options: { grid: true, legend: true, point_count: 100 },
  };
}

// ─── Symbol helpers ─────────────────────────────────────────────────

export function getBaseSymbol(symbol: string): string {
  const match = symbol.match(/^(.+?)(?:_\d+)?$/);
  return match ? match[1] : symbol;
}

export function handleDuplicateSymbol(
  doc: WorksheetDocument | null,
  incomingSymbol: string,
  excludeNodeId?: string,
): { newSymbol: string; renames: Map<string, string> } {
  const renames = new Map<string, string>();
  if (!doc) return { newSymbol: incomingSymbol, renames };

  const baseSymbol = getBaseSymbol(incomingSymbol);

  const matchingNodes: { id: string; symbol: string; subscript: number | null }[] = [];

  for (const node of doc.nodes) {
    if (node.type === 'given' && node.id !== excludeNodeId) {
      const nodeBase = getBaseSymbol(node.symbol);
      if (nodeBase === baseSymbol) {
        const subMatch = node.symbol.match(/_(\d+)$/);
        matchingNodes.push({
          id: node.id,
          symbol: node.symbol,
          subscript: subMatch ? parseInt(subMatch[1], 10) : null,
        });
      }
    }
  }

  if (matchingNodes.length === 0) {
    return { newSymbol: incomingSymbol, renames };
  }

  const bareNode = matchingNodes.find(n => n.subscript === null);
  let maxSubscript = 0;
  for (const n of matchingNodes) {
    if (n.subscript !== null) {
      maxSubscript = Math.max(maxSubscript, n.subscript);
    }
  }

  if (bareNode) {
    renames.set(bareNode.id, `${baseSymbol}_1`);
    maxSubscript = Math.max(maxSubscript, 1);
  }

  const newSymbol = `${baseSymbol}_${maxSubscript + 1}`;
  return { newSymbol, renames };
}

export function findDuplicateSymbols(doc: WorksheetDocument | null): Map<string, string[]> {
  const symbolNodes = new Map<string, string[]>();
  if (!doc) return symbolNodes;

  for (const node of doc.nodes) {
    if (node.type === 'given') {
      const existing = symbolNodes.get(node.symbol) || [];
      existing.push(node.id);
      symbolNodes.set(node.symbol, existing);
    }
  }

  const duplicates = new Map<string, string[]>();
  for (const [symbol, nodeIds] of symbolNodes) {
    if (nodeIds.length > 1) {
      duplicates.set(symbol, nodeIds);
    }
  }
  return duplicates;
}

// ─── Position helpers ───────────────────────────────────────────────

export function saveNodePositions(getDocument: () => WorksheetDocument | null): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const doc = getDocument();
  if (doc) {
    doc.nodes.forEach(n => {
      if (n.position) {
        positions.set(n.id, { ...n.position });
      }
    });
  }
  return positions;
}

export function restoreNodePositions(doc: WorksheetDocument, saved: Map<string, NodePosition>) {
  doc.nodes.forEach(n => {
    const savedPosition = saved.get(n.id);
    if (savedPosition) {
      n.position = savedPosition;
    }
  });
}

// ─── Document guard ─────────────────────────────────────────────────

type StoreActionTimer = ReturnType<typeof startTimer>;

export function requireLoadedDocument(
  getDocument: () => WorksheetDocument | null,
  timer: StoreActionTimer,
  details: Record<string, unknown> = {},
): WorksheetDocument | null {
  const doc = getDocument();
  if (!doc) {
    timer.complete({ ...details, skipped: 'no document' });
    return null;
  }
  return doc;
}

// ─── History helper (WEB: no-op, handled by historySlice snapshots) ─

export async function runHistoryOperation(_command: 'undo' | 'redo') {
  // Web version uses in-memory snapshot stack in historySlice
  // This function is kept for API compatibility but should not be called directly
  return { applied: false, doc: null };
}

// ─── Verification helpers ───────────────────────────────────────────

const ENGINE_VERSION = '1.0.0';

export { ENGINE_VERSION };

export function applyVerificationStatus(
  node: WorksheetNode,
  result: VerificationResult,
  timestamp: string,
) {
  if (result.overall_status) {
    node.verification = result.overall_status;
    return;
  }
  if (result.passed) {
    node.verification = {
      status: 'verified',
      timestamp,
      engine_version: ENGINE_VERSION,
    } as VerificationStatus;
  } else {
    const reason = result.error ||
      result.gates.unit_consistency.details ||
      result.gates.constraint_satisfaction.details ||
      'Verification failed';
    node.verification = {
      status: 'failed',
      reason,
      timestamp,
    } as VerificationStatus;
  }
}

export function createAuditEntry(
  node: WorksheetNode,
  result: VerificationResult,
  timestamp: string,
): VerificationAuditEntry {
  return {
    id: uuidv4(),
    node_id: result.node_id,
    timestamp,
    engine_version: ENGINE_VERSION,
    passed: result.passed,
    gates_checked: {
      unit_consistency: {
        passed: result.gates.unit_consistency.passed,
        details: result.gates.unit_consistency.details || '',
      },
      constraint_satisfaction: {
        passed: result.gates.constraint_satisfaction.passed,
        details: result.gates.constraint_satisfaction.details || '',
      },
      numeric_residual: result.gates.numeric_residual ? {
        passed: result.gates.numeric_residual.passed,
        residual: result.gates.numeric_residual.residual,
        details: '',
      } : undefined,
      sanity_checks: result.gates.sanity_checks ? {
        passed: result.gates.sanity_checks.passed,
        details: result.gates.sanity_checks.details || '',
      } : undefined,
    },
    inputs_used: {},
    assumptions_active: node.assumptions || [],
    provenance_at_verification: node.provenance,
  };
}

// ─── Display helpers ────────────────────────────────────────────────

export function getNodeDisplayName(node: WorksheetNode): string {
  switch (node.type) {
    case 'text':
      return `Text: "${(node as TextNode).content.substring(0, 30)}..."`;
    case 'given':
      return `Given: ${(node as GivenNode).symbol}`;
    case 'equation':
      return `Equation: ${(node as EquationNode).lhs}`;
    case 'constraint':
      return `Constraint: ${(node as ConstraintNode).latex}`;
    case 'solve_goal':
      return `Solve: ${(node as SolveGoalNode).target_symbol}`;
    default:
      return `Node ${node.id}`;
  }
}

// ─── Report generation ──────────────────────────────────────────────

export function generateVerificationReport(doc: WorksheetDocument): string {
  const lines: string[] = [];

  lines.push(`# Verification Report`);
  lines.push(``);
  lines.push(`**Document:** ${doc.name}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Engine Version:** ${ENGINE_VERSION}`);
  lines.push(``);

  const passedEntries = doc.audit_trail.filter(e => e.passed);
  const failedEntries = doc.audit_trail.filter(e => !e.passed);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Verifications | ${doc.audit_trail.length} |`);
  lines.push(`| Passed | ${passedEntries.length} |`);
  lines.push(`| Failed | ${failedEntries.length} |`);
  lines.push(`| Pass Rate | ${doc.audit_trail.length > 0 ? Math.round((passedEntries.length / doc.audit_trail.length) * 100) : 0}% |`);
  lines.push(``);

  const activeAssumptions = doc.assumptions.filter(a => a.active !== false);
  if (activeAssumptions.length > 0) {
    lines.push(`## Active Assumptions`);
    lines.push(``);
    for (const assumption of activeAssumptions) {
      lines.push(`- **${assumption.statement}**`);
      if (assumption.formal_expression) {
        lines.push(`  - Formal: \`${assumption.formal_expression}\``);
      }
      if (assumption.scope && assumption.scope.length > 0) {
        lines.push(`  - Scope: ${assumption.scope.join(', ')}`);
      }
    }
    lines.push(``);
  }

  lines.push(`## Verification Audit Trail`);
  lines.push(``);

  if (doc.audit_trail.length === 0) {
    lines.push(`*No verification entries recorded.*`);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`*This report was generated by ProveCalc for PE compliance documentation.*`);

  return lines.join('\n');
}
