/**
 * Text-to-Node Parser
 *
 * Parses natural language or shorthand text into worksheet nodes.
 * Supports patterns like:
 * - "Given m = 10 kg" → GivenNode
 * - "Let F = m*a" → EquationNode
 * - "Find v" or "Solve for v" → SolveGoalNode
 * - "m = 5 kg" → GivenNode (shorthand)
 * - "F = m*a" → EquationNode (shorthand with detection)
 */

import type { WorksheetNode, NodePosition } from '../types/document';
import {
  createGivenNode,
  createEquationNode,
  createConstraintNode,
  createSolveGoalNode,
  createTextNode,
} from '../stores/documentStore';

export interface ParseResult {
  success: boolean;
  nodes: WorksheetNode[];
  errors: string[];
  warnings: string[];
}

interface ParsedGiven {
  symbol: string;
  value: number;
  unit?: string;
}

interface ParsedEquation {
  lhs: string;
  rhs: string;
  latex?: string;
}

interface ParsedSolveGoal {
  target: string;
  method?: 'symbolic' | 'numeric' | 'auto';
}

interface ParsedConstraint {
  expression: string;
  latex: string;
  sympy: string;
}

/**
 * Parse a single line of text into a node
 */
function parseLine(line: string): { type: 'given' | 'equation' | 'constraint' | 'solve_goal' | 'text' | 'empty'; data?: ParsedGiven | ParsedEquation | ParsedConstraint | ParsedSolveGoal | string } {
  const trimmed = line.trim();

  if (!trimmed) {
    return { type: 'empty' };
  }

  // Pattern: "Given X = value unit" or "Let X = value unit"
  const givenPattern = /^(?:given|let|define|set)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.*)$/i;
  const givenMatch = trimmed.match(givenPattern);
  if (givenMatch) {
    const [, symbol, valueStr, unit] = givenMatch;
    return {
      type: 'given',
      data: {
        symbol,
        value: parseFloat(valueStr),
        unit: unit.trim() || undefined,
      } as ParsedGiven,
    };
  }

  // Pattern: "Solve for X" or "Find X" or "Calculate X"
  const solvePattern = /^(?:solve\s+for|find|calculate|determine|compute)\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+(?:using\s+)?(symbolic|numeric|auto))?$/i;
  const solveMatch = trimmed.match(solvePattern);
  if (solveMatch) {
    const [, target, method] = solveMatch;
    return {
      type: 'solve_goal',
      data: {
        target,
        method: method?.toLowerCase() as 'symbolic' | 'numeric' | 'auto' | undefined,
      } as ParsedSolveGoal,
    };
  }

  // Pattern: Constraints "x > 0", "T <= 100", "Constraint x > 0"
  const constraintPattern = /^(?:constraint\s+)?(.+\s*(?:>=|<=|>|<)\s*.+)$/i;
  const constraintMatch = trimmed.match(constraintPattern);
  if (constraintMatch) {
    const expr = constraintMatch[1].trim();
    // Verify it contains a real comparison (variable vs number or variable vs variable)
    const hasComparison = /[a-zA-Z_]\w*\s*(?:>=|<=|>|<)\s*[+-]?\d*\.?\d+|[+-]?\d*\.?\d+\s*(?:>=|<=|>|<)\s*[a-zA-Z_]\w*|[a-zA-Z_]\w*\s*(?:>=|<=|>|<)\s*[a-zA-Z_]\w*/.test(expr);
    if (hasComparison) {
      const latex = expr.replace(/>=/, ' \\geq ').replace(/<=/, ' \\leq ');
      return {
        type: 'constraint',
        data: { expression: expr, latex, sympy: expr } as ParsedConstraint,
      };
    }
  }

  // Pattern: Shorthand "X = value unit" (without keyword, for given values)
  const shorthandGivenPattern = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.*)$/;
  const shorthandGivenMatch = trimmed.match(shorthandGivenPattern);
  if (shorthandGivenMatch) {
    const [, symbol, valueStr, unit] = shorthandGivenMatch;
    // Check if unit looks like an expression (contains operators)
    const unitTrimmed = unit.trim();
    if (!unitTrimmed.includes('*') && !unitTrimmed.includes('+') && !unitTrimmed.includes('-')) {
      return {
        type: 'given',
        data: {
          symbol,
          value: parseFloat(valueStr),
          unit: unitTrimmed || undefined,
        } as ParsedGiven,
      };
    }
  }

  // Pattern: Equation "X = expression" (where expression contains other variables)
  const equationPattern = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/;
  const equationMatch = trimmed.match(equationPattern);
  if (equationMatch) {
    const [, lhs, rhs] = equationMatch;
    // Check if RHS contains variables (not just a number)
    const rhsTrimmed = rhs.trim();
    const hasVariables = /[a-zA-Z_][a-zA-Z0-9_]*/.test(rhsTrimmed);

    if (hasVariables) {
      // Generate LaTeX from expression
      const latex = `${lhs} = ${expressionToLatex(rhsTrimmed)}`;
      return {
        type: 'equation',
        data: {
          lhs,
          rhs: rhsTrimmed,
          latex,
        } as ParsedEquation,
      };
    }
  }

  // If nothing matches, treat as text
  return {
    type: 'text',
    data: trimmed,
  };
}

