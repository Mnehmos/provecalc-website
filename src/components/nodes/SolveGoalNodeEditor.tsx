/**
 * SolveGoalNodeEditor - Editor for Solve Goal nodes
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { WorksheetNode, GivenNode, ResultNode } from '../../types/document';
import { useDocumentStore, createResultNode, getResultNodePosition } from '../../stores/documentStore';
import { useCompute } from '../../hooks/useCompute';
import { MathDisplay } from '../MathDisplay';
import { getCanonicalEquationFields } from '../../utils/mathParsing';
import { extractKnownSymbols, getEquationVariables, getInputSymbolNodeIds, normalizeSolveUnit } from '../../utils/solveContext';
import { getEquationLHS, formatSymbolLatex } from './nodeShared';
import { logger } from '../../utils/logger';

export function SolveGoalNodeEditor({ node, onSave, onCancel }: { node: WorksheetNode & { type: 'solve_goal' }; onSave: (u: Partial<WorksheetNode>) => void; onCancel: () => void }) {
  const { document, insertNode } = useDocumentStore();
  const { solve, isComputing } = useCompute();
  const [targetSymbol, setTargetSymbol] = useState(node.target_symbol);
  const [method, setMethod] = useState<'symbolic' | 'numeric' | 'auto'>(node.method || 'auto');
  const [showTargetDropdown, setShowTargetDropdown] = useState(!node.target_symbol);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [lastComputedResult, setLastComputedResult] = useState<{ value: number; unit?: string } | null>(null);
  const autoSolveAttemptedRef = useRef<string | null>(null); // Track which target we've auto-solved for

  // Get all equations from document
  const equations = useMemo(() => {
    if (!document) return [];
    return document.nodes
      .filter((n): n is WorksheetNode & { type: 'equation' } => n.type === 'equation')
      .map(eq => {
        const canonical = getCanonicalEquationFields(eq);
        return {
          id: eq.id,
          latex: eq.latex,
          sympy: eq.sympy || '',
          lhs: canonical.lhs || getEquationLHS(eq.sympy || '') || '',
          rhs: canonical.rhs || '',
          variables: getEquationVariables(eq),
        };
      });
  }, [document]);

  const knownSymbols = useMemo(() => extractKnownSymbols(document), [document]);

  // Get all solvable targets (variables in equations that aren't already defined)
  // This includes both LHS variables AND RHS variables that could be solved for algebraically
  const solvableTargets = useMemo(() => {
    const knownSymbolSet = new Set(knownSymbols.map(g => g.symbol));
    const targets: Array<{ symbol: string; equation: typeof equations[0] }> = [];
    const addedSymbols = new Set<string>();

    for (const eq of equations) {
      // First, add LHS if not given
      const lhs = eq.lhs;
      if (lhs && !knownSymbolSet.has(lhs) && !addedSymbols.has(lhs)) {
        targets.push({ symbol: lhs, equation: eq });
        addedSymbols.add(lhs);
      }

      // Also add any RHS variables that aren't given and could be solved for
      // (when all other variables in the equation are known)
      for (const variable of eq.variables) {
        if (!knownSymbolSet.has(variable) && !addedSymbols.has(variable)) {
          // Check if all OTHER variables in the equation are known
          const otherVars = eq.variables.filter(v => v !== variable);
          const allOthersKnown = otherVars.every(v => knownSymbolSet.has(v));
          if (allOthersKnown) {
            targets.push({ symbol: variable, equation: eq });
            addedSymbols.add(variable);
          }
        }
      }
    }

    return targets;
  }, [equations, knownSymbols]);

  // Find the equation that can be used to solve for the current target
  // This could be an equation where target is LHS, or one that contains the target variable
  const definingEquation = useMemo(() => {
    // First try to find where target is LHS
    const lhsMatch = equations.find(eq => eq.lhs === targetSymbol);
    if (lhsMatch) return lhsMatch;
    // Otherwise find any equation containing the target variable
    return equations.find(eq => eq.variables.includes(targetSymbol));
  }, [equations, targetSymbol]);

  // Get the input variables for the current target (variables on RHS with known values)
  const inputVariables = useMemo(() => {
    if (!definingEquation) return [];

    const rhsVars = definingEquation.variables.filter(v => v !== targetSymbol);
    return rhsVars.map(v => {
      const known = knownSymbols.find(g => g.symbol === v);
      return {
        symbol: v,
        defined: !!known,
        value: known?.value,
        unit: known?.unit,
      };
    });
  }, [definingEquation, targetSymbol, knownSymbols]);

  // Check if we can solve (all inputs defined)
  const canSolve = inputVariables.length > 0 && inputVariables.every(v => v.defined);

  // Compute dependencies for this SolveGoal node (equation + known input providers)
  const targetDependencies = useMemo((): string[] => {
    const deps: string[] = [];
    if (definingEquation) {
      deps.push(definingEquation.id);
    }
    deps.push(...getInputSymbolNodeIds(document, inputVariables.map(v => v.symbol), targetSymbol));
    return deps;
  }, [definingEquation, document, inputVariables, targetSymbol]);

  // Check if a computed result already exists for this target symbol
  const existingComputedNode = useMemo(() => {
    if (!document || !targetSymbol) return null;
    // Check both result nodes and legacy computed given nodes
    return document.nodes.find((n): n is ResultNode | GivenNode =>
      (n.type === 'result' && (n as ResultNode).symbol === targetSymbol) ||
      (n.type === 'given' && (n as GivenNode).symbol === targetSymbol && n.provenance?.type === 'computed')
    ) || null;
  }, [document, targetSymbol]);

  // Auto-solve when all inputs become defined
  useEffect(() => {
    // Don't auto-solve if:
    // - We can't solve (missing inputs)
    // - We're already solving
    // - No target symbol selected
    // - We already have a computed result for this exact target
    // - We already attempted auto-solve for this target
    if (!canSolve || isAutoSolving || isComputing || !targetSymbol) return;
    if (existingComputedNode) {
      // Update our state to reflect existing result
      if (!lastComputedResult) {
        setLastComputedResult({
          value: existingComputedNode.value.value,
          unit: existingComputedNode.value.unit?.expression,
        });
      }
      return;
    }
    if (autoSolveAttemptedRef.current === targetSymbol) return;

    // Mark that we're attempting auto-solve for this target
    autoSolveAttemptedRef.current = targetSymbol;

    const autoSolve = async () => {
      logger.debug('verification', 'Auto-executing solve', { targetSymbol });
      setIsAutoSolving(true);
      setSolveError(null);

      try {
        const result = await solve(targetSymbol, method);

        if (result.error) {
          logger.error('verification', 'Auto-solve failed', { error: result.error });
          setSolveError(result.error);
          setIsAutoSolving(false);
          return;
        }

        const computedValue = result.numericResult;
        if (typeof computedValue !== 'number' || !Number.isFinite(computedValue)) {
          setSolveError(`No numeric solution found for ${targetSymbol}.`);
          setIsAutoSolving(false);
          return;
        }
        const cleanUnit = normalizeSolveUnit(result.unit);

        // Store the result for display
        setLastComputedResult({ value: computedValue, unit: cleanUnit });

        // Create a Result node for the computed value
        const nodePos = node.position || { x: 150, y: 200 };
        const resultPos = getResultNodePosition(nodePos, document);
        const newResultNode = createResultNode(
          targetSymbol,
          computedValue,
          cleanUnit,
          node.id,
          result.symbolicResult,
          resultPos
        );

        // Mark provenance with contributing nodes
        const contributingNodeIds: string[] = [];
        if (definingEquation) {
          contributingNodeIds.push(definingEquation.id);
        }
        contributingNodeIds.push(
          ...getInputSymbolNodeIds(document, inputVariables.map(v => v.symbol), targetSymbol),
        );

        newResultNode.provenance = {
          type: 'computed',
          from_nodes: contributingNodeIds,
          timestamp: new Date().toISOString(),
        };

        await insertNode(newResultNode);
        logger.info('verification', 'Auto-solve complete', { targetSymbol, value: computedValue, unit: cleanUnit });

        // Save the solve goal node state
        onSave({ target_symbol: targetSymbol, method, dependencies: targetDependencies });
      } catch (e) {
        logger.error('verification', 'Auto-solve exception', { error: String(e) });
        setSolveError(String(e));
      } finally {
        setIsAutoSolving(false);
      }
    };

    // Small delay to avoid race conditions during initial render
    const timer = setTimeout(autoSolve, 100);
    return () => clearTimeout(timer);
  }, [canSolve, isAutoSolving, isComputing, targetSymbol, existingComputedNode, lastComputedResult, method, solve, definingEquation, document, inputVariables, insertNode, node.position, onSave, targetDependencies]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave({ target_symbol: targetSymbol, method, dependencies: targetDependencies });
    } else if (e.key === 'Escape') {
      if (showTargetDropdown) {
        setShowTargetDropdown(false);
      } else {
        onCancel();
      }
    }
  };

  const handleSelectTarget = (symbol: string) => {
    setTargetSymbol(symbol);
    setShowTargetDropdown(false);
  };

  return (
    <div className="node-editor solve-goal-editor smart-solve-editor">
      {/* Target Selection */}
      <div className="editor-section">
        <label className="section-label">Solve for:</label>
        <div className="target-selector">
          <div
            className="target-input"
            onClick={() => setShowTargetDropdown(!showTargetDropdown)}
          >
            {targetSymbol ? (
              <span className="selected-target">
                <MathDisplay latex={formatSymbolLatex(targetSymbol)} />
              </span>
            ) : (
              <span className="target-placeholder">Select variable...</span>
            )}
            <span className="dropdown-arrow">▼</span>
          </div>

          {showTargetDropdown && (
            <div className="target-dropdown">
              {solvableTargets.length > 0 ? (
                <>
                  <div className="dropdown-header">Available targets from equations:</div>
                  {solvableTargets.map(({ symbol, equation }) => (
                    <div
                      key={symbol}
                      className={`target-option ${symbol === targetSymbol ? 'selected' : ''}`}
                      onClick={() => handleSelectTarget(symbol)}
                    >
                      <span className="target-symbol"><MathDisplay latex={formatSymbolLatex(symbol)} displayMode={false} /></span>
                      <span className="target-equation">
                        <MathDisplay latex={equation.latex} />
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-targets">
                  No equations defined yet. Add an equation first.
                </div>
              )}
              <div className="dropdown-divider" />
              <div className="custom-target">
                <input
                  type="text"
                  value={targetSymbol}
                  onChange={(e) => setTargetSymbol(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Or type custom symbol..."
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Defining Equation */}
      {definingEquation && (
        <div className="editor-section equation-section">
          <label className="section-label">Using equation:</label>
          <div className="defining-equation">
            <MathDisplay latex={definingEquation.latex} />
          </div>
        </div>
      )}

      {/* Input Variables */}
      {inputVariables.length > 0 && (
        <div className="editor-section inputs-section">
          <label className="section-label">Input values:</label>
          <div className="input-variables">
            {inputVariables.map(v => (
              <div key={v.symbol} className={`input-var ${v.defined ? 'defined' : 'undefined'}`}>
                <span className="input-symbol"><MathDisplay latex={formatSymbolLatex(v.symbol)} displayMode={false} /></span>
                {v.defined ? (
                  <span className="input-value">
                    = {v.value}{v.unit ? ` ${v.unit}` : ''}
                  </span>
                ) : (
                  <span className="input-missing">⚠ not defined</span>
                )}
              </div>
            ))}
          </div>
          {!canSolve && (
            <div className="solve-warning">
              Define all input variables to solve
            </div>
          )}
        </div>
      )}

      {/* Method Selection */}
      <div className="editor-section method-section">
        <label className="section-label">Method:</label>
        <div className="method-options">
          {(['auto', 'symbolic', 'numeric'] as const).map(m => (
            <button
              key={m}
              className={`method-btn ${method === m ? 'selected' : ''}`}
              onClick={() => setMethod(m)}
            >
              {m === 'auto' ? 'Auto' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Status Section - Shows different states */}
      {targetSymbol && (
        <div className="editor-section status-section">
          {/* State: Computing */}
          {(isAutoSolving || isComputing) && (
            <div className="solve-status computing">
              <span className="status-icon">⚡</span>
              <span className="status-text">Computing <MathDisplay latex={formatSymbolLatex(targetSymbol)} displayMode={false} />...</span>
            </div>
          )}

          {/* State: Solved (either from auto-solve or existing) */}
          {!isAutoSolving && !isComputing && (lastComputedResult || existingComputedNode) && (
            <div className="solve-status solved">
              <span className="status-icon">✅</span>
              <span className="status-text">
                Solved: <MathDisplay latex={formatSymbolLatex(targetSymbol)} displayMode={false} /> = {
                  lastComputedResult
                    ? `${lastComputedResult.value}${lastComputedResult.unit ? ` ${lastComputedResult.unit}` : ''}`
                    : existingComputedNode
                      ? `${existingComputedNode.value.value}${existingComputedNode.value.unit?.expression ? ` ${existingComputedNode.value.unit.expression}` : ''}`
                      : '?'
                }
              </span>
            </div>
          )}

          {/* State: Ready to solve (has inputs but no result yet) */}
          {!isAutoSolving && !isComputing && canSolve && !lastComputedResult && !existingComputedNode && definingEquation && (
            <div className="solve-status ready">
              <span className="status-icon">🎯</span>
              <span className="status-text">Ready to compute <MathDisplay latex={formatSymbolLatex(targetSymbol)} displayMode={false} /></span>
            </div>
          )}

          {/* State: Waiting for inputs */}
          {!isAutoSolving && !isComputing && !canSolve && inputVariables.length > 0 && (
            <div className="solve-status waiting">
              <span className="status-icon">⏳</span>
              <span className="status-text">Waiting for inputs...</span>
              <span className="missing-vars">
                Need: {inputVariables.filter(v => !v.defined).map(v => v.symbol).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {solveError && (
        <div className="editor-section error-section">
          <div className="solve-error">{solveError}</div>
        </div>
      )}

      {/* Actions */}
      <div className="editor-actions">
        <button
          className="btn-save"
          onClick={async () => {
            logger.debug('verification', 'Solve clicked', { canSolve, targetSymbol, method });
            if (canSolve && targetSymbol) {
              // Actually perform the solve computation
              setSolveError(null);
              const result = await solve(targetSymbol, method);
              logger.debug('verification', 'Solve result', { success: !result.error });

              if (result.error) {
                setSolveError(result.error);
                return;
              }

              // Create a Result node with the computed value
              const computedValue = result.numericResult;
              if (typeof computedValue !== 'number' || !Number.isFinite(computedValue)) {
                setSolveError(`No numeric solution found for ${targetSymbol}.`);
                return;
              }
              const cleanUnit = normalizeSolveUnit(result.unit);
              logger.debug('verification', 'Creating Result with unit', { unit: cleanUnit });
              const nodePos = node.position || { x: 150, y: 200 };
              const resultPos = getResultNodePosition(nodePos, document);
              const newResultNode = createResultNode(
                targetSymbol,
                computedValue,
                cleanUnit,
                node.id,
                result.symbolicResult,
                resultPos
              );

              // Mark provenance as computed - include from_nodes for traceability
              const contributingNodeIds: string[] = [];
              if (definingEquation) {
                contributingNodeIds.push(definingEquation.id);
              }
              contributingNodeIds.push(
                ...getInputSymbolNodeIds(document, inputVariables.map(v => v.symbol), targetSymbol),
              );

              newResultNode.provenance = {
                type: 'computed',
                from_nodes: contributingNodeIds,
                timestamp: new Date().toISOString()
              };

              // Insert the Result node
              logger.debug('document', 'Inserting Result node', { symbol: targetSymbol });
              try {
                await insertNode(newResultNode);
                logger.info('document', 'Result node inserted', { symbol: targetSymbol });
              } catch (err) {
                logger.error('document', 'Failed to insert node', { error: String(err) });
              }

              // Save the solve goal node and close
              onSave({ target_symbol: targetSymbol, method, dependencies: targetDependencies });
            } else {
              // Just save without solving
              onSave({ target_symbol: targetSymbol, method, dependencies: targetDependencies });
            }
          }}
          disabled={!targetSymbol || isComputing || isAutoSolving}
        >
          {(isComputing || isAutoSolving) ? 'Computing...' :
           (lastComputedResult || existingComputedNode) ? 'Done' :
           canSolve ? 'Solve Now' : 'Save'}
        </button>
        <button className="btn-cancel" onClick={onCancel} disabled={isComputing || isAutoSolving}>Close</button>
      </div>
    </div>
  );
}

