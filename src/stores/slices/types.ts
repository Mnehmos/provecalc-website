/**
 * Shared types for documentStore slices
 *
 * Defines the full DocumentState interface and slice creator type
 * so each slice can reference the shared state shape.
 */

import type {
  WorksheetDocument,
  WorksheetNode,
  NodeId,
  NodePosition,
  VerificationResult,
  SemanticLink,
  PhysicalDomainType,
} from '../../types/document';
import type { NodeType } from './helpers';

/** Full store state — all slices contribute actions to this shape */
export interface DocumentState {
  document: WorksheetDocument | null;
  selectedNodeId: NodeId | null;
  isLoading: boolean;
  error: string | null;

  // File state
  filePath: string | null;
  isDirty: boolean;

  // Verification state
  isVerifying: boolean;
  lastVerificationResults: VerificationResult[];

  // File operations
  saveDocument: () => Promise<boolean>;
  saveDocumentAs: () => Promise<boolean>;
  openDocument: () => Promise<boolean>;
  exportToJson: () => Promise<boolean>;
  exportToHtml: () => Promise<boolean>;
  exportToWord: () => Promise<boolean>;
  exportForAI: (options?: { compact?: boolean; focusNodeId?: NodeId }) => Promise<boolean>;
  markDirty: () => void;
  clearDirty: () => void;
  checkUnsavedChanges: () => Promise<boolean>;

  // Actions
  loadDocument: () => Promise<void>;
  createDocument: (name: string) => Promise<boolean>;
  addNode: (type: NodeType, position?: NodePosition) => Promise<void>;
  insertNode: (node: WorksheetNode, index?: number) => Promise<void>;
  updateNode: (nodeId: NodeId, updates: Partial<WorksheetNode>) => Promise<void>;
  deleteNode: (nodeId: NodeId) => Promise<void>;
  duplicateNode: (nodeId: NodeId) => Promise<void>;
  selectNode: (nodeId: NodeId | null) => void;
  updateNodePosition: (nodeId: NodeId, position: NodePosition) => void;
  updateDocumentName: (name: string) => void;

  // Assumptions
  addAssumption: (statement: string, formalExpression?: string, scope?: NodeId[]) => Promise<void>;
  removeAssumption: (assumptionId: string) => Promise<void>;
  toggleAssumption: (assumptionId: string) => Promise<void>;
  addToAssumptionScope: (assumptionId: string, nodeId: NodeId) => Promise<void>;
  removeFromAssumptionScope: (assumptionId: string, nodeId: NodeId) => Promise<void>;

  // History
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Verification
  verifyNode: (nodeId: NodeId) => Promise<VerificationResult | null>;
  verifyAllNodes: () => Promise<VerificationResult[]>;
  exportVerificationReport: () => Promise<boolean>;

  // Stale tracking
  clearNodeStale: (nodeId: NodeId) => Promise<void>;
  getStaleNodes: () => Promise<NodeId[]>;
  recalculateStale: () => Promise<void>;

  // Semantic links
  addSemanticLink: (nodeId: NodeId, link: Omit<SemanticLink, 'id' | 'createdAt'>) => Promise<void>;
  removeSemanticLink: (nodeId: NodeId, linkId: string) => Promise<void>;
  updateSemanticLink: (nodeId: NodeId, linkId: string, updates: Partial<SemanticLink>) => Promise<void>;

  // Domain context
  setActiveDomain: (domain: PhysicalDomainType | undefined) => void;
}

/** Setter / getter signatures matching Zustand + immer */
export type ImmerSet = (fn: (draft: DocumentState) => void) => void;
export type StoreGet = () => DocumentState;

/** Slice creator — each slice returns a partial of DocumentState */
export type SliceCreator<T> = (
  set: ImmerSet,
  get: StoreGet,
) => T;
