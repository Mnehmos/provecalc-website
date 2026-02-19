/**
 * Document Store - Zustand store for worksheet state
 *
 * Following: "The Database is the Intelligence"
 * This store manages the local copy of the document state.
 *
 * Split into domain slices for testability (see stores/slices/).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DocumentState } from './slices/types';
import {
  createFileSlice,
  createNodeSlice,
  createVerificationSlice,
  createAssumptionSlice,
  createHistorySlice,
  createSemanticLinkSlice,
} from './slices';

// Re-export types and helpers that external modules depend on
export type { DocumentState } from './slices/types';
export type { NodeType } from './slices/helpers';
export {
  createTextNode,
  createAnnotationNode,
  createGivenNode,
  createEquationNode,
  createConstraintNode,
  createSolveGoalNode,
  createResultNode,
  createPlotNode,
  getNextNodePosition,
  getResultNodePosition,
  findDuplicateSymbols,
  getNodeDisplayName,
  getBaseSymbol,
} from './slices/helpers';

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    // Shared state
    document: null,
    isLoading: false,
    error: null,

    // Compose all domain slices
    ...createFileSlice(set, get),
    ...createNodeSlice(set, get),
    ...createVerificationSlice(set, get),
    ...createAssumptionSlice(set, get),
    ...createHistorySlice(set, get),
    ...createSemanticLinkSlice(set, get),
  }))
);
