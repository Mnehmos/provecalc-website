/**
 * Shared utilities for node components
 * 
 * Number formatting, unit conversion, and display helpers
 * used across multiple node editor and content components.
 */

import type { WorksheetNode, GivenNode, AnnotationNode } from '../../types/document';

// ============ Number Representation Types ============
export type NumberRepresentation = 'decimal' | 'scientific' | 'engineering' | 'fraction';

/**
 * Format a number according to the selected representation
 */
export function formatNumber(value: number, representation: NumberRepresentation, precision: number = 6): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  switch (representation) {
    case 'decimal':
      // Standard decimal with significant figures
      return formatDecimal(value, precision);

    case 'scientific':
      // Scientific notation: 1.234 × 10^5
      return formatScientific(value, precision);

    case 'engineering':
      // Engineering notation: exponent is multiple of 3
      return formatEngineering(value, precision);

    case 'fraction':
      // Try to express as fraction if possible
      return formatFraction(value) || formatDecimal(value, precision);

    default:
      return formatDecimal(value, precision);
  }
}

export function formatDecimal(value: number, precision: number): string {
  if (value === 0) return '0';
  const absValue = Math.abs(value);

  // Determine if we need to use exponential for very large/small numbers
  if (absValue >= 1e10 || (absValue < 1e-4 && absValue !== 0)) {
    return value.toPrecision(precision);
  }

  // For normal range, use fixed notation with appropriate decimals
  return Number(value.toPrecision(precision)).toString();
}

export function formatScientific(value: number, precision: number): string {
  if (value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);
  const mantissaStr = mantissa.toFixed(precision - 1);
  return `${mantissaStr} \\times 10^{${exp}}`;
}

export function formatEngineering(value: number, precision: number): string {
  if (value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const engExp = Math.floor(exp / 3) * 3;
  const mantissa = value / Math.pow(10, engExp);
  const mantissaStr = Number(mantissa.toPrecision(precision)).toString();
  if (engExp === 0) return mantissaStr;
  return `${mantissaStr} \\times 10^{${engExp}}`;
}

export function formatFraction(value: number): string | null {
  // Simple fraction detection for common fractions
  const tolerance = 1e-10;
  const maxDenominator = 1000;

  for (let denom = 1; denom <= maxDenominator; denom++) {
    const numer = Math.round(value * denom);
    if (Math.abs(numer / denom - value) < tolerance) {
      if (denom === 1) return numer.toString();
      const sign = numer < 0 ? '-' : '';
      const absNumer = Math.abs(numer);
      return `${sign}\\frac{${absNumer}}{${denom}}`;
    }
  }
  return null; // Not a simple fraction
}

/**
 * Format a symbol for LaTeX rendering with proper subscripts/superscripts
 * Converts: m_1 → m_{1}, x^2 → x^{2}, v_0^2 → v_{0}^{2}
 */
const GREEK_NAMES: Record<string, string> = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\epsilon', zeta: '\\zeta', eta: '\\eta', theta: '\\theta',
  iota: '\\iota', kappa: '\\kappa', lambda: '\\lambda', mu: '\\mu',
  nu: '\\nu', xi: '\\xi', pi: '\\pi', rho: '\\rho',
  sigma: '\\sigma', tau: '\\tau', upsilon: '\\upsilon', phi: '\\phi',
  chi: '\\chi', psi: '\\psi', omega: '\\omega',
  Gamma: '\\Gamma', Delta: '\\Delta', Theta: '\\Theta', Lambda: '\\Lambda',
  Xi: '\\Xi', Pi: '\\Pi', Sigma: '\\Sigma', Phi: '\\Phi', Psi: '\\Psi', Omega: '\\Omega',
};

export function formatSymbolLatex(symbol: string): string {
  // Split into base and all underscore/caret segments
  const parts = symbol.split('_');
  let base = parts[0];
  const subscriptParts = parts.slice(1);

  // Replace Greek base with LaTeX command: rho → \rho
  if (GREEK_NAMES[base]) {
    base = GREEK_NAMES[base];
  }

  // Convert "prime" segments to LaTeX prime symbol
  const primeCount = subscriptParts.filter(p => p === 'prime').length;
  const nonPrimeParts = subscriptParts.filter(p => p !== 'prime');

  // Build result: base + primes + single subscript group
  let result = base + "'".repeat(primeCount);
  if (nonPrimeParts.length > 0) {
    const sub = nonPrimeParts.join(',');
    result += `_{${sub}}`;
  }

  // Handle caret superscripts: x^2 → x^{2}
  return result.replace(/\^([a-zA-Z0-9]+)(?![}])/g, '^{$1}');
}

/**
 * Format a number for LaTeX display with selected representation
 */
export function formatNumberLatex(
  symbol: string,
  value: number,
  unit: string | undefined,
  representation: NumberRepresentation,
  precision: number = 6
): string {
  const formattedValue = formatNumber(value, representation, precision);
  const unitPart = unit ? ` \\; \\mathrm{${formatUnitLatex(unit)}}` : '';
  return `${formatSymbolLatex(symbol)} = ${formattedValue}${unitPart}`;
}

export interface UnitConversion {
  toSI: number;           // Multiply by this to convert to SI base
  category: string;       // Category like 'length', 'mass', etc.
  siUnit: string;         // SI base unit abbreviation
}

