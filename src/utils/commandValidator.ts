/**
 * Command Validator - Hard-hat Protocol
 *
 * Physics-gated validation for AI-proposed commands.
 * Every command is validated before the user sees Accept/Reject.
 * The engine validates, not the LLM.
 */

import { checkUnits as checkUnitsApi } from '../services/computeService';
import type { WorksheetCommand } from '../types/commands';
import { useDocumentStore } from '../stores/documentStore';
import { logger, startTimer } from '../utils/logger';

/** Validation status for a single command */
export type ValidationStatus = 'valid' | 'warning' | 'invalid' | 'unchecked';

/** Validation result for a command */
export interface ValidationResult {
  status: ValidationStatus;
  message?: string;
  details?: {
    unit_check?: { passed: boolean; message?: string };
    constraint_check?: { passed: boolean; message?: string };
  };
}

const CONTEXT_REQUIRED_ACTIONS = new Set<WorksheetCommand['action']>([
  'add_equation',
]);

/** Validate a unit expression via the sidecar */
async function checkUnit(unit: string): Promise<{ valid: boolean; message?: string }> {
  try {
    const result = await checkUnitsApi(`1 * ${unit}`);
    return { valid: result.consistent, message: result.consistent ? undefined : (result.details ?? result.error ?? undefined) };
  } catch (err) {
    return { valid: false, message: String(err) };
  }
}

/** Check if a symbol already exists in the document (given, equation lhs, or result) */
function symbolExists(symbol: string): boolean {
  const doc = useDocumentStore.getState().document;
  if (!doc) return false;
  return doc.nodes.some(
    (n) =>
      (n.type === 'given' && n.symbol === symbol) ||
      (n.type === 'equation' && n.lhs === symbol) ||
      (n.type === 'result' && n.symbol === symbol)
  );
}

/** Check if a node ID exists in the document */
function nodeExists(nodeId: string): boolean {
  const doc = useDocumentStore.getState().document;
  if (!doc) return false;
  return doc.nodes.some((n) => n.id === nodeId);
}

function normalizeNodeRef(ref: string): string {
  return ref
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/^node\s+/i, '')
    .replace(/^ref:/i, '')
    .replace(/\.\.\.$/, '')
    .trim();
}

function resolveByTypeOrdinal(ref: string): string | null {
  const doc = useDocumentStore.getState().document;
  if (!doc) return null;

  const match = ref.toLowerCase().match(/^(text|annotation|given|equation|constraint|solve[_-]?goal|result|plot)[ _-]?(\d+)$/);
  if (!match) return null;

  const typeMap: Record<string, 'text' | 'annotation' | 'given' | 'equation' | 'constraint' | 'solve_goal' | 'result' | 'plot'> = {
    text: 'text',
    annotation: 'annotation',
    given: 'given',
    equation: 'equation',
    constraint: 'constraint',
    solve_goal: 'solve_goal',
    'solve-goal': 'solve_goal',
    solvegoal: 'solve_goal',
    result: 'result',
    plot: 'plot',
  };

  const rawType = match[1].replace(/[_-]/g, '_');
  const type = typeMap[rawType];
  if (!type) return null;

  const index = Number.parseInt(match[2], 10) - 1;
  if (!Number.isFinite(index) || index < 0) return null;

  const candidates = doc.nodes.filter((n) => n.type === type);
  return candidates[index]?.id ?? null;
}

/**
 * Resolve a symbol name to a node ID.
 * AIs often reference nodes by symbol (e.g. "b") instead of UUID.
 * Returns the node ID if found, or the original value if not.
 */
function resolveNodeId(ref: string): string {
  const normalized = normalizeNodeRef(ref);
  if (!normalized) return ref;

  // Already an exact node ID?
  if (nodeExists(normalized)) return normalized;

  // Try to find by symbol name (given or result)
  const doc = useDocumentStore.getState().document;
  if (!doc) return normalized;

  // Support short UUID prefixes from compact node refs.
  const prefix = normalized.toLowerCase();
  const prefixMatch = doc.nodes.find((n) => n.id.toLowerCase().startsWith(prefix));
  if (prefixMatch) return prefixMatch.id;

  const ordinalMatch = resolveByTypeOrdinal(normalized);
  if (ordinalMatch) return ordinalMatch;

  const lower = normalized.toLowerCase();

  const match = doc.nodes.find(
    (n) =>
      (n.type === 'given' && (n.symbol === normalized || n.symbol.toLowerCase() === lower)) ||
      (n.type === 'result' && (n.symbol === normalized || n.symbol.toLowerCase() === lower)) ||
      (n.type === 'equation' && (n.lhs === normalized || n.lhs.toLowerCase() === lower)) ||
      (
        n.type === 'annotation' &&
        ((n.title?.toLowerCase() === lower) || (lower === 'diagram' && (n.title?.toLowerCase().includes('diagram') || n.content.toLowerCase().includes('diagram'))))
      ),
  );
  return match ? match.id : normalized;
}

