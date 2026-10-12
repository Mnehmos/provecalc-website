/**
 * Worksheet Templates - Pre-built calculation starting points
 *
 * Each template defines a set of nodes that form a complete
 * engineering calculation. Users create a copy to work from.
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodeId, Provenance, VerificationStatus, WorksheetDocument, WorksheetNode } from '../types/document';

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

/** Closing line of each worked template's problem statement. */
const HOW_TO = '\n\n*Double-click a **Solve** node and press **Solve Now**, then press **Verify** in the toolbar.*';

export const TEMPLATES: WorksheetTemplate[] = [
  // --- Guided tutorial (shown first) ---
  {
    id: 'cantilever-beam-tutorial',
    name: 'Cantilever Beam Tutorial',
    category: 'structural',
    description: 'A five-minute guided tour: solve a real beam deflection problem and learn every core feature.',
    tags: ['tutorial', 'beam', 'deflection', 'beginner'],
    nodes: [
      {
        type: 'text',
        content: '## Welcome to ProveCalc\n\nThis worksheet is a short, hands-on tour. You will solve a real problem: **the tip deflection of a cantilever beam with a point load at its free end**.\n\nWork down the page. Each box like this one explains the nodes just below it.\n\n**You will:**\n1. Read and edit **Given** values\n2. See how an **Equation** is checked for units\n3. **Solve** for the unknown\n4. **Verify** the whole worksheet\n5. **Export** a report',
        format: 'markdown',
      },
      {
        type: 'text',
        content: '## Step 1 · The problem\n\nA steel beam is fixed to a wall at one end and carries a load **P** at the other. Its length is **L**, its material stiffness is **E** (Young\'s modulus) and its cross-section stiffness is **I** (second moment of area). The deflection at the free end is\n\n$$\n\\delta_{max} = \\frac{P L^3}{3 E I}\n$$\n\nEvery symbol in that formula is a node in this worksheet.',
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: cantilever beam with an end load',
        content: '```text\n ///|                                  P\n ///|                                  |\n ///|                                  v\n ///|==================================o\n ///|                              free end\n ///|<-------------- L --------------->|\n  fixed\n  support\n```\n- **P**: load at the free end (N)\n- **L**: beam length (m)\n- **E**: Young\'s modulus of the material (GPa)\n- **I**: second moment of area of the section (cm⁴)',
        collapsed: false,
      },
      {
        type: 'text',
        content: '## Step 2 · Given values\n\nA **Given** is a known quantity: a symbol, a value and a unit. Units are checked and converted for you, so you can mix `kN`, `mm`, `GPa` and `cm**4` freely.\n\n**Try it:** double-click **P** and change it to `2000` N. Anything that depends on P is marked **stale** until you recalculate it.',
        format: 'markdown',
      },
      {
        type: 'given',
        symbol: 'P',
        value: { value: 1000, unit: { expression: 'N' } },
        description: 'Load at the free end',
      },
      {
        type: 'given',
        symbol: 'L',
        value: { value: 2, unit: { expression: 'm' } },
        description: 'Beam length',
      },
      {
        type: 'given',
        symbol: 'E',
        value: { value: 200, unit: { expression: 'GPa' } },
        description: "Young's modulus (structural steel)",
      },
      {
        type: 'given',
        symbol: 'I',
        value: { value: 800, unit: { expression: 'cm**4' } },
        description: 'Second moment of area',
      },
      {
        type: 'text',
        content: '## Step 3 · The equation\n\nAn **Equation** relates the quantities. You type it as plain math, for example `delta_max = P*L**3/(3*E*I)`, and ProveCalc typesets it and checks that the units on both sides agree. Use `*` to multiply, `/` to divide and `**` for powers.\n\nDouble-click the equation below to open its editor: it lists every variable and whether it is defined.',
        format: 'markdown',
      },
      {
        type: 'equation',
        latex: '\\delta_{max} = \\frac{P L^3}{3 E I}',
        lhs: 'delta_max',
        rhs: '(P*L**3)/(3*E*I)',
      },
      {
        type: 'text',
        content: '## Step 4 · Solve\n\nA **Solve** node names the quantity you want. Double-click the node below and press **Solve Now**. The answer appears beside it as a **Result**, with its unit.\n\nWith the values above you should get **δ_max ≈ 0.00167 m** (1.67 mm).',
        format: 'markdown',
      },
      {
        type: 'solve_goal',
        target_symbol: 'delta_max',
        method: 'symbolic',
      },
      {
        type: 'text',
        content: '## Step 5 · Verify\n\nPress **Verify** in the toolbar. ProveCalc checks every value and unit, checks that every equation is dimensionally consistent, and re-computes each result from the current inputs.\n\nEach node then shows a status dot on its left edge: **green** verified, **amber** not fully checked, **red** failed. Hover over a dot to see the reason.',
        format: 'markdown',
      },
      {
        type: 'text',
        content: '## Step 6 · Export\n\n- **PDF Report**: a formal calculation report that states the status of every value and equation\n- **HTML**: a self-contained page you can share\n- **Export**: saves the worksheet as a file you can reopen later with **Open**',
        format: 'markdown',
      },
      {
        type: 'text',
        content: '## Next steps\n\n- **Templates** (toolbar): start from a worked engineering problem\n- **Library**: insert standard equations and physical constants\n- **AI**: describe a problem in words and review the nodes it proposes (uses your own OpenRouter key; see **Settings** in the AI panel)\n- Right-click the grid to add nodes, or choose **Tidy Layout** to line them up\n\nReady for your own problem? Press **New**, or change the values above and solve again.',
        format: 'markdown',
      },
    ],
  },

  {
    id: 'projectile-motion-tutorial',
    name: 'Projectile Motion',
    category: 'general',
    description: 'Range, maximum height and flight time of a projectile launched at an angle.',
    tags: ['projectile', 'kinematics', 'physics', 'beginner'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA projectile leaves the ground at speed **v₀** and angle **θ** above the horizontal. Ignoring air resistance, find its **range**, **maximum height** and **time of flight**.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: projectile trajectory',
        content: '```text\n                 _ - - - _\n             _ -     |     - _\n          _-         | H       -_\n        /            |           \\\n   v0  / theta       |            \\\n  ----o--------------+-------------o----\n    launch                       landing\n      |<------------ R ----------->|\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'v_0',
        value: { value: 50, unit: { expression: 'm/s' } },
        description: 'Launch speed',
      },
      {
        type: 'given',
        symbol: 'theta',
        value: { value: 45, unit: { expression: 'deg' } },
        description: 'Launch angle above horizontal',
      },
      {
        type: 'given',
        symbol: 'g',
        value: { value: 9.81, unit: { expression: 'm/s**2' } },
        description: 'Gravitational acceleration',
      },
      {
        type: 'equation',
        latex: 'R = \\frac{v_0^2 \\sin(2\\theta)}{g}',
        lhs: 'R',
        rhs: 'v_0**2 * sin(2*theta) / g',
      },
      {
        type: 'equation',
        latex: 'H = \\frac{v_0^2 \\sin^2(\\theta)}{2g}',
        lhs: 'H',
        rhs: 'v_0**2 * sin(theta)**2 / (2*g)',
      },
      {
        type: 'equation',
        latex: 'T = \\frac{2 v_0 \\sin(\\theta)}{g}',
        lhs: 'T',
        rhs: '2*v_0*sin(theta) / g',
      },
      { type: 'solve_goal', target_symbol: 'R', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'H', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'T', method: 'symbolic' },
    ],
  },

  // --- Mechanical ---
  {
    id: 'pipe-pressure-drop',
    name: 'Pipe Pressure Drop',
    category: 'mechanical',
    description: 'Darcy–Weisbach pressure drop for water flowing through a straight pipe.',
    tags: ['fluid', 'pipe', 'pressure', 'darcy'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nWater flows at speed **v** through a straight pipe of diameter **D** and length **L**. With a Darcy friction factor **f_d**, find the **pressure drop** along the pipe.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: pipe section',
        content: '```text\n    P1                              P2\n     |                               |\n  ===+===============================+===\n     |   -->   v   -->   v   -->     |  D\n  ===+===============================+===\n     |<------------- L ------------->|\n```\nThe pressure drop is P1 − P2.',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'f_d',
        value: { value: 0.02 },
        description: 'Darcy friction factor (from the Moody chart)',
      },
      {
        type: 'given',
        symbol: 'L',
        value: { value: 100, unit: { expression: 'm' } },
        description: 'Pipe length',
      },
      {
        type: 'given',
        symbol: 'D',
        value: { value: 100, unit: { expression: 'mm' } },
        description: 'Pipe inner diameter',
      },
      {
        type: 'given',
        symbol: 'v',
        value: { value: 2, unit: { expression: 'm/s' } },
        description: 'Mean flow velocity',
      },
      {
        type: 'given',
        symbol: 'rho',
        value: { value: 1000, unit: { expression: 'kg/m**3' } },
        description: 'Density of water',
      },
      {
        type: 'equation',
        latex: '\\Delta P = f_d \\, \\frac{L}{D} \\, \\frac{\\rho v^2}{2}',
        lhs: 'Delta_P',
        rhs: 'f_d * (L/D) * (rho * v**2 / 2)',
      },
      { type: 'solve_goal', target_symbol: 'Delta_P', method: 'symbolic' },
    ],
  },

  // --- Structural ---
  {
    id: 'simply-supported-beam',
    name: 'Simply Supported Beam',
    category: 'structural',
    description: 'Maximum bending moment, bending stress and deflection under a uniform load.',
    tags: ['beam', 'deflection', 'stress', 'structural'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA steel beam spans **L** between a pin and a roller and carries a uniform load **w**. Find the **maximum bending moment**, the **maximum bending stress** and the **midspan deflection**.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: simply supported beam with a uniform load',
        content: '```text\n          w (load per unit length)\n   | | | | | | | | | | | | | | | |\n   v v v v v v v v v v v v v v v v\n   ===============================\n   ^                             o\n  pin                         roller\n   |<------------- L ----------->|\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'L',
        value: { value: 5, unit: { expression: 'm' } },
        description: 'Span',
      },
      {
        type: 'given',
        symbol: 'w',
        value: { value: 10, unit: { expression: 'kN/m' } },
        description: 'Uniform load',
      },
      {
        type: 'given',
        symbol: 'E',
        value: { value: 200, unit: { expression: 'GPa' } },
        description: "Young's modulus (steel)",
      },
      {
        type: 'given',
        symbol: 'I',
        value: { value: 8356, unit: { expression: 'cm**4' } },
        description: 'Second moment of area',
      },
      {
        type: 'given',
        symbol: 'c',
        value: { value: 150, unit: { expression: 'mm' } },
        description: 'Distance from the neutral axis to the extreme fibre',
      },
      {
        type: 'equation',
        latex: 'M_{max} = \\frac{w L^2}{8}',
        lhs: 'M_max',
        rhs: 'w * L**2 / 8',
      },
      {
        type: 'equation',
        latex: '\\sigma_{max} = \\frac{M_{max} \\, c}{I}',
        lhs: 'sigma_max',
        rhs: 'M_max * c / I',
      },
      {
        type: 'equation',
        latex: '\\delta_{max} = \\frac{5 w L^4}{384 E I}',
        lhs: 'delta_max',
        rhs: '5 * w * L**4 / (384 * E * I)',
      },
      { type: 'solve_goal', target_symbol: 'M_max', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'sigma_max', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'delta_max', method: 'symbolic' },
    ],
  },

  {
    id: 'euler-column-buckling',
    name: 'Euler Column Buckling',
    category: 'structural',
    description: 'Critical elastic buckling load of a slender column.',
    tags: ['column', 'buckling', 'euler', 'structural'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA slender steel column of length **L** is pinned at both ends. Find the **critical load** at which it buckles elastically (Euler\'s formula, valid for slender columns that stay elastic).' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: pinned–pinned column',
        content: '```text\n        | P\n        v\n       _o_   pin\n        |\n        |\n        |    L\n        |\n        |\n       _o_   pin\n       ///\n```\nEffective length factor K: 1.0 pinned–pinned, 0.5 fixed–fixed, 2.0 fixed–free.',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'L',
        value: { value: 3, unit: { expression: 'm' } },
        description: 'Column length',
      },
      {
        type: 'given',
        symbol: 'E',
        value: { value: 200, unit: { expression: 'GPa' } },
        description: "Young's modulus (steel)",
      },
      {
        type: 'given',
        symbol: 'I',
        value: { value: 1450, unit: { expression: 'cm**4' } },
        description: 'Smallest second moment of area',
      },
      {
        type: 'given',
        symbol: 'K',
        value: { value: 1.0 },
        description: 'Effective length factor (1.0 = pinned–pinned)',
      },
      {
        type: 'equation',
        latex: 'P_{cr} = \\frac{\\pi^2 E I}{(K L)^2}',
        lhs: 'P_cr',
        rhs: 'pi**2 * E * I / (K * L)**2',
      },
      { type: 'solve_goal', target_symbol: 'P_cr', method: 'symbolic' },
    ],
  },

  {
    id: 'heat-conduction',
    name: 'Heat Conduction (1D)',
    category: 'mechanical',
    description: "Steady heat flow through a flat wall with Fourier's law.",
    tags: ['heat transfer', 'conduction', 'thermal', 'fourier'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA flat wall of thickness **Δx** and area **A** separates a hot side at **T₁** from a cold side at **T₂**. Find the steady **heat flow** through it.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: heat flow through a wall',
        content: '```text\n          |<-- dx -->|\n          |//////////|\n   T1     |//////////|     T2\n   hot    |//wall////|    cold\n          |//////////|\n     Q  --------------->\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'k',
        value: { value: 50, unit: { expression: 'W/(m*K)' } },
        description: 'Thermal conductivity (carbon steel)',
      },
      {
        type: 'given',
        symbol: 'A',
        value: { value: 1, unit: { expression: 'm**2' } },
        description: 'Wall area',
      },
      {
        type: 'given',
        symbol: 'dx',
        latex: '\\Delta x',
        value: { value: 100, unit: { expression: 'mm' } },
        description: 'Wall thickness',
      },
      {
        type: 'given',
        symbol: 'T_1',
        value: { value: 100, unit: { expression: 'degC' } },
        description: 'Hot side temperature',
      },
      {
        type: 'given',
        symbol: 'T_2',
        value: { value: 25, unit: { expression: 'degC' } },
        description: 'Cold side temperature',
      },
      {
        type: 'equation',
        latex: 'Q = k A \\, \\frac{T_1 - T_2}{\\Delta x}',
        lhs: 'Q',
        rhs: 'k * A * (T_1 - T_2) / dx',
      },
      { type: 'solve_goal', target_symbol: 'Q', method: 'symbolic' },
    ],
  },

  {
    id: 'spring-design',
    name: 'Helical Spring Design',
    category: 'mechanical',
    description: 'Spring rate, spring index and Wahl-corrected shear stress of a compression spring.',
    tags: ['spring', 'helical', 'shear stress', 'mechanical'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA helical compression spring is wound from steel wire. Find its **spring rate**, its **spring index** (good designs fall between about 4 and 12) and the **maximum shear stress** in the wire under load **F**, including the Wahl correction for curvature.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: helical compression spring',
        content: '```text\n          | F\n          v\n       ========\n        \\/\\/\\/      D   = mean coil diameter\n        /\\/\\/\\      d   = wire diameter\n        \\/\\/\\/      N_a = active coils\n       ========\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'd',
        value: { value: 5, unit: { expression: 'mm' } },
        description: 'Wire diameter',
      },
      {
        type: 'given',
        symbol: 'D',
        value: { value: 40, unit: { expression: 'mm' } },
        description: 'Mean coil diameter',
      },
      {
        type: 'given',
        symbol: 'N_a',
        value: { value: 10 },
        description: 'Number of active coils',
      },
      {
        type: 'given',
        symbol: 'G',
        value: { value: 79.3, unit: { expression: 'GPa' } },
        description: 'Shear modulus (spring steel)',
      },
      {
        type: 'given',
        symbol: 'F',
        value: { value: 200, unit: { expression: 'N' } },
        description: 'Axial load',
      },
      {
        type: 'equation',
        latex: 'k = \\frac{G d^4}{8 D^3 N_a}',
        lhs: 'k_spring',
        rhs: 'G * d**4 / (8 * D**3 * N_a)',
      },
      {
        type: 'equation',
        latex: 'C = \\frac{D}{d}',
        lhs: 'C',
        rhs: 'D / d',
      },
      {
        type: 'equation',
        latex: '\\tau = \\left(\\frac{4C - 1}{4C - 4} + \\frac{0.615}{C}\\right) \\frac{8 F D}{\\pi d^3}',
        lhs: 'tau',
        rhs: '((4*C - 1)/(4*C - 4) + 0.615/C) * 8*F*D / (pi*d**3)',
      },
      { type: 'solve_goal', target_symbol: 'k_spring', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'C', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'tau', method: 'symbolic' },
    ],
  },

  {
    id: 'thermal-expansion',
    name: 'Thermal Expansion',
    category: 'mechanical',
    description: 'Change in length of a steel bar when its temperature rises.',
    tags: ['thermal', 'expansion', 'temperature', 'mechanical'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA steel bar of length **L₀** warms by **ΔT**. Find how much **longer** it gets, assuming it is free to expand.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: free thermal expansion',
        content: '```text\n  before:  |<-------- L0 -------->|\n           [======================]\n\n  after:   |<-------- L0 -------->|<dL>|\n           [===========================]\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'alpha',
        value: { value: 12e-6, unit: { expression: '1/K' } },
        description: 'Coefficient of linear expansion (steel)',
      },
      {
        type: 'given',
        symbol: 'L_0',
        value: { value: 2, unit: { expression: 'm' } },
        description: 'Original length',
      },
      {
        type: 'given',
        symbol: 'delta_T',
        latex: '\\Delta T',
        value: { value: 80, unit: { expression: 'K' } },
        description: 'Temperature rise',
      },
      {
        type: 'equation',
        latex: '\\delta_L = \\alpha \\, L_0 \\, \\Delta T',
        lhs: 'delta_L',
        rhs: 'alpha * L_0 * delta_T',
      },
      { type: 'solve_goal', target_symbol: 'delta_L', method: 'symbolic' },
    ],
  },

  {
    id: 'bolt-tensile-stress',
    name: 'Bolt Tensile Stress',
    category: 'mechanical',
    description: 'Tensile stress in a metric bolt from its ISO tensile stress area.',
    tags: ['bolt', 'stress', 'tensile', 'fastener', 'mechanical'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nAn M12 coarse-thread bolt carries an axial tensile load **F**. Find its **tensile stress area** (ISO 898-1, from the nominal diameter and thread pitch) and the **tensile stress**. For M12 × 1.75 the area should come out near the tabulated 84.3 mm².' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: bolt in tension',
        content: '```text\n         ^ F\n         |\n     +---+---+\n     |  nut  |\n     +-------+\n     |///////|   threads (pitch p)\n     |///////|\n     |       |   shank (nominal d)\n     +-------+\n     | plate |\n     +---+---+\n         |\n         v F\n```\nThe threaded section is the weakest, so the stress is based on the tensile stress area, not the shank area.',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'F',
        value: { value: 25, unit: { expression: 'kN' } },
        description: 'Axial tensile load',
      },
      {
        type: 'given',
        symbol: 'd',
        value: { value: 12, unit: { expression: 'mm' } },
        description: 'Nominal diameter (M12)',
      },
      {
        type: 'given',
        symbol: 'p',
        value: { value: 1.75, unit: { expression: 'mm' } },
        description: 'Thread pitch (M12 coarse)',
      },
      {
        type: 'equation',
        latex: 'A_t = \\frac{\\pi}{4} \\left(d - 0.9382\\,p\\right)^2',
        lhs: 'A_t',
        rhs: 'pi/4 * (d - 0.9382*p)**2',
      },
      {
        type: 'equation',
        latex: '\\sigma = \\frac{F}{A_t}',
        lhs: 'sigma',
        rhs: 'F / A_t',
      },
      { type: 'solve_goal', target_symbol: 'A_t', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'sigma', method: 'symbolic' },
    ],
  },

  {
    id: 'reynolds-number',
    name: 'Reynolds Number',
    category: 'mechanical',
    description: 'Reynolds number of pipe flow, to tell laminar from turbulent.',
    tags: ['fluid', 'reynolds', 'flow', 'laminar', 'turbulent'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nWater at 20 °C flows through a pipe. Find the **Reynolds number** and judge the flow regime: below about 2300 the flow is laminar, above about 4000 it is turbulent, and in between it is transitional.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'given',
        symbol: 'rho',
        value: { value: 998, unit: { expression: 'kg/m**3' } },
        description: 'Density of water at 20 °C',
      },
      {
        type: 'given',
        symbol: 'v',
        value: { value: 2, unit: { expression: 'm/s' } },
        description: 'Mean flow velocity',
      },
      {
        type: 'given',
        symbol: 'D',
        value: { value: 50, unit: { expression: 'mm' } },
        description: 'Pipe inner diameter',
      },
      {
        type: 'given',
        symbol: 'mu',
        value: { value: 1.002, unit: { expression: 'mPa*s' } },
        description: 'Dynamic viscosity of water at 20 °C',
      },
      {
        type: 'equation',
        latex: 'Re = \\frac{\\rho v D}{\\mu}',
        lhs: 'Re',
        rhs: 'rho * v * D / mu',
      },
      { type: 'solve_goal', target_symbol: 'Re', method: 'symbolic' },
    ],
  },

  // --- Electrical ---
  {
    id: 'voltage-divider',
    name: 'Voltage Divider',
    category: 'electrical',
    description: 'Output voltage and current of a two-resistor divider.',
    tags: ['voltage divider', 'resistor', 'circuit', 'electrical'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nTwo resistors in series divide a supply voltage. Find the **output voltage** across R₂ (with no load attached) and the **current** drawn from the supply.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: voltage divider',
        content: '```text\n   V_in\n    |\n   [R1]\n    |\n    +-------> V_out\n    |\n   [R2]\n    |\n   GND\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'V_in',
        value: { value: 12, unit: { expression: 'V' } },
        description: 'Supply voltage',
      },
      {
        type: 'given',
        symbol: 'R_1',
        value: { value: 10, unit: { expression: 'kohm' } },
        description: 'Upper resistor',
      },
      {
        type: 'given',
        symbol: 'R_2',
        value: { value: 4.7, unit: { expression: 'kohm' } },
        description: 'Lower resistor',
      },
      {
        type: 'equation',
        latex: 'V_{out} = V_{in} \\, \\frac{R_2}{R_1 + R_2}',
        lhs: 'V_out',
        rhs: 'V_in * R_2 / (R_1 + R_2)',
      },
      {
        type: 'equation',
        latex: 'I = \\frac{V_{in}}{R_1 + R_2}',
        lhs: 'I_div',
        rhs: 'V_in / (R_1 + R_2)',
      },
      { type: 'solve_goal', target_symbol: 'V_out', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'I_div', method: 'symbolic' },
    ],
  },

  {
    id: 'stress-strain',
    name: "Stress-Strain (Hooke's Law)",
    category: 'structural',
    description: "Axial stress, strain and elongation of a bar in tension with Hooke's law.",
    tags: ['stress', 'strain', 'hooke', 'tension', 'structural'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA steel bar of cross-section **A** and length **L** is pulled by a force **F**. Assuming it stays elastic, find the **axial stress**, the **strain** and the **elongation**.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: bar in axial tension',
        content: '```text\n   F <---  [=====================]  ---> F\n           |<-------- L -------->|\n                 area A\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'F',
        value: { value: 50, unit: { expression: 'kN' } },
        description: 'Axial force',
      },
      {
        type: 'given',
        symbol: 'A',
        value: { value: 500, unit: { expression: 'mm**2' } },
        description: 'Cross-sectional area',
      },
      {
        type: 'given',
        symbol: 'L',
        value: { value: 2, unit: { expression: 'm' } },
        description: 'Bar length',
      },
      {
        type: 'given',
        symbol: 'E',
        value: { value: 200, unit: { expression: 'GPa' } },
        description: "Young's modulus (steel)",
      },
      {
        type: 'equation',
        latex: '\\sigma = \\frac{F}{A}',
        lhs: 'sigma',
        rhs: 'F / A',
      },
      {
        type: 'equation',
        latex: '\\varepsilon = \\frac{F}{A E}',
        lhs: 'epsilon',
        rhs: 'F / (A * E)',
      },
      {
        type: 'equation',
        latex: '\\delta = \\frac{F L}{A E}',
        lhs: 'delta',
        rhs: 'F * L / (A * E)',
      },
      { type: 'solve_goal', target_symbol: 'sigma', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'epsilon', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'delta', method: 'symbolic' },
    ],
  },

  {
    id: 'rc-time-constant',
    name: 'RC Circuit Time Constant',
    category: 'electrical',
    description: 'Time constant, cutoff frequency and charging voltage of a series RC circuit.',
    tags: ['RC', 'circuit', 'time constant', 'filter'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nA capacitor **C** charges from a step supply **V_s** through a resistor **R**. Find the **time constant**, the **cutoff frequency** of the same circuit used as a low-pass filter, and the **capacitor voltage** a time **t** after the step.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'annotation',
        title: 'Diagram: series RC circuit',
        content: '```text\n   V_s ---[ R ]---+------ V_C\n                  |\n                [ C ]\n                  |\n   GND -----------+\n```',
        collapsed: false,
      },
      {
        type: 'given',
        symbol: 'R',
        value: { value: 10, unit: { expression: 'kohm' } },
        description: 'Resistance',
      },
      {
        type: 'given',
        symbol: 'C',
        value: { value: 100, unit: { expression: 'nF' } },
        description: 'Capacitance',
      },
      {
        type: 'given',
        symbol: 'V_s',
        value: { value: 5, unit: { expression: 'V' } },
        description: 'Step supply voltage',
      },
      {
        type: 'given',
        symbol: 't',
        value: { value: 1, unit: { expression: 'ms' } },
        description: 'Time after the step',
      },
      {
        type: 'equation',
        latex: '\\tau = R C',
        lhs: 'tau',
        rhs: 'R * C',
      },
      {
        type: 'equation',
        latex: 'f_c = \\frac{1}{2 \\pi R C}',
        lhs: 'f_c',
        rhs: '1 / (2 * pi * R * C)',
      },
      {
        type: 'equation',
        latex: 'V_C = V_s \\left(1 - e^{-t/(R C)}\\right)',
        lhs: 'V_C',
        rhs: 'V_s * (1 - exp(-t / (R * C)))',
      },
      { type: 'solve_goal', target_symbol: 'tau', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'f_c', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'V_C', method: 'symbolic' },
    ],
  },

  {
    id: 'ohms-law',
    name: "Ohm's Law Calculator",
    category: 'electrical',
    description: 'Current through a resistor and the power it dissipates.',
    tags: ['ohm', 'voltage', 'current', 'power', 'electrical'],
    nodes: [
      {
        type: 'text',
        content: "## Problem\n\nA resistor **R** is connected across a voltage **V**. Find the **current** through it and the **power** it dissipates." + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'given',
        symbol: 'V',
        value: { value: 12, unit: { expression: 'V' } },
        description: 'Applied voltage',
      },
      {
        type: 'given',
        symbol: 'R',
        value: { value: 100, unit: { expression: 'ohm' } },
        description: 'Resistance',
      },
      {
        type: 'equation',
        latex: 'I = \\frac{V}{R}',
        lhs: 'I',
        rhs: 'V / R',
      },
      {
        type: 'equation',
        latex: 'P = \\frac{V^2}{R}',
        lhs: 'P',
        rhs: 'V**2 / R',
      },
      { type: 'solve_goal', target_symbol: 'I', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'P', method: 'symbolic' },
    ],
  },

  // --- General ---
  {
    id: 'quadratic-solver',
    name: 'Quadratic Equation Solver',
    category: 'general',
    description: 'Roots of ax² + bx + c = 0 with the quadratic formula.',
    tags: ['quadratic', 'algebra', 'roots', 'general'],
    nodes: [
      {
        type: 'text',
        content: '## Problem\n\nFind the roots of $a x^2 + b x + c = 0$. The **discriminant** D tells you what to expect: two real roots when D > 0, one repeated root when D = 0, and no real roots when D < 0.' + HOW_TO,
        format: 'markdown',
      },
      {
        type: 'given',
        symbol: 'a',
        value: { value: 1 },
        description: 'Coefficient of x²',
      },
      {
        type: 'given',
        symbol: 'b',
        value: { value: -5 },
        description: 'Coefficient of x',
      },
      {
        type: 'given',
        symbol: 'c',
        value: { value: 6 },
        description: 'Constant term',
      },
      {
        type: 'equation',
        latex: 'D = b^2 - 4ac',
        lhs: 'D',
        rhs: 'b**2 - 4*a*c',
      },
      {
        type: 'equation',
        latex: 'x_1 = \\frac{-b + \\sqrt{D}}{2a}',
        lhs: 'x_1',
        rhs: '(-b + sqrt(D)) / (2*a)',
      },
      {
        type: 'equation',
        latex: 'x_2 = \\frac{-b - \\sqrt{D}}{2a}',
        lhs: 'x_2',
        rhs: '(-b - sqrt(D)) / (2*a)',
      },
      { type: 'solve_goal', target_symbol: 'D', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'x_1', method: 'symbolic' },
      { type: 'solve_goal', target_symbol: 'x_2', method: 'symbolic' },
    ],
  },
];

