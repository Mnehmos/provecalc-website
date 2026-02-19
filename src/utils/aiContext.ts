/**
 * AI Context Builder
 *
 * Builds structured context from the current worksheet document
 * for consumption by LLMs. Supports full and compact formats.
 */

import type {
  WorksheetDocument,
  WorksheetNode,
  GivenNode,
  EquationNode,
  ResultNode,
  ConstraintNode,
  SolveGoalNode,
  VerificationStatus,
} from '../types/document';
import type { AIContext, AIContextCompact, AIChatContext, AIContextNodeRef, AIEntryPoint } from '../types/ai';

const AI_INSTRUCTIONS = `You are helping with an engineering calculation in ProveCalc. When suggesting additions, respond with ProveCalc JSON format using the suggestion protocol. Every value must have correct units. The engine will verify your suggestions before they are applied.

Formatting: Use $...$ for inline math and $$...$$ for display math. Never use \\[...\\] or \\(...\\) delimiters.`;

/** Build a full AI context from the document state */
export function buildAIContext(
  document: WorksheetDocument,
  options?: {
    focusNodeId?: string;
    entryPoint?: AIEntryPoint;
    query?: string;
  },
): AIContext {
  const { focusNodeId, entryPoint = 'chat', query } = options ?? {};

  // Build dependency/dependent graph
  const dependencies: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};
  for (const node of document.nodes) {
    dependencies[node.id] = node.dependencies ?? [];
    dependents[node.id] = node.dependents ?? [];
  }

  // Build state summary
  const definedSymbols: Array<{ symbol: string; value: number; unit?: string }> = [];
  const allDefinedNames = new Set<string>();
  const referencedSymbols = new Set<string>();
  const verificationStatus: Record<string, VerificationStatus> = {};

  for (const node of document.nodes) {
    verificationStatus[node.id] = node.verification;

    if (node.type === 'given') {
      const given = node as GivenNode;
      definedSymbols.push({
        symbol: given.symbol,
        value: given.value.value,
        unit: given.value.unit?.expression,
      });
      allDefinedNames.add(given.symbol);
    } else if (node.type === 'result') {
      const result = node as ResultNode;
      definedSymbols.push({
        symbol: result.symbol,
        value: result.value.value,
        unit: result.value.unit?.expression,
      });
      allDefinedNames.add(result.symbol);
    } else if (node.type === 'equation') {
      const eq = node as EquationNode;
      // Extract symbols from RHS (simple heuristic: word characters that aren't numbers)
      const symbols = eq.rhs.match(/\b[a-zA-Z_]\w*\b/g) ?? [];
      symbols.forEach(s => referencedSymbols.add(s));
      allDefinedNames.add(eq.lhs);
    }
  }

  const undefinedSymbols = [...referencedSymbols].filter(s => !allDefinedNames.has(s));

  // Focus node
  let focus: AIContext['focus'] | undefined;
  if (focusNodeId) {
    const focusNode = document.nodes.find(n => n.id === focusNodeId);
    if (focusNode) {
      focus = {
        nodeId: focusNode.id,
        nodeType: focusNode.type,
        node: focusNode,
      };
    }
  }

  return {
    provecalc_context: true,
    version: '1.0',
    document: {
      id: document.id,
      name: document.name,
      nodes: document.nodes,
      assumptions: document.assumptions,
    },
    focus,
    graph: { dependencies, dependents },
    state: {
      definedSymbols,
      undefinedSymbols,
      verificationStatus,
    },
    entryPoint,
    query,
    instructions: AI_INSTRUCTIONS,
  };
}

/** Build a compact token-efficient AI context */
export function buildCompactAIContext(
  document: WorksheetDocument,
  options?: {
    focusNodeId?: string;
    query?: string;
  },
): AIContextCompact {
  const { focusNodeId, query } = options ?? {};

  const nodes: string[] = [];
  const defined: string[] = [];
  const referencedSymbols = new Set<string>();
  const allDefined = new Set<string>();
  const assumptions: string[] = [];

  for (const node of document.nodes) {
    nodes.push(summarizeNode(node));

    if (node.type === 'given') {
      const given = node as GivenNode;
      defined.push(given.symbol);
      allDefined.add(given.symbol);
    } else if (node.type === 'result') {
      const result = node as ResultNode;
      defined.push(result.symbol);
      allDefined.add(result.symbol);
    } else if (node.type === 'equation') {
      const eq = node as EquationNode;
      allDefined.add(eq.lhs);
      const symbols = eq.rhs.match(/\b[a-zA-Z_]\w*\b/g) ?? [];
      symbols.forEach(s => referencedSymbols.add(s));
    }
  }

  for (const assumption of document.assumptions) {
    if (assumption.active) {
      assumptions.push(assumption.statement);
    }
  }

  const undefinedSymbols = [...referencedSymbols].filter(s => !allDefined.has(s));

  let focus: string | undefined;
  if (focusNodeId) {
    const focusNode = document.nodes.find(n => n.id === focusNodeId);
    if (focusNode) {
      focus = summarizeNode(focusNode);
    }
  }

  return {
    provecalc_context: true,
    version: '1.0',
    nodes,
    focus,
    defined,
    undefined: undefinedSymbols,
    assumptions,
    query,
    instructions: AI_INSTRUCTIONS,
  };
}

/**
 * Build a token-efficient context for chat completions.
 *
 * Unlike buildCompactAIContext, this shape matches the backend DocumentContext
 * contract (symbols/equations/assumptions) and adds compact node refs for
 * reliable update/delete targeting.
 */