export const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Length (base: m)
  'm': { toSI: 1, category: 'length', siUnit: 'm' },
  'cm': { toSI: 0.01, category: 'length', siUnit: 'm' },
  'mm': { toSI: 0.001, category: 'length', siUnit: 'm' },
  'km': { toSI: 1000, category: 'length', siUnit: 'm' },
  'ft': { toSI: 0.3048, category: 'length', siUnit: 'm' },
  'in': { toSI: 0.0254, category: 'length', siUnit: 'm' },
  'mi': { toSI: 1609.344, category: 'length', siUnit: 'm' },

  // Mass (base: kg)
  'kg': { toSI: 1, category: 'mass', siUnit: 'kg' },
  'g': { toSI: 0.001, category: 'mass', siUnit: 'kg' },
  'mg': { toSI: 0.000001, category: 'mass', siUnit: 'kg' },
  'ton': { toSI: 1000, category: 'mass', siUnit: 'kg' },
  'lb': { toSI: 0.453592, category: 'mass', siUnit: 'kg' },

  // Time (base: s)
  's': { toSI: 1, category: 'time', siUnit: 's' },
  'ms': { toSI: 0.001, category: 'time', siUnit: 's' },
  'min': { toSI: 60, category: 'time', siUnit: 's' },
  'hr': { toSI: 3600, category: 'time', siUnit: 's' },
  'day': { toSI: 86400, category: 'time', siUnit: 's' },

  // Velocity (base: m/s)
  'm/s': { toSI: 1, category: 'velocity', siUnit: 'm/s' },
  'km/h': { toSI: 1/3.6, category: 'velocity', siUnit: 'm/s' },
  'mph': { toSI: 0.44704, category: 'velocity', siUnit: 'm/s' },
  'ft/s': { toSI: 0.3048, category: 'velocity', siUnit: 'm/s' },
  'kn': { toSI: 0.514444, category: 'velocity', siUnit: 'm/s' },

  // Acceleration (base: m/s^2)
  'm/s^2': { toSI: 1, category: 'acceleration', siUnit: 'm/s^2' },
  'ft/s^2': { toSI: 0.3048, category: 'acceleration', siUnit: 'm/s^2' },
  'gn': { toSI: 9.80665, category: 'acceleration', siUnit: 'm/s^2' }, // Standard gravity (gn not g to avoid conflict with gram)
  'cm/s^2': { toSI: 0.01, category: 'acceleration', siUnit: 'm/s^2' }, // gal

  // Force (base: N)
  'N': { toSI: 1, category: 'force', siUnit: 'N' },
  'kN': { toSI: 1000, category: 'force', siUnit: 'N' },
  'MN': { toSI: 1000000, category: 'force', siUnit: 'N' },
  'lbf': { toSI: 4.44822, category: 'force', siUnit: 'N' },

  // Energy (base: J)
  'J': { toSI: 1, category: 'energy', siUnit: 'J' },
  'kJ': { toSI: 1000, category: 'energy', siUnit: 'J' },
  'MJ': { toSI: 1000000, category: 'energy', siUnit: 'J' },
  'cal': { toSI: 4.184, category: 'energy', siUnit: 'J' },
  'kcal': { toSI: 4184, category: 'energy', siUnit: 'J' },
  'Wh': { toSI: 3600, category: 'energy', siUnit: 'J' },
  'kWh': { toSI: 3600000, category: 'energy', siUnit: 'J' },
  'BTU': { toSI: 1055.06, category: 'energy', siUnit: 'J' },

  // Power (base: W)
  'W': { toSI: 1, category: 'power', siUnit: 'W' },
  'kW': { toSI: 1000, category: 'power', siUnit: 'W' },
  'MW': { toSI: 1000000, category: 'power', siUnit: 'W' },
  'hp': { toSI: 745.7, category: 'power', siUnit: 'W' },

  // Pressure (base: Pa)
  'Pa': { toSI: 1, category: 'pressure', siUnit: 'Pa' },
  'kPa': { toSI: 1000, category: 'pressure', siUnit: 'Pa' },
  'MPa': { toSI: 1000000, category: 'pressure', siUnit: 'Pa' },
  'bar': { toSI: 100000, category: 'pressure', siUnit: 'Pa' },
  'atm': { toSI: 101325, category: 'pressure', siUnit: 'Pa' },
  'psi': { toSI: 6894.76, category: 'pressure', siUnit: 'Pa' },

  // Area (base: m^2)
  'm^2': { toSI: 1, category: 'area', siUnit: 'm^2' },
  'cm^2': { toSI: 0.0001, category: 'area', siUnit: 'm^2' },
  'mm^2': { toSI: 0.000001, category: 'area', siUnit: 'm^2' },
  'km^2': { toSI: 1000000, category: 'area', siUnit: 'm^2' },
  'ft^2': { toSI: 0.09290304, category: 'area', siUnit: 'm^2' },
  'in^2': { toSI: 0.00064516, category: 'area', siUnit: 'm^2' },

  // Volume (base: m^3)
  'm^3': { toSI: 1, category: 'volume', siUnit: 'm^3' },
  'cm^3': { toSI: 0.000001, category: 'volume', siUnit: 'm^3' },
  'mm^3': { toSI: 0.000000001, category: 'volume', siUnit: 'm^3' },
  'L': { toSI: 0.001, category: 'volume', siUnit: 'm^3' },
  'mL': { toSI: 0.000001, category: 'volume', siUnit: 'm^3' },
  'ft^3': { toSI: 0.028316846592, category: 'volume', siUnit: 'm^3' },
  'in^3': { toSI: 0.000016387064, category: 'volume', siUnit: 'm^3' },

  // Density (base: kg/m^3)
  'kg/m^3': { toSI: 1, category: 'density', siUnit: 'kg/m^3' },
  'g/cm^3': { toSI: 1000, category: 'density', siUnit: 'kg/m^3' },
  'lb/ft^3': { toSI: 16.01846337396, category: 'density', siUnit: 'kg/m^3' },
  'kg/L': { toSI: 1000, category: 'density', siUnit: 'kg/m^3' },

  // Area moment of inertia / second moment of area (base: m^4)
  'm^4': { toSI: 1, category: 'second_moment_area', siUnit: 'm^4' },
  'cm^4': { toSI: 0.00000001, category: 'second_moment_area', siUnit: 'm^4' },
  'mm^4': { toSI: 0.000000000001, category: 'second_moment_area', siUnit: 'm^4' },
  'ft^4': { toSI: 0.0086309748412416, category: 'second_moment_area', siUnit: 'm^4' },
  'in^4': { toSI: 0.0000004162314256, category: 'second_moment_area', siUnit: 'm^4' },

  // Electrical (base: V, A, Ω)
  'V': { toSI: 1, category: 'voltage', siUnit: 'V' },
  'mV': { toSI: 0.001, category: 'voltage', siUnit: 'V' },
  'kV': { toSI: 1000, category: 'voltage', siUnit: 'V' },
  'A': { toSI: 1, category: 'current', siUnit: 'A' },
  'mA': { toSI: 0.001, category: 'current', siUnit: 'A' },
  'Ω': { toSI: 1, category: 'resistance', siUnit: 'Ω' },
  'ohm': { toSI: 1, category: 'resistance', siUnit: 'Ω' },
  'kΩ': { toSI: 1000, category: 'resistance', siUnit: 'Ω' },
  'kohm': { toSI: 1000, category: 'resistance', siUnit: 'Ω' },
  'MΩ': { toSI: 1000000, category: 'resistance', siUnit: 'Ω' },

  // Angle (base: rad)
  'rad': { toSI: 1, category: 'angle', siUnit: 'rad' },
  'deg': { toSI: Math.PI / 180, category: 'angle', siUnit: 'rad' },
  '°': { toSI: Math.PI / 180, category: 'angle', siUnit: 'rad' },

  // Temperature (special handling needed - not multiplicative)
  'K': { toSI: 1, category: 'temperature', siUnit: 'K' },
};

