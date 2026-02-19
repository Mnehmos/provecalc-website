/**
 * AgentTray - LLM interaction panel (WEB VERSION)
 *
 * Shows proposed diffs, explanation requests, verification results.
 * The human accepts/rejects changes here.
 *
 * Changes from desktop: calls OpenRouter API directly instead of Tauri invoke.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { v4 as uuidv4 } from 'uuid';
import { useDocumentStore } from '../stores/documentStore';
import { useSettingsStore, AVAILABLE_MODELS } from '../stores/settingsStore';
import { buildAIChatContext } from '../utils/aiContext';
import { parseAIResponse } from '../utils/suggestionParser';
import type { AISuggestion, ParsedAIResponse, AIChatAssistContext } from '../types/ai';
import type { WorksheetNode } from '../types/document';
import { useAIAssistStore, type AIAssistContext } from '../stores/aiAssistStore';
import { parseCommands, hasCommands, stripCommandBlocks } from '../utils/commandParser';
import { executeBatch } from '../stores/commandExecutor';
import { validateBatch, hasInvalidCommands, type ValidationResult } from '../utils/commandValidator';
import type { WorksheetCommand, BatchResult } from '../types/commands';

/** Normalize a partial node from AI to ensure required fields exist */
function normalizeNode(partial: Partial<WorksheetNode>): Partial<WorksheetNode> {
  return {
    ...partial,
    id: partial.id || uuidv4(),
    provenance: partial.provenance || { type: 'llm', timestamp: new Date().toISOString() },
    verification: partial.verification || { status: 'unverified' },
    dependencies: partial.dependencies || [],
    dependents: partial.dependents || [],
    assumptions: partial.assumptions || [],
    isStale: false,
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  parsed?: ParsedAIResponse;
  image?: string;
}

function getAssistNodeId(context: AIAssistContext | null): string | undefined {
  if (!context) return undefined;
  if ('nodeId' in context) return context.nodeId;
  return undefined;
}

function toAssistPayload(context: AIAssistContext | null): AIChatAssistContext | undefined {
  if (!context) return undefined;
  switch (context.type) {
    case 'node':
      return {
        type: context.type,
        node_id: context.nodeId,
        node_type: context.nodeType,
        node_index: context.nodeIndex,
        symbol: context.symbol,
        title: context.title,
        latex: context.latex,
        rhs: context.rhs,
        value: context.value,
        unit: context.unit,
        excerpt: context.excerpt,
      };
    case 'equation':
      return {
        type: context.type,
        node_id: context.nodeId,
        node_index: context.nodeIndex,
        latex: context.latex,
        symbol: context.lhs,
        rhs: context.rhs,
      };
    case 'verification':
      return {
        type: context.type,
        node_id: context.nodeId,
        node_index: context.nodeIndex,
        status: context.status,
        reason: context.reason,
      };
    case 'unit':
      return {
        type: context.type,
        unit: context.expression,
      };
    default:
      return { type: context.type };
  }
}

/** Build the full system prompt matching the desktop Rust backend */
function buildSystemPrompt(context: Record<string, unknown>): string {
  const ctx = context as {
    symbols?: Record<string, { value: number; unit?: string; node_id?: string }>;
    equations?: string[];
    assumptions?: string[];
    node_refs?: Array<{ id: string; node_type: string; ref: string; index?: number; aliases?: string[]; label?: string }>;
    focus_node_id?: string;
    assist_context?: Record<string, unknown>;
  };

  const shortId = (id: string) => id.slice(0, 8);

  const symbolsStr = ctx.symbols && Object.keys(ctx.symbols).length > 0
    ? Object.entries(ctx.symbols).map(([k, v]) => {
        const nodeHint = v.node_id ? ` [node:${shortId(v.node_id)}]` : '';
        return `  - ${k} = ${v.value} ${v.unit || ''}${nodeHint}`;
      }).join('\n')
    : '  (none defined)';

  const equationsStr = ctx.equations && ctx.equations.length > 0
    ? ctx.equations.map(eq => `  - ${eq}`).join('\n')
    : '  (none defined)';

  const assumptionsStr = ctx.assumptions && ctx.assumptions.length > 0
    ? ctx.assumptions.map(a => `  - ${a}`).join('\n')
    : '  (none defined)';

  const nodeRefsStr = ctx.node_refs && ctx.node_refs.length > 0
    ? ctx.node_refs.map(r => {
        const numPrefix = r.index ? `#${r.index} ` : '';
        const aliases = r.aliases?.length ? ` aliases: ${r.aliases.join(', ')}` : '';
        const label = r.label ? ` | ${r.label}` : '';
        return `  - ${numPrefix}ref:${r.ref} (${r.node_type}) id:${shortId(r.id)}${aliases}${label}`;
      }).join('\n')
    : '  (none)';

  const focusStr = ctx.focus_node_id ? `  - ${shortId(ctx.focus_node_id)}` : '  (none)';

  const assistStr = ctx.assist_context
    ? Object.entries(ctx.assist_context).map(([k, v]) => `  - ${k}: ${v}`).join('\n')
    : '  (none)';

  return `You are an engineering calculation assistant for ProveCalc.

## Current Document State

### Defined Symbols
${symbolsStr}

### Equations
${equationsStr}

### Assumptions
${assumptionsStr}

### Node Reference Index (for update/delete)
${nodeRefsStr}

### Focused Node
${focusStr}

### Assist Request Context
${assistStr}

## Your Role
- Help users set up engineering calculations
- Suggest equations and verify units
- Explain mathematical relationships
- For node explanations, identify the node as \`Node #<number>\` when available.
- NEVER compute values yourself - the compute engine handles that
- Propose changes as structured commands (see below)

## Command Protocol
When proposing worksheet changes, use JSON code blocks with these commands. Explain your reasoning BEFORE the commands.

### Node Commands

Add a known value:
\`\`\`json
{"action": "add_given", "symbol": "m", "value": 10, "unit": "kg"}
\`\`\`

Add an equation (see FORMAT RULES below):
\`\`\`json
{"action": "add_equation", "latex": "F = m \\\\cdot a", "lhs": "F", "rhs": "m*a"}
\`\`\`

Add a constraint (bounds check):
\`\`\`json
{"action": "add_constraint", "latex": "T > 0", "sympy": "T > 0"}
\`\`\`

Solve for a variable:
\`\`\`json
{"action": "add_solve_goal", "target": "F", "method": "symbolic"}
\`\`\`

Add explanatory text:
\`\`\`json
{"action": "add_text", "content": "This section models the beam deflection."}
\`\`\`

Add a diagram annotation (ASCII sketch in markdown):
\`\`\`json
{"action": "add_annotation", "title": "Diagram", "content": "Problem sketch:\\n\`\`\`text\\nW_1 v      W_2 v\\n|          |\\n+----------+----> x\\n\`\`\`\\nLegend: W_i are loads located at x_i."}
\`\`\`

### Modification Commands

Update an existing node.
Use \`node_id\` from the Node Reference Index (short id is OK), or use \`ref:<alias>\` from the same list:
\`\`\`json
{"action": "update_node", "node_id": "abc123", "updates": {"value": {"value": 20, "unit": {"expression": "kg"}}}}
\`\`\`

Delete a node:
\`\`\`json
{"action": "delete_node", "node_id": "abc123"}
\`\`\`

### Assumption Commands

Add an assumption:
\`\`\`json
{"action": "add_assumption", "statement": "Steady-state conditions", "formal_expression": "dT/dt = 0"}
\`\`\`

### Verification Commands

Verify a specific node:
\`\`\`json
{"action": "verify_node", "node_id": "abc123"}
\`\`\`

Verify all nodes:
\`\`\`json
{"action": "verify_all"}
\`\`\`

## FORMAT RULES — READ CAREFULLY

Each equation has THREE fields with DIFFERENT formats:
- \`latex\`: Display-only. Rendered by KaTeX. Use proper LaTeX: \\\\frac, \\\\cdot, subscript braces, etc.
- \`lhs\`: Compute field. A single SymPy identifier. Plain text, NO LaTeX.
- \`rhs\`: Compute field. A SymPy expression. Plain text, NO LaTeX.

The \`lhs\` and \`rhs\` are sent DIRECTLY to the Python compute engine (SymPy). LaTeX commands like \\\\frac, \\\\cdot, \\\\sqrt will cause parse errors.

### Symbol naming (used in \`symbol\`, \`lhs\`, \`rhs\`, \`target\`)
- Plain identifiers with underscores: \`F\`, \`m\`, \`x_cg\`, \`F_1\`, \`theta_0\`
- Primed variables use \`_prime\` SUFFIX: \`x_1_prime\`, \`x_cg_prime\`
- NEVER use LaTeX in symbols: no \`x_{cg}\`, \`\\\\mathrm{F}\`, \`x_{cg\\\\_prime}\`

### rhs expression format (Python/SymPy syntax)
- Multiplication: \`*\` (NOT \\\\cdot or \\\\times)
- Division: \`/\` with parentheses (NOT \\\\frac{...}{...})
- Powers: \`**\` (NOT ^)
- Square root: \`sqrt(x)\` (NOT \\\\sqrt{x})
- Parentheses for grouping: \`(a + b) / (c + d)\`

### Unit format (used in \`unit\`)
- Plain Pint strings: \`m\`, \`N\`, \`kg\`, \`m/s**2\`
- NEVER use LaTeX: no \`\\\\mathrm{m}\`, \`\\\\;\\\\mathrm{N}\`

### Examples — CORRECT vs WRONG

Center of gravity equation:
CORRECT:
\`\`\`json
{"action": "add_equation", "latex": "x'_{cg} = \\\\frac{W_1 x'_1 + W_2 x'_2 + W_3 x'_3}{W_1 + W_2 + W_3}", "lhs": "x_cg_prime", "rhs": "(W_1*x_1_prime + W_2*x_2_prime + W_3*x_3_prime) / (W_1 + W_2 + W_3)"}
\`\`\`
WRONG (LaTeX in lhs/rhs — will break compute):
\`\`\`json
{"action": "add_equation", "latex": "...", "lhs": "x_{cg\\\\_prime}", "rhs": "\\\\frac{W_1 \\\\cdot x_{1\\\\_prime}}{W_1 + W_2}"}
\`\`\`

Kinematic equation:
CORRECT:
\`\`\`json
{"action": "add_equation", "latex": "v = v_0 + a \\\\cdot t", "lhs": "v", "rhs": "v_0 + a*t"}
\`\`\`

## Completeness Rules
- **Define ALL variables before solving**: Every symbol in an equation MUST have a corresponding \`add_given\` command. Never leave a variable undefined.
- **Solve every part of the problem**: If the user asks a multi-part question, propose commands for ALL parts.
- **Include the solve goal**: After defining all givens and equations, always add an \`add_solve_goal\` command.
- **Include context nodes with every equation proposal**: whenever you add an \`add_equation\`, also include:
  1) one \`add_text\` command that restates the problem in plain language (knowns, unknowns, objective), and
  2) one \`add_annotation\` command titled \`Diagram\` with an ASCII sketch in a fenced \`\`\`text\`\`\` block plus a short legend.

## General Rules
- Always explain reasoning before proposing commands
- Ask clarifying questions when requirements are ambiguous
- Multiple commands per response are allowed (one per code block)
- The \`reasoning\` field is optional on any command
- Users will review and approve commands before they execute

## Session
- Request timestamp: ${new Date().toISOString()} (ensures fresh context, do not cache)`;
}

/** Call OpenRouter API directly from the browser */
async function callOpenRouter(
  message: string,
  context: Record<string, unknown>,
  conversationHistory: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string,
  imageData?: string | null,
): Promise<{ content: string; model: string }> {
  const systemPrompt = buildSystemPrompt(context);

  const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
  ];

  // Build the user message with optional image
  if (imageData) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageData } },
        { type: 'text', text: message },
      ],
    });
  } else {
    messages.push({ role: 'user', content: message });
  }

  // Proxy through our API route to avoid browser CORS/auth issues
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      model,
      messages,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('No response content from OpenRouter');
  }

  return {
    content: choice.message.content,
    model: data.model || model,
  };
}

