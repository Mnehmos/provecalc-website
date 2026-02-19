/**
 * Assumption slice — WEB VERSION
 *
 * All operations are pure Zustand mutations. No backend calls needed.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger, startTimer } from '../../utils/logger';
import type { Assumption, NodeId } from '../../types/document';
import type { SliceCreator } from './types';
import { requireLoadedDocument } from './helpers';

export interface AssumptionSlice {
  addAssumption: (statement: string, formalExpression?: string, scope?: NodeId[]) => Promise<void>;
  removeAssumption: (assumptionId: string) => Promise<void>;
  toggleAssumption: (assumptionId: string) => Promise<void>;
  addToAssumptionScope: (assumptionId: string, nodeId: NodeId) => Promise<void>;
  removeFromAssumptionScope: (assumptionId: string, nodeId: NodeId) => Promise<void>;
}

export const createAssumptionSlice: SliceCreator<AssumptionSlice> = (set, get) => ({
  addAssumption: async (statement: string, formalExpression?: string, scope?: NodeId[]) => {
    const timer = startTimer('addAssumption', 'store');
    logger.store.action('documentStore', 'addAssumption', { statement });
    if (!requireLoadedDocument(() => get().document, timer)) return;

    const assumption: Assumption = {
      id: uuidv4(),
      statement,
      formal_expression: formalExpression,
      scope: scope || [],
      active: true,
      provenance: { type: 'user', timestamp: new Date().toISOString() },
    };

    set((draft) => {
      if (draft.document) {
        draft.document.assumptions.push(assumption);
        draft.isDirty = true;
      }
    });
    timer.complete({ assumptionId: assumption.id });
  },

  removeAssumption: async (assumptionId: string) => {
    const timer = startTimer('removeAssumption', 'store');
    if (!requireLoadedDocument(() => get().document, timer, { assumptionId })) return;

    set((draft) => {
      if (draft.document) {
        draft.document.assumptions = draft.document.assumptions.filter(
          (a) => a.id !== assumptionId
        );
        draft.isDirty = true;
      }
    });
    timer.complete({ assumptionId });
  },

  toggleAssumption: async (assumptionId: string) => {
    const timer = startTimer('toggleAssumption', 'store');
    if (!requireLoadedDocument(() => get().document, timer, { assumptionId })) return;

    set((draft) => {
      if (draft.document) {
        const assumption = draft.document.assumptions.find((a) => a.id === assumptionId);
        if (assumption) {
          assumption.active = !assumption.active;
          draft.isDirty = true;
        }
      }
    });
    timer.complete({ assumptionId });
  },

  addToAssumptionScope: async (assumptionId: string, nodeId: NodeId) => {
    const timer = startTimer('addToAssumptionScope', 'store');
    if (!requireLoadedDocument(() => get().document, timer, { assumptionId, nodeId })) return;

    set((draft) => {
      if (draft.document) {
        const assumption = draft.document.assumptions.find((a) => a.id === assumptionId);
        if (assumption) {
          if (!assumption.scope) assumption.scope = [];
          if (!assumption.scope.includes(nodeId)) {
            assumption.scope.push(nodeId);
          }
        }
        const node = draft.document.nodes.find((n) => n.id === nodeId);
        if (node && !node.assumptions.includes(assumptionId)) {
          node.assumptions.push(assumptionId);
        }
        draft.isDirty = true;
      }
    });
    timer.complete({ assumptionId, nodeId });
  },

  removeFromAssumptionScope: async (assumptionId: string, nodeId: NodeId) => {
    const timer = startTimer('removeFromAssumptionScope', 'store');
    if (!requireLoadedDocument(() => get().document, timer, { assumptionId, nodeId })) return;

    set((draft) => {
      if (draft.document) {
        const assumption = draft.document.assumptions.find((a) => a.id === assumptionId);
        if (assumption && assumption.scope) {
          assumption.scope = assumption.scope.filter((id) => id !== nodeId);
        }
        const node = draft.document.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.assumptions = node.assumptions.filter((id) => id !== assumptionId);
        }
        draft.isDirty = true;
      }
    });
    timer.complete({ assumptionId, nodeId });
  },
});