const TYPE_TO_CANONICAL_UNIT: Record<string, string> = {
  length: 'm',
  mass: 'kg',
  time: 's',
  area: 'm^2',
  volume: 'm^3',
  velocity: 'm/s',
  acceleration: 'm/s^2',
  force: 'N',
  pressure: 'Pa',
  energy: 'J',
  power: 'W',
  density: 'kg/m^3',
  voltage: 'V',
  current: 'A',
  resistance: 'Ω',
  angle: 'rad',
  temperature: 'K',
};

const COMPOUND_UNIT_ALIASES: Record<string, string> = {
  'kg*m/s^2': 'N',
  'kg*m*s^-2': 'N',
  'kg*m^2/s^2': 'J',
  'kg*m^2*s^-2': 'J',
  'kg*m^2/s^3': 'W',
  'kg*m^2*s^-3': 'W',
  'kg/(m*s^2)': 'Pa',
  'kg*m^-1*s^-2': 'Pa',
};

function normalizeUnitForLookup(unit: string): string {
  return unit
    .trim()
    .replace(/\s+/g, '')
    .replace(/\*\*/g, '^')
    .replace(/[\u00B7\u22C5\u00D7]/g, '*')
    .replace(/\u00B2/g, '^2')
    .replace(/\u00B3/g, '^3')
    .replace(/\u2074/g, '^4')
    .replace(/\u2212/g, '-');
}

function simplifyAdditiveUnitExpression(unit: string): string {
  const compact = unit.trim();
  if (!/[+-]/.test(compact)) return compact;

  const terms = compact
    .replace(/[()]/g, ' ')
    .split(/[+-]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (terms.length < 2) return compact;

  const normalizedTerms = terms.map((term) => normalizeUnitForLookup(term).replace(/^-+/, ''));
  if (!normalizedTerms[0]) return compact;

  const allSame = normalizedTerms.every((term) => term === normalizedTerms[0]);
  return allSame ? terms[0].replace(/^-+/, '') : compact;
}

function resolveConvertibleUnit(unit: string): string | null {
  if (!unit) return null;

  const simplified = simplifyAdditiveUnitExpression(unit);
  if (UNIT_CONVERSIONS[simplified]) return simplified;

  const normalized = normalizeUnitForLookup(simplified);
  if (!normalized) return null;

  const direct = Object.keys(UNIT_CONVERSIONS).find((u) => normalizeUnitForLookup(u) === normalized);
  if (direct) return direct;

  const aliased = COMPOUND_UNIT_ALIASES[normalized];
  if (aliased && UNIT_CONVERSIONS[aliased]) return aliased;

  const inferredType = inferTypeFromUnit(simplified);
  if (!inferredType) return null;

  const canonical = TYPE_TO_CANONICAL_UNIT[inferredType];
  return canonical && UNIT_CONVERSIONS[canonical] ? canonical : null;
}

/** Get all units in the same category as the given unit */
export function getCompatibleUnits(unit: string): string[] {
  const resolvedUnit = resolveConvertibleUnit(unit);
  if (!resolvedUnit) return [];

  const conversion = UNIT_CONVERSIONS[resolvedUnit];
  if (!conversion) return [];

  return Object.entries(UNIT_CONVERSIONS)
    .filter(([_, c]) => c.category === conversion.category)
    .map(([u]) => u)
    .filter((u) => u !== resolvedUnit);
}

/** Convert a value from one unit to another */
export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const resolvedFrom = resolveConvertibleUnit(fromUnit);
  const resolvedTo = resolveConvertibleUnit(toUnit);
  if (!resolvedFrom || !resolvedTo) return null;

  const fromConv = UNIT_CONVERSIONS[resolvedFrom];
  const toConv = UNIT_CONVERSIONS[resolvedTo];

  if (!fromConv || !toConv) return null;
  if (fromConv.category !== toConv.category) return null;

  // Convert to SI, then to target unit
  const siValue = value * fromConv.toSI;
  return siValue / toConv.toSI;
}

/** Format a converted value with appropriate precision */
export function formatConvertedValue(value: number): string {
  if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)) {
    return value.toExponential(3);
  }
  return value.toPrecision(4).replace(/\.?0+$/, '');
}


export interface UnitInfo {
  abbr: string;      // Unit abbreviation (e.g., "ms")
  name: string;      // Full name (e.g., "millisecond")
}

export interface QuantityType {
  label: string;           // Display name
  description: string;     // When to use this type
  symbols: string[];       // Common symbol names (first is default)
  units: UnitInfo[];       // Units with descriptions
  dimension: string;       // Dimensional formula
}

