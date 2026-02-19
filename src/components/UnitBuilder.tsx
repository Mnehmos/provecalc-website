/**
 * UnitBuilder - Interactive unit construction component
 *
 * Allows users to visually build units like [kg]·[m]/[s]²
 * instead of typing them manually.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

// Base unit categories for selection
export const BASE_UNIT_CATEGORIES = {
  mass: {
    label: 'Mass',
    icon: 'M',
    dimension: '[M]',
    units: [
      { abbr: 'kg', name: 'kilogram', factor: 1 },
      { abbr: 'g', name: 'gram', factor: 0.001 },
      { abbr: 'mg', name: 'milligram', factor: 1e-6 },
      { abbr: 'ton', name: 'metric ton', factor: 1000 },
      { abbr: 'lb', name: 'pound', factor: 0.453592 },
      { abbr: 'oz', name: 'ounce', factor: 0.0283495 },
    ],
  },
  length: {
    label: 'Length',
    icon: 'L',
    dimension: '[L]',
    units: [
      { abbr: 'm', name: 'meter', factor: 1 },
      { abbr: 'cm', name: 'centimeter', factor: 0.01 },
      { abbr: 'mm', name: 'millimeter', factor: 0.001 },
      { abbr: 'km', name: 'kilometer', factor: 1000 },
      { abbr: 'ft', name: 'foot', factor: 0.3048 },
      { abbr: 'in', name: 'inch', factor: 0.0254 },
      { abbr: 'mi', name: 'mile', factor: 1609.34 },
      { abbr: 'yd', name: 'yard', factor: 0.9144 },
    ],
  },
  time: {
    label: 'Time',
    icon: 'T',
    dimension: '[T]',
    units: [
      { abbr: 's', name: 'second', factor: 1 },
      { abbr: 'ms', name: 'millisecond', factor: 0.001 },
      { abbr: 'min', name: 'minute', factor: 60 },
      { abbr: 'hr', name: 'hour', factor: 3600 },
      { abbr: 'day', name: 'day', factor: 86400 },
    ],
  },
  temperature: {
    label: 'Temperature',
    icon: 'Θ',
    dimension: '[Θ]',
    units: [
      { abbr: 'K', name: 'kelvin', factor: 1 },
      { abbr: '°C', name: 'celsius', factor: 1 },
      { abbr: '°F', name: 'fahrenheit', factor: 1 },
    ],
  },
  current: {
    label: 'Current',
    icon: 'I',
    dimension: '[I]',
    units: [
      { abbr: 'A', name: 'ampere', factor: 1 },
      { abbr: 'mA', name: 'milliampere', factor: 0.001 },
      { abbr: 'µA', name: 'microampere', factor: 1e-6 },
    ],
  },
  angle: {
    label: 'Angle',
    icon: '∠',
    dimension: '[1]',
    units: [
      { abbr: 'rad', name: 'radian', factor: 1 },
      { abbr: '°', name: 'degree', factor: Math.PI / 180 },
      { abbr: 'rev', name: 'revolution', factor: 2 * Math.PI },
    ],
  },
};

// Common derived unit presets
export const DERIVED_UNIT_PRESETS = [
  { abbr: 'N', name: 'newton (force)', formula: 'kg·m/s²', tokens: [{ unit: 'kg', power: 1 }, { unit: 'm', power: 1 }, { unit: 's', power: -2 }] },
  { abbr: 'J', name: 'joule (energy)', formula: 'kg·m²/s²', tokens: [{ unit: 'kg', power: 1 }, { unit: 'm', power: 2 }, { unit: 's', power: -2 }] },
  { abbr: 'W', name: 'watt (power)', formula: 'kg·m²/s³', tokens: [{ unit: 'kg', power: 1 }, { unit: 'm', power: 2 }, { unit: 's', power: -3 }] },
  { abbr: 'Pa', name: 'pascal (pressure)', formula: 'kg/m·s²', tokens: [{ unit: 'kg', power: 1 }, { unit: 'm', power: -1 }, { unit: 's', power: -2 }] },
  { abbr: 'V', name: 'volt (voltage)', formula: 'kg·m²/A·s³', tokens: [{ unit: 'kg', power: 1 }, { unit: 'm', power: 2 }, { unit: 'A', power: -1 }, { unit: 's', power: -3 }] },
  { abbr: 'Ω', name: 'ohm (resistance)', formula: 'kg·m²/A²·s³', tokens: [{ unit: 'kg', power: 1 }, { unit: 'm', power: 2 }, { unit: 'A', power: -2 }, { unit: 's', power: -3 }] },
  { abbr: 'Hz', name: 'hertz (frequency)', formula: '1/s', tokens: [{ unit: 's', power: -1 }] },
  { abbr: 'm/s', name: 'velocity', formula: 'm/s', tokens: [{ unit: 'm', power: 1 }, { unit: 's', power: -1 }] },
  { abbr: 'm/s²', name: 'acceleration', formula: 'm/s²', tokens: [{ unit: 'm', power: 1 }, { unit: 's', power: -2 }] },
];

// Maps quantity types (from GivenNode) to UnitBuilder categories
export const TYPE_TO_CATEGORY_MAP: Record<string, string> = {
  mass: 'mass',
  length: 'length',
  time: 'time',
  temperature: 'temperature',
  electric_current: 'current',
  angle: 'angle',
};

// Maps derived quantity types to their preset abbreviations
export const TYPE_TO_PRESET_MAP: Record<string, string> = {
  force: 'N',
  energy: 'J',
  work: 'J',
  power: 'W',
  pressure: 'Pa',
  stress: 'Pa',
  velocity: 'm/s',
  speed: 'm/s',
  acceleration: 'm/s²',
  voltage: 'V',
  electric_potential: 'V',
  resistance: 'Ω',
  frequency: 'Hz',
};

// Unit token in the formula
export interface UnitToken {
  unit: string;
  power: number;
}

interface UnitBuilderProps {
  value: string;
  onChange: (unit: string, tokens: UnitToken[]) => void;
  disabled?: boolean;
  /** When true, unit is derived from solved variables and cannot be edited */
  readonly?: boolean;
  /** Suggested quantity type from context (e.g., 'force', 'mass') - auto-selects category/preset */
  suggestedType?: string;
}

