/**
 * NodeRenderer - Renders a worksheet node based on its type
 *
 * Each node displays:
 * - Content (math, text, etc.)
 * - Provenance badge (user, llm, verified, library)
 * - Verification status
 * - Inline editing when selected
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { WorksheetNode, GivenNode, PlotNode, AnnotationNode, DisplayConfig } from '../../types/document';
import { DEFAULT_DISPLAY_CONFIG } from '../../types/document';
import { useDocumentStore, findDuplicateSymbols } from '../../stores/documentStore';
import { MathDisplay } from '../MathDisplay';
import { PlotRenderer } from './PlotRenderer';
import { PlotEditor } from './PlotEditor';
import { SemanticLinksPanel } from '../SemanticLinksPanel';
import { DomainBadge } from '../DomainBadge';
import { useAIAssistStore, type AIAssistContext } from '../../stores/aiAssistStore';

import { GivenNodeEditor } from './GivenNodeEditor';
import { EquationNodeEditor } from './EquationNodeEditor';
import { SolveGoalNodeEditor } from './SolveGoalNodeEditor';
import {
  type NumberRepresentation,
  formatSymbolLatex,
  formatNumberLatex,
  formatUnitLatex,
  getCompatibleUnits,
  convertUnit,
  formatConvertedValue,
  type ResultNodeContentProps,
  REPRESENTATION_LABELS,
  REPRESENTATION_ORDER,
  getProvenance,
  getVerification,
} from './nodeShared';

interface NodeRendererProps {
  node: WorksheetNode;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onUpdate?: (updates: Partial<WorksheetNode>) => void;
}

export function NodeRenderer({ node, index, isSelected, onClick, onUpdate }: NodeRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showLinksPanel, setShowLinksPanel] = useState(false);
  const { document } = useDocumentStore();

  // Exit edit mode and close panels when deselected
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
      setShowLinksPanel(false);
    }
  }, [isSelected]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected && onUpdate) {
      setIsEditing(true);
    }
  }, [isSelected, onUpdate]);

  const handleSave = useCallback((updates: Partial<WorksheetNode>) => {
    if (onUpdate) {
      onUpdate(updates);
    }
    setIsEditing(false);
  }, [onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const provenanceBadge = useMemo(() => {
    const provenance = getProvenance(node);
    switch (provenance.type) {
      case 'user':
        return <span className="badge badge-user" data-tooltip="User created" />;
      case 'llm':
        return <span className="badge badge-llm" data-tooltip="AI suggested" />;
      case 'library':
        return <span className="badge badge-library" data-tooltip="From library" />;
      case 'computed':
        return <span className="badge badge-computed" data-tooltip="Computed" />;
      default:
        return null;
    }
  }, [node]);

  const askAI = useAIAssistStore((s) => s.askAI);
  const nodeNumber = index + 1;

  const verificationBadge = useMemo(() => {
    const verification = getVerification(node);
    switch (verification.status) {
      case 'verified':
        return <span className="badge badge-verified" data-tooltip="Verified" />;
      case 'pending':
        return <span className="badge badge-pending" data-tooltip="Pending" />;
      case 'failed':
        return (
          <button
            type="button"
            className="badge badge-failed badge-clickable"
            title={verification.reason || 'Failed - click to ask AI'}
            onClick={(e) => {
              e.stopPropagation();
              askAI(
                `Why did verification fail for Node #${nodeNumber} (${node.type}, id ${node.id.slice(0, 8)})? Error: ${verification.reason || 'unknown'}`,
                { type: 'verification', nodeId: node.id, nodeIndex: nodeNumber, status: 'failed', reason: verification.reason },
              );
            }}
          />
        );
      default:
        return <span className="badge badge-unverified" data-tooltip="Unverified" />;
    }
  }, [node, askAI, nodeNumber]);

  // Check for duplicate symbols (only for given nodes)
  const duplicateBadge = useMemo(() => {
    if (node.type !== 'given') return null;
    const duplicates = findDuplicateSymbols(document);
    if (duplicates.has(node.symbol)) {
      const count = duplicates.get(node.symbol)?.length || 0;
      return <span className="badge badge-warning" data-tooltip={`Duplicate symbol (${count} instances)`} />;
    }
    return null;
  }, [node, document]);

  // Get display config with defaults
  const displayConfig: DisplayConfig = node.display || DEFAULT_DISPLAY_CONFIG;
  const isHiddenInExport = !displayConfig.showInExport;

  // Toggle visibility handler
  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      const newDisplay: DisplayConfig = {
        ...DEFAULT_DISPLAY_CONFIG,
        ...node.display,
        showInExport: !displayConfig.showInExport,
      };
      onUpdate({ display: newDisplay } as Partial<WorksheetNode>);
    }
  }, [node.display, displayConfig.showInExport, onUpdate]);

  // Cycle display mode handler
  const handleCycleDisplayMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      const modes: DisplayConfig['displayMode'][] = ['full', 'equation', 'value'];
      const currentIndex = modes.indexOf(displayConfig.displayMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      const newDisplay: DisplayConfig = {
        ...DEFAULT_DISPLAY_CONFIG,
        ...node.display,
        displayMode: nextMode,
      };
      onUpdate({ display: newDisplay } as Partial<WorksheetNode>);
    }
  }, [node.display, displayConfig.displayMode, onUpdate]);

  // Check if node is stale (dependency changed since last solve)
  const staleBadge = useMemo(() => {
    const isStale = 'isStale' in node && node.isStale === true;
    if (isStale) {
      return <span className="badge badge-stale" data-tooltip="Needs recalculation" />;
    }
    return null;
  }, [node]);

  return (
    <div
      className={`node node-${node.type} ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''} ${isHiddenInExport ? 'hidden-in-export' : ''}${'isStale' in node && node.isStale ? ' stale' : ''}`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      data-node-id={node.id}
    >
      <div className="node-gutter">
        <span className="node-index">{index + 1}</span>
      </div>
      <div className="node-badges">
        {provenanceBadge}
        {verificationBadge}
        {staleBadge}
        {duplicateBadge}
      </div>

      <div className="node-content" onClick={(e) => isEditing && e.stopPropagation()}>
        {isEditing ? (
          <NodeEditor node={node} onSave={handleSave} onCancel={handleCancel} />
        ) : (
          renderNodeContent(node)
        )}
      </div>

      {/* Visibility controls - show when selected */}
      {isSelected && (
        <div className="node-visibility-controls">
          <button
            className={`visibility-toggle ${isHiddenInExport ? 'hidden' : ''}`}
            onClick={handleToggleVisibility}
            title={isHiddenInExport ? 'Hidden in exports (click to show)' : 'Visible in exports (click to hide)'}
          >
            {isHiddenInExport ? '👁️‍🗨️' : '👁️'}
          </button>
          <button
            className="display-mode-toggle"
            onClick={handleCycleDisplayMode}
            title={`Display mode: ${displayConfig.displayMode} (click to cycle)`}
          >
            {displayConfig.displayMode === 'full' ? '📝' : displayConfig.displayMode === 'equation' ? '∑' : '='}
          </button>
          <button
            className={`links-toggle ${showLinksPanel ? 'active' : ''} ${node.semanticLinks && node.semanticLinks.length > 0 ? 'has-links' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowLinksPanel(!showLinksPanel); }}
            title={`Links & References${node.semanticLinks?.length ? ` (${node.semanticLinks.length})` : ''}`}
          >
            🔗{node.semanticLinks && node.semanticLinks.length > 0 && <span className="link-count">{node.semanticLinks.length}</span>}
          </button>
          <button
            className="ai-assist-btn"
            onClick={(e) => {
              e.stopPropagation();
              let query = `Explain Node #${nodeNumber} (${node.type}, id ${node.id.slice(0, 8)}) and its role in the calculation.`;
              const context: Extract<AIAssistContext, { type: 'node' }> = {
                type: 'node',
                nodeId: node.id,
                nodeType: node.type,
                nodeIndex: nodeNumber,
              };

              if (node.type === 'given' || node.type === 'result') {
                query = `Explain Node #${nodeNumber} variable "${node.symbol}" (${node.type}, id ${node.id.slice(0, 8)}) and what affects it in this worksheet.`;
                context.symbol = node.symbol;
                context.value = node.value.value;
                context.unit = node.value.unit?.expression;
              } else if (node.type === 'equation') {
                query = `Explain Node #${nodeNumber} equation for "${node.lhs}" (id ${node.id.slice(0, 8)}), what assumptions it uses, and which variables drive it most.`;
                context.symbol = node.lhs;
                context.latex = node.latex;
                context.rhs = node.rhs;
              } else if (node.type === 'annotation') {
                const title = node.title || 'Diagram';
                query = `Explain Annotation Node #${nodeNumber} "${title}" (id ${node.id.slice(0, 8)}) and its role in supporting the calculation.`;
                context.title = title;
                context.excerpt = node.content.slice(0, 280);
              } else if (node.type === 'solve_goal') {
                query = `Explain Solve Goal Node #${nodeNumber} targeting "${node.target_symbol}" (id ${node.id.slice(0, 8)}) and what determines its result.`;
                context.symbol = node.target_symbol;
              } else if (node.type === 'constraint') {
                query = `Explain Constraint Node #${nodeNumber} (id ${node.id.slice(0, 8)}) and how it affects feasible solutions.`;
                context.latex = node.latex;
              } else if (node.type === 'text') {
                query = `Summarize Text Node #${nodeNumber} (id ${node.id.slice(0, 8)}) and explain why it matters to the calculation flow.`;
                context.excerpt = node.content.slice(0, 280);
              }

              askAI(
                query,
                context,
              );
            }}
            title="Ask AI about this node"
          >
            AI
          </button>
        </div>
      )}

      {/* Semantic Links Panel */}
      {showLinksPanel && (
        <SemanticLinksPanel
          nodeId={node.id}
          links={node.semanticLinks || []}
          onClose={() => setShowLinksPanel(false)}
        />
      )}
    </div>
  );
}

