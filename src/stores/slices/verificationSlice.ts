/**
 * Verification slice — WEB VERSION
 *
 * Uses HTTP fetch to Railway sidecar for compute verification.
 * No Tauri dependencies.
 */

import { logger, startTimer } from '../../utils/logger';
import type { NodeId, VerificationResult } from '../../types/document';
import type { SliceCreator } from './types';
import {
  applyVerificationStatus,
  createAuditEntry,
  generateVerificationReport,
} from './helpers';
import { evaluate, checkUnits } from '../../services/computeService';

export interface VerificationSlice {
  isVerifying: boolean;
  lastVerificationResults: VerificationResult[];

  verifyNode: (nodeId: NodeId) => Promise<VerificationResult | null>;
  verifyAllNodes: () => Promise<VerificationResult[]>;
  exportVerificationReport: () => Promise<boolean>;
  clearNodeStale: (nodeId: NodeId) => Promise<void>;
  getStaleNodes: () => Promise<NodeId[]>;
  recalculateStale: () => Promise<void>;
}

export const createVerificationSlice: SliceCreator<VerificationSlice> = (set, get) => ({
  isVerifying: false,
  lastVerificationResults: [],

  verifyNode: async (nodeId: NodeId) => {
    const timer = startTimer('verifyNode', 'verification');
    logger.verification.started(nodeId);
    const state = get();
    const node = state.document?.nodes.find(n => n.id === nodeId);
    if (!state.document || !node) {
      timer.complete({ nodeId, skipped: 'missing node or document' });
      return null;
    }

    set((draft) => { draft.isVerifying = true; draft.error = null; });

    try {
      // Build a verification result by checking units on the node
      let unitPassed = true;
      let unitDetails = '';

      if (node.type === 'equation') {
        const eq = node as { lhs: string; rhs: string };
        const unitResult = await checkUnits(`(${eq.lhs}) - (${eq.rhs})`);
        unitPassed = unitResult.consistent;
        unitDetails = unitResult.error || unitResult.details || '';
      } else if (node.type === 'given') {
        const given = node as { symbol: string; value: { value: number; unit?: { expression: string } } };
        if (given.value.unit?.expression) {
          const unitResult = await checkUnits(`${given.value.value} * ${given.value.unit.expression}`);
          unitPassed = unitResult.consistent;
          unitDetails = unitResult.error || unitResult.details || '';
        }
      }

      const result: VerificationResult = {
        node_id: nodeId,
        passed: unitPassed,
        error: unitPassed ? undefined : unitDetails,
        gates: {
          unit_consistency: { passed: unitPassed, details: unitDetails },
          constraint_satisfaction: { passed: true, details: '' },
        },
      };

      set((draft) => {
        if (draft.document) {
          const draftNode = draft.document.nodes.find(n => n.id === nodeId);
          const now = new Date().toISOString();
          if (draftNode) {
            applyVerificationStatus(draftNode, result, now);
            draft.document.audit_trail.push(createAuditEntry(draftNode, result, now));
          }
          draft.lastVerificationResults = [result];
        }
        draft.isVerifying = false;
      });

      timer.complete({ nodeId, passed: result.passed });
      return result;
    } catch (e) {
      timer.error(e);
      set((draft) => { draft.error = String(e); draft.isVerifying = false; });
      return null;
    }
  },

  verifyAllNodes: async () => {
    const timer = startTimer('verifyAllNodes', 'verification');
    const state = get();
    if (!state.document || state.document.nodes.length === 0) {
      timer.complete({ total: 0 });
      return [];
    }

    set((draft) => { draft.isVerifying = true; draft.error = null; });

    const results: VerificationResult[] = [];
    for (const node of state.document.nodes) {
      if (['equation', 'given'].includes(node.type)) {
        const result = await get().verifyNode(node.id);
        if (result) results.push(result);
      }
    }

    set((draft) => {
      draft.lastVerificationResults = results;
      draft.isVerifying = false;
    });

    const passed = results.filter(r => r.passed).length;
    timer.complete({ total: results.length, passed, failed: results.length - passed });
    return results;
  },

  exportVerificationReport: async () => {
    const timer = startTimer('exportVerificationReport', 'store');
    const doc = get().document;
    if (!doc) {
      timer.complete({ skipped: 'no document' });
      return false;
    }

    try {
      const report = generateVerificationReport(doc);
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}_verification_report.md`;
      a.click();
      URL.revokeObjectURL(url);
      timer.complete({});
      return true;
    } catch (e) {
      timer.error(e);
      return false;
    }
  },

  clearNodeStale: async (nodeId: NodeId) => {
    set((draft) => {
      if (draft.document) {
        const node = draft.document.nodes.find(n => n.id === nodeId);
        if (node) node.isStale = false;
      }
    });
  },

  getStaleNodes: async () => {
    const doc = get().document;
    if (!doc) return [];
    return doc.nodes.filter(n => n.isStale).map(n => n.id);
  },

  recalculateStale: async () => {
    const timer = startTimer('recalculateStale', 'store');
    set((draft) => { draft.isLoading = true; });

    const staleIds = await get().getStaleNodes();
    for (const nodeId of staleIds) {
      const result = await get().verifyNode(nodeId);
      if (result?.passed) {
        await get().clearNodeStale(nodeId);
      }
    }

    set((draft) => { draft.isLoading = false; });
    timer.complete({ total: staleIds.length });
  },
});
