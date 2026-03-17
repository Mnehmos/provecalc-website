"use client";

import { useState } from "react";

interface TutorialStep {
  title: string;
  content: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: "first-calc",
    title: "Your First Calculation",
    description: "Set up a simple F = ma calculation from scratch.",
    steps: [
      {
        title: "Add your known values",
        content:
          'Click "+ Given" in the toolbar. Enter a symbol (e.g. "m"), a value (e.g. 10), and a unit (e.g. "kg"). Repeat for acceleration: symbol "a", value 9.81, unit "m/s**2".',
      },
      {
        title: "Add an equation",
        content:
          'Click "+ Equation". In the LaTeX field type "F = m \\\\cdot a" (display only). In the LHS field type "F". In the RHS field type "m*a" (SymPy syntax — no LaTeX).',
      },
      {
        title: "Add a solve goal",
        content:
          'Click "+ Solve". Enter target symbol "F". The engine will substitute your givens into the equation and compute the result.',
      },
      {
        title: "Verify everything",
        content:
          'Click "Verify" in the toolbar. Each node will run through the SymPy engine — green means units and values check out, red means something needs attention.',
      },
      {
        title: "Export your report",
        content:
          'Click "PDF Report" to generate a verified calculation report with full audit trail. Or use "Export" for a JSON backup.',
      },
    ],
  },
  {
    id: "ai-assistant",
    title: "Using the AI Assistant",
    description: "Let the AI set up calculations and propose worksheet changes.",
    steps: [
      {
        title: "Configure your API key",
        content:
          'Click "Settings" in the AI Assistant panel (bottom-right). Enter your OpenRouter API key from openrouter.ai/keys. Choose a model — Claude Sonnet 4.6 is recommended for engineering work.',
      },
      {
        title: "Describe your problem",
        content:
          'Type a plain-English description: "Set up a beam deflection calculation for a simply supported beam with a point load." The AI will propose structured commands.',
      },
      {
        title: "Review proposed commands",
        content:
          "The AI proposes actions (add given, add equation, etc.) as a card. Review the list — each item shows what will be added to your worksheet.",
      },
      {
        title: "Accept or dismiss",
        content:
          'Click "Accept All" to apply the commands, or "Dismiss" to reject them. Accepted commands run through the validation engine before executing.',
      },
      {
        title: "Attach images",
        content:
          "Vision-capable models (Claude, GPT, Gemini) support image attachments. Paste a screenshot or photo of a hand-drawn diagram and the AI will interpret it.",
      },
    ],
  },
  {
    id: "units",
    title: "Units & Verification",
    description: "Understand how unit checking and verification works.",
    steps: [
      {
        title: "Unit format",
        content:
          'ProveCalc uses Pint unit strings. Use plain text: "m", "kg", "N", "m/s**2", "Pa", "kN*m". Never use LaTeX in unit fields.',
      },
      {
        title: "How verification works",
        content:
          "When you click Verify, the SymPy engine substitutes all givens into each equation, checks dimensional consistency, and evaluates results. Stale nodes (shown with a count in the toolbar) need recalculation.",
      },
      {
        title: "Verification badges",
        content:
          'Each node shows a status: "verified" (green) means units match and value computed, "failed" (red) means a unit mismatch or compute error, "unverified" (gray) means not yet checked.',
      },
      {
        title: "Recalculating stale nodes",
        content:
          'When you change a given value, downstream nodes become stale. Click "Recalculate (N)" in the toolbar to update them, or re-run Verify.',
      },
    ],
  },
  {
    id: "templates",
    title: "Using Templates",
    description: "Start faster with pre-built calculation templates.",
    steps: [
      {
        title: "Open the template gallery",
        content:
          'Click "Templates" in the toolbar. Browse by category or search by name.',
      },
      {
        title: "Preview before loading",
        content:
          "Each template card shows what nodes it includes. Click a template to load it into a new worksheet — your current document is not overwritten.",
      },
      {
        title: "Customize after loading",
        content:
          "Templates are starting points. Edit the given values to match your problem, then verify to recompute results with your numbers.",
      },
    ],
  },
  {
    id: "export",
    title: "Exporting & Sharing",
    description: "Export calculations as PDF reports, HTML, or JSON.",
    steps: [
      {
        title: "PDF Report",
        content:
          'Click "PDF Report" to generate a formal engineering calculation document. It includes all nodes, verification status, dependency graph, and audit trail.',
      },
      {
        title: "HTML Export",
        content:
          '"HTML" exports a self-contained web page you can share or archive. All equations are rendered with KaTeX.',
      },
      {
        title: "JSON Export",
        content:
          '"Export" saves the full document as JSON. Use this to back up your work or transfer it between sessions.',
      },
      {
        title: "Open saved files",
        content:
          '"Open" loads a previously exported JSON file back into the app. All nodes, assumptions, and settings are restored.',
      },
    ],
  },
];

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [selected, setSelected] = useState<Tutorial | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  if (!isOpen) return null;

  const handleSelect = (t: Tutorial) => {
    setSelected(t);
    setStepIndex(0);
  };

  const handleBack = () => {
    setSelected(null);
    setStepIndex(0);
  };

  const step = selected ? selected.steps[stepIndex] : null;

  return (
    <div className="template-gallery-overlay" onClick={onClose}>
      <div
        className="template-gallery"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="template-gallery-header">
          <h2>
            {selected ? (
              <span>
                <button
                  className="close-btn"
                  style={{ marginRight: 8, fontSize: "0.85rem" }}
                  onClick={handleBack}
                  title="Back to tutorials"
                >
                  ←
                </button>
                {selected.title}
              </span>
            ) : (
              "Help & Tutorials"
            )}
          </h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {!selected ? (
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {TUTORIALS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                style={{
                  textAlign: "left",
                  background: "var(--bg-secondary, #1e1e2e)",
                  border: "1px solid var(--border-color, #333)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  cursor: "pointer",
                  color: "var(--text-primary, #fff)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary, #aaa)" }}>
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: "16px" }}>
            {/* Step progress */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {selected.steps.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setStepIndex(i)}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: i <= stepIndex ? "var(--copper, #b87333)" : "var(--border-color, #333)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>

            {/* Step content */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 8 }}>
                Step {stepIndex + 1} / {selected.steps.length}: {step!.title}
              </div>
              <p style={{ color: "var(--text-secondary, #aaa)", lineHeight: 1.6, margin: 0 }}>
                {step!.content}
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="toolbar-button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
              >
                ← Prev
              </button>
              {stepIndex < selected.steps.length - 1 ? (
                <button
                  className="toolbar-button"
                  onClick={() => setStepIndex((i) => i + 1)}
                >
                  Next →
                </button>
              ) : (
                <button className="toolbar-button" onClick={handleBack}>
                  Done ✓
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