/** Format a command for display */
function formatCommand(cmd: WorksheetCommand): string {
  switch (cmd.action) {
    case 'add_given':
      return `Add given: ${cmd.symbol} = ${cmd.value}${cmd.unit ? ' ' + cmd.unit : ''}`;
    case 'add_equation':
      return `Add equation: ${cmd.latex}`;
    case 'add_constraint':
      return `Add constraint: ${cmd.latex}`;
    case 'add_solve_goal':
      return `Solve for: ${cmd.target}`;
    case 'add_text':
      return `Add text: "${cmd.content.slice(0, 50)}${cmd.content.length > 50 ? '...' : ''}"`;
    case 'add_annotation':
      return `Add note: ${cmd.title || cmd.content.slice(0, 50)}`;
    case 'update_node':
      return `Update node ${cmd.node_id.slice(0, 8)}...`;
    case 'delete_node':
      return `Delete node ${cmd.node_id.slice(0, 8)}...`;
    case 'add_assumption':
      return `Add assumption: ${cmd.statement}`;
    case 'remove_assumption':
      return `Remove assumption ${cmd.assumption_id.slice(0, 8)}...`;
    case 'verify_node':
      return `Verify node ${cmd.node_id.slice(0, 8)}...`;
    case 'verify_all':
      return 'Verify all nodes';
  }
}

