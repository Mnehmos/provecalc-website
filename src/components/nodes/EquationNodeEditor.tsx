/**
 * EquationNodeEditor - Editor for Equation/relationship nodes
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { WorksheetNode } from '../../types/document';
import { useDocumentStore, createResultNode, getResultNodePosition } from '../../stores/documentStore';
import { useCompute } from '../../hooks/useCompute';
import { MathDisplay } from '../MathDisplay';
import { validateEquation, type ValidateEquationResponse, extractSymbolTable } from '../../services/computeService';
import { extractVariables, getEquationExtractionExpression, getEquationSolveExpression, normalizeLatex } from '../../utils/mathParsing';
import { buildContributingNodeIds, extractKnownSymbols, normalizeSolveUnit } from '../../utils/solveContext';
import {
  EQUATION_TEMPLATES,
  VARIABLE_ALIASES,
  type EquationTemplate,
  getSuggestedEquations,
  formatSymbolLatex,
} from './nodeShared';
import { logger } from '../../utils/logger';

export function EquationNodeEditor({ node, onSave, onCancel }: { node: WorksheetNode & { type: 'equation' }; onSave: (u: Partial<WorksheetNode>) => void; onCancel: () => void }) {
  const { document, insertNode } = useDocumentStore();
  const { solve } = useCompute();
  const [latex, setLatex] = useState(node.latex);
  const [sympy, setSympy] = useState(node.sympy || '');
  const [showTemplates, setShowTemplates] = useState(!node.latex); // Show templates for new equations
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Unit validation state
  const [unitValidation, setUnitValidation] = useState<ValidateEquationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Solve error state for inline solve
  const [solveError, setSolveError] = useState<string | null>(null);

  // Get available symbols from known values (givens + computed results)
  const availableSymbols = useMemo(() => {
    return extractKnownSymbols(document).map((s) => ({
      symbol: s.symbol,
      value: s.value,
      unit: s.unit,
      description: s.source === 'result' ? 'Computed result' : undefined,
    }));
  }, [document]);

  // Extract variables from equation — extractVariables calls normalizeLatex internally
  const equationVariables = useMemo(() => {
    // Prefer live editor expression while typing, fall back to stored fields.
    const source = sympy.trim()
      ? getEquationExtractionExpression({ sympy, latex })
      : getEquationExtractionExpression({
        lhs: node.lhs,
        rhs: node.rhs,
        sympy: node.sympy,
        latex,
      });
    return extractVariables(source);
  }, [latex, sympy, node.rhs, node.lhs, node.sympy]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return EQUATION_TEMPLATES;
    const search = templateSearch.toLowerCase();
    return EQUATION_TEMPLATES.map(cat => ({
      ...cat,
      equations: cat.equations.filter(eq =>
        eq.name.toLowerCase().includes(search) ||
        eq.description.toLowerCase().includes(search) ||
        eq.variables.some(v => v.toLowerCase().includes(search))
      )
    })).filter(cat => cat.equations.length > 0);
  }, [templateSearch]);

  // Get smart equation suggestions based on available symbols
  const suggestedEquations = useMemo(() => {
    return getSuggestedEquations(availableSymbols);
  }, [availableSymbols]);

  useEffect(() => {
    if (!showTemplates) {
      inputRef.current?.focus();
    }
  }, [showTemplates]);

  // Run unit validation when equation or variables change
  useEffect(() => {
    const runValidation = async () => {
      if (!document || !sympy || equationVariables.length === 0) {
        setUnitValidation(null);
        return;
      }

      // Build symbol table from available symbols
      const symbolTable = extractSymbolTable(document);

      // Only validate if we have at least one variable defined
      const definedVars = equationVariables.filter(v =>
        availableSymbols.some(s => s.symbol === v)
      );
      if (definedVars.length === 0) {
        setUnitValidation(null);
        return;
      }

      setIsValidating(true);
      try {
        const result = await validateEquation(sympy, symbolTable);
        setUnitValidation(result);
      } catch (err) {
        logger.error('verification', 'Equation validation error', { error: String(err) });
        setUnitValidation(null);
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation
    const timeout = setTimeout(runValidation, 300);
    return () => clearTimeout(timeout);
  }, [sympy, availableSymbols, document, equationVariables]);

  // Handle click-to-solve for undefined variables
  const handleSolveForVariable = async (targetVar: string) => {
    if (!document) return;

    setSolveError(null); // Clear any previous error
    // Solve using only THIS equation, not the entire document.
    // Passing all equations causes SymPy system-solve failures when
    // unrelated equations introduce nonlinear terms.
    const eqStr = getEquationSolveExpression({ sympy, latex, lhs: node.lhs, rhs: node.rhs });
    const result = await solve(targetVar, 'auto', [eqStr]);

    if (result.error) {
      setSolveError(result.error);
      return;
    }

    const numericValue = result.numericResult;
    if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
      setSolveError(`No numeric solution found for ${targetVar}.`);
      return;
    }

    if (document) {
      const cleanUnit = normalizeSolveUnit(result.unit);
      const resultPos = getResultNodePosition(node.position || { x: 150, y: 200 }, document);
      const solveGoalNode = document.nodes.find(n => n.type === 'solve_goal' && n.target_symbol === targetVar);
      const newResultNode = createResultNode(
        targetVar,
        numericValue,
        cleanUnit,
        solveGoalNode?.id || '',
        result.symbolicResult,
        resultPos,
      );

      const contributingNodeIds = buildContributingNodeIds(
        document,
        node.id,
        equationVariables,
        targetVar,
      );

      newResultNode.provenance = {
        type: 'computed',
        from_nodes: contributingNodeIds,
        timestamp: new Date().toISOString(),
      };
      await insertNode(newResultNode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showTemplates) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      if (showTemplates) {
        setShowTemplates(false);
      } else {
        onCancel();
      }
    }
  };

  const handleSelectTemplate = (template: EquationTemplate) => {
    setLatex(template.latex);
    setSympy(template.sympy);
    setShowTemplates(false);
  };

  const handleSave = () => {
    // Convert LaTeX to clean SymPy via normalizeLatex, then split on =
    const sympyExpr = sympy || normalizeLatex(latex);
    const parts = sympyExpr.split('=');
    const lhs = parts[0]?.trim() || '';
    const rhs = parts.slice(1).join('=').trim() || '';
    onSave({ latex, lhs, rhs, sympy: sympyExpr });
  };

  // Track variable substitutions (e.g., using 'g' for 'a')
  const [variableSubstitutions, setVariableSubstitutions] = useState<Record<string, string>>({});

  // Check which equation variables match available symbols - with smart suggestions
  const variableMatches = useMemo(() => {
    const matches: Record<string, {
      match: typeof availableSymbols[0] | null;
      suggestions: typeof availableSymbols;
      substitutedWith?: string;
    }> = {};

    for (const v of equationVariables) {
      // Check for substitution first
      const substitution = variableSubstitutions[v];
      if (substitution) {
        const subMatch = availableSymbols.find(s => s.symbol === substitution);
        if (subMatch) {
          matches[v] = { match: subMatch, suggestions: [], substitutedWith: substitution };
          continue;
        }
      }

      // Check for direct match
      const directMatch = availableSymbols.find(s => s.symbol === v);
      if (directMatch) {
        matches[v] = { match: directMatch, suggestions: [] };
        continue;
      }

      // Find suggestions from aliases
      const aliases = VARIABLE_ALIASES[v] || [];
      const suggestions = availableSymbols.filter(s =>
        aliases.includes(s.symbol) || aliases.some(a => s.symbol.toLowerCase() === a.toLowerCase())
      );

      matches[v] = { match: null, suggestions };
    }
    return matches;
  }, [equationVariables, availableSymbols, variableSubstitutions]);

  // Handle selecting a substitution
  const handleSubstitute = (varName: string, substituteSymbol: string) => {
    setVariableSubstitutions(prev => ({ ...prev, [varName]: substituteSymbol }));
    // Update sympy to reflect substitution
    const newSympy = sympy.replace(new RegExp(`\\b${varName}\\b`, 'g'), substituteSymbol);
    setSympy(newSympy);
    // Also update latex
    const newLatex = latex.replace(new RegExp(`\\b${varName}\\b`, 'g'), substituteSymbol);
    setLatex(newLatex);
  };

  const matchedCount = Object.values(variableMatches).filter(m => m.match).length;
  const totalVars = equationVariables.length;

  return (
    <div className="node-editor equation-editor smart-equation-editor">
      {showTemplates ? (
        <div className="template-picker">
          <div className="template-header">
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search equations..."
              className="template-search"
              autoFocus
            />
            <button className="btn-custom" onClick={() => setShowTemplates(false)}>
              Custom equation
            </button>
          </div>

          {/* Suggested Equations Section */}
          {suggestedEquations.length > 0 && !templateSearch && (
            <div className="suggested-equations">
              <div className="suggested-header">
                <span className="suggested-icon">✨</span>
                <span>Suggested for your variables</span>
                <span className="suggested-count">{availableSymbols.map(s => s.symbol).join(', ')}</span>
              </div>
              <div className="suggested-list">
                {suggestedEquations.map(suggestion => (
                  <div
                    key={`${suggestion.category}-${suggestion.template.name}`}
                    className="suggested-item"
                    onClick={() => handleSelectTemplate(suggestion.template)}
                  >
                    <div className="suggested-preview">
                      <MathDisplay latex={suggestion.template.latex} />
                    </div>
                    <div className="suggested-info">
                      <span className="suggested-name">{suggestion.template.name}</span>
                      <span className="suggested-match">
                        {suggestion.matchedVars.length}/{suggestion.totalVars} vars match
                      </span>
                    </div>
                    <div className="suggested-category-badge">{suggestion.category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="template-categories">
            {filteredTemplates.map(category => (
              <div key={category.name} className="template-category">
                <div
                  className={`category-header ${selectedCategory === category.name ? 'expanded' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                >
                  <span>{category.name}</span>
                  <span className="category-count">{category.equations.length}</span>
                </div>
                {(selectedCategory === category.name || templateSearch) && (
                  <div className="category-equations">
                    {category.equations.map(eq => (
                      <div
                        key={eq.name}
                        className="template-item"
                        onClick={() => handleSelectTemplate(eq)}
                      >
                        <div className="template-preview">
                          <MathDisplay latex={eq.latex} />
                        </div>
                        <div className="template-info">
                          <span className="template-name">{eq.name}</span>
                          <span className="template-desc">{eq.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="equation-input-row">
            <input
              ref={inputRef}
              type="text"
              value={latex}
              onChange={(e) => {
                setLatex(e.target.value);
                setSympy(normalizeLatex(e.target.value));
              }}
              onKeyDown={handleKeyDown}
              placeholder="F = m * a"
              className="equation-input"
            />
            <button
              className="btn-templates"
              onClick={() => setShowTemplates(true)}
              title="Browse equation templates"
            >
              📚
            </button>
          </div>

          <div className="latex-preview">
            <MathDisplay latex={latex} />
          </div>

          {/* Variable Status with Unit Validation */}
          {equationVariables.length > 0 && (
            <div className="variable-status">
              <div className="variable-header">
                <span>Variables</span>
                <span className={`match-count ${matchedCount === totalVars ? 'all-matched' : ''}`}>
                  {matchedCount}/{totalVars} defined
                </span>
                {isValidating && <span className="validating-indicator">⏳</span>}
              </div>
              <div className="variable-list">
                {equationVariables.map(v => {
                  const varMatch = variableMatches[v];
                  const isMatched = !!varMatch?.match;
                  const hasSuggestions = varMatch?.suggestions && varMatch.suggestions.length > 0;

                  // Get unit validation status for this variable
                  const varAnalysis = unitValidation?.variable_analysis?.[v];
                  const unitStatus = varAnalysis?.status || 'no_unit';
                  const unitStatusClass =
                    unitStatus === 'ok' ? 'unit-ok' :
                    unitStatus === 'suspicious' ? 'unit-suspicious' :
                    unitStatus === 'parse_error' ? 'unit-error' : '';

                  return (
                    <div key={v} className={`variable-item ${isMatched ? 'matched' : hasSuggestions ? 'has-suggestion' : 'unmatched'} ${unitStatusClass}`}>
                      <span className="var-symbol"><MathDisplay latex={formatSymbolLatex(v)} displayMode={false} /></span>
                      {varMatch?.substitutedWith && (
                        <span className="var-substituted">→ {varMatch.substitutedWith}</span>
                      )}
                      {isMatched ? (
                        <>
                          <span className="var-value">
                            = {varMatch.match!.value}{varMatch.match!.unit ? ` ${varMatch.match!.unit}` : ''}
                          </span>
                          {/* Show unit analysis for matched variables */}
                          {varAnalysis && (
                            <span
                              className={`unit-badge ${unitStatusClass}`}
                              title={varAnalysis.error || varAnalysis.dimensions_str || varAnalysis.quantity || ''}
                            >
                              {unitStatus === 'ok' && '✓'}
                              {unitStatus === 'suspicious' && '⚠️'}
                              {unitStatus === 'parse_error' && '❌'}
                              {varAnalysis.quantity && ` ${varAnalysis.quantity}`}
                            </span>
                          )}
                          {/* Solve for this variable (re-solve) button */}
                          <button
                            className="solve-for-btn solve-for-btn-secondary"
                            onClick={() => handleSolveForVariable(v)}
                            title={`Re-solve equation for ${v}`}
                          >
                            ↻
                          </button>
                        </>
                      ) : hasSuggestions ? (
                        <div className="var-suggestions">
                          <span className="suggestion-label">use:</span>
                          {varMatch.suggestions.map(s => (
                            <button
                              key={s.symbol}
                              className="suggestion-btn"
                              onClick={() => handleSubstitute(v, s.symbol)}
                              title={`${s.value}${s.unit ? ` ${s.unit}` : ''}`}
                            >
                              {s.symbol}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="var-undefined">
                          <span className="var-missing">not defined</span>
                          <button
                            className="solve-for-btn"
                            onClick={() => handleSolveForVariable(v)}
                            title={`Solve equation for ${v}`}
                          >
                            Solve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unit Validation Summary */}
              {unitValidation && (unitValidation.errors.length > 0 || unitValidation.warnings.length > 0) && (
                <div className="unit-validation-summary">
                  {unitValidation.errors.map((err, i) => (
                    <div key={`err-${i}`} className="validation-error">❌ {err}</div>
                  ))}
                  {unitValidation.warnings.map((warn, i) => (
                    <div key={`warn-${i}`} className="validation-warning">⚠️ {warn}</div>
                  ))}
                  {unitValidation.suggestion && (
                    <div className="validation-suggestion">💡 {unitValidation.suggestion}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Solve Error Display */}
          {solveError && (
            <div className="editor-section error-section">
              <div className="solve-error">{solveError}</div>
            </div>
          )}

          <div className="editor-actions">
            <button className="btn-save" onClick={handleSave}>Save</button>
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

// Constraint Node Editor - Simplified

