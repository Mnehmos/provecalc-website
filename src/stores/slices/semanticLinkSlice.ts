/**
 * Semantic link slice — client-side link management (no backend calls)
 */

import { v4 as uuidv4 } from 'uuid';
import { logger, startTimer } from '../../utils/logger';
import type { NodeId, SemanticLink, PhysicalDomainType } from '../../types/document';
import type { SliceCreator } from './types';

export interface SemanticLinkSlice {
  addSemanticLink: (nodeId: NodeId, link: Omit<SemanticLink, 'id' | 'createdAt'>) => Promise<void>;
  removeSemanticLink: (nodeId: NodeId, linkId: string) => Promise<void>;
  updateSemanticLink: (nodeId: NodeId, linkId: string, updates: Partial<SemanticLink>) => Promise<void>;
  setActiveDomain: (domain: PhysicalDomainType | undefined) => void;
}

export const createSemanticLinkSlice: SliceCreator<SemanticLinkSlice> = (set, _get) => ({
  addSemanticLink: async (nodeId, linkData) => {
    const timer = startTimer('addSemanticLink', 'store');
    logger.store.action('documentStore', 'addSemanticLink', { nodeId, type: linkData.type });

    const link: SemanticLink = {
      ...linkData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    set((draft) => {
      if (!draft.document) return;
      const node = draft.document.nodes.find(n => n.id === nodeId);
      if (node) {
        if (!node.semanticLinks) {
          node.semanticLinks = [];
        }
        node.semanticLinks.push(link);
        draft.isDirty = true;
      }
    });

    timer.complete({ linkId: link.id });
  },

  removeSemanticLink: async (nodeId, linkId) => {
    const timer = startTimer('removeSemanticLink', 'store');
    logger.store.action('documentStore', 'removeSemanticLink', { nodeId, linkId });

    set((draft) => {
      if (!draft.document) return;
      const node = draft.document.nodes.find(n => n.id === nodeId);
      if (node && node.semanticLinks) {
        node.semanticLinks = node.semanticLinks.filter(l => l.id !== linkId);
        draft.isDirty = true;
      }
    });

    timer.complete({});
  },

  updateSemanticLink: async (nodeId, linkId, updates) => {
    const timer = startTimer('updateSemanticLink', 'store');
    logger.store.action('documentStore', 'updateSemanticLink', { nodeId, linkId });

    set((draft) => {
      if (!draft.document) return;
      const node = draft.document.nodes.find(n => n.id === nodeId);
      if (node && node.semanticLinks) {
        const link = node.semanticLinks.find(l => l.id === linkId);
        if (link) {
          Object.assign(link, updates);
          draft.isDirty = true;
        }
      }
    });

    timer.complete({});
  },

  setActiveDomain: (domain) => {
    set((draft) => {
      if (!draft.document) return;
      draft.document.metadata.active_domain = domain;
      draft.isDirty = true;
    });
  },
});
