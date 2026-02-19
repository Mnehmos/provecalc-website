/**
 * AssumptionLedger - Sidebar panel showing all active assumptions
 *
 * Making every simplification visible:
 * steady-state, incompressible, small-angle, neglect friction, etc.
 */

import { useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { MathDisplay } from './MathDisplay';
import type { Assumption } from '../types/document';

export function AssumptionLedger() {
  const { document, addAssumption, removeAssumption, toggleAssumption } = useDocumentStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newStatement, setNewStatement] = useState('');

  const assumptions = document?.assumptions || [];
  const activeCount = assumptions.filter((a) => a.active).length;

  const handleAddAssumption = async () => {
    if (newStatement.trim()) {
      await addAssumption(newStatement.trim());
      setNewStatement('');
      setIsAdding(false);
    }
  };

  return (
    <div className="assumption-ledger">
      <div className="panel-header">
        <h3>Assumptions</h3>
        <span className="badge">{activeCount}/{assumptions.length}</span>
      </div>

      <div className="assumptions-list">
        {assumptions.length === 0 ? (
          <div className="empty-state">
            <p>No assumptions defined.</p>
            <p className="hint">
              Assumptions make simplifications explicit and auditable.
            </p>
          </div>
        ) : (
          assumptions.map((assumption) => (
            <AssumptionItem
              key={assumption.id}
              assumption={assumption}
              onToggle={() => toggleAssumption(assumption.id)}
              onRemove={() => removeAssumption(assumption.id)}
            />
          ))
        )}
      </div>

      <div className="panel-footer">
        {isAdding ? (
          <div className="add-assumption-form">
            <input
              type="text"
              value={newStatement}
              onChange={(e) => setNewStatement(e.target.value)}
              placeholder="e.g., Steady-state conditions"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddAssumption();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <div className="form-actions">
              <button onClick={handleAddAssumption}>Add</button>
              <button onClick={() => setIsAdding(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="add-button" onClick={() => setIsAdding(true)}>
            + Add Assumption
          </button>
        )}
      </div>
    </div>
  );
}

interface AssumptionItemProps {
  assumption: Assumption;
  onToggle: () => void;
  onRemove: () => void;
}

function AssumptionItem({ assumption, onToggle, onRemove }: AssumptionItemProps) {
  const provenanceLabel =
    assumption.provenance.type === 'user'
      ? 'User'
      : assumption.provenance.type === 'llm'
      ? 'AI'
      : assumption.provenance.type === 'library'
      ? 'Library'
      : 'System';

  return (
    <div className={`assumption-item ${assumption.active ? 'active' : 'inactive'}`}>
      <div className="assumption-header">
        <label className="toggle">
          <input
            type="checkbox"
            checked={assumption.active}
            onChange={onToggle}
          />
          <span className="statement">{assumption.statement}</span>
        </label>
        <button className="remove-btn" onClick={onRemove} title="Remove">
          x
        </button>
      </div>

      {assumption.formal_expression && (
        <div className="formal-expression">
          {assumption.latex ? (
            <MathDisplay latex={assumption.latex} displayMode={false} />
          ) : (
            <code>{assumption.formal_expression}</code>
          )}
        </div>
      )}

      <div className="assumption-meta">
        <span className="provenance">{provenanceLabel}</span>
        {assumption.scope.length > 0 && (
          <span className="scope">
            Applies to {assumption.scope.length} node(s)
          </span>
        )}
      </div>

      {assumption.justification && (
        <div className="justification">
          <em>{assumption.justification}</em>
        </div>
      )}
    </div>
  );
}