// ============ Node Editor Components ============

export interface NodeEditorProps {
  node: WorksheetNode;
  onSave: (updates: Partial<WorksheetNode>) => void;
  onCancel: () => void;
}

function NodeEditor({ node, onSave, onCancel }: NodeEditorProps) {
  switch (node.type) {
    case 'text':
      return <TextNodeEditor node={node} onSave={onSave} onCancel={onCancel} />;
    case 'given':
      return <GivenNodeEditor node={node} onSave={onSave} onCancel={onCancel} />;
    case 'equation':
      return <EquationNodeEditor node={node} onSave={onSave} onCancel={onCancel} />;
    case 'constraint':
      return <ConstraintNodeEditor node={node} onSave={onSave} onCancel={onCancel} />;
    case 'solve_goal':
      return <SolveGoalNodeEditor node={node} onSave={onSave} onCancel={onCancel} />;
    case 'annotation':
      return <AnnotationNodeEditor node={node} onSave={onSave} onCancel={onCancel} />;
    case 'plot':
      return <PlotEditor node={node as PlotNode} onSave={onSave} onCancel={onCancel} />;
    default:
      return <div>Cannot edit this node type</div>;
  }
}

// Text Node Editor
function TextNodeEditor({ node, onSave, onCancel }: { node: WorksheetNode & { type: 'text' }; onSave: (u: Partial<WorksheetNode>) => void; onCancel: () => void }) {
  const [content, setContent] = useState(node.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave({ content });
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="node-editor text-editor">
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter text..."
        rows={3}
      />
      <div className="editor-actions">
        <button className="btn-save" onClick={() => onSave({ content })}>Save</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// Annotation Node Editor with markdown preview
function AnnotationNodeEditor({ node, onSave, onCancel }: { node: AnnotationNode; onSave: (u: Partial<AnnotationNode>) => void; onCancel: () => void }) {
  const [content, setContent] = useState(node.content);
  const [title, setTitle] = useState(node.title || '');
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    // Note: Enter without shift inserts newline (markdown support)
  };

  const handleSave = () => {
    onSave({
      content,
      title: title.trim() || undefined,
    });
  };

  return (
    <div className="node-editor annotation-editor">
      <div className="annotation-editor-header">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="annotation-title-input"
        />
        <button
          className={`preview-toggle ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? 'Edit' : 'Preview'}
        >
          {showPreview ? '✏️' : '👁️'}
        </button>
      </div>

      {showPreview ? (
        <div className="annotation-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || '*No content*'}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write markdown here... (supports **bold**, *italic*, lists, tables)"
          rows={6}
          className="annotation-content-input"
        />
      )}

      <div className="editor-actions">
        <button className="btn-save" onClick={handleSave}>Save</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ============ Unit Conversion System ============
function ConstraintNodeEditor({ node, onSave, onCancel }: { node: WorksheetNode & { type: 'constraint' }; onSave: (u: Partial<WorksheetNode>) => void; onCancel: () => void }) {
  const [latex, setLatex] = useState(node.latex);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave({ latex, sympy: latex });
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="node-editor constraint-editor">
      <input
        ref={inputRef}
        type="text"
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="x > 0"
        className="equation-input"
      />
      <div className="latex-preview">
        <MathDisplay latex={latex} />
      </div>
      <div className="editor-actions">
        <button className="btn-save" onClick={() => onSave({ latex, sympy: latex })}>Save</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ResultNodeContent({ symbol, value, unit, symbolicForm, latex }: ResultNodeContentProps) {
  const [representation, setRepresentation] = useState<NumberRepresentation>('decimal');
  const [showSymbolic, setShowSymbolic] = useState(false);
  const [showAltUnits, setShowAltUnits] = useState(false);

  const cycleRepresentation = useCallback(() => {
    const currentIndex = REPRESENTATION_ORDER.indexOf(representation);
    const nextIndex = (currentIndex + 1) % REPRESENTATION_ORDER.length;
    setRepresentation(REPRESENTATION_ORDER[nextIndex]);
  }, [representation]);

  const displayLatex = useMemo(() => {
    if (showSymbolic && symbolicForm) {
      return `${formatSymbolLatex(symbol)} = ${symbolicForm}`;
    }
    // Use pre-computed latex if in decimal mode, otherwise format dynamically
    if (representation === 'decimal' && latex) {
      return latex;
    }
    return formatNumberLatex(symbol, value, unit, representation);
  }, [symbol, value, unit, representation, latex, showSymbolic, symbolicForm]);

  // Get compatible units for multi-unit display
  const altUnits = useMemo(() => {
    if (!unit) return [];
    const compatible = getCompatibleUnits(unit);
    return compatible
      .filter(u => u !== unit)
      .map(u => {
        const converted = convertUnit(value, unit, u);
        return { unit: u, value: converted };
      })
      .filter(({ value: v }) => v !== null)
      .slice(0, 5); // Limit to 5 alternatives
  }, [unit, value]);

  const hasAltUnits = altUnits.length > 0;

  return (
    <div className="result-content">
      <MathDisplay latex={displayLatex} displayMode={false} />

      <div className="result-controls">
        <button
          className={`repr-toggle ${showSymbolic ? '' : 'active'}`}
          onClick={(e) => { e.stopPropagation(); cycleRepresentation(); }}
          title={`Format: ${REPRESENTATION_LABELS[representation]} (click to cycle)`}
        >
          {REPRESENTATION_LABELS[representation]}
        </button>

        {symbolicForm && (
          <button
            className={`repr-toggle ${showSymbolic ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowSymbolic(!showSymbolic); }}
            title={showSymbolic ? 'Show numeric' : 'Show symbolic'}
          >
            {showSymbolic ? 'Num' : 'Sym'}
          </button>
        )}

        {hasAltUnits && (
          <button
            className={`repr-toggle ${showAltUnits ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowAltUnits(!showAltUnits); }}
            title={showAltUnits ? 'Hide unit conversions' : 'Show unit conversions'}
          >
            ≡
          </button>
        )}
      </div>

      {showAltUnits && hasAltUnits && (
        <div className="alt-units">
          {altUnits.map(({ unit: u, value: v }) => (
            <span key={u} className="alt-unit">
              = {formatConvertedValue(v!)} {u}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Given Node with Slider Support ============
function GivenNodeContent({ node }: { node: GivenNode }) {
  const { updateNode } = useDocumentStore();
  const [sliderValue, setSliderValue] = useState(node.value.value);
  const [showAltUnits, setShowAltUnits] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showSymbolic, setShowSymbolic] = useState(false);

  // Sync slider value with node value when node changes externally
  useEffect(() => {
    setSliderValue(node.value.value);
  }, [node.value.value]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setSliderValue(newValue);
  }, []);

  const handleSliderCommit = useCallback(() => {
    // Only update if value actually changed
    if (sliderValue !== node.value.value) {
      updateNode(node.id, {
        value: { ...node.value, value: sliderValue },
      } as Partial<GivenNode>);
    }
  }, [node.id, node.value, sliderValue, updateNode]);

  const sliderRange = node.sliderRange;
  const step = sliderRange?.step ?? (sliderRange ? (sliderRange.max - sliderRange.min) / 100 : 1);
  const displayValue = sliderRange ? sliderValue : node.value.value;
  const unit = node.value.unit?.expression;
  const isComputed = node.provenance?.type === 'computed';
  const hasSteps = isComputed && node.solutionSteps && node.solutionSteps.length > 0;
  const hasSymbolic = isComputed && node.symbolicForm;

  // Get compatible unit conversions
  const altUnits = useMemo(() => {
    if (!unit) return [];
    const compatible = getCompatibleUnits(unit);
    return compatible
      .filter(u => u !== unit)
      .map(u => {
        const converted = convertUnit(displayValue, unit, u);
        return { unit: u, value: converted };
      })
      .filter(({ value: v }) => v !== null)
      .slice(0, 5); // Limit to 5 alternatives
  }, [unit, displayValue]);

  const hasAltUnits = altUnits.length > 0;

  // Format display value with proper subscript/superscript handling
  const displayLatex = node.latex ||
    `${formatSymbolLatex(node.symbol)} := ${displayValue}${unit ? ` \\; \\mathrm{${formatUnitLatex(unit)}}` : ''}`;

  // Get domain from unit if available
  const domain = node.value.unit?.domain;

  return (
    <div className="given-content">
      <div className="given-display-row">
        <MathDisplay latex={displayLatex} displayMode={false} />

        {/* Domain badge - shown when unit has domain classification */}
        {domain && (
          <DomainBadge domain={domain} size="small" showTooltip />
        )}

        {hasAltUnits && (
          <button
            className={`unit-toggle ${showAltUnits ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowAltUnits(!showAltUnits); }}
            title={showAltUnits ? 'Hide unit conversions' : 'Show unit conversions'}
          >
            ≡
          </button>
        )}

        {/* Show symbolic/steps controls for computed nodes */}
        {isComputed && (hasSteps || hasSymbolic) && (
          <div className="computed-controls">
            {hasSymbolic && (
              <button
                className={`repr-toggle ${showSymbolic ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowSymbolic(!showSymbolic); }}
                title={showSymbolic ? 'Hide symbolic form' : 'Show symbolic form'}
                aria-pressed={showSymbolic}
                aria-expanded={showSymbolic}
                aria-controls={`symbolic-${node.id}`}
              >
                Sym
              </button>
            )}
            {hasSteps && (
              <button
                className={`repr-toggle ${showSteps ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowSteps(!showSteps); }}
                title={showSteps ? 'Hide solution steps' : 'Show solution steps'}
                aria-pressed={showSteps}
                aria-expanded={showSteps}
                aria-controls={`steps-${node.id}`}
              >
                Steps
              </button>
            )}
          </div>
        )}
      </div>

      {showAltUnits && hasAltUnits && (
        <div className="alt-units">
          {altUnits.map(({ unit: u, value: v }) => (
            <span key={u} className="alt-unit">
              = {formatConvertedValue(v!)} {u}
            </span>
          ))}
        </div>
      )}

      {/* Symbolic form display */}
      {showSymbolic && hasSymbolic && (
        <div id={`symbolic-${node.id}`} className="symbolic-form">
          <MathDisplay latex={`${formatSymbolLatex(node.symbol)} = ${node.symbolicForm}`} displayMode={false} />
        </div>
      )}

      {/* Solution steps display */}
      {showSteps && hasSteps && (
        <div id={`steps-${node.id}`} className="solution-steps">
          {node.solutionSteps!.map((step, i) => (
            <div key={i} className="solution-step">
              <span className="step-number">{i + 1}.</span>
              <span className="step-description">{step.description}</span>
              {step.latex ? (
                <MathDisplay latex={step.latex} displayMode={false} />
              ) : (
                <code className="step-expression">{step.expression}</code>
              )}
            </div>
          ))}
        </div>
      )}

      {sliderRange && (
        <div className="slider-container">
          <span className="slider-min">{sliderRange.min}</span>
          <input
            type="range"
            className="param-slider"
            min={sliderRange.min}
            max={sliderRange.max}
            step={step}
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            onKeyUp={handleSliderCommit}
          />
          <span className="slider-max">{sliderRange.max}</span>
        </div>
      )}

      {node.description && (
        <span className="node-description">{node.description}</span>
      )}
    </div>
  );
}

