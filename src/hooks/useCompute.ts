/**
 * useCompute - Hook for worksheet computation
 *
 * Provides:
 * - Symbol table from Given nodes
 * - Equation collection
 * - Solve execution
 * - Unit inference
 */

import { useMemo, useCallback, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { logger } from '../utils/logger';
import {
  extractSymbolTable,
  extractEquations,
  extractSolveGoals,
  solveFor,
  evaluateExpression,
  checkUnits,
  inferResultUnit,
  SymbolTable,
  SystemAnalysis,
} from '../services/computeService';
import type { SolveGoalNode } from '../types/document';

interface SolveResult {
  targetSymbol: string;
  symbolicResult?: string;
  numericResult?: number;
  unit?: string;
  latex?: string;
  steps?: Array<{ description: string; expression: string; latex?: string }>;
  systemAnalysis?: SystemAnalysis;
  error?: string;
}

function normalizeSolveEquation(rawEquation: string): string {
  const trimmed = rawEquation.trim();

  const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
  if (assignMatch && /^eq_[a-zA-Z0-9_]+$/.test(assignMatch[1])) {
    return `${assignMatch[2].trim()} = 0`;
  }

  const eqCallMatch = trimmed.match(/^Eq\(\s*(eq_[a-zA-Z0-9_]+)\s*,\s*(.+)\)\s*$/);
  if (eqCallMatch) {
    return `${eqCallMatch[2].trim()} = 0`;
  }

  return trimmed;
}

const NON_SYMBOLS = new Set([
  'pi', 'oo', 'sqrt', 'exp', 'log', 'ln', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'Abs', 'abs', 'Eq', 'min', 'max', 'Min', 'Max',
]);

function identifiers(expression: string): Set<string> {
  return new Set(expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
}

function lhsSymbol(equation: string): string | null {
  const match = equation.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/);
  return match ? match[1] : null;
}

/**
 * Keep only the equations the target depends on: its defining equation (or,
 * for an implicit target, every equation that mentions it) plus the defining
 * equations of any unknown intermediates. Sending unrelated equations makes
 * the engine check unknowns it was not asked about, so solving for A_t in
 * {A_t = pi/4*d**2, sigma = F/A_t} would otherwise fail on sigma.
 */
function relevantEquations(equations: string[], target: string, known: Set<string>): string[] {
  const defining = equations.filter((eq) => lhsSymbol(eq) === target);
  const chosen = new Set(defining.length ? defining : equations.filter((eq) => identifiers(eq).has(target)));
  if (chosen.size === 0) return equations;
  const resolved = new Set([target]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const eq of [...chosen]) {
      for (const name of identifiers(eq)) {
        if (resolved.has(name) || known.has(name) || NON_SYMBOLS.has(name)) continue;
        resolved.add(name);
        for (const candidate of equations) {
          if (!chosen.has(candidate) && lhsSymbol(candidate) === name) {
            chosen.add(candidate);
            grew = true;
          }
        }
      }
    }
  }
  return equations.filter((eq) => chosen.has(eq));
}

/**
 * The engine reports results in SI base units ("kg * m**-1 * s**-2"). Show the
 * usual named unit for common dimensions instead; the value is unchanged
 * because each named unit here equals its base-unit product exactly.
 */
const NAMED_SI_UNITS: Record<string, string> = {
  'kg:1,m:1,s:-2': 'N',
  'kg:1,m:-1,s:-2': 'Pa',
  'kg:1,m:2,s:-2': 'N*m',
  'kg:1,m:2,s:-3': 'W',
  'A:-1,kg:1,m:2,s:-3': 'V',
  'A:-2,kg:1,m:2,s:-3': 'ohm',
  'kg:1,s:-2': 'N/m',
  's:-1': 'Hz',
};

export function namedSiUnit(unit: string | undefined): string | undefined {
  if (!unit) return unit;
  const powers = new Map<string, number>();
  for (const factor of unit.replace(/\*\*/g, '^').split('*').map((f) => f.trim())) {
    const match = factor.match(/^([A-Za-z]+)(?:\^\(?(-?\d+)\)?)?$/);
    if (!match) return unit;
    powers.set(match[1], (powers.get(match[1]) ?? 0) + Number(match[2] ?? 1));
  }
  const key = [...powers].filter(([, p]) => p !== 0).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([u, p]) => `${u}:${p}`).join(',');
  return NAMED_SI_UNITS[key] ?? unit;
}