/** Pre-process commands: resolve symbol names to node IDs */
function resolveNodeReferences(commands: WorksheetCommand[]): void {
  for (const cmd of commands) {
    if ('node_id' in cmd && typeof cmd.node_id === 'string') {
      cmd.node_id = resolveNodeId(cmd.node_id);
    }
  }
}

/** Validate a single command */
async function validateOne(command: WorksheetCommand): Promise<ValidationResult> {
  switch (command.action) {
    case 'add_given': {
      // Check unit validity
      if (command.unit) {
        const unitCheck = await checkUnit(command.unit);
        if (!unitCheck.valid) {
          return {
            status: 'invalid',
            message: `Invalid unit: ${command.unit}`,
            details: { unit_check: { passed: false, message: unitCheck.message } },
          };
        }
      }
      // Warn if symbol already exists
      if (symbolExists(command.symbol)) {
        return {
          status: 'warning',
          message: `Symbol "${command.symbol}" already exists and will create a duplicate`,
        };
      }
      return { status: 'valid' };
    }

    case 'add_equation': {
      // Basic validation: lhs and rhs must be non-empty
      if (!command.lhs.trim() || !command.rhs.trim()) {
        return {
          status: 'invalid',
          message: 'Equation must have both left-hand and right-hand sides',
        };
      }
      return { status: 'valid' };
    }

    case 'add_constraint': {
      if (!command.sympy.trim()) {
        return {
          status: 'invalid',
          message: 'Constraint must have a SymPy expression',
        };
      }
      return { status: 'valid' };
    }

    case 'add_solve_goal': {
      // Check if the target symbol exists or is solvable
      if (!command.target.trim()) {
        return {
          status: 'invalid',
          message: 'Must specify a target symbol to solve for',
        };
      }
      return { status: 'valid' };
    }

    case 'update_node': {
      if (!nodeExists(command.node_id)) {
        return {
          status: 'invalid',
          message: `Node ${command.node_id} not found in document`,
        };
      }
      // Validate unit changes in updates payload
      const updates = command.updates as Record<string, unknown>;
      if (updates.unit && typeof updates.unit === 'string') {
        const unitCheck = await checkUnit(updates.unit);
        if (!unitCheck.valid) {
          return {
            status: 'invalid',
            message: `Invalid unit in update: ${updates.unit}`,
            details: { unit_check: { passed: false, message: unitCheck.message } },
          };
        }
      }
      if (updates.value && typeof updates.value === 'object') {
        const valueUpdate = updates.value as Record<string, unknown>;
        if (valueUpdate.unit && typeof valueUpdate.unit === 'string') {
          const unitCheck = await checkUnit(valueUpdate.unit);
          if (!unitCheck.valid) {
            return {
              status: 'invalid',
              message: `Invalid unit in value update: ${valueUpdate.unit}`,
              details: { unit_check: { passed: false, message: unitCheck.message } },
            };
          }
        }
      }
      return { status: 'valid' };
    }

    case 'delete_node': {
      if (!nodeExists(command.node_id)) {
        return {
          status: 'invalid',
          message: `Node ${command.node_id} not found in document`,
        };
      }
      return { status: 'valid' };
    }

    case 'remove_assumption': {
      const doc = useDocumentStore.getState().document;
      const exists = doc?.assumptions.some((a) => a.id === command.assumption_id);
      if (!exists) {
        return {
          status: 'invalid',
          message: `Assumption ${command.assumption_id} not found`,
        };
      }
      return { status: 'valid' };
    }

    case 'verify_node': {
      if (!nodeExists(command.node_id)) {
        return {
          status: 'invalid',
          message: `Node ${command.node_id} not found in document`,
        };
      }
      return { status: 'valid' };
    }

    // Commands that don't need validation
    case 'add_text':
    case 'add_annotation':
    case 'add_assumption':
    case 'verify_all':
      return { status: 'valid' };
  }
}

