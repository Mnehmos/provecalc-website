/**
 * PlotEditor - Inline editor for configuring plot nodes
 *
 * Allows users to:
 * - Add/remove/edit expressions
 * - Configure X range
 * - Set title, axis labels
 * - Toggle grid, legend, points
 */

import { useState, useEffect, useRef } from 'react';
import type { PlotNode, PlotExpression, WorksheetNode } from '../../types/document';
import { v4 as uuidv4 } from 'uuid';

interface PlotEditorProps {
  node: PlotNode;
  onSave: (updates: Partial<WorksheetNode>) => void;
  onCancel: () => void;
}

// Default colors for new series
const SERIES_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899',
];

export function PlotEditor({ node, onSave, onCancel }: PlotEditorProps) {
  const [expressions, setExpressions] = useState<PlotExpression[]>(
    node.expressions.length > 0 ? [...node.expressions] : [{
      id: uuidv4(),
      expr: 'x**2',
      variable: 'x',
      label: 'f(x)',
    }]
  );
  const [xMin, setXMin] = useState(String(node.x_range.min));
  const [xMax, setXMax] = useState(String(node.x_range.max));
  const [xVar, setXVar] = useState(node.x_range.variable);
  const [title, setTitle] = useState(node.options.title || '');
  const [xLabel, setXLabel] = useState(node.options.x_label || '');
  const [yLabel, setYLabel] = useState(node.options.y_label || '');
  const [showGrid, setShowGrid] = useState(node.options.grid !== false);
  const [showPoints, setShowPoints] = useState(!!node.options.show_points);
  const [pointCount, setPointCount] = useState(String(node.options.point_count || 100));

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleAddExpression = () => {
    const idx = expressions.length;
    setExpressions([
      ...expressions,
      {
        id: uuidv4(),
        expr: '',
        variable: xVar,
        label: `Series ${idx + 1}`,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
      },
    ]);
  };

  const handleRemoveExpression = (id: string) => {
    if (expressions.length <= 1) return;
    setExpressions(expressions.filter((e) => e.id !== id));
  };

  const handleExpressionChange = (id: string, field: keyof PlotExpression, value: string) => {
    setExpressions(
      expressions.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      )
    );
  };

  const handleSave = () => {
    const xMinNum = parseFloat(xMin);
    const xMaxNum = parseFloat(xMax);
    if (isNaN(xMinNum) || isNaN(xMaxNum) || xMinNum >= xMaxNum) return;
    if (!xVar.trim()) return;

    const validExpressions = expressions.filter((e) => e.expr.trim());
    if (validExpressions.length === 0) return;

    const clampedPointCount = Math.max(10, Math.min(1000, parseInt(pointCount) || 100));

    onSave({
      expressions: validExpressions.map((e) => ({
        ...e,
        variable: xVar.trim(),
      })),
      x_range: {
        min: xMinNum,
        max: xMaxNum,
        variable: xVar.trim(),
      },
      options: {
        title: title || undefined,
        x_label: xLabel || undefined,
        y_label: yLabel || undefined,
        grid: showGrid,
        show_points: showPoints,
        point_count: clampedPointCount,
        legend: validExpressions.length > 1,
      },
      // Clear cached data to force re-render
      cached_data: undefined,
    } as Partial<WorksheetNode>);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="node-editor plot-editor" onKeyDown={handleKeyDown}>
      {/* Expressions */}
      <div className="editor-section">
        <label className="editor-label">Expressions (SymPy syntax)</label>
        {expressions.map((expr, idx) => (
          <div key={expr.id} className="plot-expr-row">
            <input
              ref={idx === 0 ? firstInputRef : undefined}
              type="text"
              className="editor-input plot-expr-input"
              value={expr.expr}
              onChange={(e) => handleExpressionChange(expr.id, 'expr', e.target.value)}
              placeholder="e.g. sin(x), x**2 + 1"
            />
            <input
              type="text"
              className="editor-input plot-label-input"
              value={expr.label || ''}
              onChange={(e) => handleExpressionChange(expr.id, 'label', e.target.value)}
              placeholder="Label"
            />
            <input
              type="color"
              className="plot-color-input"
              value={expr.color || SERIES_COLORS[idx % SERIES_COLORS.length]}
              onChange={(e) => handleExpressionChange(expr.id, 'color', e.target.value)}
              title="Series color"
            />
            {expressions.length > 1 && (
              <button
                className="plot-remove-btn"
                onClick={() => handleRemoveExpression(expr.id)}
                title="Remove expression"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button className="plot-add-btn" onClick={handleAddExpression}>
          + Add expression
        </button>
      </div>

      {/* Range */}
      <div className="editor-section">
        <label className="editor-label">X Range</label>
        <div className="plot-range-row">
          <input
            type="text"
            className="editor-input plot-var-input"
            value={xVar}
            onChange={(e) => setXVar(e.target.value)}
            placeholder="var"
            title="Variable name"
          />
          <span className="range-separator">from</span>
          <input
            type="number"
            className="editor-input plot-range-input"
            value={xMin}
            onChange={(e) => setXMin(e.target.value)}
            step="any"
          />
          <span className="range-separator">to</span>
          <input
            type="number"
            className="editor-input plot-range-input"
            value={xMax}
            onChange={(e) => setXMax(e.target.value)}
            step="any"
          />
        </div>
      </div>

      {/* Labels */}
      <div className="editor-section">
        <label className="editor-label">Labels</label>
        <div className="plot-labels-row">
          <input
            type="text"
            className="editor-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chart title"
          />
          <input
            type="text"
            className="editor-input"
            value={xLabel}
            onChange={(e) => setXLabel(e.target.value)}
            placeholder="X axis label"
          />
          <input
            type="text"
            className="editor-input"
            value={yLabel}
            onChange={(e) => setYLabel(e.target.value)}
            placeholder="Y axis label"
          />
        </div>
      </div>

      {/* Options */}
      <div className="editor-section plot-options-row">
        <label className="plot-checkbox">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Grid
        </label>
        <label className="plot-checkbox">
          <input type="checkbox" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} />
          Points
        </label>
        <label className="plot-checkbox">
          Points:
          <input
            type="number"
            className="editor-input plot-points-input"
            value={pointCount}
            onChange={(e) => setPointCount(e.target.value)}
            min="10"
            max="1000"
            step="10"
          />
        </label>
      </div>

      {/* Actions */}
      <div className="editor-actions">
        <button className="btn-save" onClick={handleSave}>
          Plot (Ctrl+Enter)
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