// ─── Instantiation ───────────────────────────────────────────────────────────

const NOT_SYMBOLS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'exp', 'log', 'ln',
  'log10', 'sqrt', 'abs', 'pi', 'min', 'max', 'erf', 'gamma',
]);

/** Identifiers used in a compute expression (function names and constants excluded). */
function symbolsIn(expression: string | undefined): string[] {
  return [...new Set((expression ?? '').match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [])].filter((s) => !NOT_SYMBOLS.has(s));
}

/**
 * Turn a template into worksheet nodes: fresh ids, template provenance, and the dependency links
 * between them (an equation depends on the givens and equations that define its inputs; a solve
 * goal depends on the equation that defines its target), so stale tracking and the dependency
 * graph work from the start.
 */
export function instantiateTemplate(template: WorksheetTemplate): WorksheetNode[] {
  const now = new Date().toISOString();
  const nodes = template.nodes.map((partial, index) => ({
    id: uuidv4(),
    // Reading order; the canvas replaces these with positions packed from the measured sizes.
    position: { x: 40, y: 160 + index * 120 },
    provenance: { type: 'library', source: 'template', timestamp: now } as Provenance,
    verification: { status: 'unverified' } as VerificationStatus,
    dependencies: [] as NodeId[],
    dependents: [] as NodeId[],
    assumptions: [] as string[],
    ...partial,
  }) as WorksheetNode);

  const definedBy = new Map<string, NodeId>();
  for (const node of nodes) {
    if (node.type === 'given') definedBy.set(node.symbol, node.id);
  }
  for (const node of nodes) {
    if (node.type === 'equation' && node.lhs && !definedBy.has(node.lhs)) definedBy.set(node.lhs, node.id);
  }

  const link = (from: WorksheetNode, toId: NodeId | undefined) => {
    if (!toId || toId === from.id || from.dependencies.includes(toId)) return;
    from.dependencies.push(toId);
    nodes.find((n) => n.id === toId)?.dependents.push(from.id);
  };
  for (const node of nodes) {
    if (node.type === 'equation') {
      for (const symbol of symbolsIn(node.rhs)) link(node, definedBy.get(symbol));
    } else if (node.type === 'solve_goal') {
      link(node, definedBy.get(node.target_symbol));
    }
  }
  return nodes;
}

/** A new document holding a template, flagged so the canvas packs it from the measured node sizes. */
export function createDocumentFromTemplate(template: WorksheetTemplate): WorksheetDocument {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: template.name,
    created_at: now,
    updated_at: now,
    version: '1.0.0',
    nodes: instantiateTemplate(template),
    assumptions: [],
    history: [],
    current_history_id: '',
    audit_trail: [],
    metadata: { description: template.description, layout: 'auto' },
  };
}

