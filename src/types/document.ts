/**
 * Document Model - Core types for the worksheet AST
 *
 * Following the principle: "The Database is the Intelligence"
 * All state lives in the worksheet document. The LLM is stateless.
 */

/** Unique identifier for nodes */
export type NodeId = string;

/** Provenance tracking - who created this and how was it verified */
export type Provenance =
  | { type: 'user'; timestamp: string }
  | { type: 'llm'; timestamp: string; model?: string; accepted_by?: string }
  | { type: 'library'; source: string; timestamp: string }
  | { type: 'computed'; from_nodes: NodeId[]; timestamp: string };

/** Verification status */
export type VerificationStatus =
  | { status: 'unverified' }
  | { status: 'verified'; timestamp: string; engine_version: string }
  | { status: 'failed'; reason: string; timestamp: string }
  | { status: 'pending' };

/** Physical domain classification */
export type PhysicalDomainType =
  | 'mechanics'
  | 'thermodynamics'
  | 'electrical'
  | 'magnetism'
  | 'chemistry'
  | 'optics'
  | 'dimensionless'
  | 'unknown';

/** Domain metadata for display */
export interface PhysicalDomain {
  domain: PhysicalDomainType;
  quantity: string;        // Specific quantity (e.g., "force", "density")
  icon: string;            // Display icon
  label: string;           // Human-readable label
  color: string;           // Display color (hex)
}

/** Unit representation */
export interface Unit {
  expression: string;      // e.g., "m/s^2", "kg*m/s^2"
  si_base?: string;        // Normalized SI representation
  display_format?: string; // User-preferred display format
  domain?: PhysicalDomain; // Physical domain classification
}

/** Value with optional unit */
export interface ValueWithUnit {
  value: number;
  unit?: Unit;
  uncertainty?: number;
}

/** Position on the canvas (SMath-style free-form layout) */
export interface NodePosition {
  x: number;  // Pixels from left edge
  y: number;  // Pixels from top edge
  width?: number;  // Optional explicit width
  height?: number; // Optional explicit height
}

/** Display configuration for controlling visibility in exports and views */
export interface DisplayConfig {
  showInExport: boolean;      // Include in PDF/Word/HTML exports
  showInDocument: boolean;    // Show in document view
  displayMode: 'full' | 'equation' | 'value';  // Detail level
}

/** Default display configuration */
export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showInExport: true,
  showInDocument: true,
  displayMode: 'full',
};

/** Semantic link types for associating nodes with sources/related content */
export type SemanticLinkType =
  | 'source'        // Link to external source (textbook, paper, standard)
  | 'derived_from'  // This node was derived from another
  | 'related'       // General relationship
  | 'validates'     // This node validates another
  | 'contradicts'   // This node contradicts another
  | 'supersedes';   // This node replaces another

/** Semantic link to an external source or internal node */
export interface SemanticLink {
  id: string;
  type: SemanticLinkType;
  /** For external sources */
  url?: string;
  title?: string;
  citation?: string;
  /** For internal node references */
  targetNodeId?: NodeId;
  /** Optional note about the relationship */
  note?: string;
  createdAt: string;
}

/** Base properties all nodes share */
export interface BaseNode {
  id: NodeId;
  provenance: Provenance;
  verification: VerificationStatus;
  dependencies: NodeId[];      // Upstream nodes this depends on
  dependents: NodeId[];        // Downstream nodes that depend on this
  assumptions: string[];       // IDs of assumptions that apply
  position?: NodePosition;     // Canvas position (free-form layout)
  display?: DisplayConfig;     // Visibility controls for exports/views
  metadata?: Record<string, unknown>;
  /** Semantic links to sources, related nodes, etc. */
  semanticLinks?: SemanticLink[];
  /** True if any dependency changed since last solve */
  isStale?: boolean;
  /** Timestamp of last successful solve */
  lastSolvedAt?: string;
}

/** Text/narrative node */
export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
  format?: 'plain' | 'markdown';
}

/** Annotation node with rich markdown support */
export interface AnnotationNode extends BaseNode {
  type: 'annotation';
  content: string;            // Markdown content
  title?: string;             // Optional heading/title
  collapsed?: boolean;        // Collapsible state
}

