/**
 * HTML Export Utility
 *
 * Generates self-contained HTML files from worksheet documents
 * for sharing via email, embedding in documentation, or archiving.
 */

import type {
  WorksheetDocument,
  WorksheetNode,
  TextNode,
  GivenNode,
  EquationNode,
  ConstraintNode,
  SolveGoalNode,
  ResultNode,
  Assumption,
} from '../types/document';

export interface HtmlExportOptions {
  /** If true, embeds all CSS inline. If false, uses CDN links. */
  standalone: boolean;
  /** Include verification status badges */
  showVerification: boolean;
  /** Include assumption ledger */
  showAssumptions: boolean;
  /** Dark theme (matches app) or light theme */
  theme: 'dark' | 'light';
}

const DEFAULT_OPTIONS: HtmlExportOptions = {
  standalone: true,
  showVerification: true,
  showAssumptions: true,
  theme: 'dark',
};

/** KaTeX CDN version matching the app */
const KATEX_VERSION = '0.16.9';

/** Generate dark theme CSS */
function getDarkThemeCSS(): string {
  return `
    :root {
      --bg-primary: #0c0a09;
      --bg-secondary: #1c1917;
      --bg-tertiary: #292524;
      --text-primary: #fafaf9;
      --text-secondary: #a8a29e;
      --text-muted: #78716c;
      --accent-primary: #7c3aed;
      --accent-secondary: #8b5cf6;
      --success: #22c55e;
      --warning: #eab308;
      --error: #ef4444;
      --border: #44403c;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      margin: 0;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      color: var(--accent-secondary);
      border-bottom: 2px solid var(--accent-primary);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .metadata {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }

    .node {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-bottom: 1rem;
    }

    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .node-type {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }

    .verification-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .badge-verified {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }

    .badge-failed {
      background: rgba(239, 68, 68, 0.2);
      color: var(--error);
    }

    .badge-unverified {
      background: rgba(168, 162, 158, 0.2);
      color: var(--text-muted);
    }

    .node-content {
      font-size: 1.1rem;
    }

    .text-node {
      white-space: pre-wrap;
    }

    .given-node .symbol {
      color: var(--accent-secondary);
      font-weight: 600;
    }

    .given-node .value {
      font-family: 'JetBrains Mono', monospace;
    }

    .given-node .unit {
      color: var(--text-secondary);
    }

    .equation-node .katex {
      font-size: 1.3rem;
    }

    .result-node {
      border-left: 3px solid var(--success);
    }

    .result-node .value {
      font-family: 'JetBrains Mono', monospace;
      color: var(--success);
      font-weight: 600;
    }

    .solve-goal-node {
      border-left: 3px solid var(--accent-primary);
    }

    .constraint-node {
      border-left: 3px solid var(--warning);
    }

    .assumptions-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }

    .assumptions-section h2 {
      color: var(--text-secondary);
      font-size: 1.2rem;
      margin-bottom: 1rem;
    }

    .assumption {
      background: var(--bg-tertiary);
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .assumption-inactive {
      opacity: 0.5;
      text-decoration: line-through;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.8rem;
      text-align: center;
    }

    .footer a {
      color: var(--accent-secondary);
      text-decoration: none;
    }
  `;
}