export function useCompute() {
  const { document } = useDocumentStore();
  const [isComputing, setIsComputing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Extract symbol table from known values (givens + computed results)
  const symbolTable = useMemo<SymbolTable>(() => {
    if (!document) return {};
    return extractSymbolTable(document);
  }, [document]);

  // Extract all equations
  const equations = useMemo<string[]>(() => {
    if (!document) return [];
    return extractEquations(document);
  }, [document]);

  // Get solve goals
  const solveGoals = useMemo<SolveGoalNode[]>(() => {
    if (!document) return [];
    return extractSolveGoals(document);
  }, [document]);

  // Check if we have everything needed to solve
  const canSolve = useMemo(() => {
    return equations.length > 0 && solveGoals.length > 0;
  }, [equations, solveGoals]);

  // Solve for a specific target.
  // Pass `overrideEquations` to solve against a specific equation subset
  // instead of every equation in the document (prevents unrelated equations
  // from causing SymPy system-solve failures).
  const solve = useCallback(async (targetSymbol: string, method?: 'symbolic' | 'numeric' | 'auto', overrideEquations?: string[]): Promise<SolveResult> => {
    const normalized = (overrideEquations || equations).map(normalizeSolveEquation);
    const eqs = overrideEquations
      ? normalized
      : relevantEquations(normalized, targetSymbol, new Set(Object.keys(symbolTable)));
    if (eqs.length === 0) {
      return { targetSymbol, error: 'No equations defined' };
    }

    setIsComputing(true);
    setLastError(null);

    try {
      const response = await solveFor(eqs, targetSymbol, symbolTable, method);

      if (!response.success || !response.solutions || response.solutions.length === 0) {
        const error = response.error || 'No solution found';
        setLastError(error);
        return { targetSymbol, error };
      }

      const solution = response.solutions[0];

      // Try to infer the unit if not provided
      let unit = solution.unit;
      logger.debug('hook', 'Initial unit from solution', { unit, symbolic: solution.symbolic });

      if (!unit && solution.symbolic) {
        // Use the symbolic solution for unit inference (e.g., "F/P" when solving for A from P = F/A)
        // This properly handles rearranged equations
        const unitExpression = inferResultUnit(solution.symbolic, symbolTable);
        logger.debug('hook', 'Unit expression from inferResultUnit', {
          unitExpression,
          targetSymbol,
          includesTarget: unitExpression?.includes(targetSymbol)
        });

        if (unitExpression && !unitExpression.includes(targetSymbol)) {
          // Strip wrapping parentheses: "(lbf)" → "lbf"
          const cleaned = unitExpression.trim().replace(/^\(([^()]+)\)$/, '$1');
          // If it's already a simple named unit (no operators), use it directly
          // instead of sending to checkUnits which converts to SI base form.
          const isSimpleUnit = /^[A-Za-z°µ/^0-9]+$/.test(cleaned);
          if (isSimpleUnit) {
            unit = cleaned;
          } else {
            // Compound expression — ask sidecar to simplify it
            const normalizedUnits = unitExpression
              .replace(/\*\*/g, '^')
              .replace(/\*/g, ' * ')
              .replace(/\//g, ' / ')
              .replace(/\s+/g, ' ')
              .trim();
            const quantityExpression = `1 ${normalizedUnits}`;
            try {
              const unitCheck = await checkUnits(quantityExpression);
              if (unitCheck.consistent && unitCheck.inferred_unit) {
                unit = unitCheck.inferred_unit;
              } else {
                unit = unitExpression;
              }
            } catch {
              unit = unitExpression;
            }
          }
        }
      }
      unit = namedSiUnit(unit ?? undefined) ?? unit;
      logger.info('hook', 'Compute final unit', { unit });

      return {
        targetSymbol,
        symbolicResult: solution.symbolic ?? undefined,
        numericResult: solution.numeric ?? undefined,
        unit: unit ?? undefined,
        latex: solution.latex ?? undefined,
        steps: response.steps?.map(s => ({ ...s, latex: s.latex ?? undefined })),
        systemAnalysis: response.system_analysis ?? undefined,
      };
    } catch (e) {
      const error = String(e);
      setLastError(error);
      return { targetSymbol, error };
    } finally {
      setIsComputing(false);
    }
  }, [equations, symbolTable]);

  // Solve all goals and add result nodes
  const solveAll = useCallback(async (): Promise<SolveResult[]> => {
    const results: SolveResult[] = [];

    for (const goal of solveGoals) {
      const result = await solve(goal.target_symbol, goal.method as 'symbolic' | 'numeric' | 'auto');
      results.push(result);

      // If successful, we could add a Result node here
      // For now, just return the results
    }

    return results;
  }, [solveGoals, solve]);

  // Evaluate a single expression with current symbol table
  const evaluate = useCallback(async (expression: string) => {
    setIsComputing(true);
    setLastError(null);

    try {
      const response = await evaluateExpression(expression, symbolTable);

      if (!response.success) {
        setLastError(response.error || 'Evaluation failed');
      }

      return response;
    } catch (e) {
      const error = String(e);
      setLastError(error);
      return { success: false, error };
    } finally {
      setIsComputing(false);
    }
  }, [symbolTable]);

  // Check units of an expression
  const checkExpressionUnits = useCallback(async (expression: string, expectedUnit?: string) => {
    try {
      return await checkUnits(expression, expectedUnit);
    } catch (e) {
      return { consistent: false, error: String(e) };
    }
  }, []);

  // Get the value of a symbol (if it exists)
  const getSymbolValue = useCallback((symbol: string) => {
    return symbolTable[symbol];
  }, [symbolTable]);

  // Check if a symbol is defined
  const isSymbolDefined = useCallback((symbol: string) => {
    return symbol in symbolTable;
  }, [symbolTable]);

  // Get all defined symbols
  const definedSymbols = useMemo(() => {
    return Object.keys(symbolTable);
  }, [symbolTable]);

  return {
    // State
    symbolTable,
    equations,
    solveGoals,
    canSolve,
    isComputing,
    lastError,
    definedSymbols,

    // Actions
    solve,
    solveAll,
    evaluate,
    checkExpressionUnits,
    getSymbolValue,
    isSymbolDefined,
  };
}
