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
    const eqs = (overrideEquations || equations).map(normalizeSolveEquation);
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
