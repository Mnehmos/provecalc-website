/**
 * GivenNodeEditor - Editor for Given/input parameter nodes
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { WorksheetNode, GivenNode } from '../../types/document';
import { useDocumentStore } from '../../stores/documentStore';
import { UnitBuilder, type UnitToken } from '../UnitBuilder';
import { inferUnitFromSymbol } from '../../utils/symbolUnitInference';
import { findMatchingConstant, type PhysicalConstant } from '../../utils/physicalConstants';
import {
  QUANTITY_TYPES,
  inferTypeFromUnit,
  getNextSymbol,
  getSymbolSuggestions,
} from './nodeShared';

export function GivenNodeEditor({ node, onSave, onCancel }: { node: WorksheetNode & { type: 'given' }; onSave: (u: Partial<WorksheetNode>) => void; onCancel: () => void }) {
  const { document } = useDocumentStore();

  // Get existing symbols from document
  const existingSymbols = useMemo(() => {
    if (!document) return [];
    return document.nodes
      .filter((n): n is GivenNode => n.type === 'given' && n.id !== node.id)
      .map(n => n.symbol);
  }, [document, node.id]);

  // Try to infer initial type from existing unit or symbol
  const initialType = useMemo(() => {
    if (node.value.unit?.expression) {
      const inferred = inferTypeFromUnit(node.value.unit.expression);
      if (inferred) return inferred;
    }
    return 'length'; // Default
  }, [node.value.unit?.expression]);

  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [typeSearch, setTypeSearch] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [symbol, setSymbol] = useState(node.symbol);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [value, setValue] = useState(String(node.value.value));
  const [unit, setUnit] = useState(node.value.unit?.expression || '');
const [unitSuggestion, setUnitSuggestion] = useState<{ unit: string; quantity: string } | null>(null);
  const [constantMatch, setConstantMatch] = useState<PhysicalConstant | null>(null);

  // Check if this is a computed (derived) node - these should be read-only
  const isComputed = node.provenance.type === 'computed';

  // Detect physical constant when value changes
  useEffect(() => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue !== 0) {
      const match = findMatchingConstant(numValue, unit, symbol);
      setConstantMatch(match);
    } else {
      setConstantMatch(null);
    }
  }, [value, unit, symbol]);

  // Slider range state
  const [sliderEnabled, setSliderEnabled] = useState(!!node.sliderRange);
  const [sliderMin, setSliderMin] = useState(String(node.sliderRange?.min ?? 0));
  const [sliderMax, setSliderMax] = useState(String(node.sliderRange?.max ?? 100));

  const typeInputRef = useRef<HTMLInputElement>(null);
  const symbolInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Handler for UnitBuilder changes with full bidirectional sync
  const handleUnitBuilderChange = useCallback((unitStr: string, _tokens: UnitToken[]) => {
    setUnit(unitStr);

    // Infer type from the FULL compound unit expression (e.g., kg·m/s² → force)
    const inferredType = inferTypeFromUnit(unitStr);
    if (inferredType && inferredType !== selectedType) {
      setSelectedType(inferredType);

      // Update symbol to match the new type
      const typeData = QUANTITY_TYPES[inferredType];
      if (typeData) {
        // Check if current symbol is a default or doesn't match new type
        const defaultSymbols = ['x', 'y', 'z', 'a', 'b', 'c'];
        const currentSymbolMatchesOldType = QUANTITY_TYPES[selectedType]?.symbols.some(
          s => s.toLowerCase() === symbol.toLowerCase() || symbol.toLowerCase().startsWith(s.toLowerCase())
        );
        const currentSymbolMatchesNewType = typeData.symbols.some(
          s => s.toLowerCase() === symbol.toLowerCase() || symbol.toLowerCase().startsWith(s.toLowerCase())
        );

        // Update symbol if it's a default OR if it matches the old type but not the new type
        if (defaultSymbols.includes(symbol.toLowerCase()) ||
            (currentSymbolMatchesOldType && !currentSymbolMatchesNewType)) {
          const suggested = getNextSymbol(typeData.symbols[0], existingSymbols);
          setSymbol(suggested);
        }
      }
    }
  }, [selectedType, symbol, existingSymbols]);

  // Handle symbol change with unit inference
  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);

    // Only suggest if no unit is set yet
    if (!unit) {
      const suggestion = inferUnitFromSymbol(newSymbol);
      if (suggestion && suggestion.unit) {
        setUnitSuggestion({ unit: suggestion.unit, quantity: suggestion.quantity });
      } else {
        setUnitSuggestion(null);
      }
    }
  }, [unit]);

  // Apply the suggested unit
  const applyUnitSuggestion = useCallback(() => {
    if (unitSuggestion) {
      setUnit(unitSuggestion.unit);
      setUnitSuggestion(null);
    }
  }, [unitSuggestion]);

  // Focus type selector on mount if new node
  useEffect(() => {
    if (!node.symbol || node.symbol === 'x') {
      typeInputRef.current?.focus();
    } else {
      valueInputRef.current?.focus();
      valueInputRef.current?.select();
    }
  }, [node.symbol]);

  // Get current type data
  const currentTypeData = QUANTITY_TYPES[selectedType];

  // Filter types by search
  const filteredTypes = useMemo(() => {
    const search = typeSearch.toLowerCase();
    return Object.entries(QUANTITY_TYPES)
      .filter(([key, data]) =>
        key.toLowerCase().includes(search) ||
        data.label.toLowerCase().includes(search)
      )
      .slice(0, 10);
  }, [typeSearch]);

  // Get symbol suggestions for current type
  const symbolSuggestions = useMemo(() => {
    return getSymbolSuggestions(selectedType, existingSymbols);
  }, [selectedType, existingSymbols]);

  // Handle type selection
  const handleTypeSelect = (typeKey: string) => {
    setSelectedType(typeKey);
    setShowTypeDropdown(false);
    setTypeSearch('');

    const typeData = QUANTITY_TYPES[typeKey];
    if (typeData) {
      // Auto-suggest best symbol
      const suggested = getNextSymbol(typeData.symbols[0], existingSymbols);
      setSymbol(suggested);

      // Auto-set default unit (use abbreviation)
      setUnit(typeData.units[0].abbr);

      // Focus symbol input for customization
      setTimeout(() => symbolInputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab' && showTypeDropdown && filteredTypes.length > 0) {
      e.preventDefault();
      handleTypeSelect(filteredTypes[0][0]);
    }
  };

  const handleSave = () => {
    // For computed nodes, don't allow save to change anything
    if (isComputed) {
      onCancel();
      return;
    }

    const numValue = parseFloat(value) || 0;
    const minVal = parseFloat(sliderMin) || 0;
    const maxVal = parseFloat(sliderMax) || 100;

    const updates: Partial<GivenNode> = {
      symbol,
      value: {
        value: numValue,
        unit: unit ? { expression: unit } : undefined,
      },
      sliderRange: sliderEnabled
        ? { min: minVal, max: maxVal }
        : undefined,
    };

    onSave(updates);
  };

  return (
    <div className="node-editor given-editor smart-editor">
      {/* Type Selector */}
      <div className="editor-row type-row">
        <label>Type:</label>
        <div className="type-input-wrapper">
          <input
            ref={typeInputRef}
            type="text"
            value={showTypeDropdown ? typeSearch : currentTypeData?.label || selectedType}
            onChange={(e) => {
              if (!isComputed) {
                setTypeSearch(e.target.value);
                setShowTypeDropdown(true);
              }
            }}
            onFocus={() => {
              if (!isComputed) {
                setShowTypeDropdown(true);
                setTypeSearch('');
              }
            }}
            onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search types..."
            className={`type-input ${isComputed ? 'computed-readonly' : ''}`}
            autoComplete="off"
            disabled={isComputed}
            title={isComputed ? 'Computed value - cannot be edited' : undefined}
          />
          <span className="type-dimension">{currentTypeData?.dimension}</span>
          {showTypeDropdown && (
            <div className="type-dropdown">
              {filteredTypes.map(([key, data]) => (
                <div
                  key={key}
                  className={`type-option ${key === selectedType ? 'selected' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleTypeSelect(key);
                  }}
                >
                  <div className="type-option-header">
                    <span className="type-label">{data.label}</span>
                    <span className="type-dim">{data.dimension}</span>
                  </div>
                  <div className="type-description">{data.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Symbol Selector */}
      <div className="editor-row symbol-row">
        <label>Symbol:</label>
        <div className="symbol-input-wrapper">
          <input
            ref={symbolInputRef}
            type="text"
            value={symbol}
            onChange={(e) => !isComputed && handleSymbolChange(e.target.value)}
            onFocus={() => !isComputed && setShowSymbolDropdown(true)}
            onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={symbolSuggestions[0] || 'x'}
            className={`symbol-input ${isComputed ? 'computed-readonly' : ''}`}
            autoComplete="off"
            disabled={isComputed}
            title={isComputed ? 'Computed value - cannot be edited' : undefined}
          />
          {showSymbolDropdown && symbolSuggestions.length > 0 && (
            <div className="symbol-dropdown">
              <div className="symbol-dropdown-header">Suggested:</div>
              <div className="symbol-suggestions">
                {symbolSuggestions.map(s => (
                  <div
                    key={s}
                    className={`symbol-option ${s === symbol ? 'selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSymbolChange(s);
                      setShowSymbolDropdown(false);
                      valueInputRef.current?.focus();
                    }}
                  >
                    {s.includes('_') ? (
                      <span className="symbol-subscript">
                        {s.split('_')[0]}<sub>{s.split('_')[1]}</sub>
                      </span>
                    ) : s}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Unit inference suggestion */}
          {unitSuggestion && !isComputed && (
            <div className="unit-inference-suggestion">
              <span className="suggestion-text">
                Suggested: <strong>{unitSuggestion.unit}</strong> ({unitSuggestion.quantity})
              </span>
              <button
                type="button"
                className="apply-suggestion-btn"
                onClick={applyUnitSuggestion}
              >
                Apply
              </button>
              <button
                type="button"
                className="dismiss-suggestion-btn"
                onClick={() => setUnitSuggestion(null)}
              >
                &times;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Value Input */}
      <div className="editor-row">
        <label>Value:</label>
        <input
          ref={valueInputRef}
          type="number"
          value={value}
          onChange={(e) => !isComputed && setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="0"
          step="any"
          className={`value-input ${isComputed ? 'computed-readonly' : ''}`}
          disabled={isComputed}
          title={isComputed ? 'Computed value - cannot be edited' : undefined}
        />
      </div>

      {/* Constant Match Detection */}
      {constantMatch && !isComputed && (
        <div className="constant-match-banner">
          <span className="constant-match-icon">🔬</span>
          <div className="constant-match-info">
            <span className="constant-match-name">{constantMatch.name}</span>
            <span className="constant-match-value">
              {constantMatch.symbol} = {constantMatch.value}{constantMatch.unit ? ` ${constantMatch.unit}` : ''}
            </span>
            {constantMatch.description && (
              <span className="constant-match-desc">{constantMatch.description}</span>
            )}
          </div>
          <button
            type="button"
            className="apply-constant-btn"
            onClick={() => {
              setSymbol(constantMatch.symbol);
              if (constantMatch.unit && !unit) {
                setUnit(constantMatch.unit);
              }
            }}
            title="Apply constant symbol and unit"
          >
            Apply
          </button>
        </div>
      )}

      {/* Unit Builder */}
      <div className="editor-row unit-row">
        <label>Unit:</label>
        <UnitBuilder
          value={unit}
          onChange={handleUnitBuilderChange}
          readonly={isComputed}
          suggestedType={selectedType}
        />
      </div>

      {/* Slider Range Toggle */}
      <div className="editor-row slider-row">
        <label>
          <input
            type="checkbox"
            checked={sliderEnabled}
            onChange={(e) => setSliderEnabled(e.target.checked)}
          />
          Enable slider
        </label>
        {sliderEnabled && (
          <div className="slider-range-inputs">
            <input
              type="number"
              value={sliderMin}
              onChange={(e) => setSliderMin(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Min"
              step="any"
              className="slider-min-input"
            />
            <span className="slider-separator">to</span>
            <input
              type="number"
              value={sliderMax}
              onChange={(e) => setSliderMax(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Max"
              step="any"
              className="slider-max-input"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="editor-actions">
        <button className="btn-save" onClick={handleSave}>Save</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// Variable aliases for smart matching
// Maps variable names to their common alternatives