// ============ Annotation Node with Markdown ============
function AnnotationNodeContent({ node }: { node: AnnotationNode }) {
  const { updateNode } = useDocumentStore();
  const [isCollapsed, setIsCollapsed] = useState(node.collapsed ?? false);

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    updateNode(node.id, { collapsed: newCollapsed } as Partial<AnnotationNode>);
  }, [isCollapsed, node.id, updateNode]);

  return (
    <div className={`annotation-content ${isCollapsed ? 'collapsed' : ''}`}>
      {node.title && (
        <div className="annotation-header" onClick={handleToggleCollapse}>
          <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
          <span className="annotation-title">{node.title}</span>
        </div>
      )}
      {!isCollapsed && (
        <div className="annotation-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {node.content || '*Empty annotation*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function renderNodeContent(node: WorksheetNode) {
  switch (node.type) {
    case 'text':
      return (
        <div className="text-content">
          {node.content}
        </div>
      );

    case 'given':
      return <GivenNodeContent node={node} />;

    case 'equation':
      return (
        <div className="equation-content">
          <MathDisplay latex={node.latex} displayMode={false} />
        </div>
      );

    case 'constraint':
      return (
        <div className="constraint-content">
          <MathDisplay latex={node.latex} displayMode={false} />
          {node.description && (
            <span className="node-description">{node.description}</span>
          )}
        </div>
      );

    case 'solve_goal':
      return (
        <div className="solve-goal-content">
          <span className="solve-label">Solve for:</span>
          <MathDisplay latex={formatSymbolLatex(node.target_symbol)} displayMode={false} />
          {node.method && (
            <span className="method-tag">({node.method})</span>
          )}
        </div>
      );

    case 'result':
      return (
        <ResultNodeContent
          symbol={node.symbol}
          value={node.value.value}
          unit={node.value.unit?.expression}
          symbolicForm={node.symbolic_form}
          latex={node.latex}
        />
      );

    case 'plot':
      return (
        <div className="plot-content">
          <PlotRenderer node={node as PlotNode} width={380} height={280} />
        </div>
      );

    case 'annotation':
      return <AnnotationNodeContent node={node as AnnotationNode} />;

    default:
      return <div className="unknown-node">Unknown node type</div>;
  }
}