/** Range for interactive slider exploration */
export interface SliderRange {
  min: number;
  max: number;
  step?: number;            // Default: (max-min)/100
}

/** Solution step from solve computation */
export interface SolutionStep {
  description: string;      // What this step does
  expression: string;       // Mathematical expression
  latex?: string;           // LaTeX representation
}

/** Configuration for form mode input fields */
export interface InputFieldConfig {
  label: string;              // Display label, e.g., "Enter beam length:"
  inputType: 'number' | 'select' | 'text';
  options?: string[];         // For select type
  placeholder?: string;
  group?: string;             // Group name for organizing form fields
  order?: number;             // Display order within group
}

/** Given/input parameter node */
export interface GivenNode extends BaseNode {
  type: 'given';
  symbol: string;           // Variable name, e.g., "L"
  latex?: string;           // LaTeX representation for display
  value: ValueWithUnit;
  description?: string;
  constraints?: string[];   // Constraint node IDs
  sliderRange?: SliderRange; // Optional range for interactive exploration
  solutionSteps?: SolutionStep[]; // Steps that produced this value (if computed)
  symbolicForm?: string;    // Symbolic result before numeric evaluation
  inputField?: InputFieldConfig; // Form mode configuration
}

/** Equation/relationship node */
export interface EquationNode extends BaseNode {
  type: 'equation';
  latex: string;            // LaTeX representation
  sympy?: string;           // SymPy-compatible expression
  lhs: string;              // Left-hand side symbol
  rhs: string;              // Right-hand side expression
  is_definition?: boolean;  // Is this a definition (F := m*a) vs equation (F = m*a)
}

/** Constraint node */
export interface ConstraintNode extends BaseNode {
  type: 'constraint';
  latex: string;
  sympy: string;
  description?: string;
  applies_to: NodeId[];     // Which nodes this constraint applies to
}

/** Solve goal node */
export interface SolveGoalNode extends BaseNode {
  type: 'solve_goal';
  target_symbol: string;    // Variable to solve for
  method?: 'symbolic' | 'numeric' | 'auto';
  initial_guess?: number;   // For numeric solvers
}

/** Result/computed output node */
export interface ResultNode extends BaseNode {
  type: 'result';
  symbol: string;
  latex?: string;
  value: ValueWithUnit;
  symbolic_form?: string;   // Symbolic result before numeric evaluation
  solve_goal_id: NodeId;    // Which solve goal produced this
  residual?: number;        // For numeric solutions
}

/** Plot expression for visualization */
export interface PlotExpression {
  id: string;
  expr: string;           // "y = x^2" or "F = m*a"
  variable: string;       // Independent variable (usually "x")
  label?: string;         // Legend label
  color?: string;         // Line/point color
  style?: 'solid' | 'dashed' | 'dotted';
}

/** Plot range configuration */
export interface PlotRange {
  min: number;
  max: number;
  variable: string;       // Variable name for this axis
}

/** Plot options */
export interface PlotOptions {
  title?: string;
  x_label?: string;
  y_label?: string;
  grid?: boolean;
  legend?: boolean;
  show_points?: boolean;
  point_count?: number;   // Number of points to sample (default: 100)
}

/** Series data for a single plot expression */
export interface PlotSeriesData {
  expression_id: string;
  x: number[];
  y: number[];
  label?: string;
  color?: string;
}

/** Cached plot data from compute engine */
export interface PlotData {
  series: PlotSeriesData[];
  computed_at: string;
  x_bounds: [number, number];
  y_bounds: [number, number];
}

/** Plot/visualization node */
export interface PlotNode extends BaseNode {
  type: 'plot';
  plot_type: 'function' | 'parametric' | 'scatter' | 'constraint';
  expressions: PlotExpression[];
  x_range: PlotRange;
  y_range?: PlotRange;    // Auto-calculated if not specified
  options: PlotOptions;
  // Cached plot data from engine
  cached_data?: PlotData;
}

/** Union of all node types */
export type WorksheetNode =
  | TextNode
  | GivenNode
  | EquationNode
  | ConstraintNode
  | SolveGoalNode
  | ResultNode
  | PlotNode
  | AnnotationNode;