/**
 * Convert a mathematical expression to LaTeX
 */
function expressionToLatex(expr: string): string {
  return expr
    // Convert ** to ^
    .replace(/\*\*/g, '^')
    // Convert * to \cdot (but not *)
    .replace(/\*/g, ' \\cdot ')
    // Convert sqrt(x) to \sqrt{x}
    .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
    // Convert sin, cos, tan, etc.
    .replace(/\b(sin|cos|tan|log|ln|exp)\(/g, '\\$1(')
    // Convert subscripts: x_1 → x_{1}
    .replace(/_([a-zA-Z0-9]+)(?![}])/g, '_{$1}')
    // Convert superscripts: x^2 → x^{2}
    .replace(/\^([a-zA-Z0-9]+)(?![}])/g, '^{$1}');
}

/**
 * Parse multiple lines of text into nodes
 */
export function parseText(text: string, startPosition?: NodePosition): ParseResult {
  const lines = text.split('\n');
  const nodes: WorksheetNode[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let yOffset = startPosition?.y ?? 100;
  const xPosition = startPosition?.x ?? 100;
  const lineSpacing = 80; // Vertical spacing between nodes

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = parseLine(line);
    const position: NodePosition = { x: xPosition, y: yOffset };

    switch (result.type) {
      case 'empty':
        // Skip empty lines
        continue;

      case 'given': {
        const data = result.data as ParsedGiven;
        const node = createGivenNode(data.symbol, data.value, data.unit, position);
        nodes.push(node);
        yOffset += lineSpacing;
        break;
      }

      case 'equation': {
        const data = result.data as ParsedEquation;
        const node = createEquationNode(
          data.latex || `${data.lhs} = ${data.rhs}`,
          data.lhs,
          data.rhs,
          position
        );
        nodes.push(node);
        yOffset += lineSpacing;
        break;
      }

      case 'constraint': {
        const data = result.data as ParsedConstraint;
        const node = createConstraintNode(data.latex, data.sympy, position);
        nodes.push(node);
        yOffset += lineSpacing;
        break;
      }

      case 'solve_goal': {
        const data = result.data as ParsedSolveGoal;
        const node = createSolveGoalNode(data.target, data.method, position);
        nodes.push(node);
        yOffset += lineSpacing;
        break;
      }

      case 'text': {
        const content = result.data as string;
        // Only create text node if it has content
        if (content) {
          const node = createTextNode(content, position);
          nodes.push(node);
          yOffset += lineSpacing;
        }
        break;
      }
    }
  }

  return {
    success: errors.length === 0,
    nodes,
    errors,
    warnings,
  };
}

/**
 * Parse a single line and return immediate feedback
 */
export function parseLineWithFeedback(line: string): {
  type: 'given' | 'equation' | 'constraint' | 'solve_goal' | 'text' | 'empty';
  preview: string;
  valid: boolean;
} {
  const result = parseLine(line);

  switch (result.type) {
    case 'empty':
      return { type: 'empty', preview: '', valid: true };

    case 'given': {
      const data = result.data as ParsedGiven;
      const unitStr = data.unit ? ` ${data.unit}` : '';
      return {
        type: 'given',
        preview: `Given: ${data.symbol} = ${data.value}${unitStr}`,
        valid: true,
      };
    }

    case 'equation': {
      const data = result.data as ParsedEquation;
      return {
        type: 'equation',
        preview: `Equation: ${data.lhs} = ${data.rhs}`,
        valid: true,
      };
    }

    case 'constraint': {
      const data = result.data as ParsedConstraint;
      return {
        type: 'constraint',
        preview: `Constraint: ${data.expression}`,
        valid: true,
      };
    }

    case 'solve_goal': {
      const data = result.data as ParsedSolveGoal;
      const methodStr = data.method ? ` (${data.method})` : '';
      return {
        type: 'solve_goal',
        preview: `Solve for: ${data.target}${methodStr}`,
        valid: true,
      };
    }

    case 'text':
      return {
        type: 'text',
        preview: `Text: ${result.data as string}`,
        valid: true,
      };
  }
}

/**
 * Quick validation - check if text can be parsed without creating nodes
 */
export function validateText(text: string): { valid: boolean; nodeCount: number; errors: string[] } {
  const result = parseText(text);
  return {
    valid: result.success,
    nodeCount: result.nodes.length,
    errors: result.errors,
  };
}