// Convert tokens to display string
export function tokensToString(tokens: UnitToken[]): string {
  if (tokens.length === 0) return '';

  const numerator: string[] = [];
  const denominator: string[] = [];

  for (const token of tokens) {
    if (token.power > 0) {
      if (token.power === 1) {
        numerator.push(token.unit);
      } else {
        numerator.push(`${token.unit}^${token.power}`);
      }
    } else if (token.power < 0) {
      const absPower = Math.abs(token.power);
      if (absPower === 1) {
        denominator.push(token.unit);
      } else {
        denominator.push(`${token.unit}^${absPower}`);
      }
    }
  }

  if (numerator.length === 0 && denominator.length > 0) {
    return `1/${denominator.join('·')}`;
  }
  if (denominator.length === 0) {
    return numerator.join('·');
  }
  return `${numerator.join('·')}/${denominator.join('·')}`;
}

// Convert Unicode superscript characters to regular digits/minus
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-',
};

function parseSuperscripts(s: string): string {
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, ch => SUPERSCRIPT_MAP[ch] || ch);
}

// Match a unit token: letters, then optional power as caret OR Unicode superscript
const UNIT_TOKEN_RE = /^([a-zA-Z°µ]+)(?:\^(-?\d+)|([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+))?$/;

function parseUnitToken(raw: string): { unit: string; power: number } | null {
  const match = raw.match(UNIT_TOKEN_RE);
  if (!match) return null;
  const unit = match[1];
  if (match[2] != null) return { unit, power: parseInt(match[2]) };
  if (match[3] != null) return { unit, power: parseInt(parseSuperscripts(match[3])) };
  return { unit, power: 1 };
}

// Parse string to tokens (simplified)
export function parseUnitString(str: string): UnitToken[] {
  if (!str) return [];

  const tokens: UnitToken[] = [];

  // Handle division
  const parts = str.split('/');

  // Numerator
  if (parts[0] && parts[0] !== '1') {
    const numUnits = parts[0].split(/[·*]/);
    for (const u of numUnits) {
      const parsed = parseUnitToken(u.trim());
      if (parsed) {
        tokens.push({ unit: parsed.unit, power: parsed.power });
      }
    }
  }

  // Denominator
  if (parts[1]) {
    const denUnits = parts[1].split(/[·*]/);
    for (const u of denUnits) {
      const parsed = parseUnitToken(u.trim());
      if (parsed) {
        tokens.push({ unit: parsed.unit, power: -parsed.power });
      }
    }
  }

  return tokens;
}

export function UnitBuilder({ value, onChange, disabled, readonly, suggestedType }: UnitBuilderProps) {
  const [showModal, setShowModal] = useState(false);
  const [tokens, setTokens] = useState<UnitToken[]>(() => parseUnitString(value));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [highlightedPreset, setHighlightedPreset] = useState<string | null>(null);

  // Auto-select category or highlight preset based on suggestedType when modal opens
  useEffect(() => {
    if (showModal && suggestedType) {
      // Check if it's a base type (maps to category)
      const category = TYPE_TO_CATEGORY_MAP[suggestedType];
      if (category) {
        setSelectedCategory(category);
        setHighlightedPreset(null);
      } else {
        // Check if it's a derived type (maps to preset)
        const preset = TYPE_TO_PRESET_MAP[suggestedType];
        if (preset) {
          setHighlightedPreset(preset);
          setSelectedCategory(null); // Show presets section prominently
        }
      }
    }
  }, [showModal, suggestedType]);

  // Update parent when tokens change
  const updateUnit = useCallback((newTokens: UnitToken[]) => {
    setTokens(newTokens);
    onChange(tokensToString(newTokens), newTokens);
  }, [onChange]);

  // Add a unit token
  const addUnit = useCallback((abbr: string, power: number = 1) => {
    // Check if unit already exists
    const existingIdx = tokens.findIndex(t => t.unit === abbr);
    if (existingIdx >= 0) {
      // Add to existing power
      const newTokens = [...tokens];
      newTokens[existingIdx] = { ...newTokens[existingIdx], power: newTokens[existingIdx].power + power };
      // Remove if power becomes 0
      if (newTokens[existingIdx].power === 0) {
        newTokens.splice(existingIdx, 1);
      }
      updateUnit(newTokens);
    } else {
      updateUnit([...tokens, { unit: abbr, power }]);
    }
    setSelectedCategory(null);
  }, [tokens, updateUnit]);

  // Remove a unit token
  const removeToken = useCallback((index: number) => {
    const newTokens = tokens.filter((_, i) => i !== index);
    updateUnit(newTokens);
  }, [tokens, updateUnit]);

  // Change power of a token
  const changePower = useCallback((index: number, delta: number) => {
    const newTokens = [...tokens];
    newTokens[index] = { ...newTokens[index], power: newTokens[index].power + delta };
    if (newTokens[index].power === 0) {
      newTokens.splice(index, 1);
    }
    updateUnit(newTokens);
  }, [tokens, updateUnit]);

  // Replace unit at index
  const replaceUnit = useCallback((index: number, newAbbr: string) => {
    const newTokens = [...tokens];
    newTokens[index] = { ...newTokens[index], unit: newAbbr };
    updateUnit(newTokens);
    setEditingIndex(null);
    setSelectedCategory(null);
  }, [tokens, updateUnit]);

  // Apply preset
  const applyPreset = useCallback((preset: typeof DERIVED_UNIT_PRESETS[0]) => {
    updateUnit([...preset.tokens]);
    setShowModal(false);
  }, [updateUnit]);

  // Clear all
  const clearAll = useCallback(() => {
    updateUnit([]);
  }, [updateUnit]);

  // Display string
  const displayString = useMemo(() => tokensToString(tokens), [tokens]);

  // Readonly mode - just show the unit formula without interaction
  if (readonly) {
    return (
      <div className="unit-builder readonly">
        <div className="unit-builder-display readonly" title="Unit derived from solved variables">
          {tokens.length === 0 ? (
            <span className="placeholder">—</span>
          ) : (
            <span className="unit-formula">
              {tokens.map((token, i) => (
                <span key={i} className="formula-part">
                  {i > 0 && token.power > 0 && <span className="operator">·</span>}
                  {i > 0 && token.power < 0 && tokens.slice(0, i).some(t => t.power > 0) && <span className="operator">/</span>}
                  {i > 0 && token.power < 0 && !tokens.slice(0, i).some(t => t.power > 0) && i === tokens.findIndex(t => t.power < 0) && <span className="operator">1/</span>}
                  <span className="unit-token">[{token.unit}]</span>
                  {Math.abs(token.power) !== 1 && (
                    <sup className="power">{Math.abs(token.power)}</sup>
                  )}
                </span>
              ))}
            </span>
          )}
          <span className="readonly-badge">derived</span>
        </div>
      </div>
    );
  }

  return (
    <div className="unit-builder">
      {/* Display area / trigger */}
      <button
        type="button"
        className="unit-builder-display"
        onClick={() => !disabled && setShowModal(true)}
        disabled={disabled}
      >
        {tokens.length === 0 ? (
          <span className="placeholder">Click to build unit...</span>
        ) : (
          <span className="unit-formula">
            {tokens.map((token, i) => (
              <span key={i} className="formula-part">
                {i > 0 && token.power > 0 && <span className="operator">·</span>}
                {i > 0 && token.power < 0 && tokens.slice(0, i).some(t => t.power > 0) && <span className="operator">/</span>}
                {i > 0 && token.power < 0 && !tokens.slice(0, i).some(t => t.power > 0) && i === tokens.findIndex(t => t.power < 0) && <span className="operator">1/</span>}
                <span className="unit-token">[{token.unit}]</span>
                {Math.abs(token.power) !== 1 && (
                  <sup className="power">{Math.abs(token.power)}</sup>
                )}
              </span>
            ))}
          </span>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="unit-builder-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="unit-builder-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Build Unit</h4>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* Current formula */}
            <div className="current-formula">
              <span className="label">Current:</span>
              <div className="formula-tokens">
                {tokens.length === 0 ? (
                  <span className="empty">No units selected</span>
                ) : (
                  tokens.map((token, i) => (
                    <div key={i} className="token-chip">
                      <button
                        className="token-unit"
                        onClick={() => {
                          setEditingIndex(i);
                          // Find category for this unit
                          for (const [catKey, cat] of Object.entries(BASE_UNIT_CATEGORIES)) {
                            if (cat.units.some(u => u.abbr === token.unit)) {
                              setSelectedCategory(catKey);
                              break;
                            }
                          }
                        }}
                      >
                        [{token.unit}]
                      </button>
                      <div className="token-power">
                        <button onClick={() => changePower(i, 1)}>+</button>
                        <span className={token.power < 0 ? 'negative' : ''}>{token.power}</span>
                        <button onClick={() => changePower(i, -1)}>−</button>
                      </div>
                      <button className="remove-btn" onClick={() => removeToken(i)}>×</button>
                    </div>
                  ))
                )}
              </div>
              {tokens.length > 0 && (
                <div className="formula-result">
                  = <strong>{displayString}</strong>
                  <button className="clear-btn" onClick={clearAll}>Clear all</button>
                </div>
              )}
            </div>

            {/* Quick presets */}
            <div className={`presets-section ${highlightedPreset ? 'has-suggestion' : ''}`}>
              <span className="section-label">
                Common Units:
                {highlightedPreset && <span className="suggestion-hint"> (suggested: {highlightedPreset})</span>}
              </span>
              <div className="preset-chips">
                {DERIVED_UNIT_PRESETS.map(preset => (
                  <button
                    key={preset.abbr}
                    className={`preset-chip ${highlightedPreset === preset.abbr ? 'highlighted' : ''}`}
                    onClick={() => applyPreset(preset)}
                    title={`${preset.name} (${preset.formula})`}
                  >
                    <span className="preset-abbr">{preset.abbr}</span>
                    <span className="preset-name">{preset.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category tabs */}
            <div className="category-tabs">
              {Object.entries(BASE_UNIT_CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <span className="tab-icon">{cat.icon}</span>
                  <span className="tab-label">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Unit grid */}
            {selectedCategory && (
              <div className="unit-grid">
                {BASE_UNIT_CATEGORIES[selectedCategory as keyof typeof BASE_UNIT_CATEGORIES].units.map(unit => (
                  <button
                    key={unit.abbr}
                    className="unit-option"
                    onClick={() => {
                      if (editingIndex !== null) {
                        replaceUnit(editingIndex, unit.abbr);
                      } else {
                        addUnit(unit.abbr, 1);
                      }
                    }}
                  >
                    <span className="unit-abbr">{unit.abbr}</span>
                    <span className="unit-name">{unit.name}</span>
                  </button>
                ))}
                {/* Add to denominator */}
                {editingIndex === null && (
                  <div className="unit-divider">
                    <span>Add to denominator (÷):</span>
                  </div>
                )}
                {editingIndex === null && BASE_UNIT_CATEGORIES[selectedCategory as keyof typeof BASE_UNIT_CATEGORIES].units.map(unit => (
                  <button
                    key={`${unit.abbr}-den`}
                    className="unit-option denominator"
                    onClick={() => addUnit(unit.abbr, -1)}
                  >
                    <span className="unit-abbr">/{unit.abbr}</span>
                    <span className="unit-name">{unit.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Done button */}
            <div className="modal-footer">
              <button className="done-btn" onClick={() => setShowModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