export const QUANTITY_TYPES: Record<string, QuantityType> = {
  length: {
    label: 'Length / Distance',
    description: 'Position, displacement, height, width, radius',
    symbols: ['L', 'd', 'x', 'y', 'z', 'h', 'r', 'w'],
    units: [
      { abbr: 'm', name: 'meter' },
      { abbr: 'cm', name: 'centimeter' },
      { abbr: 'mm', name: 'millimeter' },
      { abbr: 'km', name: 'kilometer' },
      { abbr: 'ft', name: 'foot' },
      { abbr: 'in', name: 'inch' },
      { abbr: 'mi', name: 'mile' },
    ],
    dimension: '[L]',
  },
  mass: {
    label: 'Mass',
    description: 'Amount of matter, inertia (not weight)',
    symbols: ['m', 'M'],
    units: [
      { abbr: 'kg', name: 'kilogram' },
      { abbr: 'g', name: 'gram' },
      { abbr: 'lb', name: 'pound-mass' },
      { abbr: 'ton', name: 'metric ton' },
      { abbr: 'mg', name: 'milligram' },
    ],
    dimension: '[M]',
  },
  time: {
    label: 'Time',
    description: 'Duration, period, elapsed time',
    symbols: ['t', 'T', 'dt'],
    units: [
      { abbr: 's', name: 'second' },
      { abbr: 'min', name: 'minute' },
      { abbr: 'hr', name: 'hour' },
      { abbr: 'ms', name: 'millisecond (0.001 s)' },
      { abbr: 'day', name: 'day' },
    ],
    dimension: '[T]',
  },
  velocity: {
    label: 'Velocity / Speed',
    description: 'Rate of position change, how fast something moves',
    symbols: ['v', 'u', 'V'],
    units: [
      { abbr: 'm/s', name: 'meters per second' },
      { abbr: 'km/h', name: 'kilometers per hour' },
      { abbr: 'mph', name: 'miles per hour' },
      { abbr: 'ft/s', name: 'feet per second' },
      { abbr: 'kn', name: 'knot (nautical)' },
    ],
    dimension: '[L]/[T]',
  },
  acceleration: {
    label: 'Acceleration',
    description: 'Rate of velocity change, gravity (g = 9.81 m/s²)',
    symbols: ['a', 'g'],
    units: [
      { abbr: 'm/s^2', name: 'meters per second squared' },
      { abbr: 'ft/s^2', name: 'feet per second squared' },
      { abbr: 'gn', name: 'standard gravity (9.81 m/s²)' },
      { abbr: 'cm/s^2', name: 'gal (cm per second squared)' },
    ],
    dimension: '[L]/[T]^2',
  },
  force: {
    label: 'Force',
    description: 'Push/pull, weight, tension, friction (F = ma)',
    symbols: ['F', 'N', 'W', 'T', 'P'],
    units: [
      { abbr: 'N', name: 'newton (kg·m/s²)' },
      { abbr: 'kN', name: 'kilonewton' },
      { abbr: 'MN', name: 'meganewton' },
      { abbr: 'lbf', name: 'pound-force' },
      { abbr: 'dyn', name: 'dyne (g·cm/s²)' },
    ],
    dimension: '[M][L]/[T]^2',
  },
  energy: {
    label: 'Energy / Work',
    description: 'Work done, kinetic/potential energy, heat',
    symbols: ['E', 'W', 'U', 'KE', 'PE', 'Q'],
    units: [
      { abbr: 'J', name: 'joule (N·m)' },
      { abbr: 'kJ', name: 'kilojoule' },
      { abbr: 'MJ', name: 'megajoule' },
      { abbr: 'Wh', name: 'watt-hour' },
      { abbr: 'kWh', name: 'kilowatt-hour' },
      { abbr: 'BTU', name: 'British thermal unit' },
      { abbr: 'cal', name: 'calorie' },
      { abbr: 'eV', name: 'electron-volt' },
    ],
    dimension: '[M][L]^2/[T]^2',
  },
  power: {
    label: 'Power',
    description: 'Rate of energy transfer, work per unit time',
    symbols: ['P', 'W'],
    units: [
      { abbr: 'W', name: 'watt (J/s)' },
      { abbr: 'kW', name: 'kilowatt' },
      { abbr: 'MW', name: 'megawatt' },
      { abbr: 'hp', name: 'horsepower (mechanical)' },
      { abbr: 'BTU/h', name: 'BTU per hour' },
    ],
    dimension: '[M][L]^2/[T]^3',
  },
  pressure: {
    label: 'Pressure / Stress',
    description: 'Force per unit area, stress in materials',
    symbols: ['p', 'P', 'sigma', 'tau'],
    units: [
      { abbr: 'Pa', name: 'pascal (N/m²)' },
      { abbr: 'kPa', name: 'kilopascal' },
      { abbr: 'MPa', name: 'megapascal' },
      { abbr: 'GPa', name: 'gigapascal' },
      { abbr: 'psi', name: 'pounds per square inch' },
      { abbr: 'bar', name: 'bar (100 kPa)' },
      { abbr: 'atm', name: 'atmosphere (101.325 kPa)' },
      { abbr: 'mmHg', name: 'millimeters of mercury' },
    ],
    dimension: '[M]/[L][T]^2',
  },
  area: {
    label: 'Area',
    description: 'Surface area, cross-section',
    symbols: ['A', 'S'],
    units: [
      { abbr: 'm^2', name: 'square meter' },
      { abbr: 'cm^2', name: 'square centimeter' },
      { abbr: 'mm^2', name: 'square millimeter' },
      { abbr: 'km^2', name: 'square kilometer' },
      { abbr: 'ft^2', name: 'square foot' },
      { abbr: 'in^2', name: 'square inch' },
      { abbr: 'acre', name: 'acre' },
      { abbr: 'ha', name: 'hectare' },
    ],
    dimension: '[L]^2',
  },
  volume: {
    label: 'Volume',
    description: '3D space occupied, capacity',
    symbols: ['V', 'Vol'],
    units: [
      { abbr: 'm^3', name: 'cubic meter' },
      { abbr: 'L', name: 'liter' },
      { abbr: 'mL', name: 'milliliter' },
      { abbr: 'cm^3', name: 'cubic centimeter (= mL)' },
      { abbr: 'gal', name: 'gallon (US)' },
      { abbr: 'ft^3', name: 'cubic foot' },
    ],
    dimension: '[L]^3',
  },
  angle: {
    label: 'Angle',
    description: 'Rotation, angular position',
    symbols: ['theta', 'phi', 'alpha', 'beta', 'gamma', 'psi'],
    units: [
      { abbr: 'rad', name: 'radian (SI)' },
      { abbr: 'deg', name: 'degree (°)' },
      { abbr: 'rev', name: 'revolution (360°)' },
      { abbr: 'grad', name: 'gradian (400 per circle)' },
    ],
    dimension: '[1]',
  },
  angular_velocity: {
    label: 'Angular Velocity',
    description: 'Rotation speed, spin rate',
    symbols: ['omega', 'w'],
    units: [
      { abbr: 'rad/s', name: 'radians per second' },
      { abbr: 'rpm', name: 'revolutions per minute' },
      { abbr: 'deg/s', name: 'degrees per second' },
      { abbr: 'Hz', name: 'hertz (rev per second)' },
    ],
    dimension: '1/[T]',
  },
  frequency: {
    label: 'Frequency',
    description: 'Cycles per second, repetition rate',
    symbols: ['f', 'nu'],
    units: [
      { abbr: 'Hz', name: 'hertz (1/s)' },
      { abbr: 'kHz', name: 'kilohertz' },
      { abbr: 'MHz', name: 'megahertz' },
      { abbr: 'GHz', name: 'gigahertz' },
      { abbr: 'rpm', name: 'revolutions per minute' },
    ],
    dimension: '1/[T]',
  },
  density: {
    label: 'Density',
    description: 'Mass per unit volume',
    symbols: ['rho', 'd'],
    units: [
      { abbr: 'kg/m^3', name: 'kilogram per cubic meter' },
      { abbr: 'g/cm^3', name: 'gram per cubic cm (= kg/L)' },
      { abbr: 'g/mL', name: 'gram per milliliter' },
      { abbr: 'lb/ft^3', name: 'pound per cubic foot' },
    ],
    dimension: '[M]/[L]^3',
  },
  moment: {
    label: 'Moment / Torque',
    description: 'Rotational force, bending moment',
    symbols: ['M', 'tau', 'T'],
    units: [
      { abbr: 'N*m', name: 'newton-meter' },
      { abbr: 'kN*m', name: 'kilonewton-meter' },
      { abbr: 'lbf*ft', name: 'pound-force foot' },
      { abbr: 'lbf*in', name: 'pound-force inch' },
    ],
    dimension: '[M][L]^2/[T]^2',
  },
  temperature: {
    label: 'Temperature',
    description: 'Thermal state, heat intensity',
    symbols: ['T', 'Temp'],
    units: [
      { abbr: 'K', name: 'kelvin (absolute)' },
      { abbr: 'C', name: 'celsius (°C)' },
      { abbr: 'F', name: 'fahrenheit (°F)' },
      { abbr: 'R', name: 'rankine (absolute °F)' },
    ],
    dimension: '[Theta]',
  },
  electric_current: {
    label: 'Electric Current',
    description: 'Flow of electric charge',
    symbols: ['I', 'i'],
    units: [
      { abbr: 'A', name: 'ampere' },
      { abbr: 'mA', name: 'milliampere' },
      { abbr: 'uA', name: 'microampere' },
      { abbr: 'kA', name: 'kiloampere' },
    ],
    dimension: '[I]',
  },
  voltage: {
    label: 'Voltage / EMF',
    description: 'Electric potential difference',
    symbols: ['V', 'E', 'U'],
    units: [
      { abbr: 'V', name: 'volt' },
      { abbr: 'mV', name: 'millivolt' },
      { abbr: 'kV', name: 'kilovolt' },
      { abbr: 'MV', name: 'megavolt' },
    ],
    dimension: '[M][L]^2/[I][T]^3',
  },
  resistance: {
    label: 'Resistance',
    description: 'Opposition to current flow',
    symbols: ['R', 'Z'],
    units: [
      { abbr: 'Ω', name: 'ohm (Ω)' },
      { abbr: 'kΩ', name: 'kilohm (kΩ)' },
      { abbr: 'MΩ', name: 'megohm (MΩ)' },
      { abbr: 'mΩ', name: 'milliohm (mΩ)' },
    ],
    dimension: '[M][L]^2/[I]^2[T]^3',
  },
  capacitance: {
    label: 'Capacitance',
    description: 'Ability to store electric charge',
    symbols: ['C'],
    units: [
      { abbr: 'F', name: 'farad' },
      { abbr: 'uF', name: 'microfarad' },
      { abbr: 'nF', name: 'nanofarad' },
      { abbr: 'pF', name: 'picofarad' },
      { abbr: 'mF', name: 'millifarad' },
    ],
    dimension: '[I]^2[T]^4/[M][L]^2',
  },
  inductance: {
    label: 'Inductance',
    description: 'Opposition to current change, coils',
    symbols: ['L', 'H'],
    units: [
      { abbr: 'H', name: 'henry' },
      { abbr: 'mH', name: 'millihenry' },
      { abbr: 'uH', name: 'microhenry' },
      { abbr: 'nH', name: 'nanohenry' },
    ],
    dimension: '[M][L]^2/[I]^2[T]^2',
  },
  dimensionless: {
    label: 'Dimensionless',
    description: 'Ratios, counts, coefficients',
    symbols: ['n', 'k', 'C', 'K', 'eta', 'mu', 'nu'],
    units: [
      { abbr: '1', name: 'unitless' },
      { abbr: '-', name: 'no unit' },
      { abbr: 'ratio', name: 'ratio' },
    ],
    dimension: '[1]',
  },
};