function isContextRequiredCommand(command: WorksheetCommand): boolean {
  return CONTEXT_REQUIRED_ACTIONS.has(command.action);
}

function isProblemRestatementCommand(command: WorksheetCommand): boolean {
  return command.action === 'add_text' && command.content.trim().length > 0;
}

function isDiagramLikeContent(title: string | undefined, content: string | undefined): boolean {
  const normalizedTitle = (title || '').toLowerCase();
  const normalizedContent = content || '';
  const hasDiagramLabel =
    /(diagram|schematic|free[- ]?body|fbd|sketch)/i.test(normalizedTitle) ||
    /(diagram|schematic|free[- ]?body|fbd|sketch)/i.test(normalizedContent);

  const fencedBlockMatch = normalizedContent.match(/```(?:text|ascii)?\s*\n([\s\S]*?)```/i);
  const fencedBlock = fencedBlockMatch ? fencedBlockMatch[1] : '';
  const nonEmptyLineCount = fencedBlock
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .length;

  return hasDiagramLabel && nonEmptyLineCount >= 3;
}

function isDiagramAnnotationCommand(command: WorksheetCommand): boolean {
  if (command.action !== 'add_annotation') return false;
  return isDiagramLikeContent(command.title, command.content);
}

function hasExistingProblemRestatementNode(): boolean {
  const doc = useDocumentStore.getState().document;
  if (!doc) return false;
  return doc.nodes.some((node) => node.type === 'text' && node.content.trim().length > 0);
}

function hasExistingDiagramNode(): boolean {
  const doc = useDocumentStore.getState().document;
  if (!doc) return false;
  return doc.nodes.some(
    (node) => node.type === 'annotation' && isDiagramLikeContent(node.title, node.content),
  );
}

function applyContextCompletenessRule(
  commands: WorksheetCommand[],
  results: ValidationResult[],
): { applied: boolean; message?: string } {
  const hasContextRequiredCommands = commands.some(isContextRequiredCommand);
  if (!hasContextRequiredCommands) {
    return { applied: false };
  }

  const hasRestatement =
    commands.some(isProblemRestatementCommand) || hasExistingProblemRestatementNode();
  const hasDiagram = commands.some(isDiagramAnnotationCommand) || hasExistingDiagramNode();
  if (hasRestatement && hasDiagram) {
    return { applied: false };
  }

  const missing: string[] = [];
  if (!hasRestatement) missing.push('a problem restatement (`add_text`)');
  if (!hasDiagram) {
    missing.push('a diagram (`add_annotation`) with a fenced ASCII sketch (at least 3 lines)');
  }

  const message = `Equation proposals must include ${missing.join(' and ')}.`;
  const targetIndex = commands.findIndex(
    (command, idx) => isContextRequiredCommand(command) && results[idx]?.status !== 'invalid',
  );

  if (targetIndex >= 0) {
    results[targetIndex] = {
      status: 'invalid',
      message,
    };
    return { applied: true, message };
  }

  return { applied: false, message };
}

/** Validate a batch of commands, returning results for each */
export async function validateBatch(
  commands: WorksheetCommand[]
): Promise<ValidationResult[]> {
  const timer = startTimer('validateBatch', 'api');

  // Resolve symbol names → node IDs before validation.
  // AIs reference nodes by symbol ("b") not UUID.
  resolveNodeReferences(commands);

  const results: ValidationResult[] = [];

  for (const command of commands) {
    try {
      const result = await validateOne(command);
      results.push(result);
      logger.api.request('commandValidator', {
        action: command.action,
        status: result.status,
      });
    } catch (err) {
      logger.api.error('commandValidator', 0, err);
      results.push({
        status: 'invalid',
        message: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const contextRule = applyContextCompletenessRule(commands, results);
  if (contextRule.applied) {
    logger.api.request('commandValidator', {
      action: 'context_completeness',
      status: 'invalid',
      message: contextRule.message,
    });
  }

  timer.complete({ commandCount: commands.length, resultCount: results.length });
  return results;
}

/** Check if any command in the batch is invalid */
export function hasInvalidCommands(results: ValidationResult[]): boolean {
  return results.some((r) => r.status === 'invalid');
}
