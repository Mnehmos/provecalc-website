/**
 * AI Context Protocol Types
 *
 * Defines the bidirectional protocol for AI integration:
 * 1. Context OUT → JSON export of document/focus for AI consumption
 * 2. Suggestions IN → Structured AI responses that render as insertable node cards
 */

import type {
  WorksheetNode,
  Assumption,
  VerificationStatus,
  NodeId,
} from './document';

// ============================================================================
// Context Export Types
// ============================================================================

/** Entry point that triggered the AI interaction */
export type AIEntryPoint =
  | 'chat'
  | 'library'
  | 'node_inspector'
  | 'unit_builder'
  | 'error';

/** Full AI context for rich interactions */
export interface AIContext {
  /** Protocol metadata */
  provecalc_context: true;
  version: '1.0';

  /** Document snapshot */
  document: {
    id: string;
    name: string;
    nodes: WorksheetNode[];
    assumptions: Assumption[];
  };

  /** What user is focused on */
  focus?: {
    nodeId: string;
    nodeType: WorksheetNode['type'];
    node: WorksheetNode;
  };

  /** Dependency graph */
  graph: {
    dependencies: Record<string, string[]>;
    dependents: Record<string, string[]>;
  };

  /** Current document state summary */
  state: {
    definedSymbols: Array<{ symbol: string; value: number; unit?: string }>;
    undefinedSymbols: string[];
    verificationStatus: Record<string, VerificationStatus>;
  };

  /** Where the context was triggered from */
  entryPoint: AIEntryPoint;
  /** User's question if any */
  query?: string;

  /** Instructions for external AI tools */
  instructions: string;
}

/** Compact AI context for token efficiency */
export interface AIContextCompact {
  /** Protocol metadata */
  provecalc_context: true;
  version: '1.0';

  /** Human-readable node summaries */
  nodes: string[];
  /** Focused node summary */
  focus?: string;
  /** Defined symbol names */
  defined: string[];
  /** Undefined symbols referenced in equations */
  undefined: string[];
  /** Active assumptions */
  assumptions: string[];
  /** User's question */
  query?: string;

  instructions: string;
}

/** Minimal node reference used for token-efficient update/delete targeting */
export interface AIContextNodeRef {
  id: string;
  type: WorksheetNode['type'];
  /** 1-based node number as shown in the canvas gutter */
  index?: number;
  /** Primary human-readable reference (e.g., symbol, lhs, annotation_1) */
  ref: string;
  /** Optional extra aliases accepted by resolver */
  aliases?: string[];
  /** Optional short label for model comprehension */
  label?: string;
}

export interface AIChatAssistContext {
  type: string;
  node_id?: string;
  node_type?: string;
  node_index?: number;
  symbol?: string;
  title?: string;
  latex?: string;
  rhs?: string;
  value?: number;
  unit?: string;
  excerpt?: string;
  status?: string;
  reason?: string;
}

/** Token-efficient context tailored for chat completion calls */
export interface AIChatContext {
  provecalc_context: true;
  version: '1.0';

  /** Known symbol table used by backend system prompt */
  symbols: Record<string, { value: number; unit?: string; node_id?: string }>;
  /** Equation list for backend system prompt */
  equations: string[];
  /** Active assumptions */
  assumptions: string[];
  /** Compact node target index for update/delete commands */
  node_refs: AIContextNodeRef[];

  focus_node_id?: string;
  query?: string;
  assist_context?: AIChatAssistContext;
  instructions: string;
}

// ============================================================================
// AI Suggestion Types
// ============================================================================

/** Base suggestion with common fields */
interface SuggestionBase {
  id: string;
  confidence: number;
}

/** Suggestion to insert a single node */
export interface NodeSuggestion extends SuggestionBase {
  type: 'node';
  preview: {
    latex?: string;
    description: string;
  };
  node: Partial<WorksheetNode>;
}

/** Suggestion to insert multiple related nodes */
export interface NodeGroupSuggestion extends SuggestionBase {
  type: 'node_group';
  preview: {
    title: string;
    nodes: string[];
  };
  nodes: Partial<WorksheetNode>[];
  insertOrder: 'sequential' | 'parallel';
}

/** Suggestion to add an assumption */
export interface AssumptionSuggestion extends SuggestionBase {
  type: 'assumption';
  preview: {
    statement: string;
    scope: string[];
  };
  assumption: Partial<Assumption>;
}

/** Explanation with optional node references */
export interface ExplanationSuggestion extends SuggestionBase {
  type: 'explanation';
  content: string;
  relatedNodes?: NodeId[];
}

/** Union of all suggestion types */
export type AISuggestion =
  | NodeSuggestion
  | NodeGroupSuggestion
  | AssumptionSuggestion
  | ExplanationSuggestion;

/** Parsed AI response containing text and structured suggestions */
export interface ParsedAIResponse {
  /** Plain text/markdown content */
  text: string;
  /** Extracted structured suggestions */
  suggestions: AISuggestion[];
}

/** Insert action when user accepts a suggestion */
export interface InsertAction {
  suggestionId: string;
  mode: 'as_is' | 'with_dependencies' | 'edit_first';
  position?: {
    afterNode?: string;
    x?: number;
    y?: number;
  };
}
