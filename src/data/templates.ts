/**
 * Worksheet Templates - Pre-built calculation starting points
 *
 * Each template defines a set of nodes that form a complete
 * engineering calculation. Users create a copy to work from.
 */

import type { WorksheetNode } from '../types/document';

/** Distributive Omit that works across discriminated unions */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A template node is a WorksheetNode without runtime-assigned fields */
export type TemplateNodeData = DistributiveOmit<
  WorksheetNode,
  'id' | 'provenance' | 'verification' | 'dependencies' | 'dependents' | 'assumptions'
>;

export interface WorksheetTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  tags: string[];
  nodes: TemplateNodeData[];
}

export type TemplateCategory = 'structural' | 'mechanical' | 'electrical' | 'general';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string }> = {
  structural: { label: 'Structural', icon: '🏗️' },
  mechanical: { label: 'Mechanical', icon: '⚙️' },
  electrical: { label: 'Electrical', icon: '⚡' },
  general: { label: 'General', icon: '📐' },
};

export const TEMPLATES: WorksheetTemplate[] = [
  // --- Structural Engineering ---
  {
    id: 'simply-supported-beam',
    name: 'Simply Supported Beam',
    category: 'structural',
    description: 'Calculate deflection and bending stress for a simply supported beam with uniform load.',
    tags: ['beam', 'deflection', 'stress', 'structural'],
    nodes: [
      {
        type: 'text',
        content: '## Simply Supported Beam Analysis\nUniform load on a simply supported beam. Calculates maximum deflection and bending stress.',
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'L',
        latex: 'L',
        value: { value: 5, unit: { expression: 'm' } },
        description: 'Beam span length',
        position: { x: 40, y: 160 },
      },
      {
        type: 'given',
        symbol: 'w',
        latex: 'w',
        value: { value: 10, unit: { expression: 'kN/m' } },
        description: 'Uniform distributed load',
        position: { x: 40, y: 240 },
      },
      {
        type: 'given',
        symbol: 'E',
        latex: 'E',
        value: { value: 200, unit: { expression: 'GPa' } },
        description: 'Modulus of elasticity (steel)',
        position: { x: 40, y: 320 },
      },
      {
        type: 'given',
        symbol: 'I',
        latex: 'I',
        value: { value: 8.356e-5, unit: { expression: 'm^4' } },
        description: 'Second moment of area',
        position: { x: 40, y: 400 },
      },
      {
        type: 'equation',
        latex: 'M_{max} = \\frac{w \\cdot L^2}{8}',
        sympy: 'w * L**2 / 8',
        lhs: 'M_max',
        rhs: 'w * L**2 / 8',
        position: { x: 40, y: 500 },
      },
      {
        type: 'equation',
        latex: '\\delta_{max} = \\frac{5 \\cdot w \\cdot L^4}{384 \\cdot E \\cdot I}',
        sympy: '5 * w * L**4 / (384 * E * I)',
        lhs: 'delta_max',
        rhs: '5 * w * L**4 / (384 * E * I)',
        position: { x: 40, y: 580 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'M_max',
        method: 'symbolic',
        position: { x: 40, y: 660 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'delta_max',
        method: 'symbolic',
        position: { x: 40, y: 740 },
      },
    ],
  },

  {
    id: 'euler-column-buckling',
    name: 'Euler Column Buckling',
    category: 'structural',
    description: 'Critical buckling load for a slender column using Euler formula.',
    tags: ['column', 'buckling', 'euler', 'structural'],
    nodes: [
      {
        type: 'text',
        content: '## Euler Column Buckling\nCritical load for elastic buckling of a slender column.',
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'L',
        latex: 'L',
        value: { value: 3, unit: { expression: 'm' } },
        description: 'Column length',
        position: { x: 40, y: 140 },
      },
      {
        type: 'given',
        symbol: 'E',
        latex: 'E',
        value: { value: 200, unit: { expression: 'GPa' } },
        description: 'Modulus of elasticity',
        position: { x: 40, y: 220 },
      },
      {
        type: 'given',
        symbol: 'I',
        latex: 'I',
        value: { value: 1.45e-5, unit: { expression: 'm^4' } },
        description: 'Minimum moment of inertia',
        position: { x: 40, y: 300 },
      },
      {
        type: 'given',
        symbol: 'K',
        latex: 'K',
        value: { value: 1.0 },
        description: 'Effective length factor (1.0 = pinned-pinned)',
        position: { x: 40, y: 380 },
      },
      {
        type: 'equation',
        latex: 'P_{cr} = \\frac{\\pi^2 \\cdot E \\cdot I}{(K \\cdot L)^2}',
        sympy: 'pi**2 * E * I / (K * L)**2',
        lhs: 'P_cr',
        rhs: 'pi**2 * E * I / (K * L)**2',
        position: { x: 40, y: 480 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'P_cr',
        method: 'symbolic',
        position: { x: 40, y: 560 },
      },
    ],
  },

  // --- Mechanical Engineering ---
  {
    id: 'heat-conduction',
    name: 'Heat Conduction (1D)',
    category: 'mechanical',
    description: 'Steady-state 1D heat conduction through a flat wall using Fourier\'s law.',
    tags: ['heat transfer', 'conduction', 'thermal', 'fourier'],
    nodes: [
      {
        type: 'text',
        content: '## Steady-State Heat Conduction\nFourier\'s law for 1D heat conduction through a flat wall.',
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'k',
        latex: 'k',
        value: { value: 50, unit: { expression: 'W/(m*K)' } },
        description: 'Thermal conductivity',
        position: { x: 40, y: 140 },
      },
      {
        type: 'given',
        symbol: 'A',
        latex: 'A',
        value: { value: 1, unit: { expression: 'm^2' } },
        description: 'Cross-sectional area',
        position: { x: 40, y: 220 },
      },
      {
        type: 'given',
        symbol: 'dx',
        latex: '\\Delta x',
        value: { value: 0.1, unit: { expression: 'm' } },
        description: 'Wall thickness',
        position: { x: 40, y: 300 },
      },
      {
        type: 'given',
        symbol: 'T1',
        latex: 'T_1',
        value: { value: 100, unit: { expression: 'degC' } },
        description: 'Hot side temperature',
        position: { x: 40, y: 380 },
      },
      {
        type: 'given',
        symbol: 'T2',
        latex: 'T_2',
        value: { value: 25, unit: { expression: 'degC' } },
        description: 'Cold side temperature',
        position: { x: 40, y: 460 },
      },
      {
        type: 'equation',
        latex: 'Q = k \\cdot A \\cdot \\frac{T_1 - T_2}{\\Delta x}',
        sympy: 'k * A * (T1 - T2) / dx',
        lhs: 'Q',
        rhs: 'k * A * (T1 - T2) / dx',
        position: { x: 40, y: 560 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'Q',
        method: 'symbolic',
        position: { x: 40, y: 640 },
      },
    ],
  },

  {
    id: 'spring-design',
    name: 'Helical Spring Design',
    category: 'mechanical',
    description: 'Calculate spring constant and shear stress for a helical compression spring.',
    tags: ['spring', 'helical', 'shear stress', 'mechanical'],
    nodes: [
      {
        type: 'text',
        content: '## Helical Compression Spring\nSpring rate and maximum shear stress calculation.',
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'd',
        latex: 'd',
        value: { value: 5, unit: { expression: 'mm' } },
        description: 'Wire diameter',
        position: { x: 40, y: 140 },
      },
      {
        type: 'given',
        symbol: 'D',
        latex: 'D',
        value: { value: 40, unit: { expression: 'mm' } },
        description: 'Mean coil diameter',
        position: { x: 40, y: 220 },
      },
      {
        type: 'given',
        symbol: 'N_a',
        latex: 'N_a',
        value: { value: 10 },
        description: 'Number of active coils',
        position: { x: 40, y: 300 },
      },
      {
        type: 'given',
        symbol: 'G',
        latex: 'G',
        value: { value: 79.3, unit: { expression: 'GPa' } },
        description: 'Shear modulus (steel)',
        position: { x: 40, y: 380 },
      },
      {
        type: 'equation',
        latex: 'k = \\frac{G \\cdot d^4}{8 \\cdot D^3 \\cdot N_a}',
        sympy: 'G * d**4 / (8 * D**3 * N_a)',
        lhs: 'k_spring',
        rhs: 'G * d**4 / (8 * D**3 * N_a)',
        position: { x: 40, y: 480 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'k_spring',
        method: 'symbolic',
        position: { x: 40, y: 560 },
      },
    ],
  },

  // --- Electrical Engineering ---
  {
    id: 'rc-time-constant',
    name: 'RC Circuit Time Constant',
    category: 'electrical',
    description: 'Calculate time constant, cutoff frequency, and voltage response of an RC circuit.',
    tags: ['RC', 'circuit', 'time constant', 'filter'],
    nodes: [
      {
        type: 'text',
        content: '## RC Circuit Analysis\nTime constant and frequency response of a series RC circuit.',
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'R',
        latex: 'R',
        value: { value: 10, unit: { expression: 'kohm' } },
        description: 'Resistance',
        position: { x: 40, y: 140 },
      },
      {
        type: 'given',
        symbol: 'C',
        latex: 'C',
        value: { value: 100, unit: { expression: 'nF' } },
        description: 'Capacitance',
        position: { x: 40, y: 220 },
      },
      {
        type: 'equation',
        latex: '\\tau = R \\cdot C',
        sympy: 'R * C',
        lhs: 'tau',
        rhs: 'R * C',
        position: { x: 40, y: 320 },
      },
      {
        type: 'equation',
        latex: 'f_c = \\frac{1}{2\\pi \\cdot R \\cdot C}',
        sympy: '1 / (2 * pi * R * C)',
        lhs: 'f_c',
        rhs: '1 / (2 * pi * R * C)',
        position: { x: 40, y: 400 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'tau',
        method: 'symbolic',
        position: { x: 40, y: 480 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'f_c',
        method: 'symbolic',
        position: { x: 40, y: 560 },
      },
    ],
  },

  // --- General ---
  {
    id: 'quadratic-solver',
    name: 'Quadratic Equation Solver',
    category: 'general',
    description: 'Solve ax² + bx + c = 0 using the quadratic formula.',
    tags: ['quadratic', 'algebra', 'roots', 'general'],
    nodes: [
      {
        type: 'text',
        content: '## Quadratic Equation Solver\nSolve ax² + bx + c = 0',
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'a',
        latex: 'a',
        value: { value: 1 },
        description: 'Coefficient a',
        position: { x: 40, y: 140 },
      },
      {
        type: 'given',
        symbol: 'b',
        latex: 'b',
        value: { value: -5 },
        description: 'Coefficient b',
        position: { x: 40, y: 220 },
      },
      {
        type: 'given',
        symbol: 'c',
        latex: 'c',
        value: { value: 6 },
        description: 'Coefficient c',
        position: { x: 40, y: 300 },
      },
      {
        type: 'equation',
        latex: 'D = b^2 - 4ac',
        sympy: 'b**2 - 4*a*c',
        lhs: 'D',
        rhs: 'b**2 - 4*a*c',
        position: { x: 40, y: 400 },
      },
      {
        type: 'equation',
        latex: 'x_1 = \\frac{-b + \\sqrt{D}}{2a}',
        sympy: '(-b + sqrt(D)) / (2*a)',
        lhs: 'x_1',
        rhs: '(-b + sqrt(D)) / (2*a)',
        position: { x: 40, y: 480 },
      },
      {
        type: 'equation',
        latex: 'x_2 = \\frac{-b - \\sqrt{D}}{2a}',
        sympy: '(-b - sqrt(D)) / (2*a)',
        lhs: 'x_2',
        rhs: '(-b - sqrt(D)) / (2*a)',
        position: { x: 40, y: 560 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'D',
        method: 'symbolic',
        position: { x: 40, y: 640 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'x_1',
        method: 'symbolic',
        position: { x: 40, y: 720 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'x_2',
        method: 'symbolic',
        position: { x: 40, y: 800 },
      },
    ],
  },

  {
    id: 'ohms-law',
    name: "Ohm's Law Calculator",
    category: 'electrical',
    description: 'Basic voltage, current, resistance, and power calculations.',
    tags: ['ohm', 'voltage', 'current', 'power', 'electrical'],
    nodes: [
      {
        type: 'text',
        content: "## Ohm's Law & Power\nV = IR and P = VI relationships.",
        format: 'markdown',
        position: { x: 40, y: 40 },
      },
      {
        type: 'given',
        symbol: 'V',
        latex: 'V',
        value: { value: 12, unit: { expression: 'V' } },
        description: 'Voltage',
        position: { x: 40, y: 140 },
      },
      {
        type: 'given',
        symbol: 'R',
        latex: 'R',
        value: { value: 100, unit: { expression: 'ohm' } },
        description: 'Resistance',
        position: { x: 40, y: 220 },
      },
      {
        type: 'equation',
        latex: 'I = \\frac{V}{R}',
        sympy: 'V / R',
        lhs: 'I',
        rhs: 'V / R',
        position: { x: 40, y: 320 },
      },
      {
        type: 'equation',
        latex: 'P = V \\cdot I',
        sympy: 'V * I',
        lhs: 'P',
        rhs: 'V * I',
        position: { x: 40, y: 400 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'I',
        method: 'symbolic',
        position: { x: 40, y: 480 },
      },
      {
        type: 'solve_goal',
        target_symbol: 'P',
        method: 'symbolic',
        position: { x: 40, y: 560 },
      },
    ],
  },
];