/** Assumption in the ledger */
export interface Assumption {
  id: string;
  statement: string;              // Human-readable, e.g., "Steady-state conditions"
  formal_expression?: string;     // Mathematical form, e.g., "∂/∂t = 0"
  latex?: string;
  scope: NodeId[];                // Which nodes this applies to
  justification?: string;
  provenance: Provenance;
  active: boolean;
}

/** History entry for undo/redo */
export interface HistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  changes: NodeChange[];
  source: 'user' | 'llm' | 'engine';
  parent_id?: string;             // For branching
}

/** Individual change within a history entry */
export interface NodeChange {
  type: 'create' | 'update' | 'delete';
  node_id: NodeId;
  before?: WorksheetNode;
  after?: WorksheetNode;
}

/** The complete worksheet document */
export interface WorksheetDocument {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  version: string;

  /** Ordered list of nodes */
  nodes: WorksheetNode[];

  /** Assumption ledger */
  assumptions: Assumption[];

  /** History for undo/redo/branching */
  history: HistoryEntry[];
  current_history_id: string;

  /** Verification audit trail for PE compliance */
  audit_trail: VerificationAuditEntry[];

  /** Document-level metadata */
  metadata: {
    author?: string;
    description?: string;
    tags?: string[];
    unit_system?: 'SI' | 'Imperial' | 'Custom';
    custom_units?: Record<string, string>;
    active_domain?: PhysicalDomainType;
  };
}

/** API response types */
export interface VerificationResult {
  node_id: NodeId;
  passed: boolean;
  gates: {
    unit_consistency: { passed: boolean; details?: string };
    constraint_satisfaction: { passed: boolean; details?: string };
    numeric_residual?: { passed: boolean; residual?: number };
    sanity_checks?: { passed: boolean; details?: string };
  };
  error?: string;
  overall_status?: VerificationStatus;
}

/** Verification audit entry for PE compliance */
export interface VerificationAuditEntry {
  id: string;
  node_id: NodeId;
  timestamp: string;
  engine_version: string;
  passed: boolean;
  gates_checked: {
    unit_consistency: { passed: boolean; details: string };
    constraint_satisfaction: { passed: boolean; details: string };
    numeric_residual?: { passed: boolean; residual?: number; details?: string };
    sanity_checks?: { passed: boolean; details?: string };
  };
  inputs_used: Record<string, { value: number; unit?: string; source_node_id?: NodeId }>;
  assumptions_active: string[];  // IDs of assumptions that were active
  provenance_at_verification: Provenance;
}

/** AI action audit entry - tracks AI proposals and their validation */
export interface AIActionAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  model?: string;
  validation: {
    status: 'valid' | 'warning' | 'invalid';
    message?: string;
    unit_check?: { passed: boolean; message?: string };
    constraint_check?: { passed: boolean; message?: string };
  };
  user_decision: 'accepted' | 'rejected' | 'pending';
  reasoning?: string;
}

export interface ComputeResult {
  success: boolean;
  symbolic_result?: string;
  numeric_result?: ValueWithUnit;
  latex?: string;
  error?: string;
  warnings?: string[];
}

/** System analysis for equation determinacy */
export interface SystemAnalysis {
  equation_count: number;
  unknown_count: number;
  known_count: number;
  unknowns: string[];
  knowns: string[];
  status: 'determined' | 'under_determined' | 'over_determined';
  message: string;
  solvable_for: string[];
}

// ============ Library Types ============

/** Category for organizing library items */
export type LibraryCategory =
  | 'physics'
  | 'chemistry'
  | 'mathematics'
  | 'engineering'
  | 'electrical'
  | 'mechanical'
  | 'civil'
  | 'custom';

/** Node data for library items (without runtime properties) */
export type LibraryNodeData = {
  type: WorksheetNode['type'];
  assumptions?: string[];
  metadata?: Record<string, unknown>;
  // Type-specific fields are flexible
  [key: string]: unknown;
};

/** A reusable template stored in the library */
export interface LibraryItem {
  id: string;
  name: string;
  description?: string;
  category: LibraryCategory;
  tags: string[];

  /** The node template (without runtime properties like id, position) */
  nodeType: WorksheetNode['type'];
  nodeData: LibraryNodeData;

  /** Metadata */
  createdAt: string;
  updatedAt: string;
  author?: string;
  version?: string;
}

/** Collection of library items */
export interface Library {
  version: string;
  items: LibraryItem[];
}
