/**
 * QuickAddDialog - Parse natural language text into nodes
 *
 * Supports patterns like:
 * - "Given m = 10 kg"
 * - "Let F = m*a"
 * - "Find v"
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { parseText, parseLineWithFeedback } from '../utils/textToNodeParser';
import { useDocumentStore, getNextNodePosition } from '../stores/documentStore';

interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  startPosition?: { x: number; y: number };
}

export function QuickAddDialog({ isOpen, onClose, startPosition }: QuickAddDialogProps) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Array<{ type: string; preview: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { insertNode, document } = useDocumentStore();

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Update preview as user types
  useEffect(() => {
    const lines = text.split('\n');
    const previews = lines.map(line => {
      const result = parseLineWithFeedback(line);
      return { type: result.type, preview: result.preview };
    }).filter(p => p.type !== 'empty');
    setPreview(previews);
  }, [text]);

  const getNextPosition = useCallback(
    () => startPosition || getNextNodePosition(document),
    [document, startPosition],
  );

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;

    const position = getNextPosition();
    const result = parseText(text, position);

    if (result.nodes.length > 0) {
      // Insert all parsed nodes
      for (const node of result.nodes) {
        await insertNode(node);
      }
      setText('');
      onClose();
    }
  }, [text, getNextPosition, insertNode, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [handleSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="quick-add-overlay" onClick={onClose}>
      <div className="quick-add-dialog" onClick={e => e.stopPropagation()}>
        <div className="quick-add-header">
          <h3>Quick Add Nodes</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="quick-add-body">
          <div className="quick-add-help">
            <p>Type natural language to create nodes:</p>
            <ul>
              <li><code>Given m = 10 kg</code> - Creates a given node</li>
              <li><code>Let F = m*a</code> or <code>F = m*a</code> - Creates an equation</li>
              <li><code>Find v</code> or <code>Solve for v</code> - Creates a solve goal</li>
            </ul>
          </div>

          <textarea
            ref={textareaRef}
            className="quick-add-input"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Given m = 10 kg&#10;Given a = 9.81 m/s^2&#10;F = m*a&#10;Find F"
            rows={6}
          />

          {preview.length > 0 && (
            <div className="quick-add-preview">
              <h4>Preview ({preview.length} node{preview.length !== 1 ? 's' : ''}):</h4>
              <ul>
                {preview.map((p, i) => (
                  <li key={i} className={`preview-item preview-${p.type}`}>
                    {p.preview}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="quick-add-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={preview.length === 0}
          >
            Add {preview.length} Node{preview.length !== 1 ? 's' : ''} (Ctrl+Enter)
          </button>
        </div>
      </div>
    </div>
  );
}