/** Command proposal card */
function CommandCard({
  commands,
  onAccept,
  onReject,
  isExecuting,
  isValidating,
  result,
  validation,
}: {
  commands: WorksheetCommand[];
  onAccept: () => void;
  onReject: () => void;
  isExecuting: boolean;
  isValidating: boolean;
  result: BatchResult | null;
  validation: ValidationResult[] | null;
}) {
  const hasInvalid = validation ? hasInvalidCommands(validation) : false;

  return (
    <div className="command-card">
      <div className="command-card-header">
        Proposed Actions ({commands.length})
      </div>
      <ul className="command-list">
        {commands.map((cmd, i) => {
          const vr = validation?.[i];
          const execResult = result?.results[i];
          const statusClass = execResult?.success === false
            ? 'failed'
            : execResult?.success
              ? 'succeeded'
              : vr?.status === 'invalid'
                ? 'invalid'
                : vr?.status === 'warning'
                  ? 'warning'
                  : '';
          return (
            <li key={i} className={`command-item ${statusClass}`}>
              <span className="command-action">{formatCommand(cmd)}</span>
              {cmd.reasoning && (
                <span className="command-reasoning">{cmd.reasoning}</span>
              )}
              {vr?.message && (
                <span className={`command-validation ${vr.status}`}>{vr.message}</span>
              )}
              {execResult?.error && (
                <span className="command-error">{execResult.error}</span>
              )}
            </li>
          );
        })}
      </ul>
      {!result && (
        <div className="command-actions">
          <button
            className="command-accept"
            onClick={onAccept}
            disabled={isExecuting || isValidating || hasInvalid}
            title={hasInvalid ? 'Cannot accept: some commands failed validation' : undefined}
          >
            {isValidating ? 'Validating...' : isExecuting ? 'Applying...' : hasInvalid ? 'Blocked (invalid)' : 'Accept All'}
          </button>
          <button
            className="command-reject"
            onClick={onReject}
            disabled={isExecuting || isValidating}
          >
            Dismiss
          </button>
        </div>
      )}
      {result && (
        <div className={`command-result ${result.failed > 0 ? 'has-errors' : 'all-success'}`}>
          {result.failed === 0
            ? `Applied ${result.succeeded} action${result.succeeded !== 1 ? 's' : ''}`
            : `${result.succeeded} succeeded, ${result.failed} failed`}
        </div>
      )}
    </div>
  );
}