/** Generate light theme CSS */
function getLightThemeCSS(): string {
  return `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f4;
      --bg-tertiary: #e7e5e4;
      --text-primary: #1c1917;
      --text-secondary: #57534e;
      --text-muted: #a8a29e;
      --accent-primary: #7c3aed;
      --accent-secondary: #6d28d9;
      --success: #16a34a;
      --warning: #ca8a04;
      --error: #dc2626;
      --border: #d6d3d1;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      margin: 0;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      color: var(--accent-secondary);
      border-bottom: 2px solid var(--accent-primary);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .metadata {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }

    .node {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-bottom: 1rem;
    }

    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .node-type {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }

    .verification-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .badge-verified {
      background: rgba(22, 163, 74, 0.15);
      color: var(--success);
    }

    .badge-failed {
      background: rgba(220, 38, 38, 0.15);
      color: var(--error);
    }

    .badge-unverified {
      background: rgba(168, 162, 158, 0.15);
      color: var(--text-muted);
    }

    .node-content {
      font-size: 1.1rem;
    }

    .text-node {
      white-space: pre-wrap;
    }

    .given-node .symbol {
      color: var(--accent-secondary);
      font-weight: 600;
    }

    .given-node .value {
      font-family: 'JetBrains Mono', monospace;
    }

    .given-node .unit {
      color: var(--text-secondary);
    }

    .equation-node .katex {
      font-size: 1.3rem;
    }

    .result-node {
      border-left: 3px solid var(--success);
    }

    .result-node .value {
      font-family: 'JetBrains Mono', monospace;
      color: var(--success);
      font-weight: 600;
    }

    .solve-goal-node {
      border-left: 3px solid var(--accent-primary);
    }

    .constraint-node {
      border-left: 3px solid var(--warning);
    }

    .assumptions-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }

    .assumptions-section h2 {
      color: var(--text-secondary);
      font-size: 1.2rem;
      margin-bottom: 1rem;
    }

    .assumption {
      background: var(--bg-tertiary);
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .assumption-inactive {
      opacity: 0.5;
      text-decoration: line-through;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.8rem;
      text-align: center;
    }

    .footer a {
      color: var(--accent-secondary);
      text-decoration: none;
    }
  `;
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Format unit for display */
function formatUnit(unit: string | undefined): string {
  if (!unit) return '';
  return unit
    .replace(/\^(-?\d+)/g, '<sup>$1</sup>')
    .replace(/\*/g, ' &middot; ');
}

/** Get verification badge HTML */
function getVerificationBadge(node: WorksheetNode): string {
  const status = node.verification.status;
  switch (status) {
    case 'verified':
      return '<span class="verification-badge badge-verified">&#10003; Verified</span>';
    case 'failed':
      return '<span class="verification-badge badge-failed">&#10007; Failed</span>';
    case 'pending':
      return '<span class="verification-badge badge-unverified">&#9203; Pending</span>';
    default:
      return '<span class="verification-badge badge-unverified">&#9675; Unverified</span>';
  }
}

/** Prefer canvas reading order (top-to-bottom, then left-to-right) for sharing exports. */
function sortNodesForExport(nodes: WorksheetNode[]): WorksheetNode[] {
  const withIndex = nodes.map((node, index) => ({ node, index }));
  withIndex.sort((a, b) => {
    const ay = a.node.position?.y ?? Number.MAX_SAFE_INTEGER;
    const by = b.node.position?.y ?? Number.MAX_SAFE_INTEGER;
    if (ay !== by) return ay - by;

    const ax = a.node.position?.x ?? Number.MAX_SAFE_INTEGER;
    const bx = b.node.position?.x ?? Number.MAX_SAFE_INTEGER;
    if (ax !== bx) return ax - bx;

    return a.index - b.index;
  });
  return withIndex.map(item => item.node);
}

/** Render a text node */
function renderTextNode(node: TextNode): string {
  return `
    <div class="node text-node">
      <div class="node-content">${escapeHtml(node.content)}</div>
    </div>
  `;
}

/** Render a given node */
function renderGivenNode(node: GivenNode, showVerification: boolean): string {
  const value = node.value.value;
  const unit = node.value.unit?.expression;
  const unitHtml = unit ? `<span class="unit">${formatUnit(unit)}</span>` : '';

  return `
    <div class="node given-node">
      <div class="node-header">
        <span class="node-type">Given</span>
        ${showVerification ? getVerificationBadge(node) : ''}
      </div>
      <div class="node-content">
        <span class="symbol">${escapeHtml(node.symbol)}</span> =
        <span class="value">${value}</span> ${unitHtml}
        ${node.description ? `<div class="description">${escapeHtml(node.description)}</div>` : ''}
      </div>
    </div>
  `;
}

/** Render an equation node */
function renderEquationNode(node: EquationNode, showVerification: boolean): string {
  // Use KaTeX to render the LaTeX
  const latex = node.latex || `${node.lhs} = ${node.rhs}`;

  return `
    <div class="node equation-node">
      <div class="node-header">
        <span class="node-type">Equation</span>
        ${showVerification ? getVerificationBadge(node) : ''}
      </div>
      <div class="node-content">
        <span class="katex-display">${escapeHtml(latex)}</span>
      </div>
    </div>
  `;
}

/** Render a constraint node */
function renderConstraintNode(node: ConstraintNode, showVerification: boolean): string {
  return `
    <div class="node constraint-node">
      <div class="node-header">
        <span class="node-type">Constraint</span>
        ${showVerification ? getVerificationBadge(node) : ''}
      </div>
      <div class="node-content">
        <span class="katex-display">${escapeHtml(node.latex)}</span>
        ${node.description ? `<div class="description">${escapeHtml(node.description)}</div>` : ''}
      </div>
    </div>
  `;
}

/** Render a solve goal node */
function renderSolveGoalNode(node: SolveGoalNode, showVerification: boolean): string {
  return `
    <div class="node solve-goal-node">
      <div class="node-header">
        <span class="node-type">Solve For</span>
        ${showVerification ? getVerificationBadge(node) : ''}
      </div>
      <div class="node-content">
        Find <span class="symbol">${escapeHtml(node.target_symbol)}</span>
        ${node.method ? `<span class="method">(${node.method})</span>` : ''}
      </div>
    </div>
  `;
}

/** Render a result node */
function renderResultNode(node: ResultNode, showVerification: boolean): string {
  const value = node.value.value;
  const unit = node.value.unit?.expression;
  const unitHtml = unit ? `<span class="unit">${formatUnit(unit)}</span>` : '';

  return `
    <div class="node result-node">
      <div class="node-header">
        <span class="node-type">Result</span>
        ${showVerification ? getVerificationBadge(node) : ''}
      </div>
      <div class="node-content">
        <span class="symbol">${escapeHtml(node.symbol)}</span> =
        <span class="value">${value}</span> ${unitHtml}
        ${node.symbolic_form ? `<div class="symbolic">${escapeHtml(node.symbolic_form)}</div>` : ''}
      </div>
    </div>
  `;
}

/** Render a single node */
function renderNode(node: WorksheetNode, showVerification: boolean): string {
  switch (node.type) {
    case 'text':
      return renderTextNode(node);
    case 'given':
      return renderGivenNode(node, showVerification);
    case 'equation':
      return renderEquationNode(node, showVerification);
    case 'constraint':
      return renderConstraintNode(node, showVerification);
    case 'solve_goal':
      return renderSolveGoalNode(node, showVerification);
    case 'result':
      return renderResultNode(node, showVerification);
    case 'plot':
      return `<div class="node plot-node"><div class="node-type">Plot</div><div class="node-content">(Plot visualization not available in HTML export)</div></div>`;
    default:
      return '';
  }
}

/** Render assumptions section */
function renderAssumptions(assumptions: Assumption[]): string {
  if (assumptions.length === 0) return '';

  const assumptionItems = assumptions.map(a => `
    <div class="assumption ${a.active ? '' : 'assumption-inactive'}">
      ${escapeHtml(a.statement)}
      ${a.formal_expression ? `<br><small>${escapeHtml(a.formal_expression)}</small>` : ''}
    </div>
  `).join('');

  return `
    <div class="assumptions-section">
      <h2>Assumptions</h2>
      ${assumptionItems}
    </div>
  `;
}

/**
 * Export a worksheet document to HTML
 */
export function exportToHtml(
  document: WorksheetDocument,
  options: Partial<HtmlExportOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const css = opts.theme === 'dark' ? getDarkThemeCSS() : getLightThemeCSS();

  // Generate nodes HTML
  const nodesHtml = sortNodesForExport(document.nodes)
    .map(node => renderNode(node, opts.showVerification))
    .join('\n');

  // Generate assumptions HTML
  const assumptionsHtml = opts.showAssumptions
    ? renderAssumptions(document.assumptions)
    : '';

  // Format date
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build the HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(document.name)} - ProveCalc</title>
  ${opts.standalone
    ? `<style>${css}</style>`
    : `<link rel="stylesheet" href="data:text/css,${encodeURIComponent(css)}">`
  }
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });
      // Also render elements with katex-display class
      document.querySelectorAll('.katex-display').forEach(function(el) {
        try {
          katex.render(el.textContent, el, { displayMode: true, throwOnError: false });
        } catch (e) {
          console.warn('KaTeX render error:', e);
        }
      });
    });
  </script>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(document.name)}</h1>

    <div class="metadata">
      ${document.metadata.author ? `<div>Author: ${escapeHtml(document.metadata.author)}</div>` : ''}
      ${document.metadata.description ? `<div>${escapeHtml(document.metadata.description)}</div>` : ''}
      <div>Created: ${new Date(document.created_at).toLocaleDateString()}</div>
    </div>

    <div class="nodes">
      ${nodesHtml}
    </div>

    ${assumptionsHtml}

    <div class="footer">
      <p>Generated by <a href="https://provecalc.com">ProveCalc</a> on ${exportDate}</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

