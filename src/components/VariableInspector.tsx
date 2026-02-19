/**
 * VariableInspector - Shows current values and units for all defined variables
 */

import { useMemo } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useAIAssistStore } from '../stores/aiAssistStore';
import { MathDisplay } from './MathDisplay';
import { formatSymbolLatex } from './nodes/nodeShared';

export function VariableInspector() {
  const { document, selectNode } = useDocumentStore();

  const variables = useMemo(() => {
    if (!document) return [];

    const vars: Array<{
      id: string;
      symbol: string;
      value: number;
      unit?: string;
      type: 'given' | 'result';
      verified: boolean;
    }> = [];

    for (const node of document.nodes) {
      if (node.type === 'given') {
        vars.push({
          id: node.id,
          symbol: node.symbol,
          value: node.value.value,
          unit: node.value.unit?.expression,
          type: 'given',
          verified: node.verification.status === 'verified',
        });
      } else if (node.type === 'result') {
        vars.push({
          id: node.id,
          symbol: node.symbol,
          value: node.value.value,
          unit: node.value.unit?.expression,
          type: 'result',
          verified: node.verification.status === 'verified',
        });
      }
    }

    return vars;
  }, [document]);

  const givenVars = variables.filter((v) => v.type === 'given');
  const resultVars = variables.filter((v) => v.type === 'result');

  return (
    <div className="variable-inspector">
      <div className="panel-header">
        <h3>Variables</h3>
        <span className="badge">{variables.length}</span>
      </div>

      <div className="variables-content">
        {variables.length === 0 ? (
          <div className="empty-state">
            <p>No variables defined.</p>
            <p className="hint">
              Add Given nodes to define input parameters.
            </p>
          </div>
        ) : (
          <>
            {givenVars.length > 0 && (
              <div className="variable-section">
                <h4>Inputs</h4>
                <div className="variable-list">
                  {givenVars.map((v) => (
                    <VariableRow
                      key={v.id}
                      variable={v}
                      onClick={() => selectNode(v.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {resultVars.length > 0 && (
              <div className="variable-section">
                <h4>Results</h4>
                <div className="variable-list">
                  {resultVars.map((v) => (
                    <VariableRow
                      key={v.id}
                      variable={v}
                      onClick={() => selectNode(v.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface VariableRowProps {
  variable: {
    id: string;
    symbol: string;
    value: number;
    unit?: string;
    type: 'given' | 'result';
    verified: boolean;
  };
  onClick: () => void;
}

function VariableRow({ variable, onClick }: VariableRowProps) {
  const askAI = useAIAssistStore((s) => s.askAI);
  const formattedValue = formatNumber(variable.value);

  return (
    <div
      className={`variable-row ${variable.type} ${variable.verified ? 'verified' : ''}`}
      onClick={onClick}
    >
      <span className="symbol">
        <MathDisplay latex={formatSymbolLatex(variable.symbol)} displayMode={false} />
      </span>
      <span className="equals">=</span>
      <span className="value">{formattedValue}</span>
      {variable.unit && <span className="unit">{variable.unit}</span>}
      {variable.verified && (
        <span className="verified-badge" title="Verified">V</span>
      )}
      <button
        className="ai-assist-btn-small"
        onClick={(e) => {
          e.stopPropagation();
          askAI(
            `What affects "${variable.symbol}" and what depends on it?`,
            { type: 'node', nodeId: variable.id, nodeType: variable.type, symbol: variable.symbol },
          );
        }}
        title="Ask AI about this variable"
      >
        AI
      </button>
    </div>
  );
}

function formatNumber(value: number): string {
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
    return value.toExponential(4);
  }
  return value.toPrecision(6).replace(/\.?0+$/, '');
}