// Unit to type mapping for reverse inference
export const UNIT_TO_TYPE: Record<string, string> = {};
// Build reverse mapping
Object.entries(QUANTITY_TYPES).forEach(([typeKey, typeData]) => {
  typeData.units.forEach(unitInfo => {
    // Normalize unit abbreviation for lookup (lowercase)
    const normalizedUnit = unitInfo.abbr.toLowerCase();
    if (!UNIT_TO_TYPE[normalizedUnit]) {
      UNIT_TO_TYPE[normalizedUnit] = typeKey;
    }
  });
});

// Compound unit to type mapping (dimensional analysis)
// Format: pattern -> type mapping based on dimensional formula
export const COMPOUND_UNIT_PATTERNS: Array<{pattern: RegExp; type: string; priority: number}> = [
  // Force: M·L/T² (kg·m/s², N)
  { pattern: /kg[·*]m\/s[²^2]|kg[·*]m[·*]s\^-2/i, type: 'force', priority: 10 },
  // Energy: M·L²/T² (kg·m²/s², J)
  { pattern: /kg[·*]m[²^2]\/s[²^2]|kg[·*]m\^2[·*]s\^-2/i, type: 'energy', priority: 10 },
  // Power: M·L²/T³ (kg·m²/s³, W)
  { pattern: /kg[·*]m[²^2]\/s[³^3]|kg[·*]m\^2[·*]s\^-3/i, type: 'power', priority: 10 },
  // Pressure: M/(L·T²) (kg/m·s², Pa)
  { pattern: /kg\/m[·*]s[²^2]|kg[·*]m\^-1[·*]s\^-2/i, type: 'pressure', priority: 10 },
  // Voltage: M·L²/(I·T³) (kg·m²/A·s³, V)
  { pattern: /kg[·*]m[²^2]\/a[·*]s[³^3]/i, type: 'voltage', priority: 10 },
  // Resistance: M·L²/(I²·T³) (kg·m²/A²·s³, Ω)
  { pattern: /kg[·*]m[²^2]\/a[²^2][·*]s[³^3]/i, type: 'resistance', priority: 10 },
  // Moment/Torque: M·L²/T² but written as N·m
  { pattern: /n[·*]m|lbf[·*]ft/i, type: 'moment', priority: 9 },
  // Velocity: L/T (m/s, km/h) - must NOT have mass component
  { pattern: /^(m|km|cm|mm|ft|mi)\/s$/i, type: 'velocity', priority: 8 },
  { pattern: /^(m|km|cm|mm|ft|mi)\/(s|h|hr|min)$/i, type: 'velocity', priority: 7 },
  // Angular velocity: angle/T
  { pattern: /^(rad|deg|°)\/s$/i, type: 'angular_velocity', priority: 8 },
  // Acceleration: L/T² - must NOT have mass component
  { pattern: /^(m|km|cm|mm|ft)\/s[²^2]$/i, type: 'acceleration', priority: 8 },
  { pattern: /^(m|cm|ft)[·*]s\^-2$/i, type: 'acceleration', priority: 8 },
  // Frequency: 1/T
  { pattern: /^1\/s$|^s\^-1$/i, type: 'frequency', priority: 8 },
  // Area: L² (must not have / in it)
  { pattern: /^(m|km|cm|mm|ft|in)[²^2]$/i, type: 'area', priority: 7 },
  // Volume: L³
  { pattern: /^(m|km|cm|mm|ft)[³^3]$/i, type: 'volume', priority: 7 },
  // Density: M/L³
  { pattern: /kg\/(m|cm)[³^3]|g\/(cm|ml)/i, type: 'density', priority: 8 },
];

