/**
 * Command Executor - Execute AI commands via store actions (WEB VERSION)
 *
 * Maps symmetric API commands to the same store actions the UI uses.
 * All changes are tracked with LLM provenance in the history.
 */

import { useDocumentStore, createGivenNode, createEquationNode, createConstraintNode, createSolveGoalNode, createTextNode, createAnnotationNode } from './documentStore';
import type { WorksheetCommand, CommandResult, BatchResult } from '../types/commands';
import type { NodePosition } from '../types/document';
import { logger } from '../utils/logger';
import { normalizeLatex } from '../utils/mathParsing';
import { planBatchNodePositions } from './commandPlacement';

/**
 * Sanitize a symbol name from AI output.
 * Uses normalizeLatex to strip all LaTeX, then extracts just the identifier.
 */
function sanitizeSymbol(symbol: string): string {
  let s = normalizeLatex(symbol);
  s = s.replace(/[^a-zA-Z0-9_]/g, '');
  return s.trim();
}

/**
 * Sanitize a unit string from AI output.
 * Strips LaTeX decorators: `\; \mathrm{m}` -> `m`, `\text{kg}` -> `kg`
 */
function sanitizeUnit(unit: string): string {
  let u = unit;
  u = u.replace(/\\[;,!:]/g, '');
  u = u.replace(/\\(?:mathrm|text|mathit|mathbf|operatorname)\{([^}]*)\}/g, '$1');
  u = u.replace(/\\[a-zA-Z]+/g, '');
  u = u.replace(/[{}]/g, '');
  return u.trim();
}

/** Execute a single command against the document store */
async function executeOne(command: WorksheetCommand, position?: NodePosition): Promise<CommandResult> {
  const store = useDocumentStore.getState();

  try {
    switch (command.action) {
      case 'add_given': {
        const node = createGivenNode(
          sanitizeSymbol(command.symbol),
          command.value,
          command.unit ? sanitizeUnit(command.unit) : undefined,
          position,
        );
        node.provenance = { type: 'llm', timestamp: new Date().toISOString() };
        await store.insertNode(node);
        break;
      }

      case 'add_equation': {
        const node = createEquationNode(
          command.latex,
          sanitizeSymbol(command.lhs),
          normalizeLatex(command.rhs),
          position,
        );
        node.provenance = { type: 'llm', timestamp: new Date().toISOString() };
        await store.insertNode(node);
        break;
      }

      case 'add_constraint': {
        const node = createConstraintNode(
          command.latex,
          normalizeLatex(command.sympy),
          position,
        );
        node.provenance = { type: 'llm', timestamp: new Date().toISOString() };
        if (command.applies_to) {
          node.applies_to = command.applies_to;
        }
        await store.insertNode(node);
        break;
      }

      case 'add_solve_goal': {
        const node = createSolveGoalNode(
          sanitizeSymbol(command.target),
          command.method,
          position,
        );
        node.provenance = { type: 'llm', timestamp: new Date().toISOString() };
        await store.insertNode(node);
        break;
      }

      case 'add_text': {
        const node = createTextNode(command.content, position);
        node.provenance = { type: 'llm', timestamp: new Date().toISOString() };
        await store.insertNode(node);
        break;
      }

      case 'add_annotation': {
        const node = createAnnotationNode(command.content, command.title, position);
        node.provenance = { type: 'llm', timestamp: new Date().toISOString() };
        await store.insertNode(node);
        break;
      }

      case 'update_node': {
        await store.updateNode(command.node_id, command.updates);
        break;
      }

      case 'delete_node': {
        await store.deleteNode(command.node_id);
        break;
      }

      case 'add_assumption': {
        await store.addAssumption(
          command.statement,
          command.formal_expression,
          command.scope,
        );
        break;
      }

      case 'remove_assumption': {
        await store.removeAssumption(command.assumption_id);
        break;
      }

      case 'verify_node': {
        await store.verifyNode(command.node_id);
        break;
      }

      case 'verify_all': {
        await store.verifyAllNodes();
        break;
      }
    }

    logger.api.request('commandExecutor', { action: command.action, success: true });
    return { command, success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.api.request('commandExecutor', { action: command.action, success: false, error });
    return { command, success: false, error };
  }
}

/** Execute a batch of commands sequentially */
export async function executeBatch(commands: WorksheetCommand[]): Promise<BatchResult> {
  const results: CommandResult[] = [];
  let succeeded = 0;
  let failed = 0;
  const plannedPositions = planBatchNodePositions(commands, useDocumentStore.getState().document);

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const result = await executeOne(command, plannedPositions[i]);
    results.push(result);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    results,
    total: commands.length,
    succeeded,
    failed,
  };
}