/** Settings dialog */
function SettingsDialog() {
  const {
    openRouterApiKey,
    selectedModel,
    isSettingsOpen,
    setApiKey,
    setModel,
    closeSettings,
    testConnection,
    isLoading,
    error,
  } = useSettingsStore();
  const [testResult, setTestResult] = useState<boolean | null>(null);

  if (!isSettingsOpen) return null;

  const handleTest = async () => {
    const ok = await testConnection();
    setTestResult(ok);
  };

  return (
    <div className="template-gallery-overlay" onClick={closeSettings}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="template-gallery-header">
          <h2>AI Settings</h2>
          <button className="close-btn" onClick={closeSettings} aria-label="Close">&times;</button>
        </div>
        <div className="settings-body">
          <label className="settings-label">
            OpenRouter API Key
            <input
              type="password"
              value={openRouterApiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder="sk-or-v1-..."
              className="settings-input"
            />
          </label>
          <label className="settings-label">
            Model
            <select
              value={selectedModel}
              onChange={(e) => setModel(e.target.value)}
              className="settings-input"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name} - {m.description}</option>
              ))}
            </select>
          </label>
          <div className="settings-actions">
            <button onClick={handleTest} disabled={isLoading || !openRouterApiKey}>
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult === true && <span className="test-success">Connected!</span>}
            {testResult === false && <span className="test-error">Failed</span>}
            {error && <span className="test-error">{error}</span>}
          </div>
          <p className="settings-hint">
            Get your API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a>.
            Your key is stored in your browser only.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AgentTray() {
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingCommands, setPendingCommands] = useState<Map<number, WorksheetCommand[]>>(new Map());
  const [executingIndex, setExecutingIndex] = useState<number | null>(null);
  const [validatingIndex, setValidatingIndex] = useState<number | null>(null);
  const [commandResults, setCommandResults] = useState<Map<number, BatchResult>>(new Map());
  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult[]>>(new Map());
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get document and settings
  const document = useDocumentStore((state) => state.document);
  const selectedNodeId = useDocumentStore((state) => state.selectedNodeId);
  const {
    openRouterApiKey,
    selectedModel,
    isConfigured,
    loadSettings,
    openSettings,
  } = useSettingsStore();

  const modelSupportsVision = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.supportsVision ?? false;

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [conversation, isThinking]);

  // Consume pending AI assist queries from other components
  const pendingQuery = useAIAssistStore((s) => s.pendingQuery);
  const consumeQuery = useAIAssistStore((s) => s.consumeQuery);
  const formRef = useRef<HTMLFormElement>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContextRef = useRef<AIAssistContext | null>(null);

  useEffect(() => {
    if (pendingQuery && isConfigured && !isThinking) {
      const consumed = consumeQuery();
      if (consumed) {
        pendingContextRef.current = consumed.context;
        setMessage(consumed.query);
        if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = setTimeout(() => {
          formRef.current?.requestSubmit();
        }, 100);
      }
    }
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
    };
  }, [pendingQuery, isConfigured, isThinking, consumeQuery]);

  const handleAcceptCommands = async (msgIndex: number) => {
    const commands = pendingCommands.get(msgIndex);
    if (!commands) return;

    setValidatingIndex(msgIndex);
    try {
      const validation = await validateBatch(commands);
      setValidationResults((prev) => new Map(prev).set(msgIndex, validation));

      if (hasInvalidCommands(validation)) {
        return;
      }
    } finally {
      setValidatingIndex(null);
    }

    setExecutingIndex(msgIndex);
    try {
      const result = await executeBatch(commands);
      setCommandResults((prev) => new Map(prev).set(msgIndex, result));
      setPendingCommands((prev) => {
        const next = new Map(prev);
        next.delete(msgIndex);
        return next;
      });
    } finally {
      setExecutingIndex(null);
    }
  };

  const handleRejectCommands = (msgIndex: number) => {
    setPendingCommands((prev) => {
      const next = new Map(prev);
      next.delete(msgIndex);
      return next;
    });
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageAttach = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Image must be under 4 MB');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setAttachedImage(dataUrl);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!modelSupportsVision) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageAttach(file);
        return;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!openRouterApiKey) {
      setError('Please configure your OpenRouter API key in settings.');
      return;
    }

    const userMessage = message.trim();
    const imageToSend = attachedImage;
    setMessage('');
    setAttachedImage(null);
    setError(null);
    setConversation((prev) => [...prev, { role: 'user', content: userMessage, image: imageToSend || undefined }]);
    setIsThinking(true);

    try {
      const assistContext = pendingContextRef.current;
      pendingContextRef.current = null;
      const assistNodeId = getAssistNodeId(assistContext);
      const assistPayload = toAssistPayload(assistContext);

      const context = document
        ? buildAIChatContext(document, {
            focusNodeId: assistNodeId ?? selectedNodeId ?? undefined,
            query: userMessage,
            maxNodeRefs: 90,
          })
        : {
            provecalc_context: true as const,
            version: '1.0' as const,
            symbols: {},
            equations: [],
            assumptions: [],
            node_refs: [],
            focus_node_id: assistNodeId ?? selectedNodeId ?? undefined,
            query: userMessage,
            instructions: 'No document loaded.',
          };

      const enrichedContext = assistPayload
        ? { ...context, assist_context: assistPayload }
        : context;

      const history = conversation.map((msg, idx) => {
        let content = msg.content;

        if (msg.role === 'user' && msg.image) {
          content = `[User attached an image]\n${content}`;
        }

        if (msg.role === 'assistant') {
          const cmds = commandResults.get(idx);
          const pending = pendingCommands.has(idx);
          if (cmds) {
            content += `\n\n[Commands: ${cmds.succeeded} accepted, ${cmds.failed} failed of ${cmds.total} proposed]`;
          } else if (pending) {
            content += '\n\n[Commands: proposed, awaiting user review]';
          }
        }

        return { role: msg.role, content };
      });

      // Call OpenRouter directly
      const response = await callOpenRouter(
        userMessage,
        enrichedContext as unknown as Record<string, unknown>,
        history,
        openRouterApiKey,
        selectedModel,
        imageToSend,
      );

      const parsed = parseAIResponse(response.content);

      setConversation((prev) => {
        const newConv = [...prev, { role: 'assistant' as const, content: response.content, parsed }];
        if (hasCommands(response.content)) {
          const batch = parseCommands(response.content);
          if (batch.commands.length > 0) {
            const msgIndex = newConv.length - 1;
            setPendingCommands((p) => new Map(p).set(msgIndex, batch.commands));
          }
        }
        return newConv;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setConversation((prev) => prev.slice(0, -1));
    } finally {
      setIsThinking(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setPendingCommands(new Map());
    setCommandResults(new Map());
    setValidationResults(new Map());
    setAttachedImage(null);
    setError(null);
  };

  const handleInsertSuggestion = useCallback(async (suggestion: AISuggestion): Promise<boolean> => {
    const store = useDocumentStore.getState();
    if (!store.document) return false;

    try {
      if (suggestion.type === 'node' && suggestion.node) {
        const node = normalizeNode(suggestion.node);
        await store.insertNode(node as Parameters<typeof store.insertNode>[0]);
      } else if (suggestion.type === 'node_group') {
        for (const n of suggestion.nodes) {
          const node = normalizeNode(n);
          await store.insertNode(node as Parameters<typeof store.insertNode>[0]);
        }
      } else if (suggestion.type === 'assumption' && suggestion.assumption) {
        const { statement, scope } = suggestion.preview;
        await store.addAssumption(statement, undefined, scope);
      }
      return true;
    } catch (err) {
      setError(`Failed to insert suggestion: ${err}`);
      return false;
    }
  }, []);

  return (
    <>
      <SettingsDialog />
      <div className="agent-tray">
        <div className="panel-header">
          <h3>AI Assistant</h3>
          <div className="header-actions">
            {conversation.length > 0 && (
              <button
                className="clear-btn"
                onClick={clearConversation}
                title="Clear conversation"
              >
                Clear
              </button>
            )}
            <button
              className="settings-btn"
              onClick={openSettings}
              title="Settings"
            >
              Settings
            </button>
            <span className={`status ${isThinking ? 'thinking' : 'ready'}`}>
              {isThinking ? 'Thinking...' : isConfigured ? 'Ready' : 'Not configured'}
            </span>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>x</button>
          </div>
        )}

        <div className="conversation">
          {conversation.length === 0 ? (
            <div className="empty-state">
              {!isConfigured ? (
                <>
                  <p>Configure your OpenRouter API key to get started.</p>
                  <button className="config-btn" onClick={openSettings}>
                    Open Settings
                  </button>
                </>
              ) : (
                <>
                  <p>Describe your calculation or ask for help.</p>
                  <div className="suggestions">
                    <button
                      className="suggestion"
                      onClick={() =>
                        setMessage('Help me set up a heat transfer calculation')
                      }
                    >
                      Heat transfer setup
                    </button>
                    <button
                      className="suggestion"
                      onClick={() => setMessage('Explain the defined equations')}
                    >
                      Explain equations
                    </button>
                    <button
                      className="suggestion"
                      onClick={() => setMessage('Check the units in my worksheet')}
                    >
                      Unit check
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="messages">
              {conversation.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className="message-content">
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {msg.parsed?.text ? (hasCommands(msg.parsed.text) ? stripCommandBlocks(msg.parsed.text) : msg.parsed.text) : (hasCommands(msg.content) ? stripCommandBlocks(msg.content) : msg.content)}
                        </ReactMarkdown>
                        {msg.parsed?.suggestions.map((suggestion) => (
                          <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onInsert={handleInsertSuggestion}
                          />
                        ))}
                        {(pendingCommands.has(i) || commandResults.has(i)) && (
                          <CommandCard
                            commands={pendingCommands.get(i) || commandResults.get(i)!.results.map(r => r.command)}
                            onAccept={() => handleAcceptCommands(i)}
                            onReject={() => handleRejectCommands(i)}
                            isExecuting={executingIndex === i}
                            isValidating={validatingIndex === i}
                            result={commandResults.get(i) || null}
                            validation={validationResults.get(i) || null}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {msg.image && (
                          <img src={msg.image} alt="Attached" className="chat-image" />
                        )}
                        {msg.content}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div className="message assistant thinking">
                  <div className="thinking-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form ref={formRef} className="input-area" onSubmit={handleSubmit}>
          {attachedImage && (
            <div className="image-preview">
              <img src={attachedImage} alt="Attached" />
              <button className="image-remove" onClick={() => setAttachedImage(null)} title="Remove image">x</button>
            </div>
          )}
          <div className="input-row">
            {modelSupportsVision && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageAttach(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  disabled={!isConfigured}
                >
                  Attach
                </button>
              </>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              placeholder={isConfigured ? (modelSupportsVision ? 'Describe your calculation or paste an image...' : 'Describe your calculation...') : 'Configure API key first...'}
              rows={2}
              disabled={!isConfigured}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button type="submit" disabled={isThinking || !message.trim() || !isConfigured}>
              Send
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/** Renders a single AI suggestion as an insertable card */
function SuggestionCard({
  suggestion,
  onInsert,
}: {
  suggestion: AISuggestion;
  onInsert: (s: AISuggestion) => Promise<boolean>;
}) {
  const [status, setStatus] = useState<'idle' | 'inserting' | 'inserted' | 'failed'>('idle');

  const handleInsert = async () => {
    setStatus('inserting');
    const ok = await onInsert(suggestion);
    setStatus(ok ? 'inserted' : 'failed');
  };

  const inserted = status === 'inserted';

  if (suggestion.type === 'explanation') {
    return null;
  }

  const label =
    suggestion.type === 'node'
      ? suggestion.preview.description
      : suggestion.type === 'node_group'
        ? suggestion.preview.title
        : suggestion.preview.statement;

  const confidencePct = Math.round(suggestion.confidence * 100);

  return (
    <div className={`suggestion-card${inserted ? ' inserted' : ''}`}>
      <div className="suggestion-card-header">
        <span className="suggestion-type">
          {suggestion.type === 'node' ? 'NODE' : suggestion.type === 'node_group' ? 'GROUP' : 'ASSUMPTION'}
        </span>
        <span className="suggestion-confidence">{confidencePct}%</span>
      </div>
      <div className="suggestion-card-body">
        <p>{label}</p>
        {suggestion.type === 'node' && suggestion.preview.latex && (
          <code className="suggestion-latex">{suggestion.preview.latex}</code>
        )}
        {suggestion.type === 'node_group' && (
          <ul className="suggestion-nodes-list">
            {suggestion.preview.nodes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="suggestion-card-actions">
        {status === 'inserted' ? (
          <span className="inserted-label">Inserted</span>
        ) : status === 'failed' ? (
          <span className="inserted-label failed">Failed</span>
        ) : (
          <button className="insert-btn" onClick={handleInsert} disabled={status === 'inserting'}>
            {status === 'inserting' ? 'Inserting...' : '+ Insert'}
          </button>
        )}
      </div>
    </div>
  );
}