// Infer type from unit string (bidirectional inference with dimensional analysis)

export function inferTypeFromUnit(unitStr: string): string | null {
  if (!unitStr) return null;

  // Normalize: replace · with *, handle superscripts
  const normalized = unitStr.trim()
    .replace(/·/g, '*')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
  const lowerNorm = normalized.toLowerCase();

  // Direct match in simple unit lookup
  if (UNIT_TO_TYPE[lowerNorm]) {
    return UNIT_TO_TYPE[lowerNorm];
  }

  // Check compound unit patterns (sorted by priority)
  const sortedPatterns = [...COMPOUND_UNIT_PATTERNS].sort((a, b) => b.priority - a.priority);
  for (const { pattern, type } of sortedPatterns) {
    if (pattern.test(normalized) || pattern.test(lowerNorm)) {
      return type;
    }
  }

  // Fallback heuristics for edge cases
  // Has mass (kg/g) AND time denominator squared -> likely force/energy/power
  if (/kg|^g$/i.test(lowerNorm)) {
    if (/\/s\^2|s\^-2/i.test(lowerNorm)) {
      // Check for length^2 -> energy, length^1 -> force
      if (/m\^2|m²/i.test(lowerNorm)) return 'energy';
      if (/m[^²^]|m$/i.test(lowerNorm)) return 'force';
    }
    if (/\/s\^3|s\^-3/i.test(lowerNorm)) return 'power';
  }

  // Pure acceleration (no mass, has L/T²)
  if (!/kg|^g$/i.test(lowerNorm) && /\/s\^2|s\^-2/i.test(lowerNorm)) {
    return 'acceleration';
  }

  // Pure velocity (no mass, has L/T)
  if (!/kg|^g$/i.test(lowerNorm) && /\/(s|h|hr|min)$/i.test(lowerNorm)) {
    return 'velocity';
  }

  return null;
}