export function buildAIChatContext(
  document: WorksheetDocument,
  options?: {
    focusNodeId?: string;
    query?: string;
    maxNodeRefs?: number;
  },
): AIChatContext {
  const { focusNodeId, query, maxNodeRefs = 80 } = options ?? {};

  const symbols: AIChatContext['symbols'] = {};
  const equations: string[] = [];
  const assumptions: string[] = [];
  const nodeRefsAll: AIContextNodeRef[] = [];
  const byTypeCount: Partial<Record<WorksheetNode['type'], number>> = {};

  for (let i = 0; i < document.nodes.length; i++) {
    const node = document.nodes[i];
    byTypeCount[node.type] = (byTypeCount[node.type] ?? 0) + 1;
    const typeOrdinal = byTypeCount[node.type] ?? 1;

    if (node.type === 'given') {
      const given = node as GivenNode;
      symbols[given.symbol] = {
        value: given.value.value,
        unit: given.value.unit?.expression,
        node_id: given.id,
      };
    } else if (node.type === 'result') {
      const result = node as ResultNode;
      symbols[result.symbol] = {
        value: result.value.value,
        unit: result.value.unit?.expression,
        node_id: result.id,
      };
    } else if (node.type === 'equation') {
      const eq = node as EquationNode;
      equations.push(`${eq.lhs} = ${eq.rhs}`);
    }

    nodeRefsAll.push(buildNodeRef(node, typeOrdinal, i + 1));
  }

  for (const assumption of document.assumptions) {
    if (assumption.active) {
      assumptions.push(assumption.statement);
    }
  }

  // Prefer semantically meaningful node types if we must trim.
  const priorityOrder: WorksheetNode['type'][] = ['given', 'result', 'equation', 'solve_goal', 'constraint', 'annotation', 'text', 'plot'];
  const nodeRefsOrdered = priorityOrder.flatMap((type) => nodeRefsAll.filter((r) => r.type === type));
  const node_refs = nodeRefsOrdered.slice(0, Math.max(1, maxNodeRefs));

  return {
    provecalc_context: true,
    version: '1.0',
    symbols,
    equations,
    assumptions,
    node_refs,
    focus_node_id: focusNodeId,
    query,
    instructions: AI_INSTRUCTIONS,
  };
}

function buildNodeRef(node: WorksheetNode, ordinal: number, index: number): AIContextNodeRef {
  const ordinalAlias = `${node.type}_${ordinal}`;
  const aliases = new Set<string>([ordinalAlias]);

  let ref = ordinalAlias;
  let label = summarizeNode(node);

  switch (node.type) {
    case 'given':
      ref = (node as GivenNode).symbol;
      aliases.add((node as GivenNode).symbol);
      break;
    case 'result':
      ref = (node as ResultNode).symbol;
      aliases.add((node as ResultNode).symbol);
      break;
    case 'equation': {
      const lhs = (node as EquationNode).lhs?.trim();
      if (lhs) {
        ref = lhs;
        aliases.add(lhs);
      }
      aliases.add(`equation_${ordinal}`);
      break;
    }
    case 'solve_goal': {
      const goal = node as SolveGoalNode;
      const targetAlias = `solve_${sanitizeAlias(goal.target_symbol)}`;
      ref = targetAlias;
      aliases.add(targetAlias);
      aliases.add(`solve_goal_${ordinal}`);
      break;
    }
    case 'annotation': {
      const title = (node as { title?: string }).title?.trim();
      if (title) aliases.add(sanitizeAlias(title));
      aliases.add(`annotation_${ordinal}`);
      ref = `annotation_${ordinal}`;
      break;
    }
    case 'text':
      aliases.add(`text_${ordinal}`);
      ref = `text_${ordinal}`;
      break;
    case 'constraint':
      aliases.add(`constraint_${ordinal}`);
      ref = `constraint_${ordinal}`;
      break;
    case 'plot':
      aliases.add(`plot_${ordinal}`);
      ref = `plot_${ordinal}`;
      break;
    default:
      break;
  }

  if (label.length > 90) {
    label = `${label.slice(0, 87)}...`;
  }

  return {
    id: node.id,
    type: node.type,
    index,
    ref,
    aliases: [...aliases].filter(Boolean),
    label,
  };
}

function sanitizeAlias(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Create a human-readable one-line summary of a node */
function summarizeNode(node: WorksheetNode): string {
  switch (node.type) {
    case 'given': {
      const given = node as GivenNode;
      const unit = given.value.unit?.expression ? ` ${given.value.unit.expression}` : '';
      return `${given.symbol} := ${given.value.value}${unit}`;
    }
    case 'equation': {
      const eq = node as EquationNode;
      return `${eq.lhs} = ${eq.rhs}`;
    }
    case 'result': {
      const result = node as ResultNode;
      const unit = result.value.unit?.expression ? ` ${result.value.unit.expression}` : '';
      const symbolic = result.symbolic_form ? ` (from ${result.symbolic_form})` : '';
      return `${result.symbol} := ${result.value.value}${unit}${symbolic}`;
    }
    case 'constraint': {
      const constraint = node as ConstraintNode;
      return `constraint: ${constraint.description ?? constraint.sympy}`;
    }
    case 'solve_goal': {
      const goal = node as SolveGoalNode;
      return `solve for: ${goal.target_symbol}`;
    }
    case 'text':
      return `text: "${node.content.slice(0, 60)}${node.content.length > 60 ? '...' : ''}"`;
    case 'annotation':
      return `note: "${(node.title ?? node.content).slice(0, 60)}"`;
    case 'plot':
      return `plot: ${node.expressions.map(e => e.expr).join(', ')}`;
    default:
      return `[${(node as WorksheetNode).type}]`;
  }
}
