/**
 * SemanticLinksPanel - Manage semantic links for a node
 *
 * Shows existing links and allows adding new ones:
 * - External sources (URLs, citations)
 * - Internal node references
 * - Relationship types (source, derived_from, related, etc.)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import type { SemanticLink, SemanticLinkType, NodeId, WorksheetNode, WorksheetDocument } from '../types/document';

interface SemanticLinksPanelProps {
  nodeId: NodeId;
  links: SemanticLink[];
  onClose?: () => void;
}

const LINK_TYPE_LABELS: Record<SemanticLinkType, { label: string; icon: string; description: string }> = {
  source: { label: 'Source', icon: '📚', description: 'External reference (textbook, paper, standard)' },
  derived_from: { label: 'Derived From', icon: '⬇️', description: 'This was derived from another node' },
  related: { label: 'Related', icon: '🔗', description: 'General relationship' },
  validates: { label: 'Validates', icon: '✓', description: 'This validates another node' },
  contradicts: { label: 'Contradicts', icon: '⚠️', description: 'This contradicts another node' },
  supersedes: { label: 'Supersedes', icon: '↑', description: 'This replaces another node' },
};

export function SemanticLinksPanel({ nodeId, links, onClose }: SemanticLinksPanelProps) {
  const { addSemanticLink, removeSemanticLink, document } = useDocumentStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newLinkType, setNewLinkType] = useState<SemanticLinkType>('source');
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCitation, setNewCitation] = useState('');
  const [newTargetNodeId, setNewTargetNodeId] = useState('');
  const [newNote, setNewNote] = useState('');

  // Clear irrelevant form fields when switching link types
  useEffect(() => {
    if (newLinkType === 'source') {
      // External source - clear internal fields
      setNewTargetNodeId('');
    } else {
      // Internal reference - clear external fields
      setNewUrl('');
      setNewTitle('');
      setNewCitation('');
    }
  }, [newLinkType]);

  // Get available nodes for internal linking (exclude current node)
  const availableNodes = useMemo(() => {
    if (!document) return [];
    return document.nodes
      .filter(n => n.id !== nodeId)
      .map(n => ({
        id: n.id,
        label: getNodeLabel(n),
      }));
  }, [document, nodeId]);

  const handleAddLink = useCallback(async () => {
    const isExternal = newLinkType === 'source' || (newUrl && !newTargetNodeId);

    if (isExternal && !newUrl && !newTitle) {
      return; // Need at least URL or title for external
    }
    if (!isExternal && !newTargetNodeId) {
      return; // Need target node for internal
    }

    await addSemanticLink(nodeId, {
      type: newLinkType,
      url: newUrl || undefined,
      title: newTitle || undefined,
      citation: newCitation || undefined,
      targetNodeId: newTargetNodeId || undefined,
      note: newNote || undefined,
    });

    // Reset form
    setNewUrl('');
    setNewTitle('');
    setNewCitation('');
    setNewTargetNodeId('');
    setNewNote('');
    setIsAdding(false);
  }, [nodeId, newLinkType, newUrl, newTitle, newCitation, newTargetNodeId, newNote, addSemanticLink]);

  const handleRemoveLink = useCallback(async (linkId: string) => {
    await removeSemanticLink(nodeId, linkId);
  }, [nodeId, removeSemanticLink]);

  return (
    <div className="semantic-links-panel">
      <div className="semantic-links-header">
        <h4>Links &amp; References</h4>
        {onClose && (
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
      </div>

      <div className="semantic-links-content">
        {/* Existing Links */}
        {links.length > 0 ? (
          <ul className="semantic-links-list">
            {links.map(link => (
              <li key={link.id} className={`semantic-link-item link-type-${link.type}`}>
                <span className="link-icon">{LINK_TYPE_LABELS[link.type].icon}</span>
                <div className="link-details">
                  <span className="link-type-label">{LINK_TYPE_LABELS[link.type].label}</span>
                  {link.title && <span className="link-title">{link.title}</span>}
                  {link.url && (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-url">
                      {link.url}
                    </a>
                  )}
                  {link.citation && <span className="link-citation">{link.citation}</span>}
                  {link.targetNodeId && (
                    <span className="link-target">
                      → {getNodeLabelById(document, link.targetNodeId)}
                    </span>
                  )}
                  {link.note && <span className="link-note">{link.note}</span>}
                </div>
                <button
                  className="remove-link-btn"
                  onClick={() => handleRemoveLink(link.id)}
                  aria-label="Remove link"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-links-message">No links added yet.</p>
        )}

        {/* Add Link Form */}
        {isAdding ? (
          <div className="add-link-form">
            <div className="form-row">
              <label>Link Type:</label>
              <select
                value={newLinkType}
                onChange={(e) => setNewLinkType(e.target.value as SemanticLinkType)}
              >
                {Object.entries(LINK_TYPE_LABELS).map(([type, { label, description }]) => (
                  <option key={type} value={type} title={description}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {newLinkType === 'source' ? (
              <>
                <div className="form-row">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Engineering Mechanics (Hibbeler)"
                  />
                </div>
                <div className="form-row">
                  <label>URL:</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-row">
                  <label>Citation:</label>
                  <input
                    type="text"
                    value={newCitation}
                    onChange={(e) => setNewCitation(e.target.value)}
                    placeholder="e.g., Chapter 5, Eq. 5.12"
                  />
                </div>
              </>
            ) : (
              <div className="form-row">
                <label>Target Node:</label>
                <select
                  value={newTargetNodeId}
                  onChange={(e) => setNewTargetNodeId(e.target.value)}
                >
                  <option value="">Select a node...</option>
                  {availableNodes.map(n => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row">
              <label>Note (optional):</label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Additional context..."
              />
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setIsAdding(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleAddLink}>
                Add Link
              </button>
            </div>
          </div>
        ) : (
          <button className="add-link-btn" onClick={() => setIsAdding(true)}>
            + Add Link
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function to get a display label for a node
function getNodeLabel(node: WorksheetNode): string {
  switch (node.type) {
    case 'given':
      return `Given: ${node.symbol}`;
    case 'equation':
      return `Equation: ${node.lhs} = ${node.rhs}`;
    case 'solve_goal':
      return `Solve: ${node.target_symbol}`;
    case 'text': {
      const text = node.content ?? '';
      const preview = text.length > 30 ? `${text.slice(0, 30)}…` : (text || '(empty)');
      return `Text: ${preview}`;
    }
    case 'plot':
      return `Plot`;
    default:
      return `Node (${node.type})`;
  }
}

function getNodeLabelById(document: WorksheetDocument | null, nodeId: string): string {
  if (!document) return nodeId;
  const node = document.nodes.find(n => n.id === nodeId);
  return node ? getNodeLabel(node) : nodeId;
}