// Get next available symbol with subscript
export function getNextSymbol(baseSymbol: string, existingSymbols: string[]): string {
  // Check if base symbol is available
  if (!existingSymbols.includes(baseSymbol)) {
    return baseSymbol;
  }

  // Try subscript versions: m_1, m_2, etc.
  for (let i = 1; i <= 99; i++) {
    const candidate = `${baseSymbol}_${i}`;
    if (!existingSymbols.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback with timestamp
  return `${baseSymbol}_${Date.now() % 1000}`;
}

// Generate symbol suggestions for a type
export function getSymbolSuggestions(typeKey: string, existingSymbols: string[]): string[] {
  const typeData = QUANTITY_TYPES[typeKey];
  if (!typeData) return ['x'];

  const suggestions: string[] = [];

  for (const baseSymbol of typeData.symbols) {
    const nextAvailable = getNextSymbol(baseSymbol, existingSymbols);
    if (!suggestions.includes(nextAvailable)) {
      suggestions.push(nextAvailable);
    }
    // Also add the base if different
    if (nextAvailable !== baseSymbol && !existingSymbols.includes(baseSymbol)) {
      suggestions.push(baseSymbol);
    }
  }

  return suggestions.slice(0, 6); // Limit to 6 suggestions
}

// Given Node Editor - Smart type-first selection

export const VARIABLE_ALIASES: Record<string, string[]> = {
  // Acceleration variants
  'a': ['g', 'acceleration', 'accel'],
  'g': ['a', 'gravity', 'accel'],
  // Velocity variants
  'v': ['u', 'velocity', 'speed', 'vel'],
  'u': ['v', 'v0', 'v_0', 'initial_v'],
  // Force variants
  'F': ['force', 'f'],
  // Mass variants
  'm': ['mass', 'M'],
  // Distance/displacement variants
  'd': ['s', 'x', 'distance', 'displacement'],
  's': ['d', 'x', 'distance', 'displacement'],
  // Time variants
  't': ['time', 'T'],
  // Height variants
  'h': ['height', 'H', 'z'],
  // Energy variants
  'E': ['energy', 'E_k', 'E_p', 'KE', 'PE'],
  'E_k': ['KE', 'kinetic_energy'],
  'E_p': ['PE', 'potential_energy', 'U'],
  // Work and weight both use W - context dependent
  'W': ['work', 'weight'],
  // Power
  'P': ['power', 'pressure'],
  // Electrical
  'V': ['voltage', 'U', 'emf'],
  'I': ['current', 'i'],
  'R': ['resistance', 'r'],
};

// Common equation templates organized by category

export interface EquationTemplate {
  name: string;
  latex: string;
  sympy: string;
  variables: string[];
  description: string;
}

export interface EquationCategory {
  name: string;
  equations: EquationTemplate[];
}

export const EQUATION_TEMPLATES: EquationCategory[] = [
  {
    name: 'Mechanics',
    equations: [
      { name: "Newton's 2nd Law", latex: 'F = m \\cdot a', sympy: 'F = m * a', variables: ['F', 'm', 'a'], description: 'Force equals mass times acceleration' },
      { name: 'Weight', latex: 'W = m \\cdot g', sympy: 'W = m * g', variables: ['W', 'm', 'g'], description: 'Weight from mass and gravity' },
      { name: 'Kinetic Energy', latex: 'E_k = \\frac{1}{2} m v^2', sympy: 'E_k = (1/2) * m * v**2', variables: ['E_k', 'm', 'v'], description: 'Energy of motion' },
      { name: 'Potential Energy', latex: 'E_p = m \\cdot g \\cdot h', sympy: 'E_p = m * g * h', variables: ['E_p', 'm', 'g', 'h'], description: 'Gravitational potential energy' },
      { name: 'Work', latex: 'W = F \\cdot d', sympy: 'W = F * d', variables: ['W', 'F', 'd'], description: 'Work equals force times distance' },
      { name: 'Power', latex: 'P = \\frac{W}{t}', sympy: 'P = W / t', variables: ['P', 'W', 't'], description: 'Power is work over time' },
      { name: 'Momentum', latex: 'p = m \\cdot v', sympy: 'p = m * v', variables: ['p', 'm', 'v'], description: 'Linear momentum' },
    ]
  },
  {
    name: 'Kinematics',
    equations: [
      { name: 'Velocity', latex: 'v = \\frac{d}{t}', sympy: 'v = d / t', variables: ['v', 'd', 't'], description: 'Speed equals distance over time' },
      { name: 'Acceleration', latex: 'a = \\frac{\\Delta v}{t}', sympy: 'a = delta_v / t', variables: ['a', 'delta_v', 't'], description: 'Rate of velocity change' },
      { name: 'SUVAT: v²', latex: 'v^2 = u^2 + 2as', sympy: 'v**2 = u**2 + 2*a*s', variables: ['v', 'u', 'a', 's'], description: 'Final velocity squared' },
      { name: 'SUVAT: s', latex: 's = ut + \\frac{1}{2}at^2', sympy: 's = u*t + (1/2)*a*t**2', variables: ['s', 'u', 't', 'a'], description: 'Displacement with constant acceleration' },
    ]
  },
  {
    name: 'Pressure & Fluids',
    equations: [
      { name: 'Pressure', latex: 'P = \\frac{F}{A}', sympy: 'P = F / A', variables: ['P', 'F', 'A'], description: 'Pressure is force per area' },
      { name: 'Hydrostatic', latex: 'P = \\rho g h', sympy: 'P = rho * g * h', variables: ['P', 'rho', 'g', 'h'], description: 'Pressure from fluid depth' },
      { name: 'Density', latex: '\\rho = \\frac{m}{V}', sympy: 'rho = m / V', variables: ['rho', 'm', 'V'], description: 'Mass per unit volume' },
    ]
  },
  {
    name: 'Thermal',
    equations: [
      { name: 'Heat Transfer', latex: 'Q = m c \\Delta T', sympy: 'Q = m * c * delta_T', variables: ['Q', 'm', 'c', 'delta_T'], description: 'Heat from temperature change' },
      { name: 'Ideal Gas', latex: 'PV = nRT', sympy: 'P * V = n * R * T', variables: ['P', 'V', 'n', 'R', 'T'], description: 'Ideal gas law' },
    ]
  },
  {
    name: 'Electrical',
    equations: [
      { name: "Ohm's Law", latex: 'V = I \\cdot R', sympy: 'V = I * R', variables: ['V', 'I', 'R'], description: 'Voltage equals current times resistance' },
      { name: 'Power (P=IV)', latex: 'P = I \\cdot V', sympy: 'P = I * V', variables: ['P', 'I', 'V'], description: 'Electrical power' },
      { name: 'Power (P=I²R)', latex: 'P = I^2 R', sympy: 'P = I**2 * R', variables: ['P', 'I', 'R'], description: 'Power from current and resistance' },
    ]
  },
  {
    name: 'Geometry',
    equations: [
      { name: 'Circle Area', latex: 'A = \\pi r^2', sympy: 'A = pi * r**2', variables: ['A', 'r'], description: 'Area of a circle' },
      { name: 'Sphere Volume', latex: 'V = \\frac{4}{3} \\pi r^3', sympy: 'V = (4/3) * pi * r**3', variables: ['V', 'r'], description: 'Volume of a sphere' },
      { name: 'Pythagorean', latex: 'c^2 = a^2 + b^2', sympy: 'c**2 = a**2 + b**2', variables: ['c', 'a', 'b'], description: 'Right triangle relationship' },
    ]
  },
];

// extractVariables is imported from ../../utils/mathParsing (supports implicit multiplication)

// Score how well an equation template matches available symbols
// Returns a score object with match count and semantic bonus
export interface EquationMatchScore {
  template: EquationTemplate;
  matchedVars: string[];
  totalVars: number;
  matchRatio: number;
  semanticBonus: number;  // Bonus for meaningful variable combinations
  totalScore: number;
  category: string;
}

// Common physics constant values for semantic matching
export const KNOWN_CONSTANTS: Record<string, { value: number; tolerance: number; meaning: string }> = {
  g: { value: 9.80665, tolerance: 0.1, meaning: 'gravity' },
  G: { value: 6.674e-11, tolerance: 1e-12, meaning: 'gravitational constant' },
  c: { value: 299792458, tolerance: 1000, meaning: 'speed of light' },
  R: { value: 8.314, tolerance: 0.01, meaning: 'gas constant' },
  k_B: { value: 1.381e-23, tolerance: 1e-25, meaning: 'Boltzmann constant' },
};

// Semantic groupings that suggest related equations
export const SEMANTIC_GROUPS: Array<{ vars: string[]; suggestCategories: string[]; bonus: number }> = [
  { vars: ['m', 'a'], suggestCategories: ['Mechanics'], bonus: 2 },
  { vars: ['m', 'g'], suggestCategories: ['Mechanics'], bonus: 2 },
  { vars: ['m', 'v'], suggestCategories: ['Mechanics', 'Kinematics'], bonus: 1.5 },
  { vars: ['F', 'A'], suggestCategories: ['Pressure & Fluids'], bonus: 2 },
  { vars: ['V', 'I'], suggestCategories: ['Electrical'], bonus: 2 },
  { vars: ['V', 'I', 'R'], suggestCategories: ['Electrical'], bonus: 3 },
  { vars: ['P', 'V', 'T'], suggestCategories: ['Thermal'], bonus: 2 },
  { vars: ['u', 't', 'a'], suggestCategories: ['Kinematics'], bonus: 2 },
  { vars: ['v', 't', 'a'], suggestCategories: ['Kinematics'], bonus: 2 },
  { vars: ['r'], suggestCategories: ['Geometry'], bonus: 1 },
  { vars: ['h'], suggestCategories: ['Mechanics', 'Pressure & Fluids'], bonus: 1 },
];


export function scoreEquationMatch(
  template: EquationTemplate,
  category: string,
  availableSymbols: Array<{ symbol: string; value: number; unit?: string }>
): EquationMatchScore {
  const symbolSet = new Set(availableSymbols.map(s => s.symbol.toLowerCase()));
  const symbolValues = new Map(availableSymbols.map(s => [s.symbol.toLowerCase(), s.value]));

  // Count direct matches and alias matches
  const matchedVars: string[] = [];
  for (const v of template.variables) {
    const vLower = v.toLowerCase();
    // Direct match
    if (symbolSet.has(vLower)) {
      matchedVars.push(v);
      continue;
    }
    // Check aliases
    const aliases = VARIABLE_ALIASES[v] || [];
    for (const alias of aliases) {
      if (symbolSet.has(alias.toLowerCase())) {
        matchedVars.push(v);
        break;
      }
    }
  }

  const matchRatio = matchedVars.length / template.variables.length;

  // Calculate semantic bonus
  let semanticBonus = 0;
  const availableVarSet = new Set(availableSymbols.map(s => s.symbol.toLowerCase()));

  for (const group of SEMANTIC_GROUPS) {
    const groupVarsPresent = group.vars.filter(v => availableVarSet.has(v.toLowerCase()));
    if (groupVarsPresent.length >= 2 && group.suggestCategories.includes(category)) {
      semanticBonus += group.bonus * (groupVarsPresent.length / group.vars.length);
    }
  }

  // Check for known physical constants
  for (const [constSymbol, constInfo] of Object.entries(KNOWN_CONSTANTS)) {
    const constValue = symbolValues.get(constSymbol.toLowerCase());
    if (constValue !== undefined) {
      if (Math.abs(constValue - constInfo.value) < constInfo.tolerance) {
        // This variable looks like the known constant, boost related equations
        if (template.variables.includes(constSymbol)) {
          semanticBonus += 1;
        }
      }
    }
  }

  // Total score: weighted combination
  const totalScore = (matchRatio * 10) + semanticBonus + (matchedVars.length >= 2 ? 2 : 0);

  return {
    template,
    matchedVars,
    totalVars: template.variables.length,
    matchRatio,
    semanticBonus,
    totalScore,
    category,
  };
}

// Get suggested equations based on available symbols
export function getSuggestedEquations(
  availableSymbols: Array<{ symbol: string; value: number; unit?: string }>
): EquationMatchScore[] {
  if (availableSymbols.length === 0) return [];

  const scores: EquationMatchScore[] = [];

  for (const cat of EQUATION_TEMPLATES) {
    for (const eq of cat.equations) {
      const score = scoreEquationMatch(eq, cat.name, availableSymbols);
      // Only include if at least some variables match
      if (score.matchedVars.length > 0) {
        scores.push(score);
      }
    }
  }

  // Sort by total score descending
  scores.sort((a, b) => b.totalScore - a.totalScore);

  // Return top suggestions
  return scores.slice(0, 5);
}

// Equation Node Editor - Smart with templates and variable mapping

export function getEquationLHS(sympy: string): string | null {
  const match = sympy.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
  return match ? match[1] : null;
}

// Solve Goal Node Editor - Smart with equation/variable awareness

export function getProvenance(node: WorksheetNode) {
  switch (node.type) {
    case 'text':
    case 'given':
    case 'equation':
    case 'constraint':
    case 'solve_goal':
    case 'result':
    case 'plot':
      return node.provenance;
    default:
      return { type: 'user' as const, timestamp: '' };
  }
}

export function getVerification(node: WorksheetNode) {
  switch (node.type) {
    case 'text':
    case 'given':
    case 'equation':
    case 'constraint':
    case 'solve_goal':
    case 'result':
    case 'plot':
      return node.verification;
    default:
      return { status: 'unverified' as const };
  }
}

export function formatUnitLatex(unit: string): string {
  return unit
    // Wrap exponents in braces: ^2 → ^{2}, ^-1 → ^{-1}
    .replace(/\^(-?\d+)/g, '^{$1}')
    // Replace * with \cdot for multiplication
    .replace(/\*/g, '{\\cdot}');
}

// ============ Result Node with Representation Toggle ============

export interface ResultNodeContentProps {
  symbol: string;
  value: number;
  unit?: string;
  symbolicForm?: string;
  latex?: string;
}

export const REPRESENTATION_LABELS: Record<NumberRepresentation, string> = {
  decimal: 'Dec',
  scientific: 'Sci',
  engineering: 'Eng',
  fraction: 'Frac',
};

export const REPRESENTATION_ORDER: NumberRepresentation[] = ['decimal', 'scientific', 'engineering', 'fraction'];

export interface GivenNodeContentProps {
  node: GivenNode;
}

export interface AnnotationNodeContentProps {
  node: AnnotationNode;
}
